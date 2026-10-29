// Local-storage backed repository. This is the ONLY file that talks to
// localStorage directly. worklogService.ts depends on the shape of this
// module, not on localStorage itself - swapping in a Supabase-backed
// repository later means writing one file with the same exported shape
// and changing a single import in worklogService.ts.

import type {
  ActiveTimer,
  BillingBatch,
  Group,
  LessonTypeCatalogEntry,
  Workplace,
  WorkSession,
} from "../types";

const KEYS = {
  workplaces: "owl:workplaces",
  groups: "owl:groups",
  sessions: "owl:sessions",
  batches: "owl:batches",
  seeded: "owl:seeded",
  activeTimer: "owl:activeTimer",
  lessonTypeCatalog: "owl:lessonTypeCatalog",
} as const;

function readAll<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export const localRepository = {
  isSeeded(): boolean {
    return localStorage.getItem(KEYS.seeded) === "true";
  },
  markSeeded(): void {
    localStorage.setItem(KEYS.seeded, "true");
  },

  getWorkplaces(): Workplace[] {
    return readAll<Workplace>(KEYS.workplaces);
  },
  saveWorkplaces(items: Workplace[]): void {
    writeAll(KEYS.workplaces, items);
  },

  getGroups(): Group[] {
    return readAll<Group>(KEYS.groups);
  },
  saveGroups(items: Group[]): void {
    writeAll(KEYS.groups, items);
  },

  getSessions(): WorkSession[] {
    return readAll<WorkSession>(KEYS.sessions);
  },
  saveSessions(items: WorkSession[]): void {
    writeAll(KEYS.sessions, items);
  },

  getBatches(): BillingBatch[] {
    return readAll<BillingBatch>(KEYS.batches);
  },
  saveBatches(items: BillingBatch[]): void {
    writeAll(KEYS.batches, items);
  },

  getActiveTimer(): ActiveTimer | null {
    try {
      const raw = localStorage.getItem(KEYS.activeTimer);
      return raw ? (JSON.parse(raw) as ActiveTimer) : null;
    } catch {
      return null;
    }
  },
  saveActiveTimer(timer: ActiveTimer | null): void {
    if (timer) {
      localStorage.setItem(KEYS.activeTimer, JSON.stringify(timer));
    } else {
      localStorage.removeItem(KEYS.activeTimer);
    }
  },

  getLessonTypeCatalog(): LessonTypeCatalogEntry[] {
    return readAll<LessonTypeCatalogEntry>(KEYS.lessonTypeCatalog);
  },
  saveLessonTypeCatalog(items: LessonTypeCatalogEntry[]): void {
    writeAll(KEYS.lessonTypeCatalog, items);
  },

  exportAll() {
    return {
      workplaces: this.getWorkplaces(),
      groups: this.getGroups(),
      sessions: this.getSessions(),
      batches: this.getBatches(),
      lessonTypeCatalog: this.getLessonTypeCatalog(),
      exportedAt: new Date().toISOString(),
    };
  },

  importAll(data: {
    workplaces: Workplace[];
    groups: Group[];
    sessions: WorkSession[];
    batches: BillingBatch[];
    lessonTypeCatalog?: LessonTypeCatalogEntry[];
  }): void {
    this.saveWorkplaces(data.workplaces);
    this.saveGroups(data.groups);
    this.saveSessions(data.sessions);
    this.saveBatches(data.batches);
    this.saveLessonTypeCatalog(data.lessonTypeCatalog ?? []);
  },
};
