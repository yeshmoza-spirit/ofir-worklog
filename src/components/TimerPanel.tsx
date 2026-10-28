import { useEffect, useMemo, useState } from "react";
import { Card } from "./Card";
import type { RateType } from "../types";
import {
  cancelActiveTimer,
  confirmTimerSession,
  getActiveTimer,
  getGroups,
  getRecentWorkplaces,
  getWorkplaces,
  startTimer,
  stopTimer,
} from "../services/worklogService";
import {
  calcDurationMinutes,
  formatDurationHebrew,
  formatElapsedClock,
  isoToLocalDateAndTime,
  roundSecondsToMinutes,
} from "../utils/time";
import { agorotToShekels, calcAmountAgorot, formatAgorotAsILS, shekelsToAgorot } from "../utils/money";

export function TimerPanel({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState(() => getActiveTimer());
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [pickWorkplaceId, setPickWorkplaceId] = useState("");
  const [pickGroupId, setPickGroupId] = useState<string | null>(null);

  const workplaces = useMemo(() => getWorkplaces(), []);
  const recentWorkplaces = useMemo(() => getRecentWorkplaces(3), []);
  const pickGroups = pickWorkplaceId ? getGroups(pickWorkplaceId) : [];

  useEffect(() => {
    if (!timer || timer.state !== "running") return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  if (timer && timer.state === "running") {
    const elapsedSeconds = Math.max(0, Math.floor((nowTick - new Date(timer.startedAt).getTime()) / 1000));
    return (
      <Card className="bg-[var(--color-primary)] text-white text-center space-y-2">
        <div className="text-sm opacity-90">
          {timer.workplaceNameSnapshot}
          {timer.groupNameSnapshot ? ` · ${timer.groupNameSnapshot}` : ""}
        </div>
        <div className="text-3xl font-bold tabular-nums">{formatElapsedClock(elapsedSeconds)}</div>
        <button
          onClick={() => setTimer(stopTimer())}
          className="w-full bg-white text-[var(--color-primary-dark)] font-bold py-3 rounded-xl min-h-[44px]"
        >
          ■ סיום עבודה
        </button>
      </Card>
    );
  }

  if (timer && timer.state === "stopped_draft") {
    return (
      <TimerDraftConfirm
        timer={timer}
        onDone={() => {
          setTimer(null);
          onSaved();
        }}
        onCancel={() => {
          cancelActiveTimer();
          setTimer(null);
        }}
      />
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-[var(--color-border)] bg-white font-medium py-3 rounded-xl min-h-[44px]"
      >
        ▶ התחל טיימר
      </button>
    );
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">התחלת עבודה בטיימר</h3>
        <button className="text-sm text-[var(--color-text-muted)]" onClick={() => setOpen(false)}>
          סגירה
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {recentWorkplaces.map((wp) => (
          <button
            key={wp.id}
            onClick={() => {
              setPickWorkplaceId(wp.id);
              setPickGroupId(null);
            }}
            className={`px-4 py-2.5 rounded-xl border min-h-[44px] font-medium ${
              pickWorkplaceId === wp.id
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-white border-[var(--color-border)]"
            }`}
          >
            {wp.name}
          </button>
        ))}
      </div>

      <select
        className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
        value={pickWorkplaceId}
        onChange={(e) => {
          setPickWorkplaceId(e.target.value);
          setPickGroupId(null);
        }}
      >
        <option value="">בחירה מהרשימה המלאה</option>
        {workplaces.map((wp) => (
          <option key={wp.id} value={wp.id}>
            {wp.name}
          </option>
        ))}
      </select>

      {pickGroups.length > 0 && (
        <select
          className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
          value={pickGroupId ?? ""}
          onChange={(e) => setPickGroupId(e.target.value || null)}
        >
          <option value="">ללא קבוצה</option>
          {pickGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}

      <button
        disabled={!pickWorkplaceId}
        onClick={() => {
          const started = startTimer(pickWorkplaceId, pickGroupId);
          setTimer(started);
          setOpen(false);
        }}
        className="w-full bg-[var(--color-primary)] text-white font-bold py-3 rounded-xl min-h-[44px] disabled:opacity-40"
      >
        ▶ התחל עבודה
      </button>
    </Card>
  );
}

function TimerDraftConfirm({
  timer,
  onDone,
  onCancel,
}: {
  timer: NonNullable<ReturnType<typeof getActiveTimer>>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const startLocal = isoToLocalDateAndTime(timer.startedAt);
  const endLocal = isoToLocalDateAndTime(timer.endedAt!);

  const rawSeconds = Math.max(
    0,
    Math.round((new Date(timer.endedAt!).getTime() - new Date(timer.startedAt).getTime()) / 1000)
  );
  const roundedMinutes = roundSecondsToMinutes(rawSeconds);

  const [workDate, setWorkDate] = useState(startLocal.date);
  const [startTime, setStartTime] = useState(startLocal.time);
  const [endTime, setEndTime] = useState(endLocal.time);
  const [endsNextDay, setEndsNextDay] = useState(startLocal.date !== endLocal.date);
  const [rateShekels, setRateShekels] = useState(String(agorotToShekels(timer.rateAgorot)));
  const [rateType, setRateType] = useState<RateType>(timer.rateType);
  const [error, setError] = useState<string | null>(null);

  const durationMinutes = calcDurationMinutes(startTime, endTime, endsNextDay);
  const rateAgorot = rateShekels ? shekelsToAgorot(Number(rateShekels)) : 0;
  const amountAgorot = calcAmountAgorot(durationMinutes, rateAgorot, rateType);

  function handleConfirm() {
    if (durationMinutes <= 0) {
      setError(
        "משך העבודה הוא אפס (הטיימר רץ פחות מ-30 שניות). ערכי את השעות ידנית לפני השמירה."
      );
      return;
    }
    try {
      confirmTimerSession({
        workDate,
        startTime,
        endTime,
        endsNextDay,
        rateAgorot,
        rateType,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשמירה");
    }
  }

  return (
    <Card className="space-y-3">
      <h3 className="font-bold">
        {timer.workplaceNameSnapshot}
        {timer.groupNameSnapshot ? ` · ${timer.groupNameSnapshot}` : ""}
      </h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        הטיימר הסתיים. בדקי את השעות ואשרי שמירה כדיווח.
        {roundedMinutes === 0 && " (הזמן שנמדד קצר מ-30 שניות)"}
      </p>

      <div>
        <label className="block text-sm font-medium mb-2">תאריך</label>
        <input
          type="date"
          className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">שעת התחלה</label>
          <input
            type="time"
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">שעת סיום</label>
          <input
            type="time"
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
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
        הסיום ביום הבא
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-2">תעריף (₪)</label>
          <input
            type="number"
            min={0}
            step="0.5"
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
            value={rateShekels}
            onChange={(e) => setRateShekels(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">סוג תעריף</label>
          <select
            className="w-full border border-[var(--color-border)] rounded-xl px-3 py-2.5 min-h-[44px] bg-white"
            value={rateType}
            onChange={(e) => setRateType(e.target.value as RateType)}
          >
            <option value="hourly">לפי שעה</option>
            <option value="per_session">מחיר קבוע לשיעור</option>
          </select>
        </div>
      </div>

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
        onClick={handleConfirm}
        className="w-full bg-[var(--color-primary)] text-white font-bold text-lg py-3.5 rounded-xl min-h-[44px]"
      >
        שמור דיווח
      </button>
      <button
        onClick={onCancel}
        className="w-full border border-[var(--color-border)] font-medium py-3 rounded-xl min-h-[44px]"
      >
        ביטול הטיימר (בלי שמירה)
      </button>
    </Card>
  );
}
