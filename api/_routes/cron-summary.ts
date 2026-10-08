import { matchesKey } from "./_admin.js";
import { bearer } from "./_auth.js";
import { weeklySummary } from "./_summary.js";

// Run by Vercel Cron every Monday (see vercel.json), which sends CRON_SECRET as a bearer token.
// `?dryRun=1` computes the summary without recording it.
export async function GET(request: Request) {
  if (!matchesKey(bearer(request), process.env.CRON_SECRET, 16)) return Response.json({ error: "No autorizado." }, { status: 401 });

  try {
    const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
    return Response.json({ ok: true, dryRun, ...(await weeklySummary(dryRun)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to build weekly summary", error);
    return Response.json({ error: "No pudimos armar el resumen." }, { status: 503 });
  }
}
