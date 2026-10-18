import { rejectUnlessTeam } from "./_admin.js";
import { getSupabase } from "./_supabase.js";

const DAY = 86400000;
const noStore = { "Cache-Control": "no-store" };
// action → [status the event must have, status it moves to]
const moves: Record<string, [string, string]> = {
  publish: ["draft", "published"],
  discard: ["draft", "hidden"],
  unpublish: ["published", "draft"],
  restore: ["hidden", "draft"],
};

// Feeds the team panel at /equipo: what each agent did and the events a person approves, by status.
export async function GET(request: Request) {
  const rejected = await rejectUnlessTeam(request);
  if (rejected) return rejected;

  try {
    const supabase = getSupabase();
    const [runs, events] = await Promise.all([
      supabase.from("agent_runs")
        .select("id, agent, section, status, started_at, finished_at, summary, created_count, skipped_count, details")
        .order("finished_at", { ascending: false }).limit(40),
      supabase.from("events")
        .select("id, title, venue, category, region, starts_at, price_label, url, summary, status")
        .or(`status.eq.draft,starts_at.gte.${new Date(Date.now() - DAY).toISOString()}`)
        .order("starts_at").limit(200),
    ]);
    if (runs.error) throw runs.error;
    if (events.error) throw events.error;
    return Response.json({
      runs: runs.data.map((row) => ({
        id: row.id, agent: row.agent, section: row.section, status: row.status,
        startedAt: row.started_at, finishedAt: row.finished_at, summary: row.summary ?? undefined,
        created: row.created_count, skipped: row.skipped_count, details: row.details ?? {},
      })),
      events: events.data.map((row) => ({
        id: row.id, title: row.title, venue: row.venue, category: row.category, region: row.region,
        startsAt: row.starts_at, priceLabel: row.price_label ?? undefined, url: row.url ?? undefined,
        summary: row.summary?.es ?? undefined, status: row.status,
      })),
    }, { headers: noStore });
  } catch (error) {
    console.error("Unable to load team panel", error);
    return Response.json({ error: "El panel no está disponible por ahora." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  const rejected = await rejectUnlessTeam(request);
  if (rejected) return rejected;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const move = moves[String(body.action ?? "")];
    const eventId = Number(body.eventId);
    if (!move) return Response.json({ error: "Acción inválida." }, { status: 400 });
    if (!Number.isSafeInteger(eventId) || eventId < 1) return Response.json({ error: "Evento inválido." }, { status: 400 });

    // The current status is part of the condition, so two people deciding at once cannot overwrite each other.
    const { data, error } = await getSupabase().from("events").update({ status: move[1] }).eq("id", eventId).eq("status", move[0]).select("id");
    if (error) throw error;
    if (!data.length) return Response.json({ error: "Ese evento ya cambió de estado." }, { status: 409, headers: noStore });
    return Response.json({ ok: true, status: move[1] }, { headers: noStore });
  } catch (error) {
    console.error("Unable to update event status", error);
    return Response.json({ error: "No pudimos guardar el cambio. Intenta nuevamente." }, { status: 503, headers: noStore });
  }
}
