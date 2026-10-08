import { businessColumns, kinds, toPublicBusiness } from "./_business.js";
import { regionCapitals } from "./_regions.js";
import { getSupabase } from "./_supabase.js";

// Published businesses of a region; `kind` narrows the list. Cached briefly because "serving now" changes during the day.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "", region = params.get("region") ?? "";
  if (kind && !kinds.has(kind)) return Response.json({ error: "Tipo inválido." }, { status: 400 });
  if (!(region in regionCapitals)) return Response.json({ error: "Región inválida." }, { status: 400 });

  try {
    let query = getSupabase().from("partners").select(businessColumns).eq("region", region).eq("status", "published");
    if (kind) query = query.eq("kind", kind);
    const { data, error } = await query.order("rank", { ascending: false }).order("name").limit(kind ? 24 : 100);
    if (error) throw error;
    return Response.json({ partners: (data ?? []).map(toPublicBusiness) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Unable to load partners", error);
    return Response.json({ error: "Los colaboradores no están disponibles por ahora." }, { status: 503 });
  }
}
