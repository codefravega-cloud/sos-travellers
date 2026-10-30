import { getSupabase } from "./_supabase.js";

export type Role = "tourist" | "owner" | "boss";
export type AccountState = "activo" | "bloqueado" | "inactivo";
// A company created by the admin signs in with a temporary password and must replace it before using its panel.
export type PasswordState = "propia" | "temporal" | "vencida";
export type SessionUser = { id: string; email: string; role: Role; state: AccountState; stateReason: string; password: PasswordState };

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
  const { data: row } = await supabase.from("tbl_usuarios").select("tipo_cuenta, estado, estado_motivo, debe_cambiar_clave, clave_temporal_vence").eq("id", data.user.id).maybeSingle();
  const expired = Boolean(row?.clave_temporal_vence) && new Date(row?.clave_temporal_vence).getTime() < Date.now();
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    role: roleOf[row?.tipo_cuenta ?? ""] ?? "tourist",
    state: (row?.estado ?? "activo") as AccountState,
    stateReason: row?.estado_motivo ?? "",
    password: !row?.debe_cambiar_clave ? "propia" : expired ? "vencida" : "temporal",
  };
}

// A blocked or deactivated account keeps its session but every route that needs one refuses it, with the reason.
export const stateRefusal = (user: SessionUser) => user.state === "activo" ? null
  : Response.json({ error: `Tu cuenta está ${user.state === "bloqueado" ? "bloqueada" : "desactivada"}: ${user.stateReason}` }, { status: 403 });

// Everything a company does waits until it has its own password; `code` tells the panel and the app what to show.
export const passwordRefusal = (user: SessionUser) => user.password === "propia" ? null
  : user.password === "vencida"
    ? Response.json({ error: "Tu clave temporal venció. Pide al equipo de SOS Travellers que te envíe una nueva.", code: "clave_vencida" }, { status: 403 })
    : Response.json({ error: "Crea tu contraseña para continuar.", code: "cambiar_clave" }, { status: 403 });

// Returns the user when their role is allowed and the account is active, or the Response to send back.
export async function requireRole(request: Request, roles: Role[]): Promise<SessionUser | Response> {
  const user = await sessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const refusal = stateRefusal(user);
  if (refusal) return refusal;
  const password = passwordRefusal(user);
  if (password) return password;
  if (!roles.includes(user.role)) return Response.json({ error: "Tu cuenta no tiene acceso a esta sección." }, { status: 403 });
  return user;
}
