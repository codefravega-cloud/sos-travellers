// Uploads the hand-curated Santiago list (src/places.ts) and the editorial picks for other destinations
// (scripts/places/curated/<REGION>-<destination>.json) as curated rows, keeping their editorial copy.
//   node --experimental-strip-types scripts/places/seed-curated.mjs
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, root, slugify } from "./lib.mjs";
import { places } from "../../src/places.ts";

loadEnv();
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const rows = places.map((place) => {
  const numeric = /^\d/.test(place.rating);
  return {
    id: place.id, google_place_id: place.googlePlaceId ?? null, name: place.name, category: place.category,
    rating: numeric ? Number(place.rating.replace(",", ".")) : null, rating_label: numeric ? null : place.rating,
    review_count: place.reviews ? Number(place.reviews.replace(/\D/g, "")) : null,
    lat: place.coords[0], lng: place.coords[1], region: "RM", comuna: place.comuna ?? null, specialty: Boolean(place.specialty), locality: place.neighborhood,
    address: place.address ?? null, hours: place.hours ?? null, opening_periods: place.openingPeriods ?? null, visit: place.visit ?? null, website: place.officialUrl ?? null,
    map_query: place.mapQuery ?? null, languages: place.languages ?? null,
    summary: place.summary ?? null, tag: place.tag ?? null, access: place.access ?? null, photo: place.photo ?? null,
    curated: true, source: "curated",
  };
});
const { error } = await supabase.from("places").upsert(rows, { onConflict: "id" });
if (error) throw error;
console.log(`${rows.length} lugares curados cargados en la Región Metropolitana.`);

// Picks outside Santiago are keyed by their OpenStreetMap id: a pick already imported keeps its row (and reviews) and gains the editorial copy.
const dir = resolve(root, "scripts/places/curated");
for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
  const region = file.slice(0, 2); // files are named <REGION>.json or <REGION>-<destination>.json
  const { locality, places: picks } = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
  const { data: existing, error: readError } = await supabase.from("places").select("id, osm_id").in("osm_id", picks.map((pick) => pick.osm_id));
  if (readError) throw readError;
  const known = new Map(existing.map((row) => [row.osm_id, row.id]));
  const picked = picks.map((pick) => ({
    id: known.get(pick.osm_id) ?? `${`${slugify(pick.name)}-${slugify(locality)}`.slice(0, 50).replace(/-+$/, "")}-${region.toLowerCase()}`,
    osm_id: pick.osm_id, name: pick.name, category: pick.category, lat: pick.lat, lng: pick.lng, region, locality,
    address: pick.address ?? locality, visit: pick.visit, summary: pick.summary, tag: pick.tag,
    curated: true, source: "curated", rank: 20, checked_at: new Date().toISOString(),
  }));
  const { error: writeError } = await supabase.from("places").upsert(picked, { onConflict: "id" });
  if (writeError) throw writeError;
  console.log(`${region}: ${picked.length} lugares curados en ${locality}.`);
}
