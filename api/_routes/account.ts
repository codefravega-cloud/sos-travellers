import { sessionUser, stateRefusal } from "./_auth.js";
import { getSupabase } from "./_supabase.js";

const MIN_PASSWORD = 8, MAX_PASSWORD = 72;

// A company replaces the temporary password the admin sent it. This goes through the server, not supabase.auth.updateUser,
// so the mark that holds back its panel can only be cleared by really changing the password.
export async function POST(request: Request) {
  const user = await sessionUser(request);
  if (!user) return Response.json({ error: "Inicia sesión para continuar." }, { status: 401 });
  const refusal = stateRefusal(user);
  if (refusal) return refusal;
  if (user.password === "propia") return Response.json({ error: "Tu cuenta ya tiene contraseña." }, { status: 400 });
  if (user.password === "vencida") return Response.json({ error: "Tu clave temporal venció. Pide al equipo de SOS Travellers que te envíe una nueva.", code: "clave_vencida" }, { status: 403 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const password = String(body.password ?? "");
    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) return Response.json({ error: `La contraseña debe tener entre ${MIN_PASSWORD} y ${MAX_PASSWORD} caracteres.` }, { status: 400 });
    const supabase = getSupabase();
    const { data: same } = await getSupabase().auth.signInWithPassword({ email: user.email, password });
    if (same.session) return Response.json({ error: "Elige una contraseña distinta de la clave temporal." }, { status: 400 });
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
    const { error: markError } = await supabase.from("tbl_usuarios").update({ debe_cambiar_clave: false, clave_temporal_vence: null }).eq("id", user.id);
    if (markError) throw markError;
    const { error: prospectError } = await supabase.from("company_prospects").update({ estado: "activa", updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (prospectError) throw prospectError;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to change password", error);
    return Response.json({ error: "No pudimos guardar tu contraseña. Intenta nuevamente." }, { status: 503 });
  }
}

// Lets a signed-in user of the mobile app delete their own account; app stores require it.
// The profile row in app_users goes with it (on delete cascade).
export async function DELETE(request: Request) {
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return Response.json({ error: "Falta la sesión." }, { status: 401 });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return Response.json({ error: "Sesión inválida." }, { status: 401 });
    const { error: failure } = await supabase.auth.admin.deleteUser(data.user.id);
    if (failure) throw failure;
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete account", error);
    return Response.json({ error: "No pudimos eliminar la cuenta. Intenta nuevamente." }, { status: 503 });
  }
}
