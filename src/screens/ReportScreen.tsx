import { useMemo, useState } from "react";
import { WorkSessionForm } from "../components/WorkSessionForm";
import { WorkSessionsList } from "../components/WorkSessionsList";
import { SummaryCard } from "../components/SummaryCard";
import { TimerPanel } from "../components/TimerPanel";
import { getWorkSessions } from "../services/worklogService";
import { currentMonthKey, monthKeyFromDate, minutesToDecimalHours } from "../utils/time";
import { formatAgorotAsILS } from "../utils/money";

export function ReportScreen() {
  const [refreshKey, setRefreshKey] = useState(0);

  const allSessions = useMemo(() => getWorkSessions(), [refreshKey]);
  const recent = allSessions.slice(0, 5);

  const monthSessions = useMemo(
    () => allSessions.filter((s) => monthKeyFromDate(s.workDate) === currentMonthKey()),
    [allSessions]
  );

  const totalMinutes = monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalAmount = monthSessions.reduce((sum, s) => sum + s.amountAgorot, 0);
  const unbilledAmount = monthSessions
    .filter((s) => s.status === "reported" || s.status === "ready_to_bill")
    .reduce((sum, s) => sum + s.amountAgorot, 0);

  return (
    <div className="max-w-xl mx-auto px-4 pt-5 pb-28 space-y-5">
      <div>
        <h1 className="text-xl font-bold">שלום אופיר 👋</h1>
        <p className="text-sm text-[var(--color-text-muted)]">הנה המצב החודש</p>
      </div>

      <div className="flex gap-2">
        <SummaryCard label="שעות החודש" value={`${minutesToDecimalHours(totalMinutes)}`} />
        <SummaryCard label="סכום העבודה" value={formatAgorotAsILS(totalAmount)} />
        <SummaryCard label="טרם חויב" value={formatAgorotAsILS(unbilledAmount)} tone="muted" />
      </div>

      <WorkSessionForm onSaved={() => setRefreshKey((k) => k + 1)} />

      <TimerPanel onSaved={() => setRefreshKey((k) => k + 1)} />

      <div>
        <h2 className="text-base font-bold mb-2">דיווחים אחרונים</h2>
        <WorkSessionsList sessions={recent} />
      </div>
    </div>
  );
}
