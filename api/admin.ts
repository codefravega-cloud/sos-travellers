import { requireRole } from "./_auth.js";
import { businessColumns, kinds, photosOf, toManagedBusiness, type Photo } from "./_business.js";
import { regionCapitals } from "./_regions.js";
import { getSupabase } from "./_supabase.js";

const noStore = { "Cache-Control": "no-store" };
const roles = new Set(["tourist", "owner", "boss"]);
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const id = (value: unknown) => { const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : null; };
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: noStore });
const done = (extra: Record<string, unknown> = {}) => Response.json({ ok: true, ...extra }, { headers: noStore });

// Everything the boss panel shows, in one request: the volumes are small and the panel reloads after each action.
export async function GET(request: Request) {
  const user = await requireRole(request, ["boss"]);
  if (user instanceof Response) return user;

  try {
    const supabase = getSupabase();
    const [profiles, accounts, partners, applications, reviews, suggestions, promotions, benefits] = await Promise.all([
      supabase.from("app_users").select("id, first_name, country, role, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.auth.admin.listUsers({ page: 1, perPage: 500 }),
      supabase.from("partners").select(businessColumns).order("name").limit(500),
      supabase.from("business_applications").select("id, business_name, contact_name, email, phone, category, address, description, website, interest, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("reviews").select("id, place_id, author_name, rating, comment, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("suggestions").select("id, role, message, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("promotions").select("id, partner_id, title, description, valid_until, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("owner_benefits").select("id, title, detail, rank, status").order("rank", { ascending: false }).order("id"),
    ]);
    for (const result of [profiles, accounts, partners, applications, reviews, suggestions, promotions, benefits]) if (result.error) throw result.error;

    const emails = new Map(accounts.data.users.map((account) => [account.id, account.email ?? ""]));
    const names = new Map((partners.data ?? []).map((row) => [row.id, row.name]));
    return Response.json({
      me: user.id,
      users: (profiles.data ?? []).map((row) => ({ id: row.id, email: emails.get(row.id) ?? "", firstName: row.first_name, country: row.country, role: row.role, createdAt: row.created_at })),
      businesses: (partners.data ?? []).map(toManagedBusiness),
      applications: (applications.data ?? []).map((row) => ({
        id: row.id, businessName: row.business_name, contactName: row.contact_name, email: row.email ?? undefined, phone: row.phone ?? undefined,
        category: row.category, address: row.address, description: row.description, website: row.website ?? undefined, interest: row.interest, status: row.status, createdAt: row.created_at,
      })),
      reviews: (reviews.data ?? []).map((row) => ({ id: row.id, placeId: row.place_id, authorName: row.author_name, rating: row.rating, comment: row.comment, status: row.status, createdAt: row.created_at })),
      suggestions: suggestions.data ?? [],
      promotions: (promotions.data ?? []).map((row) => ({ id: row.id, partnerId: row.partner_id, business: names.get(row.partner_id) ?? "", title: row.title, description: row.description ?? undefined, validUntil: row.valid_until, status: row.status })),
      benefits: benefits.data ?? [],
    }, { headers: noStore });
  } catch (error) {
    console.error("Unable to load admin panel", error);
    return fail("El panel no está disponible por ahora.", 503);
  }
}

export async function POST(request: Request) {
  const user = await requireRole(request, ["boss"]);
  if (user instanceof Response) return user;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const supabase = getSupabase();

    if (action === "set-role") {
      const userId = text(body.userId, 36), role = text(body.role, 10);
      if (!/^[0-9a-f-]{36}$/.test(userId) || !roles.has(role)) return fail("Usuario o rol inválido.");
      // A boss cannot drop their own role, so the panel is never left without one.
      if (userId === user.id) return fail("No puedes cambiar tu propio rol.");
      const { error } = await supabase.from("app_users").update({ role }).eq("id", userId);
      if (error) throw error;
      return done();
    }

    if (action === "create-business") {
      const name = text(body.name, 100), kind = text(body.kind, 12), region = text(body.region, 2);
      if (name.length < 2) return fail("Escribe el nombre del negocio.");
      if (!kinds.has(kind)) return fail("Tipo inválido.");
      if (!(region in regionCapitals)) return fail("Región inválida.");
      const applicationId = id(body.applicationId);
      const { data, error } = await supabase.from("partners")
        .insert({ name, kind, region, phone: text(body.phone, 30) || null, url: text(body.url, 300) || null, address: text(body.address, 200) || null, status: "draft" })
        .select("id").single();
      if (error) throw error;
      if (applicationId) {
        const { error: applicationError } = await supabase.from("business_applications").update({ status: "approved" }).eq("id", applicationId);
        if (applicationError) throw applicationError;
      }
      return done({ id: data.id });
    }

    if (action === "update-business") {
      const partnerId = id(body.partnerId);
      if (!partnerId) return fail("Negocio inválido.");
      const changes: Record<string, unknown> = {};
      if ("status" in body) {
        if (body.status !== "draft" && body.status !== "published") return fail("Estado inválido.");
        changes.status = body.status;
      }
      if ("ownerId" in body) {
        const ownerId = text(body.ownerId, 36);
        if (ownerId && !/^[0-9a-f-]{36}$/.test(ownerId)) return fail("Dueño inválido.");
        changes.owner_id = ownerId || null;
      }
      if ("placeId" in body) {
        const placeId = text(body.placeId, 64);
        if (placeId && !/^[a-z0-9-]{2,64}$/.test(placeId)) return fail("El id de la ficha solo lleva minúsculas, números y guiones.");
        changes.place_id = placeId || null;
      }
      if (body.deactivate === true) changes.active_until = null;
      if (!Object.keys(changes).length) return fail("Nada que cambiar.");
      const { error } = await supabase.from("partners").update(changes).eq("id", partnerId);
      if (error) throw error;
      // Linking a business makes its owner an owner; unlinking does not take the role away.
      if (changes.owner_id) {
        const { error: roleError } = await supabase.from("app_users").update({ role: "owner" }).eq("id", changes.owner_id).eq("role", "tourist");
        if (roleError) throw roleError;
      }
      return done();
    }

    if (action === "photo-status") {
      const partnerId = id(body.partnerId), path = text(body.path, 120), status = text(body.status, 10);
      if (!partnerId || (status !== "published" && status !== "rejected")) return fail("Foto o estado inválido.");
      const { data: partner, error: readError } = await supabase.from("partners").select("photos").eq("id", partnerId).maybeSingle();
      if (readError) throw readError;
      if (!partner) return fail("Negocio inválido.");
      const photos: Photo[] = photosOf(partner).map((photo) => (photo.path === path ? { path, status } : photo));
      const { error } = await supabase.from("partners").update({ photos }).eq("id", partnerId);
      if (error) throw error;
      return done();
    }

    // The remaining actions change the status of one row of one table.
    const statusMoves: Record<string, { table: string; allowed: string[] }> = {
      "application-status": { table: "business_applications", allowed: ["pending", "approved", "rejected"] },
      "review-status": { table: "reviews", allowed: ["published", "hidden"] },
      "suggestion-status": { table: "suggestions", allowed: ["new", "read", "done"] },
      "promotion-status": { table: "promotions", allowed: ["pending", "published", "rejected"] },
    };
    const move = statusMoves[action];
    if (move) {
      const rowId = id(body.id), status = text(body.status, 10);
      if (!rowId || !move.allowed.includes(status)) return fail("Estado inválido.");
      const { error } = await supabase.from(move.table).update({ status }).eq("id", rowId);
      if (error) throw error;
      return done();
    }

    if (action === "save-benefit") {
      const title = text(body.title, 80), detail = text(body.detail, 300), rowId = id(body.id);
      if (title.length < 3) return fail("Escribe un título para el beneficio.");
      const row = { title, detail: detail || null, status: body.status === "draft" ? "draft" : "published" };
      const { error } = rowId ? await supabase.from("owner_benefits").update(row).eq("id", rowId) : await supabase.from("owner_benefits").insert(row);
      if (error) throw error;
      return done();
    }

    if (action === "remove-benefit") {
      const rowId = id(body.id);
      if (!rowId) return fail("Beneficio inválido.");
      const { error } = await supabase.from("owner_benefits").delete().eq("id", rowId);
      if (error) throw error;
      return done();
    }

    return fail("Acción inválida.");
  } catch (error) {
    console.error("Unable to apply admin action", error);
    return fail("No pudimos guardar el cambio. Intenta nuevamente.", 503);
  }
}
