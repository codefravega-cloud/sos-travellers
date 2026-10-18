import { getSupabase } from "./_supabase.js";

const DAY = 86400000;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Weekly summary for Administración: counts the last 7 days and records them as a run in agent_runs.
// Counts only; no email or name leaves the database.
export async function weeklySummary(dryRun: boolean) {
  const supabase = getSupabase(), started = new Date();
  const since = new Date(started.getTime() - 7 * DAY).toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const count = async (table: string, filter: (query: any) => any = (query) => query) => {
    const { count: total, error } = await filter(supabase.from(table).select("*", { count: "exact", head: true }));
    if (error) throw error;
    return (total ?? 0) as number;
  };
  const record = async (run: Record<string, unknown>) => {
    if (dryRun) return;
    const { error } = await supabase.from("agent_runs").insert({ agent: "weekly-summary", section: "administracion", started_at: started.toISOString(), finished_at: new Date().toISOString(), ...run });
    if (error) throw error;
  };

  try {
    const [usersTotal, usersWeek, leadsWeek, leadsOpen, appsWeek, appsPending, reviewsWeek, drafts, published, promotionsPending, suggestionsNew, runsWeek, runErrors] = await Promise.all([
      count("app_users"),
      count("app_users", (q) => q.gte("created_at", since)),
      count("guide_leads", (q) => q.gte("created_at", since)),
      count("guide_leads", (q) => q.eq("status", "new")),
      count("business_applications", (q) => q.gte("created_at", since)),
      count("business_applications", (q) => q.eq("status", "pending")),
      count("reviews", (q) => q.gte("created_at", since)),
      count("events", (q) => q.eq("status", "draft")),
      count("events", (q) => q.eq("status", "published").gte("starts_at", started.toISOString())),
      count("promotions", (q) => q.eq("status", "pending")),
      count("suggestions", (q) => q.eq("status", "new")),
      count("agent_runs", (q) => q.gte("finished_at", since).neq("agent", "weekly-summary")),
      count("agent_runs", (q) => q.gte("finished_at", since).eq("status", "error")),
    ]);

    const metrics = [
      { label: "Usuarios de la app", value: usersTotal, hint: `${usersWeek} nuevos esta semana` },
      { label: "Interesados en guías", value: leadsWeek, hint: `${leadsOpen} sin contactar` },
      { label: "Solicitudes de negocios", value: appsWeek, hint: `${appsPending} sin responder` },
      { label: "Opiniones nuevas", value: reviewsWeek },
      { label: "Sugerencias sin leer", value: suggestionsNew },
      { label: "Promociones por aprobar", value: promotionsPending },
      { label: "Eventos publicados", value: published, hint: "próximos días" },
      { label: "Eventos por aprobar", value: drafts },
      { label: "Corridas de agentes", value: runsWeek, hint: `${runErrors} con error` },
    ];
    const attention = [
      appsPending && `${plural(appsPending, "solicitud de negocio espera", "solicitudes de negocios esperan")} respuesta (Comercial).`,
      leadsOpen && `${plural(leadsOpen, "interesado en guías", "interesados en guías")} sin contactar (Comercial).`,
      promotionsPending && `${plural(promotionsPending, "promoción espera", "promociones esperan")} aprobación en el panel (Comercial).`,
      suggestionsNew && `${plural(suggestionsNew, "sugerencia", "sugerencias")} sin leer (Administración).`,
      drafts && `${plural(drafts, "evento espera", "eventos esperan")} aprobación en el panel (Contenido).`,
      !published && "No hay eventos publicados para los próximos días: «Qué pasa hoy» se ve vacío (Contenido).",
      runErrors && `${plural(runErrors, "corrida de agente falló", "corridas de agentes fallaron")} esta semana (Desarrollo).`,
    ].filter(Boolean) as string[];

    const summary = `Últimos 7 días: ${plural(usersWeek, "usuario nuevo", "usuarios nuevos")}, ${plural(appsWeek, "solicitud", "solicitudes")} de negocios y ${plural(reviewsWeek, "opinión nueva", "opiniones nuevas")}. ${attention.length ? `${plural(attention.length, "tema necesita", "temas necesitan")} atención.` : "Nada pendiente."}`;
    await record({ status: "ok", summary, details: { metrics, attention, since } });
    return { summary, attention };
  } catch (error) {
    await record({ status: "error", summary: `No se pudo armar el resumen: ${error instanceof Error ? error.message : "error desconocido"}`.slice(0, 600), details: {} }).catch(() => {});
    throw error;
  }
}
