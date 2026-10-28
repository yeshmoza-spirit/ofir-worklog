// Time helpers. All work-session math is done in whole minutes to avoid
// floating point drift; display formatting happens separately.

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Duration between startTime and endTime (both "HH:mm"), on the same
 * calendar day unless endsNextDay is explicitly set (crossing midnight
 * must be an explicit user choice, never inferred silently).
 */
export function calcDurationMinutes(
  startTime: string,
  endTime: string,
  endsNextDay: boolean
): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (endsNextDay) end += 24 * 60;
  const duration = end - start;
  return duration > 0 ? duration : 0;
}

export function formatDurationHebrew(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} דקות`;
  if (minutes === 0) return hours === 1 ? "שעה" : `${hours} שעות`;
  const hoursLabel = hours === 1 ? "שעה" : `${hours} שעות`;
  return `${hoursLabel} ו-${minutes} דקות`;
}

/**
 * Timer rounding rule: under 30 seconds past a full minute rounds down,
 * 30 seconds or more rounds up. Math.round on minutes already implements
 * this for a non-negative input.
 */
export function roundSecondsToMinutes(totalSeconds: number): number {
  return Math.round(totalSeconds / 60);
}

export function formatElapsedClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function minutesToDecimalHours(totalMinutes: number): number {
  return Math.round((totalMinutes / 60) * 100) / 100;
}

export function todayIsoDate(): string {
  // Asia/Jerusalem local date, formatted as YYYY-MM-DD
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

export function formatDateHebrew(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function monthKeyFromDate(isoDate: string): string {
  // "2026-09"
  return isoDate.slice(0, 7);
}

export function currentMonthKey(): string {
  return todayIsoDate().slice(0, 7);
}

export function monthLabelHebrew(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const months = [
    "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
    "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
  ];
  return `${months[m - 1]} ${y}`;
}

/** Converts an ISO timestamp to a local (Asia/Jerusalem) date + "HH:mm" time. */
export function isoToLocalDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
  };
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
