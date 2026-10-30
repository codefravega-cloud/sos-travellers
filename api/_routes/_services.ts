import { isActive, photoUrl } from "./_business.js";
import { validCategoryId } from "./_categories.js";

// Shapes and rules shared by the routes that deal with a service (a row of `services`, see 202610260003_services.sql).
export const MAX_SERVICES = 10;
export const MAX_SERVICE_PHOTOS = 3;
export const serviceColumns = "id, partner_id, category, title, description, price_clp, price_from, duration, languages, whatsapp, phone, booking_url, photos, status, review_note, updated_at";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

export const servicePhotos = (row: Row) => (Array.isArray(row.photos) ? row.photos : []).filter((path): path is string => typeof path === "string");

// What anyone may see of a published service.
export function toPublicService(row: Row) {
  return {
    id: row.id as number,
    category: row.category as string,
    title: row.title as string,
    description: row.description as string,
    priceClp: (row.price_clp ?? undefined) as number | undefined,
    priceFrom: Boolean(row.price_from),
    duration: (row.duration ?? undefined) as string | undefined,
    languages: (row.languages ?? []) as string[],
    whatsapp: (row.whatsapp ?? undefined) as string | undefined,
    phone: (row.phone ?? undefined) as string | undefined,
    bookingUrl: (row.booking_url ?? undefined) as string | undefined,
    photos: servicePhotos(row).map(photoUrl),
  };
}

// What its business and the admin see: the status, the reason of a rejection and the photo paths.
export function toManagedService(row: Row) {
  return {
    ...toPublicService(row),
    partnerId: row.partner_id as number,
    status: row.status as "pending" | "published" | "rejected",
    reviewNote: (row.review_note ?? undefined) as string | undefined,
    photos: servicePhotos(row).map((path) => ({ path, url: photoUrl(path) })),
    updatedAt: row.updated_at as string,
  };
}

export const publicBusinessOf = (partner: Row) => ({
  id: partner.id as number, name: partner.name as string, kind: partner.kind as string,
  address: (partner.address ?? undefined) as string | undefined, active: isActive(partner),
  categoryId: (partner.category_id ?? undefined) as string | undefined, lat: (partner.lat ?? undefined) as number | undefined, lng: (partner.lng ?? undefined) as number | undefined,
});

// Reads the fields a business sends for a service, checked like the SQL constraints. Returns the row or an error message.
export function readService(body: Record<string, unknown>): { row: Row } | { error: string } {
  const category = text(body.category, 40), title = text(body.title, 80), description = text(body.description, 600);
  const price = text(body.priceClp, 9).replace(/[.\s$]/g, ""), bookingUrl = text(body.bookingUrl, 300);
  if (!validCategoryId(category)) return { error: "Elige el tipo de servicio." };
  if (title.length < 3) return { error: "Escribe el nombre del servicio (al menos 3 letras)." };
  if (description.length < 10) return { error: "Describe el servicio (al menos 10 letras)." };
  if (price && !/^\d{1,9}$/.test(price)) return { error: "El precio va en pesos, solo números." };
  if (bookingUrl && !/^https?:\/\/[^\s]+\.[^\s]+$/.test(bookingUrl)) return { error: "El enlace para reservar debe empezar con https://" };
  const languages = Array.isArray(body.languages) ? [...new Set(body.languages.map((value) => String(value).toUpperCase()).filter((value) => /^[A-Z]{2}$/.test(value)))].slice(0, 8) : [];
  return {
    row: {
      category, title, description, price_clp: price ? Number(price) : null, price_from: Boolean(price) && body.priceFrom === true,
      duration: text(body.duration, 40) || null, languages, whatsapp: text(body.whatsapp, 30) || null, phone: text(body.phone, 30) || null,
      booking_url: bookingUrl || null,
    },
  };
}
