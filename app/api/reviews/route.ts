import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const validPlaceId = /^[a-z0-9-]{2,64}$/;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId") ?? "";
  if (!validPlaceId.test(placeId)) return NextResponse.json({ error: "Lugar inválido." }, { status: 400 });

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
    return NextResponse.json({ reviews, summary: { count: reviews.length, average } });
  } catch (error) {
    console.error("Unable to load reviews", error);
    return NextResponse.json({ error: "Las opiniones no están disponibles por ahora." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const placeId = String(body.placeId ?? "").trim();
    const authorName = String(body.authorName ?? "").trim();
    const comment = String(body.comment ?? "").trim();
    const rating = Number(body.rating);
    const website = String(body.website ?? "").trim();

    if (website) return NextResponse.json({ ok: true });
    if (!validPlaceId.test(placeId)) return NextResponse.json({ error: "Lugar inválido." }, { status: 400 });
    if (authorName.length < 2 || authorName.length > 40) return NextResponse.json({ error: "Escribe un nombre de 2 a 40 caracteres." }, { status: 400 });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Selecciona de 1 a 5 estrellas." }, { status: 400 });
    if (comment.length < 5 || comment.length > 400) return NextResponse.json({ error: "La opinión debe tener entre 5 y 400 caracteres." }, { status: 400 });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("reviews")
      .insert({ place_id: placeId, author_name: authorName, rating, comment, status: "published" })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Unable to save review", error);
    return NextResponse.json({ error: "No pudimos guardar tu opinión. Intenta nuevamente." }, { status: 503 });
  }
}
