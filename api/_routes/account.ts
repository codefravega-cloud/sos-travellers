import { getSupabase } from "./_supabase.js";

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
