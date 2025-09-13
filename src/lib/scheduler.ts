import type { Task } from "./types";
import { isBetween, parseHHmm, diffDays, clamp } from "./date";

export type TodaySlot = {
  taskId: string;
  title: string;
  needMin: number;
  start: Date;
  end: Date;
  pressureRatio: number;
  dueInDays: number;
  visibility?: Task["visibility"];
};

export function deadlineRatio(todayISO: string, startISO: string, dueISO: string){
  const total = Math.max(1, diffDays(startISO, dueISO));
  const spent = clamp(diffDays(startISO, todayISO), 0, total);
  return clamp(spent / total, 0, 1);
}

function isActiveDay(task: Task, dateISO: string){
  const dow = new Date(dateISO + "T00:00:00").getDay() || 7; // 1..7
  const list = task.autoScheduleRule?.daysOfWeek;
  return !list || list.length === 0 || list.includes(dow);
}

export function buildTodayPlan(todayISO: string, tasks: Task[]): TodaySlot[] {
  const candidates = tasks.filter(
    t => t.startDate && t.dueDate &&
         isBetween(todayISO, t.startDate, t.dueDate) &&
         isActiveDay(t, todayISO)
  );

  const todo = candidates.map(t => {
    const doneToday = t.progress?.[todayISO] ?? 0;
    const need = Math.max(0, (t.dailyMinutes ?? 0) - doneToday);
    const ratio = deadlineRatio(todayISO, t.startDate, t.dueDate);
    const dueIn = diffDays(todayISO, t.dueDate);
    return { t, need, ratio, dueIn };
  }).filter(x => x.need > 0);

  todo.sort((a, b) => {
    const bonusA = a.t.visibility && a.t.visibility !== "private" ? 0.1 : 0;
    const bonusB = b.t.visibility && b.t.visibility !== "private" ? 0.1 : 0;
    return (b.ratio + b.need/100 + bonusB) - (a.ratio + a.need/100 + bonusA);
  });

  const rough = todo.map((it) => {
    const earliest = it.t.autoScheduleRule?.earliestHHmm ?? "22:00";
    const start = parseHHmm(earliest, todayISO);
    const end   = new Date(+start + it.need*60000);
    return { it, start, end };
  });

  rough.sort((a,b) => +a.start - +b.start);

  return rough.map(({ it, start, end }) => ({
    taskId: it.t.id,
    title: it.t.title,
    needMin: it.need,
    start, end,
    pressureRatio: it.ratio,
    dueInDays: it.dueIn,
    visibility: it.t.visibility
  }));
}

export function pressureBg(ratio: number){
  const hue = Math.round(120 - 120*ratio);
  return `hsl(${hue} 85% 94%)`;
}