import { isActive } from "./_business.js";
import { regionCapitals } from "./_regions.js";
import { getSupabase } from "./_supabase.js";

const ZONE = "America/Santiago";

// Approved promotions still in force, with the business that offers each one.
export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get("region") ?? "";
  if (!(region in regionCapitals)) return Response.json({ error: "Región inválida." }, { status: 400 });

  try {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(new Date());
    const { data, error } = await getSupabase().from("promotions")
      .select("id, title, description, valid_until, partners!inner(id, name, kind, region, status, address, active_until)")
      .eq("status", "published").gte("valid_until", today)
      .eq("partners.region", region).eq("partners.status", "published")
      .order("valid_until").limit(60);
    if (error) throw error;
    const promotions = (data ?? []).map((row) => {
      const partner = (Array.isArray(row.partners) ? row.partners[0] : row.partners) as Record<string, unknown>;
      return {
        id: row.id, title: row.title, description: row.description ?? undefined, validUntil: row.valid_until,
        business: { id: partner.id, name: partner.name, kind: partner.kind, address: partner.address ?? undefined, active: isActive(partner) },
      };
    });
    return Response.json({ region, promotions }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch (error) {
    console.error("Unable to load promotions", error);
    return Response.json({ error: "Las promociones no están disponibles por ahora." }, { status: 503 });
  }
}
