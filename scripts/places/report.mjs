// Writes scripts/places/out/report.csv and prints a per-region summary to review before publishing.
//   node scripts/places/report.mjs [--region=LL] [--source=osm]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { args, outDir, selectedRegions } from "./lib.mjs";

const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const columns = ["region", "locality", "category", "name", "rating", "review_count", "address", "hours", "website", "google_maps_url", "id"];
const rows = [columns.join(",")];
const flags = args();
for (const region of selectedRegions(flags)) {
  const file = resolve(outDir, `${flags.source === "osm" ? "osm-" : ""}${region}.json`);
  if (!existsSync(file)) { console.log(`${region}: sin datos (corre fetch.mjs)`); continue; }
  const places = JSON.parse(readFileSync(file, "utf8"));
  const byCategory = Object.groupBy(places, (place) => place.category);
  const lowest = places.reduce((min, place) => Math.min(min, place.rating ?? 5), 5);
  console.log(`${region}: ${places.length} locales · nota mínima ${lowest} · ${new Set(places.map((place) => place.locality)).size} localidades · ${places.filter((place) => place.opening_periods).length} con horario · ${Object.entries(byCategory).map(([name, list]) => `${name} ${list.length}`).join(", ")}`);
  for (const place of places) rows.push(columns.map((column) => cell(place[column])).join(","));
}
writeFileSync(resolve(outDir, "report.csv"), rows.join("\n"));
console.log(`Reporte: scripts/places/out/report.csv (${rows.length - 1} filas)`);
