import { createCipheriv, createHmac, randomBytes } from "node:crypto";

// The RUT is stored encrypted (tbl_usuarios_privado). RUT_SECRET lives only on the server: the database never sees
// the RUT in clear, and neither does the panel, which only gets the masked form.
const secret = () => {
  const value = process.env.RUT_SECRET ?? "";
  if (value.length < 32) throw new RutError("Falta configurar la clave RUT_SECRET en el servidor (mínimo 32 caracteres).");
  return value;
};
// Two keys from one secret: one encrypts, the other makes the fingerprint that finds duplicates without decrypting.
const key = (purpose: string) => createHmac("sha256", secret()).update(purpose).digest();

export class RutError extends Error {}

// "12.345.678-k" → "12345678K", or null when the check digit does not match.
export function normalizeRut(input: string) {
  const clean = input.replace(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(clean)) return null;
  const body = clean.slice(0, -1);
  let sum = 0, factor = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const rest = 11 - (sum % 11);
  const digit = rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
  return digit === clean.slice(-1) ? clean : null;
}

export function protectRut(rut: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("cifrar-rut"), iv);
  const encrypted = Buffer.concat([cipher.update(rut, "utf8"), cipher.final()]);
  return {
    rut_cifrado: `v1:${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64")}`,
    rut_huella: createHmac("sha256", key("huella-rut")).update(rut).digest("hex"),
    rut_visible: `••.•••.${rut.slice(-4, -1)}-${rut.slice(-1)}`,
  };
}
