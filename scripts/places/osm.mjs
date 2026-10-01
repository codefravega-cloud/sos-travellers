// Finds tourist-facing places across Chile in OpenStreetMap (free, via the Overpass API)
// and writes them to scripts/places/out/osm-<REGION>.json.
//
//   node scripts/places/osm.mjs --dry-run              # count requests
//   node scripts/places/osm.mjs --region=LL            # one region (pilot)
//   flags: --per-locality=12   (places kept per locality in the priority categories; half of it in the rest)
//
// OpenStreetMap has no ratings, so quality is judged by how complete a listing is.
// One request per region, cached on disk. Data is © OpenStreetMap contributors (ODbL): keep the attribution on the site.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import OpeningHours from "opening_hours";
import { args, bigCities, cacheDir, chains, ensureDir, localities, outDir, selectedRegions, slugify } from "./lib.mjs";

const ENDPOINT = "https://overpass-api.de/api/interpreter";
const flags = args();
const dryRun = Boolean(flags["dry-run"]);
const perLocality = Number(flags["per-locality"] ?? 12);

// What a visitor looks for first: nature, viewpoints, places to eat and going out. `rank` orders the site's lists.
const priority = { park: 4, view: 4, food: 3, nightlife: 3, museum: 2, winery: 2, snow: 2 };

const query = (region) => `[out:json][timeout:240];
area["ISO3166-2"="CL-${region}"]->.a;
(
  nwr["amenity"~"^(restaurant|cafe|bar|pub|nightclub|marketplace)$"]["name"](area.a);
  nwr["tourism"~"^(hotel|hostel|guest_house|chalet|camp_site|museum|gallery|attraction|viewpoint|wine_cellar)$"]["name"](area.a);
  nwr["leisure"~"^(nature_reserve|park)$"]["name"](area.a);
  nwr["boundary"="national_park"]["name"](area.a);
  nwr["craft"="winery"]["name"](area.a);
  nwr["landuse"="winter_sports"]["name"](area.a);
  node["place"~"^(city|town|village)$"]["name"](area.a);
);
out center tags;`;

function categoryFor(tags) {
  if (tags.boundary === "national_park" || tags.leisure) return "park";
  if (tags.landuse === "winter_sports") return "snow";
  if (tags.craft === "winery" || tags.tourism === "wine_cellar") return "winery";
  if (["museum", "gallery"].includes(tags.tourism)) return "museum";
  if (["attraction", "viewpoint"].includes(tags.tourism)) return "view";
  if (tags.tourism) return "stay";
  return { restaurant: "food", cafe: "coffee", marketplace: "market" }[tags.amenity] ?? "nightlife";
}

// Without ratings, a listing someone bothered to fill in is the best sign of a place worth visiting.
const notable = (tags) => Boolean(tags.wikidata || tags.wikipedia);
function score(tags) {
  return (notable(tags) ? 3 : 0) + (tags.opening_hours ? 2 : 0) + (tags.website || tags["contact:website"] ? 2 : 0)
    + (tags.phone || tags["contact:phone"] ? 1 : 0) + (tags.cuisine ? 1 : 0) + (tags.stars ? 1 : 0) + (tags["addr:street"] ? 1 : 0)
    // Signs of a place visitors come for: protected nature, a tourist attraction, local cooking, a long history, a real club.
    + (tags.boundary === "national_park" || tags.leisure === "nature_reserve" ? 3 : 0) + (tags.tourism === "attraction" ? 1 : 0)
    + (/chilean|regional|seafood|fish|local/.test(tags.cuisine ?? "") ? 2 : 0) + (tags.start_date || tags.heritage ? 2 : 0) + (tags.amenity === "nightclub" ? 2 : 0);
}

// A reference week with no Chilean public holiday, so the periods reflect a regular week.
const weekStart = new Date(2026, 10, 8), weekEnd = new Date(2026, 10, 15);
function toPeriods(value) {
  if (!value) return null;
  try {
    const periods = new OpeningHours(value).getOpenIntervals(weekStart, weekEnd)
      .filter(([, , unknown]) => !unknown)
      .map(([from, to]) => [Math.round((from - weekStart) / 60000), Math.round((to - weekStart) / 60000)]);
    if (!periods.length) return null;
    // A night that runs past Saturday midnight comes back split in two: join it into one wrapping period.
    const first = periods[0], last = periods.at(-1);
    if (periods.length > 1 && first[0] === 0 && last[1] === 10080) { last[1] += first[1]; periods.shift(); }
    return periods;
  } catch { return null; } // holiday-dependent or malformed rules: keep only the text
}

const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180));
const website = (tags) => { const url = tags.website ?? tags["contact:website"]; return url ? (/^https?:\/\//.test(url) ? url : `https://${url}`) : null; };

async function overpass(body) {
  const file = resolve(cacheDir, `osm-${createHash("sha1").update(body).digest("hex")}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  if (dryRun) return null;
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "sos-travellers-import/1.0" }, body: `data=${encodeURIComponent(body)}` });
    if (response.ok) { const data = await response.json(); writeFileSync(file, JSON.stringify(data)); return data; }
    // The public server answers 429/504 when busy; wait and try again a few times.
    if (attempt === 4 || ![429, 504].includes(response.status)) throw new Error(`Overpass ${response.status}: ${(await response.text()).slice(0, 200)}`);
    await new Promise((done) => setTimeout(done, attempt * 30000));
  }
}

ensureDir(cacheDir); ensureDir(outDir);
let requests = 0;
for (const region of selectedRegions(flags)) {
  const data = await overpass(query(region));
  if (!data) { requests++; console.log(`${region}: sin caché`); continue; }

  const points = data.elements.map((element) => ({ ...element, lat: element.lat ?? element.center?.lat, lon: element.lon ?? element.center?.lon })).filter((element) => element.lat != null && element.tags?.name);
  const isTown = ({ type, tags }) => type === "node" && tags.place && !tags.amenity && !tags.tourism;
  const towns = points.filter(isTown);
  if (!towns.length) { console.log(`${region}: sin localidades, se omite`); continue; }
  const comunas = new Set(localities[region].comunas);

  const groups = new Map(), seen = new Map();
  for (const element of points) {
    const { tags } = element;
    if (isTown(element) || chains.test(tags.name) || tags.name.length < 2 || tags.name.length > 160) continue;
    if (tags.access === "private" || tags.disused || tags.abandoned) continue;
    const town = towns.reduce((best, item) => (km(element, item) < km(element, best) ? item : best));
    const locality = town.tags.name, category = categoryFor(tags);
    const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    const place = {
      osm_id: `${element.type}/${element.id}`, source: "osm", name: tags.name, category, rating: null, review_count: null,
      lat: element.lat, lng: element.lon, region, comuna: comunas.has(locality) ? locality : null, locality,
      address: [street, tags["addr:city"] ?? locality].filter(Boolean).join(", "),
      rank: score(tags) + (priority[category] ?? 0), hours: tags.opening_hours ?? null, opening_periods: toPeriods(tags.opening_hours), website: website(tags), google_maps_url: null,
    };
    // Museums, protected areas and anything with its own Wikipedia/Wikidata entry always make the list.
    const always = category === "museum" || tags.boundary === "national_park" || tags.leisure === "nature_reserve" || notable(tags);
    const points_ = score(tags);
    if (!always && bigCities.has(locality) && points_ === 0) continue;
    // The same place is often mapped twice (a point and its outline): keep the better listing.
    const twin = `${slugify(tags.name)}|${locality}`, previous = seen.get(twin);
    if (previous && previous.score >= points_) continue;
    if (previous) groups.set(previous.key, groups.get(previous.key).filter((item) => item !== previous));
    const key = `${locality}|${category}`, entry = { place, always, score: points_, key };
    seen.set(twin, entry);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  const used = new Set();
  const places = [...groups.values()].filter((group) => group.length).flatMap((group) => {
    const ranked = group.sort((a, b) => b.score - a.score);
    return [...ranked.filter((item) => item.always), ...ranked.filter((item) => !item.always).slice(0, group[0].place.category in priority ? perLocality : Math.ceil(perLocality / 2))];
  }).map(({ place }) => {
    // Stable ids that satisfy the reviews API (/^[a-z0-9-]{2,64}$/); the region suffix keeps them unique across Chile.
    let id = `${`${slugify(place.name)}-${slugify(place.locality)}`.slice(0, 50).replace(/-+$/, "")}-${region.toLowerCase()}`;
    if (used.has(id)) id = `${id.slice(0, 44)}-${place.osm_id.replace(/\D/g, "").slice(-9)}`;
    used.add(id);
    return { id, ...place };
  }).filter((place) => /^[a-z0-9-]{2,64}$/.test(place.id));

  writeFileSync(resolve(outDir, `osm-${region}.json`), JSON.stringify(places, null, 1));
  console.log(`${region}: ${places.length} locales en ${new Set(places.map((place) => place.locality)).size} localidades · ${places.filter((place) => place.opening_periods).length} con horario`);
}
if (dryRun) console.log(`Requests necesarias: ${requests}`);
