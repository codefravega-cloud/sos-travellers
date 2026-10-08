// Builds the list of specialty coffee shops in Santiago's urban comunas from two sources and publishes it.
//
//   node scripts/places/specialty.mjs                  # OpenStreetMap only (free)
//   node scripts/places/specialty.mjs --google --dry-run   # count Google requests, spend nothing
//   node scripts/places/specialty.mjs --google         # add Google Places (paid, needs GOOGLE_MAPS_API_KEY)
//   node scripts/places/specialty.mjs --publish        # mark/insert the reviewed list in Supabase
//   flags: --pages=2 (Google result pages per comuna) --min-rating=4.3 --min-reviews=50
//
// "Specialty" is an editorial call no source provides, so every run writes scripts/places/out/specialty-RM.csv
// to review. scripts/places/curated/specialty-RM.json has the last word: `exclude` drops a candidate and
// `include` adds one by hand (both by name; `include` entries may narrow it with a comuna, and one that also
// carries `address`, `lat` and `lng` adds a shop neither source knows).
// Only candidates with confidence "alta" or "media" are published, and only in comunas that reach MIN_PER_COMUNA.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { args, bigCities, cacheDir, chains, ensureDir, loadEnv, localities, outDir, root, slugify, toPeriods } from "./lib.mjs";

const REGION = "RM", REGION_NAME = "Región Metropolitana", MIN_PER_COMUNA = 5;
const OVERPASS = "https://overpass-api.de/api/interpreter";
const FIELDS = ["id", "displayName", "location", "formattedAddress", "rating", "userRatingCount", "primaryType", "types", "regularOpeningHours.weekdayDescriptions", "regularOpeningHours.periods", "websiteUri", "googleMapsUri", "businessStatus"].map((field) => `places.${field}`).join(",") + ",nextPageToken";

loadEnv();
const flags = args();
const dryRun = Boolean(flags["dry-run"]);
const pages = Number(flags.pages ?? 2), minRating = Number(flags["min-rating"] ?? 4.3), minReviews = Number(flags["min-reviews"] ?? 50);
const comunas = localities[REGION].comunas.filter((name) => bigCities.has(name));
const overridesFile = resolve(root, "scripts/places/curated/specialty-RM.json");
const overrides = existsSync(overridesFile) ? JSON.parse(readFileSync(overridesFile, "utf8")) : { include: [], exclude: [] };
const listFile = resolve(outDir, `specialty-${REGION}.json`);

// Words a roaster or third-wave bar puts in its name; a plain "café" or "coffee" says nothing.
const signal = /roaster|tostador|tostadur|tostaduría|specialty|especialidad|coffee ?lab|brew|barista|micro ?lote|de origen/i;
// Coffee chains and bakeries that a "café de especialidad" search still returns.
const coffeeChains = /\b(juan valdez|havanna|tavelli|coppelia|castaño|san camilo|bonafide|cory|mokka|café caribe|cafe caribe|café haití|cafe haiti|nespresso|krispy|cinnabon|le fournil|pastelería|pasteleria|panadería|panaderia|heladería|heladeria)\b/i;
// Generic words ignored when deciding whether two listings are the same shop.
const filler = new Set(["cafe", "cafeteria", "coffee", "roasters", "roaster", "specialty", "especialidad", "tostadores", "tostaduria", "shop", "bar", "the", "and", "santiago", "chile", ...comunas.map((name) => slugify(name))]);
const tokens = (name) => slugify(name).split("-").filter((word) => word.length > 2 && !filler.has(word));
const meters = (a, b) => Math.hypot((a.lat - b.lat) * 111000, (a.lng - b.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180));
function sameShop(a, b, radius = 120) {
  if (meters(a, b) > radius) return false;
  const left = tokens(a.name), right = new Set(tokens(b.name));
  return left.length && right.size ? left.some((word) => right.has(word)) : slugify(a.name) === slugify(b.name);
}

ensureDir(cacheDir); ensureDir(outDir);

// ---- OpenStreetMap: every named café and roaster, placed in the comuna whose boundary contains it.
async function overpass(body) {
  const file = resolve(cacheDir, `osm-${createHash("sha1").update(body).digest("hex")}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(OVERPASS, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "sos-travellers-import/1.0" }, body: `data=${encodeURIComponent(body)}` });
    if (response.ok) {
      const data = await response.json();
      // A timed-out query still answers 200 with partial data: never cache or use it.
      if (data.remark) throw new Error(`Overpass: ${data.remark}`);
      writeFileSync(file, JSON.stringify(data)); return data;
    }
    if (attempt === 4 || ![429, 504].includes(response.status)) throw new Error(`Overpass ${response.status}: ${(await response.text()).slice(0, 200)}`);
    await new Promise((done) => setTimeout(done, attempt * 30000));
  }
}

// Even-odd ray casting over a boundary's segments, so the ways need not be joined into rings.
function inside(lat, lng, segments) {
  let crossings = 0;
  for (const [a, b] of segments) if ((a.lat > lat) !== (b.lat > lat) && lng < a.lon + ((lat - a.lat) / (b.lat - a.lat)) * (b.lon - a.lon)) crossings++;
  return crossings % 2 === 1;
}

async function fromOsm() {
  const area = `[out:json][timeout:240];area["ISO3166-2"="CL-${REGION}"]->.a;`;
  const shops = await overpass(`${area}(nwr["amenity"="cafe"]["name"](area.a);nwr["craft"~"roaster"]["name"](area.a);nwr["shop"="coffee"]["name"](area.a););out center tags;`);
  const borders = await overpass(`${area}rel(area.a)["boundary"="administrative"]["admin_level"="8"];out geom;`);
  const known = new Map(comunas.map((name) => [slugify(name), name]));
  const zones = borders.elements.filter((relation) => known.has(slugify(relation.tags?.name ?? ""))).map((relation) => ({
    name: known.get(slugify(relation.tags.name)), ...relation.bounds,
    segments: relation.members.filter((member) => member.type === "way" && member.geometry).flatMap((way) => way.geometry.slice(1).map((point, index) => [way.geometry[index], point])),
  }));
  const places = [];
  for (const element of shops.elements) {
    const { tags } = element, lat = element.lat ?? element.center?.lat, lng = element.lon ?? element.center?.lon;
    if (lat == null || tags.disused || tags.abandoned || tags.access === "private") continue;
    const comuna = zones.find((zone) => lat >= zone.minlat && lat <= zone.maxlat && lng >= zone.minlon && lng <= zone.maxlon && inside(lat, lng, zone.segments))?.name;
    if (!comuna) continue;
    const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
    const url = tags.website ?? tags["contact:website"];
    places.push({
      osm_id: `${element.type}/${element.id}`, name: tags.name, lat, lng, comuna,
      address: [street, comuna].filter(Boolean).join(", "), hours: tags.opening_hours ?? null,
      website: url ? (/^https?:\/\//.test(url) ? url : `https://${url}`) : null,
      roaster: /roaster/.test(tags.craft ?? "") || signal.test(tags.description ?? ""),
      coffeeShop: /coffee_shop/.test(tags.cuisine ?? ""),
    });
  }
  return places;
}

// ---- Google Places: one Text Search per comuna (plus following pages), cached on disk like fetch.mjs.
let requests = 0, cached = 0;
async function textSearch(body) {
  const file = resolve(cacheDir, `${createHash("sha1").update(JSON.stringify(body) + FIELDS).digest("hex")}.json`);
  if (existsSync(file)) { cached++; return JSON.parse(readFileSync(file, "utf8")); }
  requests++;
  if (dryRun) return { places: [] };
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": FIELDS },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Places API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  writeFileSync(file, JSON.stringify(data));
  return data;
}

// "Merced 295A, 8320113 Santiago, Región Metropolitana, Chile" → Santiago. Results often spill into the comuna next door.
function comunaOf(address, searched) {
  const part = (address ?? "").split(",").map((item) => item.trim()).at(-3)?.replace(/^\d{7}\s*/, "") ?? "";
  return comunas.find((name) => slugify(name) === slugify(part)) ?? searched;
}

async function fromGoogle() {
  if (!dryRun && !process.env.GOOGLE_MAPS_API_KEY) throw new Error("Falta GOOGLE_MAPS_API_KEY en .env.local");
  const found = new Map();
  for (const comuna of comunas) {
    const body = { textQuery: `café de especialidad en ${comuna}, ${REGION_NAME}, Chile`, languageCode: "es", regionCode: "CL", pageSize: 20, minRating };
    let pageToken;
    for (let page = 0; page < pages; page++) {
      const data = await textSearch(pageToken ? { ...body, pageToken } : body);
      for (const place of data.places ?? []) {
        const name = place.displayName?.text ?? "";
        if (found.has(place.id) || (place.businessStatus && place.businessStatus !== "OPERATIONAL")) continue;
        if (!(place.userRatingCount >= minReviews) || !/Chile\s*$/.test(place.formattedAddress ?? "")) continue;
        if (!(place.types ?? []).some((type) => ["cafe", "coffee_shop", "coffee_roastery"].includes(type))) continue;
        found.set(place.id, {
          google_place_id: place.id, name, lat: place.location.latitude, lng: place.location.longitude,
          comuna: comunaOf(place.formattedAddress, comuna), address: place.formattedAddress,
          rating: place.rating, review_count: place.userRatingCount, primaryType: place.primaryType ?? "",
          hours: place.regularOpeningHours?.weekdayDescriptions?.join(" · ") ?? null, opening_periods: toPeriods(place.regularOpeningHours),
          website: place.websiteUri ?? null, google_maps_url: place.googleMapsUri ?? null,
        });
      }
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  }
  return [...found.values()];
}

// ---- Merge: a shop found in both sources is one candidate; confidence says how sure we are it is specialty coffee.
function merge(osm, google) {
  const candidates = google.map((place) => ({ ...place, sources: ["google"] }));
  for (const place of osm) {
    const twin = candidates.find((item) => sameShop(item, place));
    if (twin) {
      if (!twin.osm_id) { twin.osm_id = place.osm_id; twin.sources.push("osm"); }
      twin.roaster ||= place.roaster; twin.coffeeShop ||= place.coffeeShop;
    } else candidates.push({ ...place, sources: ["osm"] });
  }
  const excluded = new Set((overrides.exclude ?? []).map(slugify));
  const wanted = (overrides.include ?? []).map((item) => (typeof item === "string" ? { name: item } : item));
  const isWanted = (place) => wanted.some((item) => slugify(item.name) === slugify(place.name) && (!item.comuna || item.comuna === place.comuna) && (item.lat == null || meters(place, item) <= 120));
  // A hand-added shop with its own coordinates joins the list unless a source already has it there.
  for (const item of wanted) {
    if (item.lat == null || !item.comuna) continue;
    const twin = candidates.find((place) => sameShop(place, item));
    if (twin) item.name = twin.name;
    else candidates.push({ name: item.name, lat: item.lat, lng: item.lng, comuna: item.comuna, address: item.address ?? item.comuna, website: item.website ?? null, sources: ["manual"] });
  }
  return candidates.map((place) => {
    const named = signal.test(place.name) || place.roaster, inGoogle = place.sources.includes("google");
    let confidence = "baja", reason = "solo figura como cafetería";
    if (isWanted(place)) { confidence = "alta"; reason = "agregada a mano"; }
    else if (excluded.has(slugify(place.name))) { confidence = "excluida"; reason = "descartada a mano"; }
    else if (chains.test(place.name) || coffeeChains.test(place.name)) { confidence = "excluida"; reason = "cadena o pastelería"; }
    else if (named) { confidence = "alta"; reason = "tostador o café de especialidad declarado"; }
    else if (inGoogle && place.coffeeShop) { confidence = "alta"; reason = "en ambas fuentes como cafetería de café"; }
    else if (inGoogle && place.rating >= 4.5) { confidence = "media"; reason = "resultado de Google para café de especialidad, nota 4,5 o más"; }
    else if (inGoogle) reason = "resultado de Google con nota bajo 4,5";
    return { ...place, confidence, reason };
  }).filter((place) => place.confidence !== "baja" || !place.sources.includes("osm") || place.sources.includes("google") || place.coffeeShop);
}

function report(list) {
  const order = { alta: 0, media: 1, baja: 2, excluida: 3 };
  const sorted = [...list].sort((a, b) => order[a.confidence] - order[b.confidence] || a.comuna.localeCompare(b.comuna, "es") || a.name.localeCompare(b.name, "es"));
  const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [["confianza", "comuna", "nombre", "motivo", "nota", "opiniones", "fuentes", "direccion", "sitio_web", "google_maps"].join(",")];
  for (const place of sorted) rows.push([place.confidence, place.comuna, place.name, place.reason, place.rating, place.review_count, place.sources.join("+"), place.address, place.website, place.google_maps_url].map(cell).join(","));
  writeFileSync(resolve(outDir, `specialty-${REGION}.csv`), rows.join("\n"));
  writeFileSync(listFile, JSON.stringify(sorted, null, 1));
  const count = (level) => list.filter((place) => place.confidence === level).length;
  const publishable = list.filter((place) => ["alta", "media"].includes(place.confidence));
  console.log(`${list.length} candidatas: ${count("alta")} alta, ${count("media")} media, ${count("baja")} baja, ${count("excluida")} excluidas`);
  const perComuna = Object.entries(Object.groupBy(publishable, (place) => place.comuna)).sort((a, b) => b[1].length - a[1].length);
  console.log(`Publicables por comuna (mínimo ${MIN_PER_COMUNA}): ${perComuna.map(([name, shops]) => `${name} ${shops.length}${shops.length < MIN_PER_COMUNA ? " ✗" : ""}`).join(", ")}`);
  console.log(`Revisa scripts/places/out/specialty-${REGION}.csv`);
}

const manualSummary = (comuna) => ({
  es: `Cafetería de especialidad en ${comuna}, recomendada por medios locales. Confirma el horario antes de ir.`,
  en: `Specialty coffee shop in ${comuna}, recommended by local media. Check opening hours before you go.`,
  pt: `Cafeteria de café especial em ${comuna}, recomendada pela imprensa local. Confirme o horário antes de ir.`,
  fr: `Café de spécialité à ${comuna}, recommandé par la presse locale. Vérifiez les horaires avant d'y aller.`,
});

// ---- Publish: a shop already on the site only gains the flag and its comuna (its id, reviews and editorial copy stay).
async function publish() {
  if (!existsSync(listFile)) throw new Error("Primero genera la lista (sin --publish).");
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local");
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  // --comuna=Maipú publishes one comuna and leaves the rest as they are; a comuna short of the minimum is never published.
  const only = flags.comuna ? comunas.find((name) => slugify(name) === slugify(String(flags.comuna))) : null;
  if (flags.comuna && !only) throw new Error(`Comuna desconocida: ${flags.comuna}`);
  const scope = only ? [only] : comunas;
  const ready = JSON.parse(readFileSync(listFile, "utf8")).filter((place) => ["alta", "media"].includes(place.confidence) && scope.includes(place.comuna));
  const byComuna = Object.groupBy(ready, (place) => place.comuna);
  const list = ready.filter((place) => byComuna[place.comuna].length >= MIN_PER_COMUNA);
  for (const [name, shops] of Object.entries(byComuna)) console.log(`${name}: ${shops.length}${shops.length < MIN_PER_COMUNA ? ` (bajo el mínimo de ${MIN_PER_COMUNA}, no se publica)` : ""}`);
  const { data: existing, error } = await supabase.from("places").select("id, name, lat, lng, comuna, google_place_id, osm_id, specialty, curated").eq("region", REGION).range(0, 4999);
  if (error) throw error;

  const used = new Set(existing.map((row) => row.id)), keep = new Set(), updates = [], inserts = [];
  for (const place of list) {
    // The same shop can be on the site twice (a curated row and its OpenStreetMap import): the curated one gets the flag.
    const twins = existing.filter((item) => (place.google_place_id && item.google_place_id === place.google_place_id) || (place.osm_id && item.osm_id === place.osm_id) || sameShop(item, place, 80));
    const row = twins.find((item) => item.curated) ?? twins[0];
    // Imported rows were filed under the nearest village; the comuna is the right label for them.
    if (row) { keep.add(row.id); updates.push({ id: row.id, patch: { specialty: true, comuna: place.comuna, ...(row.curated ? {} : { locality: place.comuna }) } }); continue; }
    let id = `${`${slugify(place.name)}-${slugify(place.comuna)}`.slice(0, 50).replace(/-+$/, "")}-rm`;
    if (used.has(id)) id = `${id.slice(0, 44)}-${(place.google_place_id ?? place.osm_id ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-9)}`;
    if (used.has(id) || !/^[a-z0-9-]{2,64}$/.test(id)) continue;
    used.add(id);
    const rated = place.google_place_id != null, manual = !rated && !place.osm_id;
    inserts.push({
      id, name: place.name, category: "coffee", specialty: true, region: REGION, comuna: place.comuna, locality: place.comuna,
      lat: place.lat, lng: place.lng, address: place.address, hours: place.hours ?? null, opening_periods: place.opening_periods ?? null,
      website: place.website ?? null, google_maps_url: place.google_maps_url ?? null,
      // Google's listing carries the rating; an OpenStreetMap-only shop is published unrated, like the rest of that source.
      // A shop added by hand is an editorial pick, so it carries its own copy instead of the imported-place note.
      source: rated ? "google" : manual ? "curated" : "osm", google_place_id: place.google_place_id ?? null, osm_id: rated || manual ? null : place.osm_id,
      rating: place.rating ?? null, review_count: place.review_count ?? null, rank: 3, curated: manual, summary: manual ? manualSummary(place.comuna) : null, checked_at: new Date().toISOString(),
    });
  }
  // Curated rows get their flag from src/places.ts (places:seed), so a list that misses them does not clear it.
  const dropped = existing.filter((row) => row.specialty && !row.curated && !keep.has(row.id) && scope.includes(row.comuna)).map((row) => row.id);
  if (dryRun) console.log(`Marcar: ${updates.map((item) => item.id).join(", ")}\nAgregar: ${inserts.map((item) => item.id).join(", ")}`);
  if (dryRun) { console.log(`Se marcarían ${updates.length} locales ya publicados, se agregarían ${inserts.length} y ${dropped.length} perderían la marca.`); return; }

  for (const { id, patch } of updates) { const result = await supabase.from("places").update(patch).eq("id", id); if (result.error) throw result.error; }
  if (inserts.length) { const result = await supabase.from("places").insert(inserts); if (result.error) throw result.error; }
  if (dropped.length) { const result = await supabase.from("places").update({ specialty: false }).in("id", dropped); if (result.error) throw result.error; }
  console.log(`Especialidad: ${updates.length} marcados, ${inserts.length} agregados, ${dropped.length} sin marca.`);
}

if (flags.publish) await publish();
else {
  const google = flags.google ? await fromGoogle() : [];
  if (flags.google) console.log(`Google: ${dryRun ? "requests necesarias" : "requests hechas"} ${requests} · desde caché ${cached} · ${google.length} locales`);
  if (!(flags.google && dryRun)) {
    const osm = await fromOsm();
    console.log(`OpenStreetMap: ${osm.length} cafeterías y tostadores en ${comunas.length} comunas`);
    report(merge(osm, google));
  }
}
