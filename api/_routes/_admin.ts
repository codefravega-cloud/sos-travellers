import { createHash, timingSafeEqual } from "node:crypto";
import { sessionUser } from "./_auth.js";

const digest = (value: string) => createHash("sha256").update(value).digest();

// Compares a shared secret without leaking its length or content through timing. Short or missing secrets never match.
export const matchesKey = (given: string, expected: string | undefined, minLength: number) =>
  Boolean(expected && expected.length >= minLength) && timingSafeEqual(digest(given), digest(expected!));

// Team-only routes: returns a Response to send back when the caller is not allowed, or null when it is.
// Only the session of the one admin account (an active boss) gets in; there is no shared key any more.
export async function rejectUnlessTeam(request: Request): Promise<Response | null> {
  const user = await sessionUser(request).catch(() => null);
  if (user?.role === "boss" && user.state === "activo") return null;
  return Response.json({ error: "Solo la cuenta admin puede entrar." }, { status: 401 });
}
