import { getSupabase } from "./_supabase.js";

// For an external monitor: answers 200 only if the API reaches the database.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { error } = await getSupabase().from("places").select("id", { head: true, count: "estimated" }).limit(1);
    if (error) throw error;
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
