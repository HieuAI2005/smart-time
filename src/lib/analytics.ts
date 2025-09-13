import type { Task } from "./types";

export function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

function safeDate(iso?: string) {
  if (!iso) return NaN;
  const t = Date.parse(iso + "T00:00:00Z");
  return Number.isFinite(t) ? t : NaN;
}

export function diffDays(aISO: string, bISO: string) {
  const a = safeDate(aISO), b = safeDate(bISO);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

export function addDays(iso: string, n: number) {
  const base = safeDate(iso);
  const d = Number.isFinite(base) ? new Date(base) : new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function listDates(fromISO: string, toISO: string) {
  const out: string[] = [];
  if (!fromISO || !toISO) return out;
  if (fromISO > toISO) return out;
  let cur = fromISO;
  let guard = 0;
  while (cur <= toISO && guard < 365) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

export function lastNDays(n: number, todayISO: string) {
  return listDates(addDays(todayISO, -(n - 1)), todayISO);
}

function getDaysOfWeek(rule: any): number[] | undefined {
  if (!rule) return undefined;
  return rule.daysOfWeek ?? rule.dayOfWeek; 
}

export function isActiveOnDay(t: Task, dayISO: string) {
  if (!t.startDate || !t.dueDate) return false;
  if (dayISO < t.startDate || dayISO > t.dueDate) return false;

  const days = getDaysOfWeek(t.autoScheduleRule);
  if (!days || days.length === 0) return true;

  const js = new Date(dayISO + "T00:00:00").getDay();
  const dow = js === 0 ? 7 : js; // 1..7
  return days.includes(dow);
}

export function requiredOnDay(t: Task, dayISO: string) {
  return isActiveOnDay(t, dayISO) ? (t.dailyMinutes ?? 0) : 0;
}

export function doneOnDay(t: Task, dayISO: string) {
  return t.progress?.[dayISO] ?? 0;
}

export function liveMinutesToday(t: Task, todayISO: string) {
  if (!t?.runningFrom) return 0;
  const startMs = new Date(t.runningFrom).getTime();
  const dayStart = new Date(todayISO + "T00:00:00").getTime();
  const dayEnd   = new Date(todayISO + "T23:59:59").getTime();
  const from = Math.max(startMs, dayStart);
  const to   = Math.min(Date.now(), dayEnd);
  if (to <= from) return 0;
  return Math.floor((to - from) / 60000);
}

export function deadlineRatio(todayISO: string, startISO: string, dueISO: string) {
  if (todayISO < startISO) return 0;
  const total = Math.max(1, diffDays(startISO, dueISO));
  const spent = clamp(diffDays(startISO, todayISO), 0, total);
  return clamp(spent / total, 0, 1);
}

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

export function fmtMinHuman(mins: number) {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60; 
  if (h > 0 && r > 0) return `${h}h ${r}m`;
  if (h > 0) return `${h}h`;
  return `${r}m`;
}

export function summarizeAnalytics(tasks: Task[], todayISO: string, daysWindow = 14) {
  const cleanTasks = (tasks || []).filter(
    t => t.startDate && t.dueDate && t.startDate <= t.dueDate
  );

  const days = lastNDays(daysWindow, todayISO);

  const perDay = days.map(day => {
    const required = cleanTasks.reduce((s, t) => s + requiredOnDay(t, day), 0);
    const doneBase = cleanTasks.reduce((s, t) => s + doneOnDay(t, day), 0);
    const live = day === todayISO
      ? cleanTasks.reduce((s, t) => s + liveMinutesToday(t, todayISO), 0)
      : 0;
    const done = doneBase + live;
    const deficit = Math.max(0, required - done);
    return { day, required, done, deficit };
  });

  const reqSum  = perDay.reduce((s, d) => s + d.required, 0);
  const doneSum = perDay.reduce((s, d) => s + d.done, 0);
  const adherence = reqSum > 0 ? Math.round((doneSum / reqSum) * 100) : 100;
  const threshold = 1.0; 

  let endIdx = perDay.length - 1;
  const today = perDay[endIdx];
  if (today) {
    const todayReq = today.required;
    if (todayReq > 0) {
      const todayPct = today.done / todayReq;
      if (todayPct < threshold) endIdx--;
    }
  }

  let streak = 0;
  for (let i = endIdx; i >= 0; i--) {
    const d = perDay[i];
    if (d.required === 0) continue;     
    const pct = d.done / d.required;
    if (pct >= threshold) streak++; else break;  
  }

  const deficitTotal = perDay.reduce((s, d) => s + d.deficit, 0);
  const todayActive = cleanTasks.filter(t => isActiveOnDay(t, todayISO));
  const pressure = todayActive.length
    ? avg(todayActive.map(t => deadlineRatio(todayISO, t.startDate!, t.dueDate!)))
    : 0;

  const suggestions = suggestDailyCatchUp(cleanTasks, todayISO);

  return { perDay, adherence, streak, deficitTotal, pressure, suggestions };
}

export function suggestDailyCatchUp(tasks: Task[], todayISO: string) {
  type Sug = {
    taskId: string; title: string;
    addPerDay: number; daysLeft: number; deficit: number;
    dueDate?: string; dailyMinutes?: number;
    isToday: boolean; todayReq: number; todayDone: number;
  };
  const out: Sug[] = [];

  for (const t of tasks) {
    if (!t.startDate || !t.dueDate || t.startDate > t.dueDate) continue;

    const isToday = isActiveOnDay(t, todayISO);
    const todayReq = requiredOnDay(t, todayISO);
    const todayDone = doneOnDay(t, todayISO) + (isToday ? liveMinutesToday(t, todayISO) : 0);

    const fromISO = todayISO < t.startDate ? t.startDate : todayISO;
    const toISO   = t.dueDate;
    const daysList = listDates(fromISO, toISO).filter(d => isActiveOnDay(t, d));
    const daysLeft = daysList.length;
    const daily    = t.dailyMinutes ?? 0;
    if (daysLeft <= 0 || daily <= 0) continue;

    const reqLeft  = daily * daysLeft;

    const doneLeft = daysList.reduce((s, d) => {
      const base = s + (t.progress?.[d] ?? 0);
      if (d === todayISO) return base + liveMinutesToday(t, todayISO);
      return base;
    }, 0);

    const deficit  = Math.max(0, reqLeft - doneLeft);
    if (deficit <= 0) continue;

    let addPerDay = Math.ceil(deficit / daysLeft / 5) * 5;
    addPerDay = Math.min(addPerDay, 240);                 

    out.push({
      taskId: t.id, title: t.title,
      addPerDay, daysLeft, deficit,
      dueDate: t.dueDate, dailyMinutes: t.dailyMinutes ?? 0,
      isToday, todayReq, todayDone
    });
  }

  out.sort((a, b) => (Number(b.isToday) - Number(a.isToday)) || (b.deficit - a.deficit));
  return out;
}