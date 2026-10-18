/**
 * Formatting helpers. Russian locale, Kazakhstan tenge, space as the thousands
 * separator, square metres written as м².
 */

const ruNumber = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** 144.02 -> "144,02"; 782 -> "782"; 84.5 -> "84,5" */
export function formatNumber(value: number): string {
  return ruNumber.format(value);
}

/** 782 -> "782 м²"; 84.5 -> "84,5 м²" */
export function formatArea(value: number | null): string | null {
  if (value === null) return null;
  return `${formatNumber(value)} м²`;
}

export function formatSquareMetre(value: number): string {
  return `${formatNumber(value)} м²`;
}

/** "2026-10-17" -> "17.10.2026" */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}

/** "2025-11-26" -> "26 ноября 2025" */
export function formatDateLong(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Almaty",
  }).format(date);
}

/** Astana time, for the "сейчас открыто/закрыто" line. */
export function astanaNow(now = new Date()): { day: number; hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hours = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minutes = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const day = Math.max(0, order.indexOf(weekday));

  return { day, hours, minutes };
}

/** Schedule from business.json, expressed in the studio's own wording. */
export function scheduleWindow(day: number): { open: number; close: number } | null {
  if (day <= 4) return { open: 9, close: 18 };
  if (day === 5) return { open: 10, close: 17 };
  return null;
}

export function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
