import { regionCapitals } from "./_regions.js";
import { publicBusinessOf, serviceCategories, serviceColumns, toPublicService } from "./_services.js";
import { getSupabase } from "./_supabase.js";

// Published services of published businesses in a region, for travellers. ?category= narrows them to one kind.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const region = params.get("region") ?? "", category = params.get("category") ?? "";
  if (!(region in regionCapitals)) return Response.json({ error: "Región inválida." }, { status: 400 });
  if (category && !serviceCategories.has(category)) return Response.json({ error: "Tipo inválido." }, { status: 400 });

  try {
    let query = getSupabase().from("services")
      .select(`${serviceColumns}, partners!inner(id, name, kind, region, status, address, active_until)`)
      .eq("status", "published").eq("partners.region", region).eq("partners.status", "published");
    if (category) query = query.eq("category", category);
    const { data, error } = await query.order("updated_at", { ascending: false }).limit(100);
    if (error) throw error;
    const services = (data ?? []).map((row) => {
      const partner = (Array.isArray(row.partners) ? row.partners[0] : row.partners) as Record<string, unknown>;
      return { ...toPublicService(row), business: publicBusinessOf(partner) };
    });
    return Response.json({ region, services }, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } });
  } catch (error) {
    console.error("Unable to load services", error);
    return Response.json({ error: "Los servicios no están disponibles por ahora." }, { status: 503 });
  }
}
