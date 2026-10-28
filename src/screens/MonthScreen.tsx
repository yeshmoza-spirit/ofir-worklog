import { useMemo, useState } from "react";
import { SummaryCard } from "../components/SummaryCard";
import { Card } from "../components/Card";
import { WorkSessionsList } from "../components/WorkSessionsList";
import { WorkSessionForm } from "../components/WorkSessionForm";
import {
  deleteWorkSession,
  getWorkSessions,
  getWorkplaces,
  prepareBillingBatch,
} from "../services/worklogService";
import {
  currentMonthKey,
  monthKeyFromDate,
  monthLabelHebrew,
  shiftMonthKey,
  minutesToDecimalHours,
} from "../utils/time";
import { formatAgorotAsILS } from "../utils/money";
import { downloadCsv, sessionsToCsv } from "../utils/exportCsv";
import type { WorkSession } from "../types";

export function MonthScreen() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [workplaceFilter, setWorkplaceFilter] = useState<string>("all");
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const workplaces = useMemo(() => getWorkplaces(), [refreshKey]);

  const sessionsInMonth = useMemo(() => {
    return getWorkSessions().filter((s) => monthKeyFromDate(s.workDate) === monthKey);
  }, [monthKey, refreshKey]);

  const filteredSessions = useMemo(() => {
    if (workplaceFilter === "all") return sessionsInMonth;
    return sessionsInMonth.filter((s) => s.workplaceId === workplaceFilter);
  }, [sessionsInMonth, workplaceFilter]);

  const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalAmount = filteredSessions.reduce((sum, s) => sum + s.amountAgorot, 0);
  const unbilledAmount = filteredSessions
    .filter((s) => s.status !== "billed")
    .reduce((sum, s) => sum + s.amountAgorot, 0);

  const summaryByWorkplace = useMemo(() => {
    const map = new Map<string, { name: string; minutes: number; amount: number; count: number }>();
    for (const s of filteredSessions) {
      const entry = map.get(s.workplaceId) ?? {
        name: s.workplaceNameSnapshot,
        minutes: 0,
        amount: 0,
        count: 0,
      };
      entry.minutes += s.durationMinutes;
      entry.amount += s.amountAgorot;
      entry.count += 1;
      map.set(s.workplaceId, entry);
    }
    return Array.from(map.values());
  }, [filteredSessions]);

  const selectedSessions = filteredSessions.filter((s) => selectedIds.includes(s.id));
  const selectionWorkplaceIds = new Set(selectedSessions.map((s) => s.workplaceId));
  const canPrepareBatch =
    selectedSessions.length > 0 && selectionWorkplaceIds.size === 1;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handlePrepareBatch() {
    try {
      const batch = prepareBillingBatch(selectedIds);
      setBatchMessage(
        `הוכנו לחיוב: ${batch.workplaceNameSnapshot}, ${minutesToDecimalHours(
          batch.totalMinutes
        )} שעות, ${formatAgorotAsILS(batch.totalAmountAgorot)}. לא נוצר מסמך, רק סימון מעקב.`
      );
      setSelectedIds([]);
      setSelectionMode(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setBatchMessage(e instanceof Error ? e.message : "שגיאה בהכנת החיוב");
    }
  }

  function handleExportCsv() {
    const csv = sessionsToCsv(filteredSessions);
    downloadCsv(`דיווחי-שעות-${monthKey}.csv`, csv);
  }

  function handleDelete(session: WorkSession) {
    if (!confirm(`למחוק את הדיווח מ-${session.workDate}?`)) return;
    try {
      deleteWorkSession(session.id);
      setEditingSession(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : "שגיאה במחיקה");
    }
  }

  if (editingSession) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-5 pb-28 space-y-4">
        <WorkSessionForm
          editingSession={editingSession}
          onSaved={() => {
            setEditingSession(null);
            setRefreshKey((k) => k + 1);
          }}
          onCancel={() => setEditingSession(null)}
        />
        <button
          onClick={() => handleDelete(editingSession)}
          className="w-full text-[var(--color-warning)] font-medium py-2.5"
        >
          מחיקת דיווח
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-5 pb-28 space-y-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthKey((k) => shiftMonthKey(k, -1))}
          className="w-10 h-10 rounded-full bg-white border border-[var(--color-border)]"
        >
          ‹
        </button>
        <h1 className="text-lg font-bold">{monthLabelHebrew(monthKey)}</h1>
        <button
          onClick={() => setMonthKey((k) => shiftMonthKey(k, 1))}
          className="w-10 h-10 rounded-full bg-white border border-[var(--color-border)]"
        >
          ›
        </button>
      </div>

      <div className="flex gap-2">
        <SummaryCard label="סה״כ שעות" value={`${minutesToDecimalHours(totalMinutes)}`} />
        <SummaryCard label="סכום עבודה" value={formatAgorotAsILS(totalAmount)} />
        <SummaryCard label="טרם חויב" value={formatAgorotAsILS(unbilledAmount)} tone="muted" />
      </div>

      <select
        className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
        value={workplaceFilter}
        onChange={(e) => setWorkplaceFilter(e.target.value)}
      >
        <option value="all">כל מקומות העבודה</option>
        {workplaces.map((wp) => (
          <option key={wp.id} value={wp.id}>
            {wp.name}
          </option>
        ))}
      </select>

      {summaryByWorkplace.length > 0 && (
        <Card>
          <h3 className="font-bold mb-2">סיכום לפי מקום עבודה</h3>
          <div className="space-y-2">
            {summaryByWorkplace.map((s) => (
              <div key={s.name} className="flex justify-between text-sm">
                <span>{s.name}</span>
                <span className="text-[var(--color-text-muted)]">
                  {minutesToDecimalHours(s.minutes)} שעות
                </span>
                <span className="font-semibold">{formatAgorotAsILS(s.amount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleExportCsv}
          className="flex-1 border border-[var(--color-border)] rounded-xl py-2.5 font-medium min-h-[44px]"
        >
          ייצוא דו״ח CSV
        </button>
        <button
          onClick={() => {
            setSelectionMode((v) => !v);
            setSelectedIds([]);
          }}
          className={`flex-1 rounded-xl py-2.5 font-medium min-h-[44px] ${
            selectionMode
              ? "bg-[var(--color-primary)] text-white"
              : "border border-[var(--color-border)]"
          }`}
        >
          {selectionMode ? "ביטול בחירה" : "הכנה לחיוב"}
        </button>
      </div>

      {selectionMode && (
        <Card className="bg-[#f1efe9] border-none flex items-center justify-between">
          <span className="text-sm">
            נבחרו {selectedSessions.length} דיווחים
            {selectedSessions.length > 0 &&
              ` · ${minutesToDecimalHours(
                selectedSessions.reduce((s, x) => s + x.durationMinutes, 0)
              )} שעות · ${formatAgorotAsILS(
                selectedSessions.reduce((s, x) => s + x.amountAgorot, 0)
              )}`}
          </span>
          <button
            disabled={!canPrepareBatch}
            onClick={handlePrepareBatch}
            className="bg-[var(--color-primary)] text-white rounded-xl px-3 py-2 font-medium disabled:opacity-40"
          >
            הכנה לחשבון עסקה
          </button>
        </Card>
      )}

      {!selectionMode && selectionWorkplaceIds.size > 1 && (
        <div className="text-sm text-[var(--color-warning)]">
          ניתן להכין חיוב רק לדיווחים מאותו מקום עבודה בכל פעם
        </div>
      )}

      {batchMessage && (
        <Card className="bg-[#e7f1ec] border-none text-sm">{batchMessage}</Card>
      )}

      <WorkSessionsList
        sessions={filteredSessions}
        onSelect={!selectionMode ? setEditingSession : undefined}
        showCheckboxes={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
      />
    </div>
  );
}
