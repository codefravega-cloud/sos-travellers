import { businessColumns, toPublicBusiness } from "./_business.js";
import { getSupabase } from "./_supabase.js";

// One published business, for the review link written on its NFC tag (/r/<id>).
export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Negocio inválido." }, { status: 400 });

  try {
    const { data, error } = await getSupabase().from("partners").select(businessColumns).eq("id", id).eq("status", "published").maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "No encontramos este negocio." }, { status: 404 });
    return Response.json({ business: toPublicBusiness(data) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Unable to load business", error);
    return Response.json({ error: "El negocio no está disponible por ahora." }, { status: 503 });
  }
}
