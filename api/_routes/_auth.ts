import { getSupabase } from "./_supabase.js";

export type Role = "tourist" | "owner" | "boss";
export type AccountState = "activo" | "bloqueado" | "inactivo";
export type SessionUser = { id: string; email: string; role: Role; state: AccountState; stateReason: string };

// tbl_usuarios names the account types in Spanish; the routes still use the role codes of app_users.
export const roleOf: Record<string, Role> = { cliente: "tourist", empresa: "owner", admin: "boss" };

export const bearer = (request: Request) => /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";

// The signed-in account behind a request, or null. Type and state are read from tbl_usuarios, never from the token.
export async function sessionUser(request: Request): Promise<SessionUser | null> {
  const token = bearer(request);
  // Session tokens are JWTs; anything else (the team key, for instance) is not worth a round trip.
  if (token.split(".").length !== 3) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: row } = await supabase.from("tbl_usuarios").select("tipo_cuenta, estado, estado_motivo").eq("id", data.user.id).maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    role: roleOf[row?.tipo_cuenta ?? ""] ?? "tourist",
    state: (row?.estado ?? "activo") as AccountState,
    stateReason: row?.estado_motivo ?? "",
  };
}

// A blocked or deactivated account keeps its session but every route that needs one refuses it, with the reason.
export const stateRefusal = (user: SessionUser) => user.state === "activo" ? null
  : Response.json({ error: `Tu cuenta está ${user.state === "bloqueado" ? "bloqueada" : "desactivada"}: ${user.stateReason}` }, { status: 403 });

// Returns the user when their role is allowed and the account is active, or the Response to send back.
export async function requireRole(request: Request, roles: Role[]): Promise<SessionUser | Response> {
  const user = await sessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const refusal = stateRefusal(user);
  if (refusal) return refusal;
  if (!roles.includes(user.role)) return Response.json({ error: "Tu cuenta no tiene acceso a esta sección." }, { status: 403 });
  return user;
}
