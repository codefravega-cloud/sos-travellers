import { randomUUID } from "node:crypto";
import { requireRole } from "./_auth.js";
import { MAX_PHOTOS, PHOTO_BUCKET, photosOf, photoUrl, type Photo } from "./_business.js";
import { getSupabase } from "./_supabase.js";

const noStore = { "Cache-Control": "no-store" };
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: noStore });

// Photos of a business, in three steps so the service-role key never leaves the server:
// "request" hands out a one-off upload address, the client uploads straight to storage, and "confirm"
// records the photo as pending. A boss publishes it from the panel.
export async function POST(request: Request) {
  const user = await requireRole(request, ["owner", "boss"]);
  if (user instanceof Response) return user;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? ""), partnerId = Number(body.partnerId);
    if (!Number.isSafeInteger(partnerId) || partnerId < 1) return fail("Negocio inválido.");
    const supabase = getSupabase();
    const { data: partner, error: ownError } = await supabase.from("partners").select("id, photos").eq("id", partnerId).eq("owner_id", user.id).maybeSingle();
    if (ownError) throw ownError;
    if (!partner) return fail("Ese negocio no pertenece a tu cuenta.", 403);
    const photos = photosOf(partner), bucket = supabase.storage.from(PHOTO_BUCKET);

    if (action === "request") {
      const extension = extensions[String(body.contentType ?? "")];
      if (!extension) return fail("Sube una imagen JPG, PNG o WebP.");
      if (photos.length >= MAX_PHOTOS) return fail(`Puedes tener hasta ${MAX_PHOTOS} fotos.`);
      const path = `${partnerId}/${randomUUID()}.${extension}`;
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error) throw error;
      return Response.json({ path, token: data.token }, { headers: noStore });
    }

    // Paths are issued by "request": <partner id>/<uuid>.<ext>. Nothing else is accepted.
    const path = String(body.path ?? "");
    if (!new RegExp(`^${partnerId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(path)) return fail("Foto inválida.");

    if (action === "confirm") {
      if (photos.some((photo) => photo.path === path)) return Response.json({ ok: true }, { headers: noStore });
      if (photos.length >= MAX_PHOTOS) return fail(`Puedes tener hasta ${MAX_PHOTOS} fotos.`);
      const { data: found, error: listError } = await bucket.list(String(partnerId), { search: path.split("/")[1] });
      if (listError) throw listError;
      if (!found?.length) return fail("La foto no terminó de subirse. Intenta nuevamente.");
      const next: Photo[] = [...photos, { path, status: "pending" }];
      const { error } = await supabase.from("partners").update({ photos: next }).eq("id", partnerId);
      if (error) throw error;
      return Response.json({ ok: true, photo: { path, status: "pending", url: photoUrl(path) } }, { status: 201, headers: noStore });
    }

    if (action === "remove") {
      const { error } = await supabase.from("partners").update({ photos: photos.filter((photo) => photo.path !== path) }).eq("id", partnerId);
      if (error) throw error;
      await bucket.remove([path]);
      return Response.json({ ok: true }, { headers: noStore });
    }

    return fail("Acción inválida.");
  } catch (error) {
    console.error("Unable to manage business photo", error);
    return fail("No pudimos guardar la foto. Intenta nuevamente.", 503);
  }
}
