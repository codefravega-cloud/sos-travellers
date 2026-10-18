import { getSupabase } from "./_supabase.js";

const validPlaceId = /^[a-z0-9-]{2,64}$/;

export async function GET(request: Request) {
  const placeId = new URL(request.url).searchParams.get("placeId") ?? "";
  if (!validPlaceId.test(placeId)) return Response.json({ error: "Lugar inválido." }, { status: 400 });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("reviews")
      .select("id, author_name, rating, comment, created_at")
      .eq("place_id", placeId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;

    const reviews = data ?? [];
    const average = reviews.length
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
      : null;
    return Response.json({ reviews, summary: { count: reviews.length, average } });
  } catch (error) {
    console.error("Unable to load reviews", error);
    return Response.json({ error: "Las opiniones no están disponibles por ahora." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const placeId = String(body.placeId ?? "").trim();
    const authorName = String(body.authorName ?? "").trim();
    const comment = String(body.comment ?? "").trim();
    const rating = Number(body.rating);
    const website = String(body.website ?? "").trim();

    if (website) return Response.json({ ok: true });
    if (!validPlaceId.test(placeId)) return Response.json({ error: "Lugar inválido." }, { status: 400 });
    if (authorName.length < 2 || authorName.length > 40) return Response.json({ error: "Escribe un nombre de 2 a 40 caracteres." }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return Response.json({ error: "Selecciona de 1 a 5 estrellas." }, { status: 400 });
    if (comment.length < 5 || comment.length > 400) return Response.json({ error: "La opinión debe tener entre 5 y 400 caracteres." }, { status: 400 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("reviews")
      .insert({ place_id: placeId, author_name: authorName, rating, comment, status: "published" })
      .select("id")
      .single();
    if (error) throw error;
    return Response.json({ ok: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Unable to save review", error);
    return Response.json({ error: "No pudimos guardar tu opinión. Intenta nuevamente." }, { status: 503 });
  }
}
