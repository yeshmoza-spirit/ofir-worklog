// Public data-layer API. Every screen talks to worklogService, never
// directly to localRepository. This is the seam for future integrations:
// - Swap localRepository for a Supabase-backed repository without
//   touching any screen component.
// - Add outbound sync (e.g. to GHL) by calling a webhook adapter at the
//   end of createWorkSession / prepareBillingBatch, once that
//   integration is approved and configured.

import { localRepository } from "../repositories/localRepository";
import { buildDemoData } from "./demoData";
import type {
  ActiveTimer,
  BillingBatch,
  Group,
  RateType,
  SessionStatus,
  Workplace,
  WorkSession,
} from "../types";
import { generateId } from "../utils/id";
import { calcAmountAgorot } from "../utils/money";
import { calcDurationMinutes, isSaturday, todayIsoDate } from "../utils/time";

function ensureSeeded(): void {
  if (localRepository.isSeeded()) return;
  const demo = buildDemoData();
  localRepository.saveWorkplaces(demo.workplaces);
  localRepository.saveGroups(demo.groups);
  localRepository.saveSessions(demo.sessions);
  localRepository.saveBatches(demo.batches);
  localRepository.saveLessonTypeCatalog(demo.lessonTypeCatalog);
  localRepository.markSeeded();
}

/** Rate to suggest for a workplace given a session date: the Saturday
 * override when set and the date falls on Saturday, else the default. */
export function suggestedRateAgorot(workplace: Workplace, workDate: string): number {
  if (isSaturday(workDate) && workplace.saturdayRateAgorot != null) {
    return workplace.saturdayRateAgorot;
  }
  return workplace.defaultRateAgorot;
}

// ---------- Workplaces ----------

export function getWorkplaces(includeInactive = false): Workplace[] {
  ensureSeeded();
  const all = localRepository.getWorkplaces();
  return includeInactive ? all : all.filter((w) => w.active);
}

export function getRecentWorkplaces(limit = 3): Workplace[] {
  return getWorkplaces()
    .filter((w) => w.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt! > a.lastUsedAt! ? 1 : -1))
    .slice(0, limit);
}

export function saveWorkplace(
  input: Omit<Workplace, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Workplace {
  const all = localRepository.getWorkplaces();
  const now = new Date().toISOString();
  if (input.id) {
    const idx = all.findIndex((w) => w.id === input.id);
    const updated: Workplace = { ...all[idx], ...input, id: input.id, updatedAt: now };
    all[idx] = updated;
    localRepository.saveWorkplaces(all);
    return updated;
  }
  const created: Workplace = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(created);
  localRepository.saveWorkplaces(all);
  return created;
}

export function setWorkplaceActive(id: string, active: boolean): void {
  const all = localRepository.getWorkplaces();
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], active, updatedAt: new Date().toISOString() };
  localRepository.saveWorkplaces(all);
}

function touchWorkplaceLastUsed(id: string): void {
  const all = localRepository.getWorkplaces();
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], lastUsedAt: new Date().toISOString() };
  localRepository.saveWorkplaces(all);
}

// ---------- Groups ----------

export function getGroups(workplaceId?: string, includeInactive = false): Group[] {
  ensureSeeded();
  let all = localRepository.getGroups();
  if (workplaceId) all = all.filter((g) => g.workplaceId === workplaceId);
  return includeInactive ? all : all.filter((g) => g.active);
}

export function saveGroup(
  input: Omit<Group, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Group {
  const all = localRepository.getGroups();
  const now = new Date().toISOString();
  let result: Group;
  if (input.id) {
    const idx = all.findIndex((g) => g.id === input.id);
    const updated: Group = { ...all[idx], ...input, id: input.id, updatedAt: now };
    all[idx] = updated;
    localRepository.saveGroups(all);
    result = updated;
  } else {
    const created: Group = { ...input, id: generateId(), createdAt: now, updatedAt: now };
    all.push(created);
    localRepository.saveGroups(all);
    result = created;
  }
  // Every group name a workplace has ever used becomes reusable for every
  // other workplace too, so a new client never requires re-typing
  // "פילאטיס" / "מחול" / etc. from scratch.
  addLessonTypeToCatalog(result.name);
  return result;
}

// ---------- Lesson type catalog (shared across all workplaces) ----------

export function getLessonTypeNames(includeInactive = false): string[] {
  ensureSeeded();
  const all = localRepository.getLessonTypeCatalog();
  const filtered = includeInactive ? all : all.filter((e) => e.active);
  return filtered.map((e) => e.name).sort((a, b) => a.localeCompare(b, "he"));
}

export function addLessonTypeToCatalog(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const all = localRepository.getLessonTypeCatalog();
  const existing = all.find((e) => e.name === trimmed);
  if (existing) {
    if (!existing.active) existing.active = true;
    localRepository.saveLessonTypeCatalog(all);
    return;
  }
  all.push({ name: trimmed, active: true });
  localRepository.saveLessonTypeCatalog(all);
}

export function setLessonTypeCatalogActive(name: string, active: boolean): void {
  const all = localRepository.getLessonTypeCatalog();
  const entry = all.find((e) => e.name === name);
  if (!entry) return;
  entry.active = active;
  localRepository.saveLessonTypeCatalog(all);
}

export function setGroupActive(id: string, active: boolean): void {
  const all = localRepository.getGroups();
  const idx = all.findIndex((g) => g.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], active, updatedAt: new Date().toISOString() };
  localRepository.saveGroups(all);
}

// ---------- Work Sessions ----------

export interface WorkSessionInput {
  workDate: string;
  workplaceId: string;
  groupId: string | null;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  rateAgorot: number;
  rateType: RateType;
  notes?: string;
}

export function getWorkSessions(): WorkSession[] {
  ensureSeeded();
  return localRepository
    .getSessions()
    .sort((a, b) => (a.workDate === b.workDate ? (a.startTime < b.startTime ? 1 : -1) : a.workDate < b.workDate ? 1 : -1));
}

export function getLastWorkSession(): WorkSession | null {
  const all = getWorkSessions();
  return all.length ? all[0] : null;
}

export function createWorkSession(input: WorkSessionInput): WorkSession {
  const workplaces = localRepository.getWorkplaces();
  const workplace = workplaces.find((w) => w.id === input.workplaceId);
  if (!workplace) throw new Error("מקום עבודה לא נמצא");

  const groups = localRepository.getGroups();
  const group = input.groupId ? groups.find((g) => g.id === input.groupId) ?? null : null;

  const durationMinutes = calcDurationMinutes(input.startTime, input.endTime, input.endsNextDay);
  if (durationMinutes <= 0) {
    throw new Error("משך העבודה חייב להיות גדול מאפס. בדקי אם השעות נכונות או שהעבודה הסתיימה ביום הבא.");
  }
  const amountAgorot = calcAmountAgorot(durationMinutes, input.rateAgorot, input.rateType);

  const now = new Date().toISOString();
  const session: WorkSession = {
    id: generateId(),
    workDate: input.workDate,
    workplaceId: input.workplaceId,
    groupId: group?.id ?? null,
    workplaceNameSnapshot: workplace.name,
    groupNameSnapshot: group?.name ?? null,
    startTime: input.startTime,
    endTime: input.endTime,
    endsNextDay: input.endsNextDay,
    durationMinutes,
    rateAgorot: input.rateAgorot,
    rateType: input.rateType,
    amountAgorot,
    entryType: "manual",
    status: "reported",
    billingBatchId: null,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  const all = localRepository.getSessions();
  all.push(session);
  localRepository.saveSessions(all);
  touchWorkplaceLastUsed(workplace.id);

  return session;
}

export function updateWorkSession(id: string, input: WorkSessionInput): WorkSession {
  const all = localRepository.getSessions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error("דיווח לא נמצא");
  if (all[idx].status === "billed") {
    throw new Error("דיווח זה חויב ונעול לעריכה. יש לבטל קודם את החיוב.");
  }

  const workplaces = localRepository.getWorkplaces();
  const workplace = workplaces.find((w) => w.id === input.workplaceId);
  if (!workplace) throw new Error("מקום עבודה לא נמצא");
  const groups = localRepository.getGroups();
  const group = input.groupId ? groups.find((g) => g.id === input.groupId) ?? null : null;

  const durationMinutes = calcDurationMinutes(input.startTime, input.endTime, input.endsNextDay);
  if (durationMinutes <= 0) {
    throw new Error("משך העבודה חייב להיות גדול מאפס.");
  }
  const amountAgorot = calcAmountAgorot(durationMinutes, input.rateAgorot, input.rateType);

  const updated: WorkSession = {
    ...all[idx],
    workDate: input.workDate,
    workplaceId: input.workplaceId,
    groupId: group?.id ?? null,
    workplaceNameSnapshot: workplace.name,
    groupNameSnapshot: group?.name ?? null,
    startTime: input.startTime,
    endTime: input.endTime,
    endsNextDay: input.endsNextDay,
    durationMinutes,
    rateAgorot: input.rateAgorot,
    rateType: input.rateType,
    amountAgorot,
    notes: input.notes,
    updatedAt: new Date().toISOString(),
  };
  all[idx] = updated;
  localRepository.saveSessions(all);
  return updated;
}

export function deleteWorkSession(id: string): void {
  const all = localRepository.getSessions();
  const session = all.find((s) => s.id === id);
  if (session && session.status === "billed") {
    throw new Error("לא ניתן למחוק דיווח שחויב.");
  }
  localRepository.saveSessions(all.filter((s) => s.id !== id));
}

export function setSessionStatus(id: string, status: SessionStatus): void {
  const all = localRepository.getSessions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], status, updatedAt: new Date().toISOString() };
  localRepository.saveSessions(all);
}

// ---------- Billing batches ----------

export function prepareBillingBatch(sessionIds: string[]): BillingBatch {
  const sessions = localRepository.getSessions();
  const selected = sessions.filter((s) => sessionIds.includes(s.id));
  if (selected.length === 0) throw new Error("לא נבחרו דיווחים");

  const workplaceIds = new Set(selected.map((s) => s.workplaceId));
  if (workplaceIds.size > 1) {
    throw new Error("ניתן להכין חיוב רק לדיווחים מאותו מקום עבודה");
  }
  if (selected.some((s) => s.status !== "reported")) {
    throw new Error("ניתן לכלול רק דיווחים בסטטוס דווח (לא כבר חויבו או הוכנו לחיוב)");
  }

  const totalMinutes = selected.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalAmountAgorot = selected.reduce((sum, s) => sum + s.amountAgorot, 0);

  const batch: BillingBatch = {
    id: generateId(),
    workplaceId: selected[0].workplaceId,
    workplaceNameSnapshot: selected[0].workplaceNameSnapshot,
    status: "prepared",
    preparedAt: new Date().toISOString(),
    totalMinutes,
    totalAmountAgorot,
    sessionIds: selected.map((s) => s.id),
  };

  const batches = localRepository.getBatches();
  batches.push(batch);
  localRepository.saveBatches(batches);

  const updatedSessions = sessions.map((s) =>
    sessionIds.includes(s.id)
      ? { ...s, status: "ready_to_bill" as SessionStatus, billingBatchId: batch.id, updatedAt: new Date().toISOString() }
      : s
  );
  localRepository.saveSessions(updatedSessions);

  return batch;
}

export function cancelBillingBatch(batchId: string): void {
  const batches = localRepository.getBatches();
  const idx = batches.findIndex((b) => b.id === batchId);
  if (idx === -1) return;
  batches[idx] = { ...batches[idx], status: "cancelled" };
  localRepository.saveBatches(batches);

  const sessions = localRepository.getSessions();
  const updated = sessions.map((s) =>
    s.billingBatchId === batchId
      ? { ...s, status: "reported" as SessionStatus, billingBatchId: null, updatedAt: new Date().toISOString() }
      : s
  );
  localRepository.saveSessions(updated);
}

export function markBillingBatchBilled(batchId: string): void {
  const batches = localRepository.getBatches();
  const idx = batches.findIndex((b) => b.id === batchId);
  if (idx === -1) return;
  batches[idx] = {
    ...batches[idx],
    status: "manually_marked_billed",
    billedAt: new Date().toISOString(),
  };
  localRepository.saveBatches(batches);

  const sessions = localRepository.getSessions();
  const updated = sessions.map((s) =>
    s.billingBatchId === batchId
      ? { ...s, status: "billed" as SessionStatus, updatedAt: new Date().toISOString() }
      : s
  );
  localRepository.saveSessions(updated);
}

export function getBillingBatches(): BillingBatch[] {
  return localRepository.getBatches();
}

// ---------- Timer ----------

export function getActiveTimer(): ActiveTimer | null {
  return localRepository.getActiveTimer();
}

export function startTimer(workplaceId: string, groupId: string | null): ActiveTimer {
  if (localRepository.getActiveTimer()) {
    throw new Error("יש כבר טיימר פעיל. יש לסיים או לבטל אותו קודם.");
  }
  const workplace = localRepository.getWorkplaces().find((w) => w.id === workplaceId);
  if (!workplace) throw new Error("מקום עבודה לא נמצא");
  const group = groupId
    ? localRepository.getGroups().find((g) => g.id === groupId) ?? null
    : null;

  const timer: ActiveTimer = {
    id: generateId(),
    workplaceId,
    groupId: group?.id ?? null,
    workplaceNameSnapshot: workplace.name,
    groupNameSnapshot: group?.name ?? null,
    rateAgorot: suggestedRateAgorot(workplace, todayIsoDate()),
    rateType: workplace.rateType,
    startedAt: new Date().toISOString(),
    endedAt: null,
    state: "running",
  };
  localRepository.saveActiveTimer(timer);
  touchWorkplaceLastUsed(workplaceId);
  return timer;
}

export function stopTimer(): ActiveTimer {
  const timer = localRepository.getActiveTimer();
  if (!timer) throw new Error("אין טיימר פעיל");
  const stopped: ActiveTimer = { ...timer, endedAt: new Date().toISOString(), state: "stopped_draft" };
  localRepository.saveActiveTimer(stopped);
  return stopped;
}

export function cancelActiveTimer(): void {
  localRepository.saveActiveTimer(null);
}

export interface TimerConfirmInput {
  workDate: string;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  rateAgorot: number;
  rateType: RateType;
  notes?: string;
}

/** Confirms a stopped timer draft as a real, billable WorkSession. */
export function confirmTimerSession(input: TimerConfirmInput): WorkSession {
  const timer = localRepository.getActiveTimer();
  if (!timer || timer.state !== "stopped_draft") {
    throw new Error("אין טיוטת טיימר לאישור");
  }
  const session = createWorkSession({
    workDate: input.workDate,
    workplaceId: timer.workplaceId,
    groupId: timer.groupId,
    startTime: input.startTime,
    endTime: input.endTime,
    endsNextDay: input.endsNextDay,
    rateAgorot: input.rateAgorot,
    rateType: input.rateType,
    notes: input.notes,
  });
  const all = localRepository.getSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], entryType: "timer" };
    localRepository.saveSessions(all);
  }
  localRepository.saveActiveTimer(null);
  return session;
}

// ---------- Backup ----------

export function exportBackup(): string {
  return JSON.stringify(localRepository.exportAll(), null, 2);
}

export function importBackup(json: string): void {
  const data = JSON.parse(json);
  if (!data.workplaces || !data.groups || !data.sessions) {
    throw new Error("קובץ גיבוי לא תקין");
  }
  localRepository.importAll({
    workplaces: data.workplaces,
    groups: data.groups,
    sessions: data.sessions,
    batches: data.batches ?? [],
    lessonTypeCatalog: data.lessonTypeCatalog ?? [],
  });
  localRepository.markSeeded();
}

export { todayIsoDate };
