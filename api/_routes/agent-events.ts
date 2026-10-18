import { matchesKey } from "./_admin.js";
import { bearer } from "./_auth.js";
import { intakeEvents } from "./_event-intake.js";

const MAX_BYTES = 300000;

// Where the events agent delivers what it found, from wherever it runs. AGENT_KEY can only do this:
// propose drafts. `?dryRun=1` validates without writing.
export async function POST(request: Request) {
  if (!matchesKey(bearer(request), process.env.AGENT_KEY, 24)) return Response.json({ error: "Clave de agente inválida." }, { status: 401 });

  let input: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return Response.json({ error: "El archivo es demasiado grande." }, { status: 413 });
    input = JSON.parse(raw);
  } catch {
    return Response.json({ error: "El cuerpo no es JSON válido." }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "Se esperaba un objeto con events y sources." }, { status: 400 });

  try {
    const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
    const result = await intakeEvents(input as Record<string, unknown>, dryRun);
    return Response.json({ ok: true, dryRun, ...result }, { status: dryRun ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to take in agent events", error);
    return Response.json({ error: "No pudimos guardar los eventos. Intenta nuevamente." }, { status: 503 });
  }
}
