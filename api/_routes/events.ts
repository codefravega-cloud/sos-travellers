import { regionCapitals } from "./_regions.js";
import { getSupabase } from "./_supabase.js";

const HOUR = 3600000, WINDOW_DAYS = 7;

// Events that started up to six hours ago still count as "happening now".
export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get("region") ?? "";
  if (!(region in regionCapitals)) return Response.json({ error: "Región inválida." }, { status: 400 });

  try {
    const now = Date.now();
    const { data, error } = await getSupabase()
      .from("events")
      .select("id, title, venue, category, starts_at, ends_at, price_label, url, summary, featured")
      .eq("region", region)
      .eq("status", "published")
      .gte("starts_at", new Date(now - 6 * HOUR).toISOString())
      .lte("starts_at", new Date(now + WINDOW_DAYS * 24 * HOUR).toISOString())
      .order("featured", { ascending: false })
      .order("starts_at")
      .limit(60);
    if (error) throw error;
    const events = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      venue: row.venue,
      category: row.category,
      startsAt: row.starts_at,
      endsAt: row.ends_at ?? undefined,
      priceLabel: row.price_label ?? undefined,
      url: row.url ?? undefined,
      summary: row.summary ?? undefined,
      featured: row.featured,
    }));
    return Response.json({ region, events }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("Unable to load events", error);
    return Response.json({ error: "Los eventos no están disponibles por ahora." }, { status: 503 });
  }
}
