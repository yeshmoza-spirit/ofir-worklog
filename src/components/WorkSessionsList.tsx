import type { WorkSession } from "../types";
import { formatDateHebrew, formatDurationHebrew } from "../utils/time";
import { formatAgorotAsILS } from "../utils/money";
import { Card } from "./Card";

const STATUS_STYLES: Record<string, string> = {
  reported: "bg-[#eef0ec] text-[var(--color-text-muted)]",
  ready_to_bill: "bg-[#fbeee0] text-[var(--color-warning)]",
  billed: "bg-[#e7f1ec] text-[var(--color-success)]",
};

const STATUS_LABELS: Record<string, string> = {
  reported: "דווח",
  ready_to_bill: "מוכן לחיוב",
  billed: "חויב",
};

export function WorkSessionsList({
  sessions,
  onSelect,
  showCheckboxes = false,
  selectedIds = [],
  onToggleSelect,
}: {
  sessions: WorkSession[];
  onSelect?: (session: WorkSession) => void;
  showCheckboxes?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <Card className="text-center text-[var(--color-text-muted)] py-8">
        אין דיווחים להצגה
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => (
        <Card
          key={s.id}
          className={`flex items-start gap-3 ${onSelect ? "cursor-pointer" : ""}`}
        >
          {showCheckboxes && (
            <input
              type="checkbox"
              className="w-5 h-5 mt-1"
              checked={selectedIds.includes(s.id)}
              onChange={() => onToggleSelect?.(s.id)}
              disabled={s.status !== "reported"}
            />
          )}
          <button
            className="flex-1 text-right"
            onClick={() => onSelect?.(s)}
            disabled={!onSelect}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold">{s.workplaceNameSnapshot}</span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {formatDateHebrew(s.workDate)}
              </span>
            </div>
            {s.groupNameSnapshot && (
              <div className="text-sm text-[var(--color-text-muted)]">{s.groupNameSnapshot}</div>
            )}
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-sm text-[var(--color-text-muted)]">
                {s.startTime}-{s.endTime} · {formatDurationHebrew(s.durationMinutes)}
              </span>
              <span className="font-bold">{formatAgorotAsILS(s.amountAgorot)}</span>
            </div>
            <div className="mt-1.5">
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status]}`}
              >
                {STATUS_LABELS[s.status]}
              </span>
            </div>
          </button>
        </Card>
      ))}
    </div>
  );
}
