import { useEffect, useMemo, useState } from "react";
import type { Group, RateType, WorkSession, Workplace } from "../types";
import {
  getGroups,
  getRecentWorkplaces,
  getWorkplaces,
  createWorkSession,
  updateWorkSession,
  getLastWorkSession,
  suggestedRateAgorot,
} from "../services/worklogService";
import { calcDurationMinutes, formatDurationHebrew, isSaturday, todayIsoDate } from "../utils/time";
import { calcAmountAgorot, formatAgorotAsILS, agorotToShekels, shekelsToAgorot } from "../utils/money";
import { Card } from "./Card";

interface Props {
  editingSession?: WorkSession | null;
  onSaved: () => void;
  onCancel?: () => void;
}

export function WorkSessionForm({ editingSession, onSaved, onCancel }: Props) {
  const workplaces = useMemo(() => getWorkplaces(), []);
  const recentWorkplaces = useMemo(() => getRecentWorkplaces(3), []);

  const [workplaceId, setWorkplaceId] = useState(editingSession?.workplaceId ?? "");
  const [groupId, setGroupId] = useState<string | null>(editingSession?.groupId ?? null);
  const [workDate, setWorkDate] = useState(editingSession?.workDate ?? todayIsoDate());
  const [startTime, setStartTime] = useState(editingSession?.startTime ?? "");
  const [endTime, setEndTime] = useState(editingSession?.endTime ?? "");
  const [endsNextDay, setEndsNextDay] = useState(editingSession?.endsNextDay ?? false);
  const [rateShekels, setRateShekels] = useState<string>(
    editingSession ? String(agorotToShekels(editingSession.rateAgorot)) : ""
  );
  const [rateType, setRateType] = useState<RateType>(editingSession?.rateType ?? "hourly");
  const [notes, setNotes] = useState(editingSession?.notes ?? "");
  const [showNotes, setShowNotes] = useState(Boolean(editingSession?.notes));
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  // Tracks whether the rate was typed by hand, so a later date change (e.g.
  // into/out of Saturday) only re-suggests a rate the user hasn't touched.
  const [rateManuallyEdited, setRateManuallyEdited] = useState(Boolean(editingSession));

  useEffect(() => {
    if (!workplaceId) {
      setGroups([]);
      return;
    }
    setGroups(getGroups(workplaceId));
  }, [workplaceId]);

  function selectWorkplace(workplace: Workplace, keepGroup = false) {
    setWorkplaceId(workplace.id);
    if (!keepGroup) setGroupId(null);
    setRateShekels(String(agorotToShekels(suggestedRateAgorot(workplace, workDate))));
    setRateType(workplace.rateType);
    setRateManuallyEdited(false);
  }

  function handleDateChange(newDate: string) {
    setWorkDate(newDate);
    if (rateManuallyEdited) return;
    const wp = workplaces.find((w) => w.id === workplaceId);
    if (!wp) return;
    setRateShekels(String(agorotToShekels(suggestedRateAgorot(wp, newDate))));
  }

  function applyLastSession() {
    const last = getLastWorkSession();
    if (!last) return;
    const wp = workplaces.find((w) => w.id === last.workplaceId);
    if (!wp || !wp.active) {
      setError("מקום העבודה האחרון אינו פעיל כעת. בחרי מקום עבודה תקין.");
      return;
    }
    setWorkplaceId(last.workplaceId);
    setGroupId(last.groupId);
    setStartTime(last.startTime);
    setEndTime(last.endTime);
    setEndsNextDay(false);
    setRateShekels(String(agorotToShekels(last.rateAgorot)));
    setRateType(last.rateType);
    setWorkDate(todayIsoDate());
    setError(null);
  }

  const durationMinutes =
    startTime && endTime ? calcDurationMinutes(startTime, endTime, endsNextDay) : 0;
  const rateAgorot = rateShekels ? shekelsToAgorot(Number(rateShekels)) : 0;
  const amountAgorot = calcAmountAgorot(durationMinutes, rateAgorot, rateType);

  const selectedWorkplace = workplaces.find((w) => w.id === workplaceId);
  const showSaturdayRateHint =
    !rateManuallyEdited &&
    isSaturday(workDate) &&
    selectedWorkplace?.saturdayRateAgorot != null;

  function handleSave() {
    setError(null);
    if (!workplaceId) {
      setError("בחרי מקום עבודה");
      return;
    }
    if (!startTime || !endTime) {
      setError("בחרי שעת התחלה ושעת סיום");
      return;
    }
    if (durationMinutes <= 0) {
      setError(
        "שעת הסיום מוקדמת משעת ההתחלה. אם העבודה הסתיימה ביום הבא, סמני זאת למטה."
      );
      return;
    }
    if (!rateShekels || Number(rateShekels) < 0) {
      setError("תעריף לא תקין");
      return;
    }

    try {
      const input = {
        workDate,
        workplaceId,
        groupId,
        startTime,
        endTime,
        endsNextDay,
        rateAgorot,
        rateType,
        notes: notes || undefined,
      };
      if (editingSession) {
        updateWorkSession(editingSession.id, input);
      } else {
        createWorkSession(input);
      }
      setSavedMessage(
        `${formatDurationHebrew(durationMinutes)} | ${formatAgorotAsILS(amountAgorot)}`
      );
      if (!editingSession) {
        setStartTime("");
        setEndTime("");
        setEndsNextDay(false);
        setNotes("");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשמירה");
    }
  }

  if (savedMessage && !editingSession) {
    return (
      <Card className="text-center space-y-3">
        <div className="text-2xl">✅</div>
        <div className="font-semibold text-lg">הדיווח נשמר בהצלחה</div>
        <div className="text-[var(--color-text-muted)]">{savedMessage}</div>
        <div className="flex gap-2 justify-center pt-2">
          <button
            className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white font-medium min-h-[44px]"
            onClick={() => setSavedMessage(null)}
          >
            דיווח חדש
          </button>
          <button
            className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] font-medium min-h-[44px]"
            onClick={onCancel}
          >
            חזרה למסך הראשי
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {editingSession ? "עריכת דיווח" : "דיווח עבודה חדש"}
        </h2>
        {!editingSession && (
          <button
            onClick={applyLastSession}
            className="text-sm text-[var(--color-primary-dark)] font-medium underline"
          >
            כמו בפעם הקודמת
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">מקום עבודה</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {recentWorkplaces.map((wp) => (
            <button
              key={wp.id}
              onClick={() => selectWorkplace(wp)}
              className={`px-4 py-2.5 rounded-xl border min-h-[44px] font-medium ${
                workplaceId === wp.id
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-white border-[var(--color-border)]"
              }`}
            >
              {wp.name}
            </button>
          ))}
        </div>
        <select
          className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] text-base bg-white"
          value={workplaceId}
          onChange={(e) => {
            const wp = workplaces.find((w) => w.id === e.target.value);
            if (wp) selectWorkplace(wp);
          }}
        >
          <option value="">בחירה מהרשימה המלאה</option>
          {workplaces.map((wp) => (
            <option key={wp.id} value={wp.id}>
              {wp.name}
            </option>
          ))}
        </select>
      </div>

      {groups.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">קבוצה / כיתה (לא חובה)</label>
          <select
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] text-base bg-white"
            value={groupId ?? ""}
            onChange={(e) => setGroupId(e.target.value || null)}
          >
            <option value="">ללא</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">תאריך</label>
        <input
          type="date"
          className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] text-base bg-white"
          value={workDate}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">שעת התחלה</label>
          <input
            type="time"
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] text-base bg-white"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">שעת סיום</label>
          <input
            type="time"
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] text-base bg-white"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <input
          type="checkbox"
          checked={endsNextDay}
          onChange={(e) => setEndsNextDay(e.target.checked)}
          className="w-5 h-5"
        />
        הסיום ביום הבא (עבודה שחוצה חצות)
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">תעריף (₪)</label>
          <input
            type="number"
            min={0}
            step="0.5"
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] text-base bg-white"
            value={rateShekels}
            onChange={(e) => {
              setRateShekels(e.target.value);
              setRateManuallyEdited(true);
            }}
          />
          {showSaturdayRateHint && (
            <p className="text-xs text-[var(--color-primary-dark)] mt-1">תעריף שבת הוחל אוטומטית</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">סוג תעריף</label>
          <select
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] text-base bg-white"
            value={rateType}
            onChange={(e) => setRateType(e.target.value as RateType)}
          >
            <option value="hourly">לפי שעה</option>
            <option value="per_session">מחיר קבוע לשיעור</option>
          </select>
        </div>
      </div>

      {!showNotes ? (
        <button
          className="text-sm text-[var(--color-text-muted)] underline"
          onClick={() => setShowNotes(true)}
        >
          + הוספת הערה
        </button>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2">הערה</label>
          <textarea
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-base bg-white"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}

      <Card className="bg-[#f1efe9] border-none">
        <div className="flex justify-between items-center">
          <span className="text-[var(--color-text-muted)]">משך</span>
          <span className="font-semibold">{formatDurationHebrew(durationMinutes)}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-[var(--color-text-muted)]">סכום</span>
          <span className="font-bold text-lg">{formatAgorotAsILS(amountAgorot)}</span>
        </div>
      </Card>

      {error && (
        <div className="text-[var(--color-warning)] text-sm font-medium bg-[#fbeee0] rounded-xl p-3">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full bg-[var(--color-primary)] text-white font-bold text-lg py-3.5 rounded-xl min-h-[44px] active:bg-[var(--color-primary-dark)]"
      >
        שמור דיווח
      </button>

      {editingSession && onCancel && (
        <button
          onClick={onCancel}
          className="w-full border border-[var(--color-border)] font-medium py-3 rounded-xl min-h-[44px]"
        >
          ביטול
        </button>
      )}
    </div>
  );
}
