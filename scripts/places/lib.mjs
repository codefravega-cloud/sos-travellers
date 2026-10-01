// Shared helpers for the Google Places import pipeline (see README: "Importar locales").
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const outDir = resolve(root, "scripts/places/out");
export const cacheDir = resolve(root, "scripts/places/.cache");
export const localities = JSON.parse(readFileSync(resolve(root, "src/data/chile-localities.json"), "utf8"));
export const regionIds = Object.keys(localities);

export function loadEnv() {
  const file = resolve(root, ".env.local");
  if (existsSync(file)) process.loadEnvFile(file);
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function args() {
  const flags = {};
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    flags[key] = value ?? true;
  }
  return flags;
}

export function selectedRegions(flags) {
  if (!flags.region) return regionIds;
  const chosen = String(flags.region).toUpperCase().split(",");
  const unknown = chosen.filter((id) => !regionIds.includes(id));
  if (unknown.length) throw new Error(`Región desconocida: ${unknown.join(", ")}. Usa: ${regionIds.join(", ")}`);
  return chosen;
}

export function slugify(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Cities where a place needs many reviews to stand out; everywhere else counts as a town.
export const bigCities = new Set([
  "Arica", "Iquique", "Antofagasta", "Calama", "Copiapó", "La Serena", "Coquimbo", "Valparaíso", "Viña del Mar", "Concón", "Quilpué",
  "Rancagua", "Talca", "Curicó", "Chillán", "Concepción", "Talcahuano", "Los Ángeles", "Temuco", "Pucón", "Villarrica", "Valdivia",
  "Osorno", "Puerto Montt", "Puerto Varas", "Castro", "Coyhaique", "Punta Arenas", "Puerto Natales", "San Pedro de Atacama",
  ...localities.RM.comunas.filter((name) => !["Pirque", "San José de Maipo", "Tiltil", "Alhué", "María Pinto", "San Pedro", "Curacaví", "El Monte", "Isla de Maipo", "Calera de Tango"].includes(name)),
  "Barrio Lastarria", "Barrio Bellavista", "Barrio Italia",
]);

// One Text Search per locality and entry. `type` narrows results when Google has a matching place type.
export const searches = [
  { category: "food", query: "restaurantes", type: "restaurant" },
  { category: "coffee", query: "cafeterías", type: "cafe" },
  { category: "stay", query: "hoteles y hospedajes", type: "lodging" },
  { category: "view", query: "atractivos turísticos", type: "tourist_attraction" },
  { category: "museum", query: "museos", type: "museum" },
  { category: "park", query: "parques y reservas naturales", type: "park" },
  { category: "nightlife", query: "bares", type: "bar" },
  { category: "market", query: "ferias y mercados de artesanía" },
  { category: "experience", query: "tours y excursiones" },
  { category: "winery", query: "viñas con visitas", regions: ["CO", "VS", "RM", "LI", "ML", "NB"] },
  { category: "snow", query: "centros de esquí", regions: ["VS", "RM", "LI", "NB", "BI", "AR", "LL", "AI", "MA"], bigOnly: true },
];

// A result's own type wins over the query it came from (a hotel found under "atractivos" is still a hotel).
const typeCategories = [
  [["lodging", "hotel", "hostel", "bed_and_breakfast", "guest_house", "resort_hotel", "campground", "cottage", "inn", "motel"], "stay"],
  [["museum", "art_gallery", "historical_landmark", "cultural_center"], "museum"],
  [["winery"], "winery"],
  [["ski_resort"], "snow"],
  [["cafe", "coffee_shop", "bakery", "tea_house"], "coffee"],
  [["bar", "pub", "night_club", "wine_bar"], "nightlife"],
  [["national_park", "park", "hiking_area", "garden", "botanical_garden", "wildlife_park"], "park"],
  [["market"], "market"],
];
export function categoryFor(place, fallback) {
  const primary = place.primaryType ?? "";
  for (const [types, category] of typeCategories) if (types.includes(primary)) return category;
  if (primary.endsWith("_restaurant") || primary === "restaurant") return "food";
  return fallback;
}

const excludedTypes = new Set(["fast_food_restaurant", "supermarket", "gas_station", "convenience_store", "shopping_mall", "department_store", "grocery_store", "liquor_store", "car_rental", "bank", "atm"]);
export const chains = /\b(mc ?donald|burger king|kfc|subway|starbucks|domino|papa john|telepizza|doggis|juan maestro|pedro,? juan (y|&) diego|tarragona|dunkin|little caesars|pizza hut|tommy beans|wendy)/i;

export const defaults = { minRating: 4.0, minReviewsCity: 150, minReviewsTown: 20, perSearch: 8 };

export function qualifies(place, { big, minRating, minReviewsCity, minReviewsTown }) {
  if (place.businessStatus && place.businessStatus !== "OPERATIONAL") return false;
  if (!(place.rating >= minRating)) return false;
  if (!(place.userRatingCount >= (big ? minReviewsCity : minReviewsTown))) return false;
  if ((place.types ?? []).some((type) => excludedTypes.has(type))) return false;
  if (chains.test(place.displayName?.text ?? "")) return false;
  if (!/Chile\s*$/.test(place.formattedAddress ?? "")) return false;
  return true;
}

// Google's weekly periods as [open, close] pairs in minutes since Sunday 00:00, the shape src/open-status.ts reads.
// A close earlier than its open wraps past Saturday midnight; a period without `close` means open around the clock.
export function toPeriods(openingHours) {
  const periods = openingHours?.periods;
  if (!periods?.length) return null;
  const minute = (point) => point.day * 1440 + point.hour * 60 + (point.minute ?? 0);
  return periods.map(({ open, close }) => {
    if (!close) return [0, 10080];
    const start = minute(open), end = minute(close);
    return [start, end > start ? end : end + 10080];
  });
}

export const score = (place) => place.rating * Math.log10(place.userRatingCount + 1);
