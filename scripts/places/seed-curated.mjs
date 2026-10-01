// Uploads the hand-curated Santiago list (src/places.ts) as curated rows, keeping its editorial copy.
//   node --experimental-strip-types scripts/places/seed-curated.mjs
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./lib.mjs";
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
    lat: place.coords[0], lng: place.coords[1], region: "RM", comuna: null, locality: place.neighborhood,
    address: place.address ?? null, hours: place.hours ?? null, opening_periods: place.openingPeriods ?? null, visit: place.visit ?? null, website: place.officialUrl ?? null,
    map_query: place.mapQuery ?? null, languages: place.languages ?? null,
    summary: place.summary ?? null, tag: place.tag ?? null, access: place.access ?? null, photo: place.photo ?? null,
    curated: true, source: "curated",
  };
});
const { error } = await supabase.from("places").upsert(rows, { onConflict: "id" });
if (error) throw error;
console.log(`${rows.length} lugares curados cargados en la Región Metropolitana.`);
