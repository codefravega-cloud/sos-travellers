import { regionCapitals } from "./_regions.js";
import { getSupabase } from "./_supabase.js";

const DAY = 86400000, WINDOW_DAYS = 14, MAX_EVENTS = 60, MAX_SOURCES = 40;
// Mirrors the check constraints in supabase/migrations/202610030001_create_events.sql.
const categories = new Set(["concert", "circus", "theatre", "festival", "fair", "sport", "party", "other"]);
const locales = ["es", "en", "pt", "fr"];

type Json = Record<string, unknown>;
type EventRow = { title: string; venue: string; category: string; region: string; url: string; summary: Record<string, string> | null; starts_at: string; ends_at: string | null; price_label: string | null; featured: false; status: "draft"; source: string; source_url: string };
export type IntakeResult = { created: number; duplicates: number; rejected: { title: string; reason: string }[] };

const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const isHttps = (value: string) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
const keyOf = (region: string, title: string, startsAt: string) => `${region}|${title.toLowerCase()}|${new Date(startsAt).getTime()}`;

function toRow(event: Json, now: number): { row: EventRow } | { error: string } {
  const title = text(event.title, 140), venue = text(event.venue, 120), url = text(event.url, 500);
  const region = text(event.region || "RM", 2).toUpperCase(), category = text(event.category, 20);
  const starts = new Date(String(event.startsAt ?? "")), ends = event.endsAt ? new Date(String(event.endsAt)) : null;
  if (title.length < 2) return { error: "título vacío" };
  if (venue.length < 2) return { error: "recinto vacío" };
  if (!categories.has(category)) return { error: `categoría inválida: ${category}` };
  if (!(region in regionCapitals)) return { error: `región inválida: ${region}` };
  if (!isHttps(url)) return { error: "falta la URL oficial (https)" };
  if (Number.isNaN(starts.getTime())) return { error: "fecha de inicio inválida" };
  if (starts.getTime() < now - DAY || starts.getTime() > now + WINDOW_DAYS * DAY) return { error: "fuera de los próximos días" };
  if (ends && (Number.isNaN(ends.getTime()) || ends < starts)) return { error: "fecha de término inválida" };
  const given = (event.summary ?? {}) as Json;
  const summary = locales.every((locale) => text(given[locale], 280)) ? Object.fromEntries(locales.map((locale) => [locale, text(given[locale], 280)])) : null;
  return { row: {
    title, venue, category, region, url, summary,
    starts_at: starts.toISOString(), ends_at: ends?.toISOString() ?? null,
    price_label: text(event.priceLabel, 60) || null,
    featured: false, status: "draft", source: "agent:events", source_url: url,
  } };
}

// The only way an agent writes events: every row is validated, de-duplicated and stored as a draft, and the run
// is recorded in agent_runs (also when it fails). Nothing here publishes; a person does that in /equipo.
// Input: { summary, startedAt?, sources: [{ name, url, ok, note? }], events: [{ title, venue, category, region?,
//   startsAt, endsAt?, priceLabel?, url, summary?: { es, en, pt, fr } }] }
export async function intakeEvents(input: Json, dryRun: boolean): Promise<IntakeResult> {
  const supabase = getSupabase(), now = Date.now();
  const record = async (run: Json) => {
    if (dryRun) return;
    const { error } = await supabase.from("agent_runs").insert({ agent: "events", section: "contenido", ...run });
    if (error) throw error;
  };

  try {
    const sources = (Array.isArray(input.sources) ? (input.sources as Json[]) : []).slice(0, MAX_SOURCES)
      .map((source) => ({ name: text(source.name, 80), url: text(source.url, 300), ok: Boolean(source.ok), note: text(source.note, 200) || undefined }));
    const rows: EventRow[] = [], rejected: IntakeResult["rejected"] = [], seen = new Set<string>();
    for (const event of (Array.isArray(input.events) ? (input.events as Json[]) : []).slice(0, MAX_EVENTS)) {
      const result = toRow(event ?? {}, now);
      if ("error" in result) { rejected.push({ title: text(event?.title, 140), reason: result.error }); continue; }
      const key = keyOf(result.row.region, result.row.title, result.row.starts_at);
      if (seen.has(key)) { rejected.push({ title: result.row.title, reason: "repetido en el archivo" }); continue; }
      seen.add(key);
      rows.push(result.row);
    }

    // Skip events already in the table, whatever their status, so a discarded one is not proposed again.
    const { data: existing, error: readError } = await supabase.from("events").select("region, title, starts_at").gte("starts_at", new Date(now - 2 * DAY).toISOString());
    if (readError) throw readError;
    const known = new Set(existing.map((row) => keyOf(row.region, row.title, row.starts_at)));
    const fresh = rows.filter((row) => !known.has(keyOf(row.region, row.title, row.starts_at)));
    const duplicates = rows.length - fresh.length;

    if (fresh.length && !dryRun) {
      const { error } = await supabase.from("events").insert(fresh);
      if (error) throw error;
    }
    const startedAt = Date.parse(String(input.startedAt ?? ""));
    await record({
      status: "ok",
      started_at: new Date(Number.isNaN(startedAt) ? now : startedAt).toISOString(),
      finished_at: new Date().toISOString(),
      summary: text(input.summary, 600) || null,
      created_count: fresh.length,
      skipped_count: duplicates + rejected.length,
      details: { sources, rejected, duplicates },
    });
    return { created: fresh.length, duplicates, rejected };
  } catch (error) {
    await record({ status: "error", finished_at: new Date().toISOString(), summary: text(`No se pudo cargar: ${error instanceof Error ? error.message : "error desconocido"}`, 600), details: {} }).catch(() => {});
    throw error;
  }
}
