// Builds src/data/metro-santiago.json (Santiago Metro lines and stations for the Leaflet layer).
// Source: OpenStreetMap through the Overpass API (© OpenStreetMap contributors, ODbL). Usage:
//   node scripts/geo/build-metro.mjs
import { writeFileSync } from "node:fs";

const BBOX = "-33.75,-70.95,-33.25,-70.4", STOP_RADIUS_M = 250;
const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
// Official line colours; OSM `colour` tags are not consistent across relations.
const colors = { "1": "#e2231a", "2": "#f5a800", "3": "#8a5a2b", "4": "#1c3f94", "4A": "#00a3e0", "5": "#00a651", "6": "#9c4f9f" };
const query = `[out:json][timeout:90];
relation["route"="subway"](${BBOX});
out geom;
node["railway"="station"]["station"="subway"](${BBOX});
out;`;

async function overpass() {
  for (const url of ENDPOINTS) {
    try {
      const response = await fetch(url, { method: "POST", body: new URLSearchParams({ data: query }), headers: { "user-agent": "sos-travellers-build/1.0" } });
      if (response.ok) return await response.json();
      console.warn(`${url} → ${response.status}`);
    } catch (error) { console.warn(`${url} → ${error.message}`); }
  }
  throw new Error("Overpass no respondió.");
}

const round = (value) => Math.round(value * 1e5) / 1e5;
const lineId = (tags) => String(tags.ref ?? "").replace(/^L/i, "").toUpperCase();
function meters(a, b) {
  const rad = Math.PI / 180, dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}

const { elements } = await overpass();
const lines = new Map();
// Each line has one relation per direction; their ways overlap, so ways are de-duplicated by id.
for (const relation of elements.filter((item) => item.type === "relation")) {
  const id = lineId(relation.tags ?? {});
  if (!colors[id]) continue;
  const line = lines.get(id) ?? { id, color: colors[id], ways: new Map(), stops: [] };
  for (const member of relation.members ?? []) {
    if (member.type === "way" && member.geometry && !member.role?.startsWith("platform")) line.ways.set(member.ref, member.geometry.map((p) => [round(p.lat), round(p.lon)]));
    if (member.type === "node" && member.role?.startsWith("stop")) line.stops.push([member.lat, member.lon]);
  }
  lines.set(id, line);
}

const order = Object.keys(colors);
const stations = elements.filter((item) => item.type === "node" && item.tags?.name).map((node) => {
  const coords = [round(node.lat), round(node.lon)];
  const served = order.filter((id) => lines.get(id)?.stops.some((stop) => meters(stop, coords) < STOP_RADIUS_M));
  return { name: node.tags.name, lines: served, coords };
}).filter((station) => station.lines.length).sort((a, b) => a.name.localeCompare(b.name, "es"));

// Interchanges are mapped as one node per line; merge them into a single station.
const merged = [];
for (const station of stations) {
  const same = merged.find((item) => item.name === station.name && meters(item.coords, station.coords) < 400);
  if (same) same.lines = order.filter((id) => same.lines.includes(id) || station.lines.includes(id));
  else merged.push(station);
}

const output = {
  source: "© OpenStreetMap contributors (ODbL)",
  generatedAt: new Date().toISOString().slice(0, 10),
  lines: order.filter((id) => lines.has(id)).map((id) => ({ id, color: colors[id], paths: [...lines.get(id).ways.values()] })),
  stations: merged,
};
writeFileSync(new URL("../../src/data/metro-santiago.json", import.meta.url), JSON.stringify(output));
console.log(`${output.lines.length} líneas, ${merged.length} estaciones`);
