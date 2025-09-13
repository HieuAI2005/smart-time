import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStore, todayLocal } from "../lib/store";
import { summarizeAnalytics, fmtMinHuman } from "../lib/analytics";

export default function AnalyticsView() {
  const tasks = useStore((s) => s.tasks);
  const snaps = useStore((s) => s.slimSnapshots); 
  const today = useMemo(() => todayLocal(), []);
  const nav = useNavigate();

  const stats = useMemo(() => {
    try {
      return summarizeAnalytics(tasks || [], today, 7);
    } catch (e) {
      console.error("Analytics error:", e);
      return null;
    }
  }, [tasks, today]);

  const forward7 = useMemo(
    () => buildForwardWindow(tasks || [], today, 7),
    [tasks, today]
  );

  if (!stats) {
    return (
      <div className="card pad">
        There was an error calculating Analytics. Check the date data (start/due).
      </div>
    );
  }

  const { adherence, streak, deficitTotal, pressure, suggestions } = stats;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Analytics</h2>

      {/* Summary stats */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 }}
      >
        <StatCard
          label="% of days achieved"
          value={`${adherence}%`}
          hint="In the last 7 days"
        />
        <StatCard
          label="Streak"
          value={`${streak} day${streak > 1 ? "s" : ""}`}
          hint="Most recent series of days"
        />
        <StatCard
          label="Cumulative deficiency"
          value={fmtMinHuman(deficitTotal)}
          hint="Total shortage in 7 days"
        />
        <StatCard
          label="Deadline pressure"
          value={pressure.toFixed(2)}
          hint="0 (far) → 1 (close)"
        />
      </div>

      {/* Today → Next 6 days (strip) */}
      <div className="card pad" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Today → Next 6 days</div>

        {!forward7.length ? (
          <div style={{ opacity: 0.7 }}>No data.</div>
        ) : (
          <WeekStrip items={forward7} todayISO={today} snaps={snaps} />
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            fontSize: 12,
            opacity: 0.8,
          }}
        >
          <Legend sw="#16a34a" label="Hit (≥100%)" />
          <Legend sw="#eab308" label="Near (80–99%)" />
          <Legend sw="#ef4444" label="Miss (<80%)" />
          <Legend sw="#9ca3af" label="No requirement" />
        </div>
      </div>

      {/* Tips */}
      <div className="card pad" style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 700 }}>Tips to keep up with progress</div>
        {!suggestions?.length ? (
          <div style={{ opacity: 0.8 }}>
            You're on track – no extra time needed. 🎯
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {suggestions.map((s: any) => {
              const isToday = !!s.isToday;
              const todayReq =
                typeof s.todayReq === "number" ? s.todayReq : undefined;
              const todayDone =
                typeof s.todayDone === "number" ? s.todayDone : undefined;

              return (
                <div
                  key={s.taskId}
                  className="card"
                  style={{ padding: 12, display: "grid", gap: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {s.title} {isToday ? <span className="pill">Today</span> : null}
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                        +{fmtMinHuman(s.addPerDay)} / day
                      </span>
                      {isToday && (
                        <button
                          className="btn btn-ghost btn-small"
                          onClick={() =>
                            nav("/", { state: { focusTaskId: s.taskId } })
                          }
                          title="Go to today's task"
                        >
                          Focus today
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}
                  >
                    <Chip label={`Deficit: ${fmtMinHuman(s.deficit)}`} tone="red" />
                    {s.dueDate && (
                      <Chip
                        label={`Due: ${new Date(
                          s.dueDate + "T00:00:00"
                        ).toLocaleDateString()}`}
                      />
                    )}
                    <Chip label={`Active days left: ${s.daysLeft}`} />
                    {typeof s.dailyMinutes === "number" && (
                      <Chip label={`Daily target: ${fmtMinHuman(s.dailyMinutes)}`} />
                    )}
                    {isToday && todayReq != null && todayDone != null && (
                      <Chip
                        label={`Today: ${fmtMinHuman(todayDone)}/${fmtMinHuman(
                          todayReq
                        )}`}
                        tone="blue"
                      />
                    )}
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    Suggestion: increase your daily target by{" "}
                    <b>{fmtMinHuman(s.addPerDay)}</b> for the next{" "}
                    <b>{s.daysLeft}</b> active day(s) to clear the remaining{" "}
                    <b>{fmtMinHuman(s.deficit)}</b>.
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card pad" style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, opacity: 0.6 }}>{hint}</div>}
    </div>
  );
}

type DayItem = { day: string; required: number; done: number; deficit: number };

function WeekStrip({
  items,
  todayISO,
  snaps,
}: {
  items: DayItem[];
  todayISO: string;
  snaps: Record<string, { pct: number; noReq: boolean; hit: boolean }>;
}) {
  return (
    <div className="weekstrip-wrap" style={{ overflowX: "auto", paddingBottom: 6 }}>
      <div className="weekstrip-row" style={{ display: "flex", gap: 12 }}>
        {items.map((d) => {
          const isToday = d.day === todayISO;
          const snap = d.day < todayISO ? snaps?.[d.day] : undefined;

          let pct = 0;
          let status: "hit" | "near" | "miss" | "none" = "none";
          let req = d.required;
          let done = d.done;
          let def = Math.max(0, d.required - d.done);

          if (snap) {
            pct = Math.round((snap.pct || 0) * 100);
            status = snap.noReq ? "none" : pct >= 100 ? "hit" : pct >= 80 ? "near" : "miss";
            req = 0;
            done = 0;
            def = 0; 
          } else {
            const ratio = d.required > 0 ? Math.min(1, d.done / d.required) : 0;
            pct = Math.round(ratio * 100);
            status =
              d.required === 0 ? "none" : pct >= 100 ? "hit" : pct >= 80 ? "near" : "miss";
          }

          const ui = statusStyle(status);

          return (
            <article
              key={d.day}
              className="daycard"
              style={{
                width: 168,
                flex: "0 0 auto",
                padding: 10,
                border: `1px solid ${ui.border}`,
                borderRadius: 14,
                background: ui.bg,
                boxShadow: "0 8px 16px rgba(0,0,0,.04)",
              }}
              title={`${isToday ? "Today" : formatDayLong(d.day)}\nRequired: ${req}′\nDone: ${done}′\nDeficit: ${def}′`}
            >
              <header
                className="daycard-head"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <div className="daycard-date">
                  <span className={`pill ${isToday ? "pill-today" : ""}`}>
                    {isToday ? "Today" : formatDayShort(d.day)}
                  </span>
                </div>
                <span
                  className="status-chip"
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    background: ui.chipBg,
                    color: ui.chipFg,
                  }}
                >
                  {statusLabel(status)}
                </span>
              </header>

              <div
                className="daycard-main"
                style={{
                  display: "grid",
                  gridTemplateColumns: "46px 1fr",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <ProgressRing size={46} stroke={6} percent={pct} color={ui.accent} />
                <div className="daycard-kpis" style={{ display: "flex", gap: 8 }}>
                  <div className="kpi" style={{ fontSize: 12, textAlign: "center" }}>
                    <b className="text-gray-900 dark:text-gray-100">{req}</b>
                    <span className="block text-gray-600 dark:text-gray-300">req</span>
                  </div>
                  <div className="kpi" style={{ fontSize: 12, textAlign: "center" }}>
                    <b className="text-gray-900 dark:text-gray-100">{done}</b>
                    <span className="block text-gray-600 dark:text-gray-300">done</span>
                  </div>
                  <div className="kpi" style={{ fontSize: 12, textAlign: "center" }}>
                    <b className="text-gray-900 dark:text-gray-100">{def}</b>
                    <span className="block text-gray-600 dark:text-gray-300">def</span>
                  </div>
                </div>
              </div>

              {/* tiny bar */}
              <div
                className="tinybar"
                style={{
                  position: "relative",
                  height: 8,
                  marginTop: 8,
                  borderRadius: 999,
                  background: "var(--tinyTrack,#eef2f7)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="tinybar-req"
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(90deg,#d1d5db,#e5e7eb)",
                  }}
                />
                <div
                  className="tinybar-done"
                  style={{
                    position: "absolute",
                    inset: "0 auto 0 0",
                    background: "#2563eb",
                    width: `${req ? Math.min(100, Math.round((done / Math.max(1, req, 60)) * 100)) : 0}%`,
                  }}
                />
                <span
                  className="tinybar-mark"
                  style={{
                    position: "absolute",
                    top: -2,
                    bottom: -2,
                    left: "calc(100% - 2px)",
                    width: 2,
                    background: "#9ca3af",
                    opacity: 0.9,
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function statusLabel(s: "hit" | "near" | "miss" | "none") {
  if (s === "hit") return "Hit";
  if (s === "near") return "Near";
  if (s === "miss") return "Miss";
  return "No req";
}

function statusStyle(s: "hit" | "near" | "miss" | "none") {
  if (s === "hit")
    return {
      bg: "linear-gradient(180deg,#f0fdf4,#ffffff)",
      border: "#bbf7d0",
      chipBg: "#16a34a22",
      chipFg: "#166534",
      accent: "#16a34a",
    };
  if (s === "near")
    return {
      bg: "linear-gradient(180deg,#fffbeb,#ffffff)",
      border: "#fde68a",
      chipBg: "#eab30822",
      chipFg: "#854d0e",
      accent: "#eab308",
    };
  if (s === "miss")
    return {
      bg: "linear-gradient(180deg,#fef2f2,#ffffff)",
      border: "#fecaca",
      chipBg: "#ef444422",
      chipFg: "#7f1d1d",
      accent: "#ef4444",
    };
  return {
    bg: "linear-gradient(180deg,#f3f4f6,#ffffff)",
    border: "#e5e7eb",
    chipBg: "#9ca3af22",
    chipFg: "#374151",
    accent: "#9ca3af",
  };
}

function Legend({ sw, label }: { sw: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: sw,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}

function ProgressRing({
  size = 46,
  stroke = 6,
  percent,
  color = "#2563eb",
}: {
  size?: number;
  stroke?: number;
  percent: number;
  color?: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const bg = `conic-gradient(${color} ${p}%, var(--ringTrack,#e5e7eb) ${p}% 100%)`;
  const inner = size - stroke * 2;

  return (
    <div
      aria-label={`Progress ${p}%`}
      className="ring"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div
        className="ring-inner"
        style={{
          width: inner,
          height: inner,
          borderRadius: "50%",
          background: "var(--card,#fff)",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {p}%
      </div>
    </div>
  );
}

function formatDayShort(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const wd = d.toLocaleDateString(undefined, { weekday: "short" });
  const md = d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
  return `${wd} ${md}`;
}

function formatDayLong(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDaysISO(iso: string, n: number) {
  const dt = new Date(iso + "T00:00:00");
  dt.setDate(dt.getDate() + n);
  return toISO(dt);
}

function buildForwardWindow(
  tasks: any[],
  todayISO: string,
  days: number
): Array<{ day: string; required: number; done: number; deficit: number }> {
  const out: Array<{ day: string; required: number; done: number; deficit: number }> = [];
  const nowISO = new Date().toISOString();

  const diffMins = (aIso: string, bIso: string) =>
    Math.max(0, Math.floor((new Date(bIso).getTime() - new Date(aIso).getTime()) / 60000));

  for (let i = 0; i < days; i++) {
    const day = addDaysISO(todayISO, i);
    let required = 0;
    let done = 0;

    for (const t of tasks) {
      if (!t?.startDate || !t?.dueDate) continue;
      if (day < t.startDate || day > t.dueDate) continue;
      const daysOfWeek: number[] | undefined =
        t.autoScheduleRule?.daysOfWeek ?? t.autoScheduleRule?.dayOfWeek;

      if (daysOfWeek && daysOfWeek.length > 0) {
        const js = new Date(day + "T00:00:00").getDay(); // 0..6
        const dow1 = js === 0 ? 7 : js; // 1..7
        const match = daysOfWeek.includes(js) || daysOfWeek.includes(dow1);
        if (!match) continue;
      }

      const daily = t.dailyMinutes ?? 0;
      if (daily > 0) required += daily;

      if (t.progress && t.progress[day]) {
        done += t.progress[day];
      }

      if (day === todayISO && t.runningFrom) {
        done += diffMins(t.runningFrom, nowISO);
      }
    }

    const deficit = Math.max(0, required - done);
    out.push({ day, required, done, deficit });
  }
  return out;
}

function Chip({ label, tone }: { label: string; tone?: "red" | "gray" | "blue" | "green" }) {
  const map: Record<string, { bg: string; fg: string; bd: string }> = {
    red: { bg: "#fee2e2", fg: "#7f1d1d", bd: "#fecaca" },
    gray: { bg: "#f3f4f6", fg: "#374151", bd: "#e5e7eb" },
    blue: { bg: "#dbeafe", fg: "#1e3a8a", bd: "#bfdbfe" },
    green: { bg: "#dcfce7", fg: "#14532d", bd: "#bbf7d0" },
  };
  const s = tone ? map[tone] : map.gray;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.bd}`,
      }}
    >
      {label}
    </span>
  );
}