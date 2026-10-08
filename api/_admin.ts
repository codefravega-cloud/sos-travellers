import { createHash, timingSafeEqual } from "node:crypto";
import { bearer, sessionUser } from "./_auth.js";

const digest = (value: string) => createHash("sha256").update(value).digest();

// Compares a shared secret without leaking its length or content through timing. Short or missing secrets never match.
export const matchesKey = (given: string, expected: string | undefined, minLength: number) =>
  Boolean(expected && expected.length >= minLength) && timingSafeEqual(digest(given), digest(expected!));

// Team-only routes: returns a Response to send back when the caller is not allowed, or null when it is.
// Two ways in: the shared TEAM_PANEL_KEY, or the session of an account with the boss role.
export async function rejectUnlessTeam(request: Request): Promise<Response | null> {
  if (matchesKey(bearer(request), process.env.TEAM_PANEL_KEY, 12)) return null;
  const user = await sessionUser(request).catch(() => null);
  if (user?.role === "boss") return null;
  return Response.json({ error: "Clave incorrecta." }, { status: 401 });
}
