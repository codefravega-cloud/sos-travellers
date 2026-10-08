import { getSupabase } from "./_supabase.js";

// Mirrors the guide ids in src/guides.ts and the SQL check constraint.
const guideIds = new Set(["metro-aeropuerto", "santiago-noche", "santiago-3-dias", "pase-sos"]);
const locales = new Set(["es", "en", "pt", "fr"]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (String(body.companyWebsite ?? "")) return Response.json({ ok: true });
    const guideId = String(body.guideId ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const locale = String(body.locale ?? "").trim();
    const currency = String(body.currency ?? "").trim();

    if (!guideIds.has(guideId)) return Response.json({ error: "Guía inválida." }, { status: 400 });
    if (email.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Correo inválido." }, { status: 400 });
    if (!locales.has(locale)) return Response.json({ error: "Idioma inválido." }, { status: 400 });

    const { error } = await getSupabase()
      .from("guide_leads")
      .upsert({ guide_id: guideId, email, locale, currency: /^[A-Z]{3}$/.test(currency) ? currency : null }, { onConflict: "guide_id,email", ignoreDuplicates: true });
    if (error) throw error;
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to save guide lead", error);
    return Response.json({ error: "No pudimos guardar tu correo. Intenta nuevamente." }, { status: 503 });
  }
}
