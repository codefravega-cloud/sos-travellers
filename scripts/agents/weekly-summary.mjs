// Asks the site for the weekly summary (api/_routes/cron-summary.ts → api/_routes/_summary.ts). In production Vercel Cron
// calls the same route every Monday; this script is for running it by hand.
//   node scripts/agents/weekly-summary.mjs [--dry-run]
// Needs CRON_SECRET (in .env.local or the environment). SOS_SITE_URL picks the site; default is the local dev server.
import { loadEnv } from "../places/lib.mjs";

const dryRun = process.argv.includes("--dry-run");
loadEnv();
const { CRON_SECRET, SOS_SITE_URL = "http://localhost:3000" } = process.env;
if (!CRON_SECRET) throw new Error("Falta CRON_SECRET en .env.local");

const response = await fetch(`${SOS_SITE_URL.replace(/\/+$/, "")}/api/cron-summary${dryRun ? "?dryRun=1" : ""}`, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
const result = await response.json().catch(() => ({}));
if (!response.ok) throw new Error(`${response.status}: ${result.error ?? "el sitio rechazó la consulta"}`);

console.log(`${dryRun ? "[dry-run] " : ""}${result.summary}`);
for (const item of result.attention) console.log(`  · ${item}`);
