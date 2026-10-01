import type { Locale, Place } from "./places";

// `day` (0 = Sunday) is set when a closed place next opens on a different day.
export type OpenStatus = { state: "open" | "closed" | "unknown"; always?: boolean; changesAt?: string; day?: number };

const WEEK = 10080;
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Chile keeps three clocks: the mainland, Magallanes and Aysén (no winter time) and Rapa Nui.
function timeZone(place: Place) {
  if (place.coords[1] < -100) return "Pacific/Easter";
  if (place.region === "MA" || place.region === "AI") return "America/Punta_Arenas";
  return "America/Santiago";
}

function minuteOfWeek(now: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return weekdays.indexOf(value("weekday")) * 1440 + Number(value("hour")) * 60 + Number(value("minute"));
}

const clock = (minute: number) => `${String(Math.floor((minute % 1440) / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

// Regular weekly hours only: holidays and one-off closures are not known here.
export function openStatus(place: Place, now: Date): OpenStatus {
  const periods = place.openingPeriods;
  if (!periods?.length) return { state: "unknown" };
  if (periods.some(([open, close]) => close - open >= WEEK)) return { state: "open", always: true };
  const minute = minuteOfWeek(now, timeZone(place));
  // A period that wraps past Saturday midnight is also checked a week ahead.
  for (const at of [minute, minute + WEEK]) {
    const current = periods.find(([open, close]) => at >= open && at < close);
    if (current) return { state: "open", changesAt: clock(current[1]) };
  }
  const next = Math.min(...periods.map(([open]) => (open > minute ? open : open + WEEK)));
  const day = Math.floor(next / 1440) % 7;
  return { state: "closed", changesAt: clock(next), day: day === Math.floor(minute / 1440) ? undefined : day };
}

const copy: Record<Locale, { open: string; closed: string; closes: string; opens: string; always: string; unknown: string }> = {
  es: { open: "Abierto", closed: "Cerrado", closes: "cierra", opens: "abre", always: "Abierto 24 h", unknown: "Horario no informado" },
  en: { open: "Open", closed: "Closed", closes: "closes", opens: "opens", always: "Open 24 h", unknown: "Hours not listed" },
  pt: { open: "Aberto", closed: "Fechado", closes: "fecha", opens: "abre", always: "Aberto 24 h", unknown: "Horário não informado" },
  fr: { open: "Ouvert", closed: "Fermé", closes: "ferme", opens: "ouvre", always: "Ouvert 24 h/24", unknown: "Horaires non indiqués" },
};

export function openLabel(status: OpenStatus, locale: Locale, detailed = false) {
  const t = copy[locale];
  if (status.state === "unknown") return t.unknown;
  if (status.always) return t.always;
  const word = status.state === "open" ? t.open : t.closed;
  if (!detailed) return word;
  // 1 January 2023 was a Sunday, so day N of that month names weekday N - 1.
  const weekday = status.day === undefined ? "" : `${new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2023, 0, 1 + status.day)))} `;
  return `${word} · ${status.state === "open" ? t.closes : t.opens} ${weekday}${status.changesAt}`;
}
