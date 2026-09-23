import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "../../../db/d1";

export const dynamic = "force-dynamic";

type ReviewRow = {
  id: number;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

const validPlaceId = /^[a-z0-9-]{2,48}$/;

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId") ?? "";
  if (!validPlaceId.test(placeId)) return NextResponse.json({ error: "Lugar inválido." }, { status: 400 });

  try {
    const db = getD1();
    const [reviewsResult, summaryResult] = await db.batch([
      db.prepare(
        `SELECT id, author_name, rating, comment, created_at
         FROM reviews
         WHERE place_id = ? AND status = 'published'
         ORDER BY created_at DESC, id DESC
         LIMIT 30`,
      ).bind(placeId),
      db.prepare(
        `SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS average
         FROM reviews
         WHERE place_id = ? AND status = 'published'`,
      ).bind(placeId),
    ]);
    const summary = (summaryResult.results[0] ?? { count: 0, average: null }) as { count: number; average: number | null };
    return NextResponse.json({ reviews: reviewsResult.results as ReviewRow[], summary });
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

    const db = getD1();
    const result = await db.prepare(
      `INSERT INTO reviews (place_id, author_name, rating, comment)
       VALUES (?, ?, ?, ?)`,
    ).bind(placeId, authorName, rating, comment).run();

    return NextResponse.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
  } catch (error) {
    console.error("Unable to save review", error);
    return NextResponse.json({ error: "No pudimos guardar tu opinión. Intenta nuevamente." }, { status: 503 });
  }
}
