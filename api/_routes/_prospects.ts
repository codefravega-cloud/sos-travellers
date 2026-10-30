import { randomBytes } from "node:crypto";
import { kinds } from "./_business.js";
import { regionCapitals } from "./_regions.js";
import { MAX_SERVICES, readService } from "./_services.js";

// What the admin's "Empresas" tab reads and writes. Checks mirror 202610300001_company_onboarding.sql.
export const TEMPORARY_PASSWORD_DAYS = 7;
export const prospectColumns = "id, contact_name, contact_email, contact_phone, business_name, kind, region, comuna, address, whatsapp, url, languages, description, services, notes, estado, application_id, partner_id, user_id, invited_at, created_at";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const text = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const languagesOf = (value: unknown) => Array.isArray(value)
  ? [...new Set(value.map((item) => String(item).toUpperCase()).filter((item) => /^[A-Z]{2}$/.test(item)))].slice(0, 8) : [];

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
// 16 characters from a secure source; it is sent once by email and never stored by the API.
export const temporaryPassword = () => randomBytes(12).toString("base64url");
export const temporaryPasswordExpiry = () => new Date(Date.now() + TEMPORARY_PASSWORD_DAYS * 86400000).toISOString();

export function readProspect(body: Record<string, unknown>): { row: Row } | { error: string } {
  const businessName = text(body.businessName, 100), kind = text(body.kind, 12), region = text(body.region, 2);
  const email = text(body.contactEmail, 160).toLowerCase(), url = text(body.url, 300);
  if (businessName.length < 2) return { error: "Escribe el nombre de la empresa." };
  if (!kinds.has(kind)) return { error: "Elige el rubro." };
  if (!(region in regionCapitals)) return { error: "Elige la región." };
  if (email && !isEmail(email)) return { error: "El correo no es válido." };
  if (url && !/^https?:\/\/[^\s]+\.[^\s]+$/.test(url)) return { error: "El sitio debe empezar con https://" };

  const given = Array.isArray(body.services) ? body.services as Record<string, unknown>[] : [];
  if (given.length > MAX_SERVICES) return { error: `Puedes cargar hasta ${MAX_SERVICES} servicios.` };
  for (const service of given) {
    const read = readService(service);
    if ("error" in read) return read;
  }
  return {
    row: {
      contact_name: text(body.contactName, 60), contact_email: email, contact_phone: text(body.contactPhone, 30) || null,
      business_name: businessName, kind, region, comuna: text(body.comuna, 80) || null, address: text(body.address, 200) || null,
      whatsapp: text(body.whatsapp, 30) || null, url: url || null, languages: languagesOf(body.languages),
      description: text(body.description, 600) || null, services: given, notes: text(body.notes, 1000) || null,
    },
  };
}

export const toProspect = (row: Row) => ({
  id: row.id as number, contactName: row.contact_name as string, contactEmail: row.contact_email as string, contactPhone: row.contact_phone ?? undefined,
  businessName: row.business_name as string, kind: row.kind as string, region: row.region as string, comuna: row.comuna ?? undefined, address: row.address ?? undefined,
  whatsapp: row.whatsapp ?? undefined, url: row.url ?? undefined, languages: (row.languages ?? []) as string[], description: row.description ?? undefined,
  services: (Array.isArray(row.services) ? row.services : []) as Record<string, unknown>[], notes: row.notes ?? undefined, status: row.estado as string,
  applicationId: row.application_id ?? undefined, partnerId: row.partner_id ?? undefined, userId: row.user_id ?? undefined, invitedAt: row.invited_at ?? undefined, createdAt: row.created_at as string,
});
