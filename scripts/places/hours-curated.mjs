// Fetches opening hours for the hand-curated Santiago list (src/places.ts) with Place Details (New)
// and writes src/data/curated-hours.json, which src/places.ts merges into the static list.
//   node --experimental-strip-types scripts/places/hours-curated.mjs [--dry-run]
// One request per curated place that has a googlePlaceId; places already in the file are skipped.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { args, loadEnv, root, toPeriods } from "./lib.mjs";
import { places } from "../../src/places.ts";

loadEnv();
const dryRun = Boolean(args()["dry-run"]);
const key = process.env.GOOGLE_MAPS_API_KEY;
if (!dryRun && !key) throw new Error("Falta GOOGLE_MAPS_API_KEY en .env.local");

const file = resolve(root, "src/data/curated-hours.json");
const saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
const pending = places.filter((place) => place.googlePlaceId && !(place.id in saved));
if (dryRun) { console.log(`Requests necesarias: ${pending.length}`); process.exit(0); }

for (const place of pending) {
  const response = await fetch(`https://places.googleapis.com/v1/places/${place.googlePlaceId}?languageCode=es`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "regularOpeningHours.weekdayDescriptions,regularOpeningHours.periods" },
  });
  if (!response.ok) { console.log(`${place.id}: Places API ${response.status}`); continue; }
  const { regularOpeningHours } = await response.json();
  const periods = toPeriods(regularOpeningHours);
  // An empty entry records that Google has no hours, so the place is not asked for again.
  saved[place.id] = periods ? { hours: regularOpeningHours.weekdayDescriptions?.join(" · "), periods } : {};
  writeFileSync(file, `${JSON.stringify(saved, null, 1)}\n`);
}
console.log(`${pending.length} consultados · ${Object.values(saved).filter((entry) => entry.periods).length} lugares curados con horario`);
