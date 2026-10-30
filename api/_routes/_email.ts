// Email sent by the API itself, through Resend. Auth emails (confirmation, password recovery) are sent by Supabase.
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

// Returns false instead of throwing: the account already exists, and the admin can send a new password from the panel.
// The temporary password is in the body, so neither the body nor the provider's answer is ever logged.
async function send(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.error("Email is not configured: RESEND_API_KEY or EMAIL_FROM is missing");
    return false;
  }
  try {
    const response = await fetch(`${process.env.RESEND_API_URL ?? "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    if (!response.ok) console.error("Email provider refused the message", response.status);
    return response.ok;
  } catch {
    console.error("Unable to reach the email provider");
    return false;
  }
}

export function sendCompanyPassword({ to, contactName, businessName, password, days }: { to: string; contactName: string; businessName: string; password: string; days: number }) {
  const panel = `${process.env.SITE_URL ?? "https://sos-travellers.vercel.app"}/panel`;
  const hello = contactName ? `Hola, ${contactName}:` : "Hola:";
  const subject = `Tu cuenta de ${businessName} en SOS Travellers`;
  return send(to, subject,
    `<p>${escape(hello)}</p>
<p>Creamos la cuenta de <b>${escape(businessName)}</b> en SOS Travellers. Desde ella administras tus servicios para los viajeros.</p>
<p><b>Correo:</b> ${escape(to)}<br><b>Clave temporal:</b> <code>${escape(password)}</code></p>
<p><a href="${escape(panel)}">Entrar a SOS Travellers</a></p>
<p>Al entrar deberás crear tu propia contraseña. La clave temporal vale ${days} días y no debes compartirla.</p>`,
    `${hello}\n\nCreamos la cuenta de ${businessName} en SOS Travellers. Desde ella administras tus servicios para los viajeros.\n\nCorreo: ${to}\nClave temporal: ${password}\n\nEntra en ${panel}\n\nAl entrar deberás crear tu propia contraseña. La clave temporal vale ${days} días y no debes compartirla.`);
}
