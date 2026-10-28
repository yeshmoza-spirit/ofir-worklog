import type { RateType } from "../types";

export function shekelsToAgorot(shekels: number): number {
  return Math.round(shekels * 100);
}

export function agorotToShekels(agorot: number): number {
  return agorot / 100;
}

export function formatAgorotAsILS(agorot: number): string {
  const shekels = agorotToShekels(agorot);
  return `${shekels.toLocaleString("he-IL", {
    minimumFractionDigits: shekels % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} ₪`;
}

/**
 * Hourly: amount = round(durationMinutes * rateAgorot / 60)
 * Per-session (fixed price per lesson): amount = rateAgorot, regardless
 * of duration. Duration is still recorded for reporting purposes.
 */
export function calcAmountAgorot(
  durationMinutes: number,
  rateAgorot: number,
  rateType: RateType
): number {
  if (rateType === "per_session") return rateAgorot;
  return Math.round((durationMinutes * rateAgorot) / 60);
}
