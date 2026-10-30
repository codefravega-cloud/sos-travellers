import type { getSupabase } from "./_supabase.js";

// Categories of companies and services (202610300002_business_categories.sql). They live in the database, so the
// lists in src/services-board.tsx and the app are only a fallback for when the API cannot be reached.
export const MAX_PENDING_CATEGORIES = 3;
export const categoryColumns = "id, names, partner_kind, status, proposed_by, rank";
export const partnerKinds = new Set(["radio_taxi", "venue", "tour", "other"]);

type Supabase = ReturnType<typeof getSupabase>;
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const validCategoryId = (id: string) => /^[a-z0-9-]{2,40}$/.test(id);
// Accents, case and spacing do not make a new category: "Cafeteria" and "cafetería " are the same.
const plain = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
export const slugOf = (name: string) => plain(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export const toCategory = (row: Row) => ({ id: row.id as string, names: row.names as Record<string, string>, partnerKind: row.partner_kind as string, status: row.status as string, proposedBy: (row.proposed_by ?? undefined) as string | undefined });

// The partner kind of a published category, or null when it does not exist or is not published.
export async function publishedKind(supabase: Supabase, id: string) {
  const { data, error } = await supabase.from("business_categories").select("partner_kind").eq("id", id).eq("status", "published").maybeSingle();
  if (error) throw error;
  return (data?.partner_kind ?? null) as string | null;
}

// Whether every id is a published category.
export async function allPublished(supabase: Supabase, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return true;
  const { data, error } = await supabase.from("business_categories").select("id").in("id", unique).eq("status", "published");
  if (error) throw error;
  return data.length === unique.length;
}

// A name typed by a company or the admin. If it already exists, that category is used instead of a duplicate.
export async function proposeCategory(supabase: Supabase, name: string, userId: string): Promise<{ id: string; status: string } | { error: string }> {
  const clean = name.trim().replace(/\s+/g, " ").slice(0, 60), slug = slugOf(clean);
  if (clean.length < 3 || slug.length < 2) return { error: "Escribe el nombre de la categoría (al menos 3 letras)." };
  const { data: rows, error } = await supabase.from("business_categories").select("id, names, status").neq("status", "rejected");
  if (error) throw error;
  const wanted = plain(clean);
  const same = rows.find((row) => Object.values(row.names as Record<string, string>).some((value) => plain(value) === wanted));
  if (same) return { id: same.id, status: same.status };
  const id = `${slug.slice(0, 33)}-${Date.now().toString(36).slice(-6)}`;
  const { error: insertError } = await supabase.from("business_categories").insert({ id, names: { es: clean }, status: "pending", proposed_by: userId });
  if (insertError) throw insertError;
  return { id, status: "pending" };
}

// Puts a business on a category, or on "Otra" while a proposal waits for the admin.
export const placement = (category: { id: string; status: string }, kind: string | null) => category.status === "published"
  ? { category_id: category.id, proposed_category_id: null, ...(kind ? { kind } : {}) }
  : { category_id: "other", proposed_category_id: category.id, kind: "other" };
