// Builds src/data/chile-map.json (pre-projected SVG paths for the hero map).
// Input: Natural Earth 10m admin-1 GeoJSON (ne_10m_admin_1_states_provinces.geojson,
// https://github.com/nvkelso/natural-earth-vector). Usage:
//   node scripts/geo/build-chile-map.mjs <path-to-geojson>
import { readFileSync, writeFileSync } from "node:fs";

const HEIGHT = 1000, TOLERANCE = 0.35, MIN_AREA = 1.2, WEST_LIMIT = -76.5;
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const source = JSON.parse(readFileSync(process.argv[2], "utf8"));
const features = source.features.filter((f) => (f.properties.adm0_a3 ?? "CHL") === "CHL" && f.properties.iso_3166_2?.startsWith("CL-"));

// Continental rings only; Rapa Nui and Juan Fernández are drawn as an inset.
const rings = features.map((f) => ({
  id: f.properties.iso_3166_2.slice(3),
  rings: (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)
    .map((polygon) => polygon[0]).filter((ring) => ring.every(([lon]) => lon > WEST_LIMIT)),
}));
const all = rings.flatMap((r) => r.rings.flat());
const lon0 = Math.min(...all.map((p) => p[0])), lon1 = Math.max(...all.map((p) => p[0]));
const latN = Math.max(...all.map((p) => p[1])), latS = Math.min(...all.map((p) => p[1]));
const k = HEIGHT / (merc(latN) - merc(latS));
const kx = (k * Math.PI) / 180;
const project = ([lon, lat]) => [(lon - lon0) * kx, (merc(latN) - merc(lat)) * k];

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
  // Rings are closed (first === last), so anchor on the farthest point too.
  let far = 0, farDistance = 0;
  points.forEach(([x, y], i) => { const d = Math.hypot(x - points[0][0], y - points[0][1]); if (d > farDistance) { farDistance = d; far = i; } });
  keep[far] = 1;
  const stack = [[0, far], [far, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, index = -1;
    const [ax, ay] = points[a], [bx, by] = points[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; index = i; }
    }
    if (max > tolerance) { keep[index] = 1; stack.push([a, index], [index, b]); }
  }
  return points.filter((_, i) => keep[i]);
}
const area = (ring) => Math.abs(ring.reduce((sum, [x, y], i) => { const [nx, ny] = ring[(i + 1) % ring.length]; return sum + x * ny - nx * y; }, 0) / 2);
const round = (n) => Math.round(n * 10) / 10;

const regions = rings.map(({ id, rings }) => {
  const projected = rings.map((ring) => ring.map(project));
  const largest = Math.max(...projected.map(area));
  const kept = projected.filter((ring) => area(ring) >= MIN_AREA || area(ring) === largest).map((ring) => simplify(ring, TOLERANCE)).filter((ring) => ring.length >= 4);
  const points = kept.flat();
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const main = kept.reduce((a, b) => (area(a) > area(b) ? a : b));
  return {
    id,
    d: kept.map((ring) => "M" + ring.map(([x, y]) => `${round(x)},${round(y)}`).join("L") + "Z").join(""),
    bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(round),
    center: [round(main.reduce((s, p) => s + p[0], 0) / main.length), round(main.reduce((s, p) => s + p[1], 0) / main.length)],
  };
}).sort((a, b) => a.bbox[1] - b.bbox[1]);

const output = { width: round((lon1 - lon0) * kx), height: HEIGHT, projection: { lon0, latN, k }, regions };
writeFileSync(new URL("../../src/data/chile-map.json", import.meta.url), JSON.stringify(output));
console.log(regions.map((r) => `${r.id} ${r.d.length}b bbox ${r.bbox}`).join("\n"), "\nwidth", output.width, "bytes", JSON.stringify(output).length);
