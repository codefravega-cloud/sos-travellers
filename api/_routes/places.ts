import { regionCapitals } from "./_regions.js";
import { getSupabase } from "./_supabase.js";

const PAGE = 1000, MAX_PAGES = 4;
const columns = "id, google_place_id, name, category, rating, rating_label, review_count, lat, lng, region, comuna, locality, address, hours, opening_periods, visit, website, google_maps_url, map_query, languages, summary, tag, access, photo, curated, checked_at, source, specialty";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Rows are returned in the shape of the client's `Place` type (src/places.ts).
function toPlace(row: Row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    rating: row.rating_label ?? (row.rating == null ? "—" : Number(row.rating).toFixed(1)),
    reviews: row.review_count == null ? undefined : new Intl.NumberFormat("es-CL").format(row.review_count),
    coords: [row.lat, row.lng],
    neighborhood: row.locality,
    comuna: row.comuna ?? undefined,
    address: row.address ?? undefined,
    visit: row.visit ?? undefined,
    mapQuery: row.map_query ?? undefined,
    googlePlaceId: row.google_place_id ?? undefined,
    googleMapsUrl: row.google_maps_url ?? undefined,
    languages: row.languages ?? undefined,
    officialUrl: row.website ?? undefined,
    photo: row.photo ?? undefined,
    hours: row.hours ?? undefined,
    openingPeriods: row.opening_periods ?? undefined,
    access: row.access ?? undefined,
    tag: row.tag ?? undefined,
    summary: row.summary ?? undefined,
    region: row.region,
    curated: row.curated,
    checkedAt: row.checked_at,
    source: row.source,
    specialty: row.specialty || undefined,
  };
}

export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get("region") ?? "";
  if (!(region in regionCapitals)) return Response.json({ error: "Región inválida." }, { status: 400 });

  try {
    const supabase = getSupabase();
    const rows: Row[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await supabase
        .from("places")
        .select(columns)
        .eq("region", region)
        .eq("status", "published")
        .order("curated", { ascending: false })
        .order("rank", { ascending: false })
        .order("review_count", { ascending: false, nullsFirst: false })
        .order("id")
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    return Response.json({ region, places: rows.map(toPlace) }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    console.error("Unable to load places", error);
    return Response.json({ error: "Los lugares no están disponibles por ahora." }, { status: 503 });
  }
}
