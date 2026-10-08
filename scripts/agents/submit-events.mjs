// Hands the events found by the events agent to the site, which validates them, stores them as drafts and
// records the run (api/_routes/agent-events.ts → api/_routes/_event-intake.ts). Nothing here publishes an event.
//   node scripts/agents/submit-events.mjs <file.json> [--dry-run]
// Needs AGENT_KEY (in .env.local or the environment). SOS_SITE_URL picks the site; default is the local dev server.
// File: { summary, startedAt?, sources: [{ name, url, ok, note? }], events: [{ title, venue, category,
//   region?, startsAt, endsAt?, priceLabel?, url, summary?: { es, en, pt, fr } }] }
import { readFileSync } from "node:fs";
import { loadEnv } from "../places/lib.mjs";

const file = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const dryRun = process.argv.includes("--dry-run");
if (!file) throw new Error("Uso: node scripts/agents/submit-events.mjs <archivo.json> [--dry-run]");

loadEnv();
const { AGENT_KEY, SOS_SITE_URL = "http://localhost:3000" } = process.env;
if (!AGENT_KEY) throw new Error("Falta AGENT_KEY en .env.local");

const response = await fetch(`${SOS_SITE_URL.replace(/\/+$/, "")}/api/agent-events${dryRun ? "?dryRun=1" : ""}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${AGENT_KEY}`, "Content-Type": "application/json" },
  body: readFileSync(file, "utf8"),
});
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(`${response.status}: ${result.error ?? "el sitio rechazó el envío"}`);

console.log(`${dryRun ? "[dry-run] " : ""}${result.created} borradores, ${result.duplicates} ya existían, ${result.rejected.length} rechazados`);
for (const item of result.rejected) console.log(`  rechazado: ${item.title || "(sin título)"} — ${item.reason}`);
