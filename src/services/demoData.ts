import type { BillingBatch, Group, Workplace, WorkSession } from "../types";
import { generateId } from "../utils/id";
import { calcAmountAgorot } from "../utils/money";
import { calcDurationMinutes, todayIsoDate } from "../utils/time";

const now = new Date().toISOString();

function makeWorkplace(
  name: string,
  defaultRateAgorot: number,
  rateType: "hourly" | "per_session"
): Workplace {
  return {
    id: generateId(),
    name,
    defaultRateAgorot,
    rateType,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

function makeGroup(workplaceId: string, name: string): Group {
  return {
    id: generateId(),
    workplaceId,
    name,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

function makeSession(
  workDate: string,
  workplace: Workplace,
  group: Group | null,
  startTime: string,
  endTime: string
): WorkSession {
  const durationMinutes = calcDurationMinutes(startTime, endTime, false);
  const amountAgorot = calcAmountAgorot(
    durationMinutes,
    workplace.defaultRateAgorot,
    workplace.rateType
  );
  return {
    id: generateId(),
    workDate,
    workplaceId: workplace.id,
    groupId: group?.id ?? null,
    workplaceNameSnapshot: workplace.name,
    groupNameSnapshot: group?.name ?? null,
    startTime,
    endTime,
    endsNextDay: false,
    durationMinutes,
    rateAgorot: workplace.defaultRateAgorot,
    rateType: workplace.rateType,
    amountAgorot,
    entryType: "manual",
    status: "reported",
    billingBatchId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDemoData(): {
  workplaces: Workplace[];
  groups: Group[];
  sessions: WorkSession[];
  batches: BillingBatch[];
} {
  const move = makeWorkplace("סטודיו Move", 15000, "hourly");
  const alon = makeWorkplace("בית ספר אלון", 18000, "hourly");
  const privateLesson = makeWorkplace("שיעור פרטי", 20000, "per_session");

  const moveMorning = makeGroup(move.id, "פילאטיס בוקר");
  const moveEvening = makeGroup(move.id, "פילאטיס ערב");
  const alonC = makeGroup(alon.id, "כיתה ג׳");
  const alonD = makeGroup(alon.id, "כיתה ד׳");

  const today = todayIsoDate();
  const [y, m] = today.split("-");
  const thisMonth = (day: string) => `${y}-${m}-${day}`;

  const sessions: WorkSession[] = [
    makeSession("2026-09-07", move, moveEvening, "17:00", "19:00"),
    makeSession("2026-09-08", alon, alonD, "09:00", "12:00"),
    makeSession(thisMonth("02"), move, moveMorning, "08:00", "09:00"),
    makeSession(thisMonth("03"), alon, alonC, "13:00", "15:30"),
    makeSession(thisMonth("05"), privateLesson, null, "16:00", "17:30"),
    makeSession(thisMonth("09"), move, moveEvening, "17:00", "18:30"),
    makeSession(thisMonth("10"), alon, alonD, "09:00", "11:00"),
  ];

  // Seed lastUsedAt so the quick-select row on the report screen has
  // something to show immediately in the demo, instead of staying empty
  // until a real session is saved.
  move.lastUsedAt = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  alon.lastUsedAt = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
  privateLesson.lastUsedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString();

  return {
    workplaces: [move, alon, privateLesson],
    groups: [moveMorning, moveEvening, alonC, alonD],
    sessions,
    batches: [],
  };
}
