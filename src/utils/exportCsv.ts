import type { WorkSession } from "../types";
import { formatDateHebrew, minutesToDecimalHours } from "./time";
import { agorotToShekels } from "./money";

const STATUS_LABELS: Record<string, string> = {
  reported: "דווח",
  ready_to_bill: "מוכן לחיוב",
  billed: "חויב",
};

// Prevent formula injection: a leading =, +, -, @ or tab in a text field
// can be interpreted as a formula by Excel/Sheets when the CSV is opened.
function sanitizeCell(value: string): string {
  const needsPrefix = /^[=+\-@\t]/.test(value);
  const escaped = value.replace(/"/g, '""');
  const prefixed = needsPrefix ? `'${escaped}` : escaped;
  return `"${prefixed}"`;
}

export function sessionsToCsv(sessions: WorkSession[]): string {
  const headers = [
    "תאריך",
    "מקום עבודה",
    "קבוצה",
    "התחלה",
    "סיום",
    "משך בדקות",
    "שעות",
    "תעריף",
    "סוג תעריף",
    "סכום",
    "סטטוס",
    "הערה",
  ];

  const rows = sessions.map((s) => [
    formatDateHebrew(s.workDate),
    s.workplaceNameSnapshot,
    s.groupNameSnapshot ?? "",
    s.startTime,
    s.endTime,
    String(s.durationMinutes),
    String(minutesToDecimalHours(s.durationMinutes)),
    String(agorotToShekels(s.rateAgorot)),
    s.rateType === "hourly" ? "לפי שעה" : "מחיר קבוע",
    String(agorotToShekels(s.amountAgorot)),
    STATUS_LABELS[s.status] ?? s.status,
    s.notes ?? "",
  ]);

  const lines = [headers, ...rows].map((row) => row.map(sanitizeCell).join(","));
  // UTF-8 BOM so Excel on Windows detects Hebrew encoding correctly.
  return "﻿" + lines.join("\r\n");
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, csvContent: string): void {
  downloadFile(filename, csvContent, "text/csv;charset=utf-8;");
}
