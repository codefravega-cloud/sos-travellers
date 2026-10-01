// Finds tourist-facing places across Chile with Google Places API (New) Text Search
// and writes the ones that meet the quality bar to scripts/places/out/<REGION>.json.
//
//   node scripts/places/fetch.mjs --dry-run                 # count requests, spend nothing
//   node scripts/places/fetch.mjs --region=LL               # one region (pilot)
//   node scripts/places/fetch.mjs --max-requests=500        # hard cap per run
//   flags: --min-rating=4.0 --min-reviews-city=150 --min-reviews-town=20 --per-search=8 --categories=food,stay
//
// Responses are cached on disk, so re-running never pays twice for the same query.
// Google's terms limit how long Places content may be stored: keep google_place_id,
// show attribution and re-run this script periodically to refresh ratings.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { args, bigCities, cacheDir, categoryFor, defaults, ensureDir, loadEnv, localities, outDir, qualifies, score, searches, selectedRegions, slugify, toPeriods } from "./lib.mjs";

const regionNames = { AP: "Arica y Parinacota", TA: "Tarapacá", AN: "Antofagasta", AT: "Atacama", CO: "Coquimbo", VS: "Valparaíso", RM: "Región Metropolitana", LI: "O'Higgins", ML: "Maule", NB: "Ñuble", BI: "Biobío", AR: "La Araucanía", LR: "Los Ríos", LL: "Los Lagos", AI: "Aysén", MA: "Magallanes" };
const FIELDS = ["id", "displayName", "location", "formattedAddress", "rating", "userRatingCount", "primaryType", "types", "regularOpeningHours.weekdayDescriptions", "regularOpeningHours.periods", "websiteUri", "googleMapsUri", "businessStatus"].map((field) => `places.${field}`).join(",");

loadEnv();
const flags = args();
const options = {
  minRating: Number(flags["min-rating"] ?? defaults.minRating),
  minReviewsCity: Number(flags["min-reviews-city"] ?? defaults.minReviewsCity),
  minReviewsTown: Number(flags["min-reviews-town"] ?? defaults.minReviewsTown),
  perSearch: Number(flags["per-search"] ?? defaults.perSearch),
};
if (options.minRating < 4) throw new Error("La nota mínima no puede ser menor que 4.0.");
const dryRun = Boolean(flags["dry-run"]);
const maxRequests = Number(flags["max-requests"] ?? Infinity);
const onlyCategories = flags.categories ? String(flags.categories).split(",") : null;
const key = process.env.GOOGLE_MAPS_API_KEY;
if (!dryRun && !key) throw new Error("Falta GOOGLE_MAPS_API_KEY en .env.local");

ensureDir(cacheDir); ensureDir(outDir);
let requests = 0, cached = 0, stopped = false;

// The field mask is part of the cache key: asking for new fields must not reuse older, poorer responses.
async function textSearch(body) {
  const file = resolve(cacheDir, `${createHash("sha1").update(JSON.stringify(body) + FIELDS).digest("hex")}.json`);
  if (existsSync(file)) { cached++; return JSON.parse(readFileSync(file, "utf8")); }
  if (dryRun) { requests++; return { places: [] }; }
  if (requests >= maxRequests) { stopped = true; return null; }
  requests++;
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELDS },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Places API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  writeFileSync(file, JSON.stringify(data));
  return data;
}

for (const region of selectedRegions(flags)) {
  const found = new Map();
  const names = [...localities[region].comunas.map((name) => ({ name, comuna: name })), ...localities[region].towns.map((name) => ({ name, comuna: null }))];
  for (const { name, comuna } of names) {
    const big = bigCities.has(name);
    for (const search of searches) {
      if (stopped) break;
      if (onlyCategories && !onlyCategories.includes(search.category)) continue;
      if (search.regions && !search.regions.includes(region)) continue;
      if (search.bigOnly && !big) continue;
      const data = await textSearch({
        textQuery: `${search.query} en ${name}, ${regionNames[region]}, Chile`,
        languageCode: "es", regionCode: "CL", pageSize: 20, minRating: options.minRating,
        ...(search.type ? { includedType: search.type } : {}),
      });
      if (!data) break;
      const good = (data.places ?? []).filter((place) => qualifies(place, { big, ...options })).sort((a, b) => score(b) - score(a)).slice(0, options.perSearch);
      for (const place of good) {
        if (found.has(place.id)) continue;
        found.set(place.id, {
          google_place_id: place.id,
          name: place.displayName.text,
          category: categoryFor(place, search.category),
          rating: place.rating,
          review_count: place.userRatingCount,
          lat: place.location.latitude,
          lng: place.location.longitude,
          region, comuna, locality: name,
          address: place.formattedAddress,
          hours: place.regularOpeningHours?.weekdayDescriptions?.join(" · ") ?? null,
          opening_periods: toPeriods(place.regularOpeningHours),
          website: place.websiteUri ?? null,
          google_maps_url: place.googleMapsUri ?? null,
        });
      }
    }
    if (stopped) break;
  }

  // Stable, URL-safe ids that satisfy the reviews API (/^[a-z0-9-]{2,64}$/).
  const used = new Set();
  const places = [...found.values()].map((place) => {
    let id = `${slugify(place.name)}-${slugify(place.locality)}`.slice(0, 56).replace(/-+$/, "");
    if (id.length < 2 || used.has(id)) id = `${id.slice(0, 48)}-${slugify(place.google_place_id).slice(-7)}`;
    used.add(id);
    return { id, ...place };
  });
  if (!dryRun) writeFileSync(resolve(outDir, `${region}.json`), JSON.stringify(places, null, 1));
  console.log(`${region}: ${places.length} locales${stopped ? " (incompleto: tope de requests)" : ""}`);
  if (stopped) break;
}
console.log(`${dryRun ? "Requests necesarias" : "Requests hechas"}: ${requests} · desde caché: ${cached}`);
