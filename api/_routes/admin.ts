import { requireRole } from "./_auth.js";
import { businessColumns, kinds, PHOTO_BUCKET, photosOf, toManagedBusiness, type Photo } from "./_business.js";
import { regionCapitals } from "./_regions.js";
import { normalizeRut, protectRut, RutError } from "./_rut.js";
import { getSupabase } from "./_supabase.js";

const noStore = { "Cache-Control": "no-store" };
// Mirror the checks of tbl_usuarios and tbl_niveles in 202610220001_tbl_usuarios.sql.
const accountTypes = new Set(["cliente", "empresa", "admin"]);
const levels = new Set(["basico", "medio", "alto", "premium"]);
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const id = (value: unknown) => { const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : null; };
const uuid = (value: unknown) => { const given = text(value, 36); return /^[0-9a-f-]{36}$/.test(given) ? given : null; };
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: noStore });
const done = (extra: Record<string, unknown> = {}) => Response.json({ ok: true, ...extra }, { headers: noStore });
// Blocking, deactivating and deleting always say why: the reason goes to the user (state) and to the audit log.
const reasonOf = (body: Record<string, unknown>) => { const reason = text(body.reason, 500); return reason.length >= 5 ? reason : null; };
const lines = (value: unknown) => (Array.isArray(value) ? value : String(value ?? "").split("\n")).map((item) => text(item, 120)).filter(Boolean).slice(0, 12);

// What can be deleted for good, and what of each row stays in the audit log. Rows written by people keep no personal text.
const deletable: Record<string, { table: string; keep: string }> = {
  review: { table: "reviews", keep: "place_id, rating, status, created_at" },
  suggestion: { table: "suggestions", keep: "role, status, created_at" },
  application: { table: "business_applications", keep: "business_name, category, interest, status, created_at" },
  promotion: { table: "promotions", keep: "partner_id, title, status, valid_until" },
  business: { table: "partners", keep: "name, kind, region, status, owner_id, place_id" },
};

// Everything the boss panel shows, in one request: the volumes are small and the panel reloads after each action.
// ?places=<text>&region=<id> searches the map's places instead (there are thousands).
export async function GET(request: Request) {
  const user = await requireRole(request, ["boss"]);
  if (user instanceof Response) return user;

  const params = new URL(request.url).searchParams;
  if (params.has("places")) return searchPlaces(params.get("places") ?? "", params.get("region") ?? "");

  try {
    const supabase = getSupabase();
    const [profiles, accounts, ruts, levelRows, audit, partners, applications, reviews, suggestions, promotions, benefits] = await Promise.all([
      supabase.from("tbl_usuarios").select("id, nombre, pais, tipo_cuenta, nivel, nivel_vence_en, estado, estado_motivo, estado_en, creado_en").order("creado_en", { ascending: false }).limit(500),
      supabase.auth.admin.listUsers({ page: 1, perPage: 500 }),
      supabase.from("tbl_usuarios_privado").select("usuario_id, rut_visible"),
      supabase.from("tbl_niveles").select("codigo, nombre, orden, beneficios_cliente, beneficios_empresa, precio_mensual_clp").order("orden"),
      supabase.from("tbl_auditoria").select("id, actor_id, origen, accion, tabla, registro_id, antes, despues, motivo, creado_en").order("creado_en", { ascending: false }).limit(200),
      supabase.from("partners").select(businessColumns).order("name").limit(500),
      supabase.from("business_applications").select("id, business_name, contact_name, email, phone, category, address, description, website, interest, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("reviews").select("id, place_id, author_name, rating, comment, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("suggestions").select("id, role, message, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("promotions").select("id, partner_id, title, description, valid_until, status, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("owner_benefits").select("id, title, detail, rank, status").order("rank", { ascending: false }).order("id"),
    ]);
    for (const result of [profiles, accounts, ruts, levelRows, audit, partners, applications, reviews, suggestions, promotions, benefits]) if (result.error) throw result.error;

    const emails = new Map(accounts.data.users.map((account) => [account.id, account.email ?? ""]));
    const rutOf = new Map((ruts.data ?? []).map((row) => [row.usuario_id, row.rut_visible]));
    const names = new Map((partners.data ?? []).map((row) => [row.id, row.name]));
    return Response.json({
      me: user.id,
      users: (profiles.data ?? []).map((row) => ({
        id: row.id, email: emails.get(row.id) ?? "", firstName: row.nombre, country: row.pais, type: row.tipo_cuenta, level: row.nivel,
        levelUntil: row.nivel_vence_en ?? undefined, state: row.estado, stateReason: row.estado_motivo ?? undefined, stateAt: row.estado_en ?? undefined,
        rut: rutOf.get(row.id), createdAt: row.creado_en,
      })),
      levels: (levelRows.data ?? []).map((row) => ({
        code: row.codigo, name: row.nombre, order: row.orden, clientBenefits: row.beneficios_cliente, businessBenefits: row.beneficios_empresa, monthlyPrice: row.precio_mensual_clp,
      })),
      audit: (audit.data ?? []).map((row) => ({
        id: row.id, actorId: row.actor_id ?? undefined, origin: row.origen, action: row.accion, table: row.tabla, recordId: row.registro_id ?? undefined,
        before: row.antes ?? undefined, after: row.despues ?? undefined, reason: row.motivo ?? undefined, createdAt: row.creado_en,
      })),
      businesses: (partners.data ?? []).map(toManagedBusiness),
      applications: (applications.data ?? []).map((row) => ({
        id: row.id, businessName: row.business_name, contactName: row.contact_name, email: row.email ?? undefined, phone: row.phone ?? undefined,
        category: row.category, address: row.address, description: row.description, website: row.website ?? undefined, interest: row.interest, status: row.status, createdAt: row.created_at,
      })),
      reviews: (reviews.data ?? []).map((row) => ({ id: row.id, placeId: row.place_id, authorName: row.author_name, rating: row.rating, comment: row.comment, status: row.status, createdAt: row.created_at })),
      suggestions: suggestions.data ?? [],
      promotions: (promotions.data ?? []).map((row) => ({ id: row.id, partnerId: row.partner_id, business: names.get(row.partner_id) ?? "", title: row.title, description: row.description ?? undefined, validUntil: row.valid_until, status: row.status })),
      benefits: benefits.data ?? [],
    }, { headers: noStore });
  } catch (error) {
    console.error("Unable to load admin panel", error);
    return fail("El panel no está disponible por ahora.", 503);
  }
}

async function searchPlaces(query: string, region: string) {
  // Wildcards and the separators of PostgREST filters are dropped, so the text is only ever a plain substring.
  const words = query.replace(/[%_,()\\*]/g, " ").trim().slice(0, 60);
  if (region && !(region in regionCapitals)) return fail("Región inválida.");
  if (words.length < 2 && !region) return fail("Escribe al menos 2 letras o elige una región.");
  try {
    let search = getSupabase().from("places").select("id, name, category, region, locality, address, rating, source, status").order("name").limit(60);
    if (words.length >= 2) search = search.ilike("name", `%${words}%`);
    if (region) search = search.eq("region", region);
    const { data, error } = await search;
    if (error) throw error;
    return Response.json({ places: data ?? [] }, { headers: noStore });
  } catch (error) {
    console.error("Unable to search places", error);
    return fail("No pudimos buscar lugares por ahora.", 503);
  }
}

export async function POST(request: Request) {
  const user = await requireRole(request, ["boss"]);
  if (user instanceof Response) return user;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const supabase = getSupabase();
    // Every action of this panel leaves its own row in tbl_auditoria, with who did it and why.
    const log = async (accion: string, tabla: string, registro: string | number, details: { antes?: unknown; despues?: unknown; motivo?: string | null } = {}) => {
      const { error } = await supabase.from("tbl_auditoria").insert({ actor_id: user.id, origen: "admin", accion, tabla, registro_id: String(registro), ...details });
      if (error) throw error;
    };
    const account = async (userId: string) => {
      const { data, error } = await supabase.from("tbl_usuarios").select("id, nombre, tipo_cuenta, nivel, estado").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    };

    // Accounts. An admin never changes their own type or state, nor deletes themself, so the panel always keeps one admin.
    if (["set-type", "set-state", "delete-user", "edit-user", "set-level", "set-rut", "remove-rut"].includes(action)) {
      const userId = uuid(body.userId);
      const target = userId && await account(userId);
      if (!userId || !target) return fail("Usuario inválido.");
      const self = userId === user.id;

      if (action === "edit-user") {
        const nombre = text(body.firstName, 60), pais = text(body.country, 80);
        if (nombre.length < 2 || pais.length < 2) return fail("Escribe el nombre y el país (al menos 2 letras).");
        const { error } = await supabase.from("tbl_usuarios").update({ nombre, pais }).eq("id", userId);
        if (error) throw error;
        await log("editar_perfil", "tbl_usuarios", userId);
        return done();
      }

      if (action === "set-type") {
        const tipo = text(body.type, 10);
        if (!accountTypes.has(tipo)) return fail("Tipo de cuenta inválido.");
        if (self) return fail("No puedes cambiar tu propio tipo de cuenta.");
        const { error } = await supabase.from("tbl_usuarios").update({ tipo_cuenta: tipo }).eq("id", userId);
        if (error) throw error;
        await log("cambiar_tipo", "tbl_usuarios", userId, { antes: { tipo_cuenta: target.tipo_cuenta }, despues: { tipo_cuenta: tipo } });
        return done();
      }

      if (action === "set-level") {
        const nivel = text(body.level, 10), until = text(body.until, 10);
        if (!levels.has(nivel)) return fail("Nivel inválido.");
        if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) return fail("Fecha de vencimiento inválida.");
        // A level set here is the admin's; it lasts until the end of that day in Chile, or forever without a date.
        const vence = until ? new Date(`${until}T23:59:59-03:00`).toISOString() : null;
        const { error } = await supabase.from("tbl_usuarios").update({ nivel, nivel_origen: "admin", nivel_vence_en: vence }).eq("id", userId);
        if (error) throw error;
        await log("cambiar_nivel", "tbl_usuarios", userId, { antes: { nivel: target.nivel }, despues: { nivel, nivel_vence_en: vence } });
        return done();
      }

      if (action === "set-state") {
        const estado = text(body.state, 10), motivo = reasonOf(body);
        if (!["activo", "bloqueado", "inactivo"].includes(estado)) return fail("Estado inválido.");
        if (self) return fail("No puedes cambiar el estado de tu propia cuenta.");
        if (estado !== "activo" && !motivo) return fail("Escribe el motivo (al menos 5 letras). El usuario lo verá.");
        const { error } = await supabase.from("tbl_usuarios")
          .update({ estado, estado_motivo: estado === "activo" ? null : motivo, estado_por: user.id, estado_en: new Date().toISOString() }).eq("id", userId);
        if (error) throw error;
        // A business that closed disappears from the site: its listings go back to review and stop "serving now".
        // Reactivating does not republish them; the admin does that from Negocios.
        if (estado === "inactivo") {
          const { error: hideError } = await supabase.from("partners").update({ status: "draft", active_until: null }).eq("owner_id", userId);
          if (hideError) throw hideError;
        }
        await log(estado === "activo" ? "reactivar" : estado === "bloqueado" ? "bloquear" : "desactivar", "tbl_usuarios", userId,
          { antes: { estado: target.estado }, despues: { estado }, motivo });
        return done();
      }

      if (action === "set-rut") {
        const rut = normalizeRut(text(body.rut, 20));
        if (!rut) return fail("El RUT no es válido. Revisa el dígito verificador.");
        const row = protectRut(rut);
        const { data: taken, error: readError } = await supabase.from("tbl_usuarios_privado").select("usuario_id").eq("rut_huella", row.rut_huella).maybeSingle();
        if (readError) throw readError;
        if (taken && taken.usuario_id !== userId) return fail("Ese RUT ya está registrado en otra cuenta.");
        const { error } = await supabase.from("tbl_usuarios_privado").upsert({ usuario_id: userId, ...row, actualizado_en: new Date().toISOString() });
        if (error) throw error;
        await log("cargar_rut", "tbl_usuarios_privado", userId, { despues: { rut_visible: row.rut_visible } });
        return done();
      }

      if (action === "remove-rut") {
        const { error } = await supabase.from("tbl_usuarios_privado").delete().eq("usuario_id", userId);
        if (error) throw error;
        await log("quitar_rut", "tbl_usuarios_privado", userId);
        return done();
      }

      // delete-user: the account, its profile and its RUT go for good (on delete cascade); its businesses stay, without an owner.
      const motivo = reasonOf(body);
      if (self) return fail("No puedes eliminar tu propia cuenta desde aquí.");
      if (!motivo) return fail("Escribe el motivo (al menos 5 letras).");
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      await log("eliminar_cuenta", "tbl_usuarios", userId, { antes: { tipo_cuenta: target.tipo_cuenta, nivel: target.nivel, estado: target.estado }, motivo });
      return done();
    }

    if (action === "save-level") {
      const code = text(body.code, 10), nombre = text(body.name, 40), price = text(body.monthlyPrice, 9);
      if (!levels.has(code)) return fail("Nivel inválido.");
      if (nombre.length < 2) return fail("Escribe el nombre del nivel.");
      if (price && !/^\d{1,9}$/.test(price)) return fail("El precio va en pesos, solo números.");
      const row = { nombre, beneficios_cliente: lines(body.clientBenefits), beneficios_empresa: lines(body.businessBenefits), precio_mensual_clp: price ? Number(price) : null, actualizado_en: new Date().toISOString() };
      const { error } = await supabase.from("tbl_niveles").update(row).eq("codigo", code);
      if (error) throw error;
      await log("editar_nivel", "tbl_niveles", code, { despues: row });
      return done();
    }

    if (action === "place-status") {
      const placeId = text(body.placeId, 64), status = text(body.status, 10);
      if (!/^[a-z0-9-]{2,64}$/.test(placeId) || (status !== "published" && status !== "hidden")) return fail("Lugar o estado inválido.");
      const { data, error } = await supabase.from("places").update({ status }).eq("id", placeId).select("id");
      if (error) throw error;
      if (!data?.length) return fail("Ese lugar no existe.");
      await log(status === "hidden" ? "ocultar_lugar" : "publicar_lugar", "places", placeId, { motivo: reasonOf(body) });
      return done();
    }

    if (action === "delete") {
      const kind = deletable[text(body.kind, 12)], rowId = id(body.id), motivo = reasonOf(body);
      if (!kind || !rowId) return fail("Nada que eliminar.");
      if (!motivo) return fail("Escribe el motivo (al menos 5 letras).");
      const { data: row, error: readError } = await supabase.from(kind.table).select(kind.keep).eq("id", rowId).maybeSingle();
      if (readError) throw readError;
      if (!row) return fail("Ya no existe.");
      // A business takes its photos and the reviews keyed to it (those of its card in `places` stay with the card).
      if (kind.table === "partners") {
        const { data: partner, error: partnerError } = await supabase.from("partners").select("photos, place_id").eq("id", rowId).single();
        if (partnerError) throw partnerError;
        const paths = photosOf(partner).map((photo) => photo.path);
        if (paths.length) {
          const { error: photoError } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
          if (photoError) throw photoError;
        }
        if (!partner.place_id) {
          const { error: reviewError } = await supabase.from("reviews").delete().eq("place_id", `partner-${rowId}`);
          if (reviewError) throw reviewError;
        }
      }
      const { error } = await supabase.from(kind.table).delete().eq("id", rowId);
      if (error) throw error;
      await log("borrar", kind.table, rowId, { antes: row, motivo });
      return done();
    }

    if (action === "create-business") {
      const name = text(body.name, 100), kind = text(body.kind, 12), region = text(body.region, 2);
      if (name.length < 2) return fail("Escribe el nombre del negocio.");
      if (!kinds.has(kind)) return fail("Tipo inválido.");
      if (!(region in regionCapitals)) return fail("Región inválida.");
      const applicationId = id(body.applicationId);
      const { data, error } = await supabase.from("partners")
        .insert({ name, kind, region, phone: text(body.phone, 30) || null, url: text(body.url, 300) || null, address: text(body.address, 200) || null, status: "draft" })
        .select("id").single();
      if (error) throw error;
      if (applicationId) {
        const { error: applicationError } = await supabase.from("business_applications").update({ status: "approved" }).eq("id", applicationId);
        if (applicationError) throw applicationError;
      }
      return done({ id: data.id });
    }

    if (action === "update-business") {
      const partnerId = id(body.partnerId);
      if (!partnerId) return fail("Negocio inválido.");
      const changes: Record<string, unknown> = {};
      if ("status" in body) {
        if (body.status !== "draft" && body.status !== "published") return fail("Estado inválido.");
        changes.status = body.status;
      }
      if ("ownerId" in body) {
        const ownerId = text(body.ownerId, 36);
        if (ownerId && !/^[0-9a-f-]{36}$/.test(ownerId)) return fail("Dueño inválido.");
        changes.owner_id = ownerId || null;
      }
      if ("placeId" in body) {
        const placeId = text(body.placeId, 64);
        if (placeId && !/^[a-z0-9-]{2,64}$/.test(placeId)) return fail("El id de la ficha solo lleva minúsculas, números y guiones.");
        changes.place_id = placeId || null;
      }
      if (body.deactivate === true) changes.active_until = null;
      if (!Object.keys(changes).length) return fail("Nada que cambiar.");
      const { error } = await supabase.from("partners").update(changes).eq("id", partnerId);
      if (error) throw error;
      // Linking a business makes its owner an empresa account; unlinking does not take the type away.
      if (changes.owner_id) {
        const { error: typeError } = await supabase.from("tbl_usuarios").update({ tipo_cuenta: "empresa" }).eq("id", changes.owner_id).eq("tipo_cuenta", "cliente");
        if (typeError) throw typeError;
      }
      return done();
    }

    if (action === "photo-status") {
      const partnerId = id(body.partnerId), path = text(body.path, 120), status = text(body.status, 10);
      if (!partnerId || (status !== "published" && status !== "rejected")) return fail("Foto o estado inválido.");
      const { data: partner, error: readError } = await supabase.from("partners").select("photos").eq("id", partnerId).maybeSingle();
      if (readError) throw readError;
      if (!partner) return fail("Negocio inválido.");
      const photos: Photo[] = photosOf(partner).map((photo) => (photo.path === path ? { path, status } : photo));
      const { error } = await supabase.from("partners").update({ photos }).eq("id", partnerId);
      if (error) throw error;
      return done();
    }

    // The remaining actions change the status of one row of one table.
    const statusMoves: Record<string, { table: string; allowed: string[] }> = {
      "application-status": { table: "business_applications", allowed: ["pending", "approved", "rejected"] },
      "review-status": { table: "reviews", allowed: ["published", "hidden"] },
      "suggestion-status": { table: "suggestions", allowed: ["new", "read", "done"] },
      "promotion-status": { table: "promotions", allowed: ["pending", "published", "rejected"] },
    };
    const move = statusMoves[action];
    if (move) {
      const rowId = id(body.id), status = text(body.status, 10);
      if (!rowId || !move.allowed.includes(status)) return fail("Estado inválido.");
      const { error } = await supabase.from(move.table).update({ status }).eq("id", rowId);
      if (error) throw error;
      return done();
    }

    if (action === "save-benefit") {
      const title = text(body.title, 80), detail = text(body.detail, 300), rowId = id(body.id);
      if (title.length < 3) return fail("Escribe un título para el beneficio.");
      const row = { title, detail: detail || null, status: body.status === "draft" ? "draft" : "published" };
      const { error } = rowId ? await supabase.from("owner_benefits").update(row).eq("id", rowId) : await supabase.from("owner_benefits").insert(row);
      if (error) throw error;
      return done();
    }

    if (action === "remove-benefit") {
      const rowId = id(body.id);
      if (!rowId) return fail("Beneficio inválido.");
      const { error } = await supabase.from("owner_benefits").delete().eq("id", rowId);
      if (error) throw error;
      return done();
    }

    return fail("Acción inválida.");
  } catch (error) {
    if (error instanceof RutError) return fail(error.message, 503);
    console.error("Unable to apply admin action", error);
    return fail("No pudimos guardar el cambio. Intenta nuevamente.", 503);
  }
}
