import { categoryColumns, toCategory } from "./_categories.js";
import { getSupabase } from "./_supabase.js";

// The published categories, for the filters and forms of the site, the panel and the app.
export async function GET() {
  try {
    const { data, error } = await getSupabase().from("business_categories").select(categoryColumns).eq("status", "published").order("rank", { ascending: false }).order("id");
    if (error) throw error;
    const categories = data.map((row) => { const { id, names, partnerKind } = toCategory(row); return { id, names, partnerKind }; });
    return Response.json({ categories }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch (error) {
    console.error("Unable to load categories", error);
    return Response.json({ error: "Las categorías no están disponibles por ahora." }, { status: 503 });
  }
}
