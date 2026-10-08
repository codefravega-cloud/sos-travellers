// Shapes and rules shared by the routes that deal with a business (a row of `partners`).
export const PHOTO_BUCKET = "business-photos";
export const MAX_PHOTOS = 6;
export const ACTIVE_HOURS = 12;
export const kinds = new Set(["radio_taxi", "venue", "tour", "other"]);

export type Photo = { path: string; status: "pending" | "published" | "rejected" };
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const photoUrl = (path: string) => `${process.env.SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
export const isActive = (row: Row) => Boolean(row.active_until) && new Date(row.active_until).getTime() > Date.now();
// Reviews are keyed by place id. A business without a card in `places` gets its own key.
export const reviewPlaceId = (row: Row) => (row.place_id as string | null) ?? `partner-${row.id}`;
export const photosOf = (row: Row) => (Array.isArray(row.photos) ? row.photos : []) as Photo[];

// What anyone may see of a published business.
export function toPublicBusiness(row: Row) {
  return {
    id: row.id as number,
    kind: row.kind as string,
    name: row.name as string,
    region: row.region as string,
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    url: row.url ?? undefined,
    address: row.address ?? undefined,
    languages: (row.languages ?? []) as string[],
    note: row.note ?? undefined,
    active: isActive(row),
    photos: photosOf(row).filter((photo) => photo.status === "published").map((photo) => photoUrl(photo.path)),
    reviewPlaceId: reviewPlaceId(row),
  };
}

// What its owner and a boss see: every photo with its status, the expiry of "serving now" and the listing status.
export function toManagedBusiness(row: Row) {
  return {
    ...toPublicBusiness(row),
    status: row.status as string,
    ownerId: (row.owner_id ?? undefined) as string | undefined,
    placeId: (row.place_id ?? undefined) as string | undefined,
    activeUntil: isActive(row) ? (row.active_until as string) : undefined,
    photos: photosOf(row).map((photo) => ({ path: photo.path, status: photo.status, url: photoUrl(photo.path) })),
  };
}

export const businessColumns = "id, kind, name, phone, whatsapp, url, address, region, languages, note, rank, status, owner_id, place_id, active_until, photos";
