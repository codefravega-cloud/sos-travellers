import { requireRole } from "./_auth.js";
import { ACTIVE_HOURS, businessColumns, reviewPlaceId, toManagedBusiness } from "./_business.js";
import { getSupabase } from "./_supabase.js";

const noStore = { "Cache-Control": "no-store" };
const HOUR = 3600000, DAY = 86400000, MAX_PROMOTIONS = 5, MAX_PROMOTION_DAYS = 180;
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: noStore });

// The owner's side of the panel and of the app: their businesses, promotions, benefits and the reviews they received.
export async function GET(request: Request) {
  const user = await requireRole(request, ["owner", "boss"]);
  if (user instanceof Response) return user;

  try {
    const supabase = getSupabase();
    const { data: rows, error } = await supabase.from("partners").select(businessColumns).eq("owner_id", user.id).order("name");
    if (error) throw error;
    const ids = rows.map((row) => row.id), placeIds = rows.map(reviewPlaceId);
    const [promotions, benefits, reviews] = await Promise.all([
      ids.length ? supabase.from("promotions").select("id, partner_id, title, description, valid_until, status").in("partner_id", ids).order("created_at", { ascending: false }) : { data: [], error: null },
      supabase.from("owner_benefits").select("id, title, detail").eq("status", "published").order("rank", { ascending: false }).order("id"),
      placeIds.length ? supabase.from("reviews").select("id, place_id, author_name, rating, comment, created_at").in("place_id", placeIds).eq("status", "published").order("created_at", { ascending: false }).limit(50) : { data: [], error: null },
    ]);
    if (promotions.error) throw promotions.error;
    if (benefits.error) throw benefits.error;
    if (reviews.error) throw reviews.error;

    return Response.json({
      businesses: rows.map((row) => ({
        ...toManagedBusiness(row),
        promotions: (promotions.data ?? []).filter((promotion) => promotion.partner_id === row.id)
          .map((promotion) => ({ id: promotion.id, title: promotion.title, description: promotion.description ?? undefined, validUntil: promotion.valid_until, status: promotion.status })),
        reviews: (reviews.data ?? []).filter((review) => review.place_id === reviewPlaceId(row))
          .map((review) => ({ id: review.id, authorName: review.author_name, rating: review.rating, comment: review.comment, createdAt: review.created_at })),
      })),
      benefits: benefits.data ?? [],
    }, { headers: noStore });
  } catch (error) {
    console.error("Unable to load owner panel", error);
    return fail("Tu panel no está disponible por ahora.", 503);
  }
}

export async function POST(request: Request) {
  const user = await requireRole(request, ["owner", "boss"]);
  if (user instanceof Response) return user;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const supabase = getSupabase();

    // Every action is on one business, and only on a business of this account.
    const partnerId = Number(body.partnerId);
    if (!Number.isSafeInteger(partnerId) || partnerId < 1) return fail("Negocio inválido.");
    const { data: owned, error: ownError } = await supabase.from("partners").select("id").eq("id", partnerId).eq("owner_id", user.id).maybeSingle();
    if (ownError) throw ownError;
    if (!owned) return fail("Ese negocio no pertenece a tu cuenta.", 403);

    if (action === "set-active") {
      const activeUntil = body.active === true ? new Date(Date.now() + ACTIVE_HOURS * HOUR).toISOString() : null;
      const { error } = await supabase.from("partners").update({ active_until: activeUntil }).eq("id", partnerId);
      if (error) throw error;
      return Response.json({ ok: true, activeUntil: activeUntil ?? undefined }, { headers: noStore });
    }

    if (action === "update-contact") {
      const url = text(body.url, 300);
      if (url && !/^https?:\/\/[^\s]+\.[^\s]+$/.test(url)) return fail("El sitio debe empezar con https://");
      const languages = Array.isArray(body.languages) ? [...new Set(body.languages.map((value) => String(value).toUpperCase()).filter((value) => /^[A-Z]{2}$/.test(value)))].slice(0, 8) : [];
      const { error } = await supabase.from("partners").update({
        phone: text(body.phone, 30) || null, whatsapp: text(body.whatsapp, 30) || null, url: url || null,
        address: text(body.address, 200) || null, languages,
      }).eq("id", partnerId);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: noStore });
    }

    if (action === "add-promotion") {
      const title = text(body.title, 80), description = text(body.description, 300), validUntil = text(body.validUntil, 10);
      if (title.length < 3) return fail("Escribe un título para la promoción.");
      const until = /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? Date.parse(`${validUntil}T23:59:59-03:00`) : NaN;
      if (Number.isNaN(until) || until < Date.now()) return fail("La fecha de término debe ser hoy o posterior.");
      if (until > Date.now() + MAX_PROMOTION_DAYS * DAY) return fail("La promoción puede durar hasta 180 días.");
      const { count, error: countError } = await supabase.from("promotions").select("*", { count: "exact", head: true }).eq("partner_id", partnerId).neq("status", "rejected");
      if (countError) throw countError;
      if ((count ?? 0) >= MAX_PROMOTIONS) return fail(`Puedes tener hasta ${MAX_PROMOTIONS} promociones a la vez.`);
      const { error } = await supabase.from("promotions").insert({ partner_id: partnerId, title, description: description || null, valid_until: validUntil, status: "pending" });
      if (error) throw error;
      return Response.json({ ok: true }, { status: 201, headers: noStore });
    }

    if (action === "remove-promotion") {
      const promotionId = Number(body.promotionId);
      if (!Number.isSafeInteger(promotionId) || promotionId < 1) return fail("Promoción inválida.");
      const { error } = await supabase.from("promotions").delete().eq("id", promotionId).eq("partner_id", partnerId);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: noStore });
    }

    return fail("Acción inválida.");
  } catch (error) {
    console.error("Unable to update business", error);
    return fail("No pudimos guardar el cambio. Intenta nuevamente.", 503);
  }
}
