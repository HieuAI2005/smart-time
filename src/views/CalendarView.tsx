import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, parseISO, isToday,
  setMonth, setYear, addWeeks, subWeeks
} from "date-fns";
import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Star } from "lucide-react";

type ViewMode = "month" | "week";

type EventMini = {
  title: string;
  status: "todo" | "in_progress" | "done";
  startAt?: Date;
  endAt?: Date;
};

export default function CalendarView() {
  const tasks = useStore((s) => s.tasks);
  const snaps = useStore((s) => s.slimSnapshots);

  const [mode, setMode] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState<Date>(new Date());

  const ymd = (d: Date) => format(d, "yyyy-MM-dd");
  const todayISO = ymd(new Date());

  const toStartISO = (t: any) =>
    t.startAt ?? (t.startDate ? `${t.startDate}T12:00:00Z` : undefined);
  const toDueISO = (t: any) =>
    t.dueAt ?? (t.dueDate ? `${t.dueDate}T12:00:00Z` : undefined);

  const reqDoneForDay = (dayIso: string) => {
    let required = 0;
    let done = 0;
    const nowISO = new Date().toISOString();

    const diffMins = (aIso: string, bIso: string) =>
      Math.max(0, Math.floor((new Date(bIso).getTime() - new Date(aIso).getTime()) / 60000));

    for (const t of tasks) {
      if (!t?.startDate || !t?.dueDate) continue;
      if (dayIso < t.startDate || dayIso > t.dueDate) continue;

      const daysOfWeek: number[] | undefined =
        t.autoScheduleRule?.daysOfWeek ?? t.autoScheduleRule?.daysOfWeek;
      if (daysOfWeek && daysOfWeek.length > 0) {
        const js = new Date(dayIso + "T00:00:00").getDay(); // 0..6
        const dow1 = js === 0 ? 7 : js; // 1..7
        const match = daysOfWeek.includes(js) || daysOfWeek.includes(dow1);
        if (!match) continue;
      }

      const daily = t.dailyMinutes ?? 0;
      if (daily > 0) required += daily;

      if (t.progress && t.progress[dayIso]) {
        done += t.progress[dayIso];
      }

      if (dayIso === todayISO && t.runningFrom) {
        done += diffMins(t.runningFrom, nowISO);
      }
    }
    return { required, done };
  };

  const isHitDay = (d: Date): boolean => {
    const dayIso = ymd(d);
    if (dayIso < todayISO) {
      return !!snaps?.[dayIso]?.hit;
    }
    if (dayIso === todayISO) {
      const { required, done } = reqDoneForDay(dayIso);
      return required > 0 && done / required >= 1.0;
    }
    return false;
  };

  const monthCells = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(cursor),   { weekStartsOn: 1 });
    const days  = eachDayOfInterval({ start, end });

    return days.map((d) => {
      const starts: EventMini[] = tasks
        .filter((t) => {
          const sISO = toStartISO(t);
          if (!sISO) return false;
          return ymd(parseISO(sISO)) === ymd(d);
        })
        .map((t) => ({
          title: t.title,
          status: t.status,
          startAt: toStartISO(t) ? parseISO(toStartISO(t)!) : undefined,
          endAt:   toDueISO(t)   ? parseISO(toDueISO(t)!)   : undefined,
        }));

      const dues: EventMini[] = tasks
        .filter((t) => {
          const eISO = toDueISO(t);
          if (!eISO) return false;
          return ymd(parseISO(eISO)) === ymd(d);
        })
        .map((t) => ({
          title: t.title,
          status: t.status,
          startAt: toStartISO(t) ? parseISO(toStartISO(t)!) : undefined,
          endAt:   toDueISO(t)   ? parseISO(toDueISO(t)!)   : undefined,
        }));

      return {
        date: d,
        starts,
        dues,
        isCurrentMonth: isSameMonth(d, cursor),
        hit: isHitDay(d), 
      };
    });
  }, [cursor, tasks, snaps]);

  const weekCells = useMemo(() => {
    const wStart = startOfWeek(cursor, { weekStartsOn: 1 });
    const wEnd   = endOfWeek(cursor,   { weekStartsOn: 1 });
    const days   = eachDayOfInterval({ start: wStart, end: wEnd });

    return days.map((d) => {
      const starts: EventMini[] = tasks
        .filter((t) => {
          const sISO = toStartISO(t);
          if (!sISO) return false;
          return ymd(parseISO(sISO)) === ymd(d);
        })
        .map((t) => ({
          title: t.title,
          status: t.status,
          startAt: toStartISO(t) ? parseISO(toStartISO(t)!) : undefined,
          endAt:   toDueISO(t)   ? parseISO(toDueISO(t)!)   : undefined,
        }));

      const dues: EventMini[] = tasks
        .filter((t) => {
          const eISO = toDueISO(t);
          if (!eISO) return false;
          return ymd(parseISO(eISO)) === ymd(d);
        })
        .map((t) => ({
          title: t.title,
          status: t.status,
          startAt: toStartISO(t) ? parseISO(toStartISO(t)!) : undefined,
          endAt:   toDueISO(t)   ? parseISO(toDueISO(t)!)   : undefined,
        }));

      return { date: d, starts, dues, hit: isHitDay(d) };
    });
  }, [cursor, tasks, snaps]);

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => thisYear - 5 + i);

  const goPrev  = () => setCursor(mode === "month" ? subMonths(cursor, 1) : subWeeks(cursor, 1));
  const goNext  = () => setCursor(mode === "month" ? addMonths(cursor, 1) : addWeeks(cursor, 1));
  const goToday = () => setCursor(new Date());

  return (
    <section className="cal-month">
      {/* Header */}
      <div className="cal-bar">
        <div className="cal-left">
          <div className="cal-title">
            {mode === "month"
              ? format(cursor, "MMMM yyyy")
              : `Week of ${format(startOfWeek(cursor, {weekStartsOn:1}), "dd/MM")} – ${format(endOfWeek(cursor,{weekStartsOn:1}), "dd/MM")}`}
          </div>
          <div className="cal-controls">
            <button className="btn btn-ghost" onClick={goPrev}>‹ Prev</button>
            <button className="btn btn-ghost" onClick={goToday}>Today</button>
            <button className="btn btn-ghost" onClick={goNext}>Next ›</button>
          </div>
        </div>

        <div className="cal-right" style={{ gap: 10 }}>
          <div className="seg">
            <button className={`seg-btn ${mode === "week" ? "active": ""}`} onClick={()=>setMode("week")}>Week</button>
            <button className={`seg-btn ${mode === "month" ? "active": ""}`} onClick={()=>setMode("month")}>Month</button>
          </div>

          {mode === "month" && (
            <>
              <select
                className="select"
                value={cursor.getMonth()}
                onChange={(e) => setCursor(setMonth(cursor, Number(e.target.value)))}
                aria-label="Month"
              >
                {Array.from({ length: 12 }, (_, m) => (
                  <option key={m} value={m}>{format(setMonth(new Date(2000,0,1), m), "MMM")}</option>
                ))}
              </select>
              <select
                className="select"
                value={cursor.getFullYear()}
                onChange={(e) => setCursor(setYear(cursor, Number(e.target.value)))}
                aria-label="Year"
              >
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
        </div>
      </div>

      {mode === "month" && (
        <div className="cal-weekdays">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((w) => (
            <div key={w} className="cal-weekday">{w}</div>
          ))}
        </div>
      )}

      {/* Grids */}
      {mode === "month" ? (
        <div className="cal-grid">
          {monthCells.map((cell) => {
            const notInMonth = !cell.isCurrentMonth;
            const today = isToday(cell.date);
            return (
              <div
                key={cell.date.toISOString()}
                className={`cal-cell ${notInMonth ? "muted" : ""} ${today ? "today" : ""}`}
              >
                <div className="cal-cell-head" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span className="cal-daynum">{format(cell.date, "d")}</span>
                  {cell.hit && (
                    <Star size={14} className="star-hit" style={{ color:"#eab308" }} />
                  )}
                </div>
                <div className="cal-events">
                  {cell.starts.slice(0, 3).map((e, i) => (
                    <div
                      className={`chip ${e.status === "done" ? "done" : "start"}`}
                      key={`s-${i}`}
                      title={rangeTitle(e)}
                    >
                      {truncate(e.title, 20)}
                    </div>
                  ))}
                  {cell.starts.length > 3 && <div className="chip more">{`+${cell.starts.length - 3} more`}</div>}

                  {cell.dues.slice(0, 3).map((e, i) => (
                    <div className={`chip end`} key={`d-${i}`} title={rangeTitle(e)}>
                      {truncate(e.title, 18)}
                    </div>
                  ))}
                  {cell.dues.length > 3 && <div className="chip more">{`+${cell.dues.length - 3} more`}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cal-grid week">
        {weekCells.map((cell) => {
          const today = isToday(cell.date);
          return (
            <div
              key={cell.date.toISOString()}
              className={`cal-cell ${today ? "today" : ""}`}
            >
              <div className="cal-cell-head week" style={{ display: "flex" }}>
                <span
                  className="cal-head-pill"
                  style={{
                    display: "inline-flex",      
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",       
                  }}
                >
                  {cell.hit && (
                    <span
                      aria-hidden
                      style={{
                        color: "#eab308",     
                        fontSize: 14,
                        lineHeight: 1, 
                      }}
                      title="Hit day"
                    >
                      ★
                    </span>
                  )}

                  <span className="w">{format(cell.date, "EEE")}</span>
                  <span className="dot">·</span>
                  <span className="n">{format(cell.date, "d")}</span>
                </span>
              </div>

              <div className="cal-events" style={{ alignItems: "center" }}>
                {cell.starts.map((e, i) => (
                  <div
                    className={`chip ${e.status === "done" ? "done" : "start"}`}
                    key={`ws-${i}`}
                    title={rangeTitle(e)}
                  >
                    {truncate(e.title, 24)}
                  </div>
                ))}
                {cell.dues.map((e, i) => (
                  <div className="chip end" key={`wd-${i}`} title={rangeTitle(e)}>
                    {truncate(e.title, 22)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        </div>
      )}
    </section>
  );
}

function rangeTitle(e: EventMini) {
  const s = e.startAt ? format(e.startAt, "dd/MM/yyyy") : "";
  const d = e.endAt   ? format(e.endAt,   "dd/MM/yyyy") : "";
  if (s && d) return `${e.title}\n${s} → ${d}`;
  if (s)     return `${e.title}\nStart: ${s}`;
  if (d)     return `${e.title}\nEnd: ${d}`;
  return e.title;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}