// Loads scripts/places/out/<REGION>.json into the Supabase `places` table.
// Re-runnable: rows are matched by google_place_id and their rating is refreshed.
//   node scripts/places/upsert.mjs [--region=LL] [--source=osm]
// --source=osm loads the OpenStreetMap files (out/osm-<REGION>.json), matched by osm_id.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { args, loadEnv, outDir, selectedRegions } from "./lib.mjs";

loadEnv();
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const flags = args();
const osm = flags.source === "osm";
const key = osm ? "osm_id" : "google_place_id";

for (const region of selectedRegions(flags)) {
  const file = resolve(outDir, `${osm ? "osm-" : ""}${region}.json`);
  if (!existsSync(file)) { console.log(`${region}: sin datos`); continue; }
  const places = JSON.parse(readFileSync(file, "utf8"));

  // Keep the id of rows already published so their reviews stay attached, and never overwrite curated entries.
  const { data: existing, error: readError } = await supabase.from("places").select(`id, ${key}, curated`).eq("region", region).not(key, "is", null);
  if (readError) throw readError;
  const known = new Map(existing.map((row) => [row[key], row]));
  const rows = places.filter((place) => !known.get(place[key])?.curated)
    .map((place) => ({ ...place, id: known.get(place[key])?.id ?? place.id, curated: false, checked_at: new Date().toISOString() }));

  for (let start = 0; start < rows.length; start += 500) {
    const { error } = await supabase.from("places").upsert(rows.slice(start, start + 500), { onConflict: key });
    if (error) throw error;
  }
  console.log(`${region}: ${rows.length} locales cargados (${places.length - rows.length} curados sin tocar)`);
}
