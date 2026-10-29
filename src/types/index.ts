export type RateType = "hourly" | "per_session";

export type SessionStatus = "reported" | "ready_to_bill" | "billed";

export type EntryType = "manual" | "timer";

export interface Workplace {
  id: string;
  name: string;
  defaultRateAgorot: number;
  rateType: RateType;
  /** Optional override applied when a session's date falls on Saturday. */
  saturdayRateAgorot?: number | null;
  billingClientName?: string;
  active: boolean;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** A reusable lesson-type name (e.g. "פילאטיס", "מחול"), shared across
 * every workplace so it never has to be re-typed for a new client. */
export interface LessonTypeCatalogEntry {
  name: string;
  active: boolean;
}

export interface Group {
  id: string;
  workplaceId: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  workDate: string; // YYYY-MM-DD
  workplaceId: string;
  groupId: string | null;
  workplaceNameSnapshot: string;
  groupNameSnapshot: string | null;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  endsNextDay: boolean;
  durationMinutes: number;
  rateAgorot: number;
  rateType: RateType;
  amountAgorot: number;
  entryType: EntryType;
  status: SessionStatus;
  billingBatchId: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingBatch {
  id: string;
  workplaceId: string;
  workplaceNameSnapshot: string;
  status: "prepared" | "manually_marked_billed" | "cancelled";
  preparedAt: string;
  billedAt?: string;
  totalMinutes: number;
  totalAmountAgorot: number;
  sessionIds: string[];
}

export interface ActiveTimer {
  id: string;
  workplaceId: string;
  groupId: string | null;
  workplaceNameSnapshot: string;
  groupNameSnapshot: string | null;
  rateAgorot: number;
  rateType: RateType;
  startedAt: string; // ISO timestamp
  endedAt: string | null; // ISO timestamp, set once stopped
  state: "running" | "stopped_draft";
}
