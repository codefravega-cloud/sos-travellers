import { getSupabase } from "./_supabase.js";

export type Role = "tourist" | "owner" | "boss";
export type SessionUser = { id: string; email: string; role: Role };

export const bearer = (request: Request) => /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";

// The signed-in account behind a request, or null. The role is read from app_users, never from the token.
export async function sessionUser(request: Request): Promise<SessionUser | null> {
  const token = bearer(request);
  // Session tokens are JWTs; anything else (the team key, for instance) is not worth a round trip.
  if (token.split(".").length !== 3) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: row } = await supabase.from("app_users").select("role").eq("id", data.user.id).maybeSingle();
  return { id: data.user.id, email: data.user.email ?? "", role: (row?.role ?? "tourist") as Role };
}

// Returns the user when their role is allowed, or the Response to send back.
export async function requireRole(request: Request, roles: Role[]): Promise<SessionUser | Response> {
  const user = await sessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  if (!roles.includes(user.role)) return Response.json({ error: "Tu cuenta no tiene acceso a esta sección." }, { status: 403 });
  return user;
}
