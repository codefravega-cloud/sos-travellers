import { sessionUser } from "./_auth.js";
import { getSupabase } from "./_supabase.js";

// Suggestions from the app and the panel, read by a boss. Signed-in or not; the role is taken from the session.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (String(body.companyWebsite ?? "")) return Response.json({ ok: true });
    const message = String(body.message ?? "").trim();
    if (message.length < 5 || message.length > 600) return Response.json({ error: "Escribe entre 5 y 600 caracteres." }, { status: 400 });

    const user = await sessionUser(request).catch(() => null);
    const { error } = await getSupabase().from("suggestions").insert({ user_id: user?.id ?? null, role: user?.role ?? "guest", message });
    if (error) throw error;
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to save suggestion", error);
    return Response.json({ error: "No pudimos enviar tu sugerencia. Intenta nuevamente." }, { status: 503 });
  }
}
