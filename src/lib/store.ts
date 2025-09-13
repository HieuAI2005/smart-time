import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task, FilterState } from "./types";
import { useMemo } from "react";
import { perUserJSONStorage } from "./storage"; 

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
export const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const toLocalYMD = (input?: string | Date | null): string => {
  if (!input) return localDateStr(new Date());
  if (typeof input === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input);
    if (!isNaN(d.getTime())) return localDateStr(d);
    return localDateStr(new Date());
  }
  return localDateStr(input);
};

const nowIso = () => new Date().toISOString();
export const todayLocal = () => localDateStr(new Date());
const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const diffMins = (aIso: string, bIso: string) =>
  Math.max(
    0,
    Math.round(
      (new Date(bIso).getTime() - new Date(aIso).getTime()) / 60000
    )
  );

function normalizeTaskBase<T extends Partial<Task>>(t: T): Task {
  const startDate = toLocalYMD(t.startDate ?? todayLocal());
  const dueDate = toLocalYMD(
    t.dueDate ?? localDateStr(new Date(Date.now() + 7 * 86400000))
  );

  const startAtISO: string = (t as any).startAt ?? `${startDate}T12:00:00.000Z`;

  return {
    id: (t as any).id ?? makeId(),
    title: t.title ?? "Untitled",
    category: t.category ?? "personal",
    status: t.status ?? "todo",

    plannedMinutes: t.plannedMinutes ?? (t.dailyMinutes ?? 60),

    dailyMinutes: t.dailyMinutes ?? 60,
    startDate,
    dueDate,

    estimateTotalMin: t.estimateTotalMin,
    procrastinationFactor: t.procrastinationFactor ?? 3,
    autoScheduleRule: t.autoScheduleRule ?? { earliestHHmm: "22:00" },
    visibility: t.visibility ?? "private",
    progress: t.progress ?? {},

    description: t.description,
    tags: t.tags ?? [],
    actualMinutes: t.actualMinutes ?? 0,
    runningFrom: undefined,

    startAt: startAtISO,
    dueAt: t.dueAt ?? `${dueDate}T23:59:59.000Z`,

    completedAt: (t as any).completedAt,
    checklist: t.checklist ?? [],

    createdAt: (t as any).createdAt ?? nowIso(),
    updatedAt: nowIso(),
  } as Task;
}

interface State {
  [x: string]: any;
  tasks: Task[];
  filters: FilterState;

  add: (t: Omit<Task, "id" | "createdAt" | "updatedAt"> | Partial<Task>) => void;
  update: (id: string, patch: Partial<Task>) => void;
  remove: (id: string) => void;

  setFilters: (f: Partial<FilterState>) => void;
  clearAll: () => void;

  startNow: (id: string) => void;
  pause: (id: string) => void;
  toggleStatus: (id: string) => void;

  logProgress: (taskId: string, dateISO: string, addMin: number) => void;

  addSubtask: (taskId: string, text: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  updateSubtask: (taskId: string, subId: string, text: string) => void;
  removeSubtask: (taskId: string, subId: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      tasks: [],
      filters: { q: "", cat: "all", status: "all" },

      add: (t) => {
        const normalized = normalizeTaskBase(t as Partial<Task>);
        set({ tasks: [normalized, ...get().tasks] });
      },

      update: (id, patch) => {
        set({
          tasks: get().tasks.map((x) => {
            if (x.id !== id) return x;
            if (x.status !== "todo") return x;
            const nextStart = toLocalYMD(patch.startDate ?? x.startDate);
            const nextDue = toLocalYMD(patch.dueDate ?? x.dueDate);
            return {
              ...x,
              ...patch,
              startDate: nextStart,
              dueDate: nextDue,
              updatedAt: nowIso(),
            };
          }),
        });
      },

      remove: (id) => {
        set({ tasks: get().tasks.filter((x) => x.id !== id) });
      },

      setFilters: (f) => {
        set({ filters: { ...get().filters, ...f } });
      },

      clearAll: () => {
        set({ tasks: [] });
      },

      startNow: (id) => {
        const anyRunning = get().tasks.find(
          (t) => !!t.runningFrom && t.id !== id
        );
        if (anyRunning) return;
        set({
          tasks: get().tasks.map((t) => {
            if (t.id !== id) return t;
            if (t.status === "in_progress" && t.runningFrom) return t;
            const started = nowIso();
            return {
              ...t,
              status: "in_progress",
              runningFrom: started,
              startAt: t.startAt ?? started,
              updatedAt: started,
            };
          }),
        });
      },

      pause: (id) => {
        set({
          tasks: get().tasks.map((t) => {
            if (t.id !== id) return t;
            if (!t.runningFrom) return t;

            const end = nowIso();
            const plus = diffMins(t.runningFrom, end);

            const day = todayLocal();
            const progress = { ...(t.progress ?? {}) };
            progress[day] = (progress[day] ?? 0) + plus;

            return {
              ...t,
              status: "todo",
              runningFrom: undefined,
              actualMinutes: (t.actualMinutes ?? 0) + plus,
              progress,
              updatedAt: end,
            };
          }),
        });
      },

      toggleStatus: (id) => {
        set({
          tasks: get().tasks.map((t) => {
            if (t.id !== id) return t;
            const timeNow = nowIso();

            if (t.status === "done") {
              return {
                ...t,
                status: "todo",
                completedAt: undefined,
                updatedAt: timeNow,
              };
            }

            if (t.runningFrom) return t;

            const todayYMD = todayLocal();
            const requiredToday = t.dailyMinutes ?? 0;
            const doneToday = t.progress?.[todayYMD] ?? 0;

            if (
              (requiredToday > 0 && doneToday < requiredToday) ||
              (t.estimateTotalMin != null &&
                (t.actualMinutes ?? 0) < t.estimateTotalMin)
            ) {
              return t;
            }

            let extra = 0;
            if (t.runningFrom) extra = diffMins(t.runningFrom, timeNow);
            return {
              ...t,
              status: "done",
              runningFrom: undefined,
              completedAt: timeNow,
              actualMinutes: (t.actualMinutes ?? 0) + extra,
              updatedAt: timeNow,
            };
          }),
        });
      },

      logProgress: (taskId, dateISO, addMin) => {
        const dayKey = toLocalYMD(dateISO);
        set({
          tasks: get().tasks.map((t) => {
            if (t.id !== taskId) return t;
            const progress = { ...(t.progress ?? {}) };
            progress[dayKey] =
              (progress[dayKey] ?? 0) + Math.max(0, addMin);
            return { ...t, progress, updatedAt: nowIso() };
          }),
        });
      },

      addSubtask: (taskId, text) => {
        set({
          tasks: get().tasks.map((x) => {
            if (x.id !== taskId) return x;
            if (x.status === "done") return x;
            return {
              ...x,
              checklist: [
                { id: makeId(), text, done: false },
                ...(x.checklist ?? []),
              ],
              updatedAt: nowIso(),
            };
          }),
        });
      },

      toggleSubtask: (taskId, subId) => {
        set({
          tasks: get().tasks.map((x) => {
            if (x.id !== taskId) return x;
            if (x.status === "done") return x;
            const checklist = (x.checklist ?? []).map((s) =>
              s.id === subId ? { ...s, done: !s.done } : s
            );
            return { ...x, checklist, updatedAt: nowIso() };
          }),
        });
      },

      updateSubtask: (taskId, subId, text) => {
        set({
          tasks: get().tasks.map((x) => {
            if (x.id !== taskId) return x;
            if (x.status === "done") return x;
            return {
              ...x,
              checklist: (x.checklist ?? []).map((s) =>
                s.id === subId ? { ...s, text } : s
              ),
              updatedAt: nowIso(),
            };
          }),
        });
      },

      removeSubtask: (taskId, subId) => {
        set({
          tasks: get().tasks.map((x) => {
            if (x.id !== taskId) return x;
            if (x.status === "done") return x;
            return {
              ...x,
              checklist: (x.checklist ?? []).filter((s) => s.id !== subId),
              updatedAt: nowIso(),
            };
          }),
        });
      },
    }),
    {
      name: "ssp",                 
      storage: perUserJSONStorage,
      version: 2,
      migrate: (persisted: any, _fromVersion) => {
        if (!persisted || !persisted.state) return persisted;
        const st = persisted.state;
        if (Array.isArray(st.tasks)) {
          st.tasks = st.tasks.map((t: any) => normalizeTaskBase(t));
        }
        return persisted;
      },
      // partialize: (s) => ({ tasks: s.tasks, filters: s.filters }),
    }
  )
);

export const useFilteredTasks = () => {
  const tasks = useStore((s) => s.tasks);
  const filters = useStore((s) => s.filters);

  return useMemo(() => {
    const q = (filters.q ?? "").toLowerCase().trim();
    return tasks.filter((t) => {
      const matchQ = q
        ? (
            t.title +
            (t.description ?? "") +
            (t.tags ?? []).join(" ")
          )
            .toLowerCase()
            .includes(q)
        : true;

      const matchCat =
        filters.cat === "all"
          ? true
          : (t.category ?? "personal") === filters.cat;
      const matchStatus =
        filters.status === "all" ? true : t.status === filters.status;

      return matchQ && matchCat && matchStatus;
    });
  }, [tasks, (filters.q as string), filters.cat, filters.status]);
};

export function canMarkDone(t: Task, _todayISO?: string) {
  if (t.runningFrom) return false;

  const todayYMD = todayLocal();
  const requiredToday = t.dailyMinutes ?? 0;
  const doneToday = t.progress?.[todayYMD] ?? 0;
  if (requiredToday > 0 && doneToday < requiredToday) return false;

  if (t.estimateTotalMin != null) {
    const actual = t.actualMinutes ?? 0;
    if (actual < t.estimateTotalMin) return false;
  }

  return true;
}
