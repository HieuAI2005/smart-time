import TaskCard from "../components/TaskCard";
import { useStore, useFilteredTasks, localDateStr } from "../lib/store";
import type { TaskCategory, TaskStatus } from "../lib/types";

import { useEffect, useMemo, useRef, useState } from "react";
import { pressureBg } from "../lib/scheduler";

export default function DoNowView() {
  const tasksFiltered = useFilteredTasks();

  const { q, cat, status } = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const clearAll = useStore((s) => s.clearAll);

  const allTasks = useStore((s) => s.tasks);
  const startNow = useStore((s) => s.startNow);
  const pauseTask = useStore((s) => s.pause);

  const runningTask = useMemo(
    () => allTasks.find((t) => !!t.runningFrom) || null,
    [allTasks]
  );
  const runningTaskId = runningTask?.id;

  const today = useMemo(() => localDateStr(new Date()), []);

  const todaysTasks = useMemo(() => {
    return allTasks.filter(
      (t) =>
        !!t.startDate &&
        !!t.dueDate &&
        t.startDate <= today &&
        today <= t.dueDate &&
        t.status !== "done"
    );
  }, [allTasks, today]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const alarmRef = useRef<HTMLAudioElement | null>(null);
  const alarmTimerRef = useRef<any>(null);
  const showedToastRef = useRef(false);

  useEffect(() => {
    const a = new Audio("/warning.mp3"); 
    a.preload = "auto";
    a.loop = false;
    a.volume = 0.9;
    alarmRef.current = a;
    return () => {
      try { a.pause(); } catch {}
      alarmRef.current = null;
    };
  }, []);

  const runningRemain = useMemo(() => {
    if (!runningTask) return null;
    const daily = runningTask.dailyMinutes ?? 60;
    const doneTodaySaved = runningTask.progress?.[today] ?? 0;
    const runMs = runningTask.runningFrom
      ? Date.now() - new Date(runningTask.runningFrom).getTime()
      : 0;
    const runningElapsedMin = Math.floor(Math.max(0, runMs / 60000));
    const doneLive = doneTodaySaved + runningElapsedMin;
    return Math.max(0, daily - doneLive);
  }, [
    runningTask?.id,
    runningTask?.runningFrom,
    runningTask?.dailyMinutes,
    runningTask?.progress,
    today,
    tick, // quan trọng: cập nhật mỗi giây
  ]);

  useEffect(() => {
    const audio = alarmRef.current;
    if (!audio) return;

    const shouldAlarm = !!runningTask && runningRemain !== null && runningRemain <= 0;

    const playOnce = () => {
      try {
        audio.currentTime = 0;
        audio.play();
      } catch (e) {
        console.debug("Alarm play blocked:", e);
      }
    };

    if (shouldAlarm) {
      if (!alarmTimerRef.current) {
        playOnce();
        alarmTimerRef.current = setInterval(playOnce, 3000);
      }
      if (!showedToastRef.current) {
        // @ts-ignore: nếu app có hệ thống toast
        window?.toast?.warning?.("Đã đạt đủ phút hôm nay — nhấn Stop để lưu!");
        showedToastRef.current = true;
      }
    } else {
      showedToastRef.current = false;
      if (alarmTimerRef.current) {
        clearInterval(alarmTimerRef.current);
        alarmTimerRef.current = null;
      }
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    }

    return () => {
      if (alarmTimerRef.current) {
        clearInterval(alarmTimerRef.current);
        alarmTimerRef.current = null;
      }
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {}
    };
  }, [runningTaskId, runningRemain]);
  // ===========================================================================

  const onClearAll = () => {
    if (confirm("Clear all tasks? This cannot be undone.")) clearAll();
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* ============ TODAY'S PLAN ============ */}
      <div className="card pad" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Today's Plan</h2>

        {todaysTasks.length === 0 ? (
          <div style={{ opacity: 0.8 }}>
            There are no tasks scheduled for today.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {todaysTasks.map((t) => {
              const running = !!t.runningFrom;

              const runningElapsedMin = running
                ? Math.floor(
                    Math.max(
                      0,
                      (Date.now() - new Date(t.runningFrom!).getTime()) / 60000
                    )
                  )
                : 0;

              const needMin = t.dailyMinutes ?? 60;
              const doneTodaySaved = t.progress?.[today] ?? 0;
              const doneLive = doneTodaySaved + runningElapsedMin;

              const remain = Math.max(0, needMin - doneLive);
              const dailyHour = (needMin / 60).toFixed(needMin % 60 === 0 ? 0 : 1);

              const elapsedSec = running
                ? Math.max(
                    0,
                    (Date.now() - new Date(t.runningFrom!).getTime()) / 1000
                  )
                : 0;

              return (
                <div
                  key={t.id}
                  className="today-slot card"
                  style={{ padding: 12, background: pressureBg(0.5) }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 260 }}>
                      <div style={{ fontWeight: 700 }}>{t.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.85 }}>
                        Missing today: <b>{remain} minutes</b> • Goal/day:{" "}
                        <b>{needMin} minutes</b> ({dailyHour}h) • End:{" "}
                        <b>{fmtDate(t.dueDate)}</b>
                        {remainToDue(t.dueDate)}
                        {running && (
                          <span style={{ marginLeft: 8 }}>
                            ⏱ Running: {fmtHMS(elapsedSec)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {!running ? (
                        <button
                          className="button"
                          onClick={() => startNow(t.id)}
                          title={
                            runningTaskId && runningTaskId !== t.id
                              ? "Đang có task khác chạy"
                              : "Bắt đầu"
                          }
                          disabled={!!runningTaskId && runningTaskId !== t.id}
                        >
                          Start
                        </button>
                      ) : (
                        <button
                          className="button"
                          onClick={() => pauseTask(t.id)} // Stop sẽ dừng chuông qua effect
                          title="Stop"
                        >
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ FILTERS ============ */}
      <div className="card pad">
        <div className="grid grid-4">
          <input
            className="input"
            placeholder="Search title/desc/tags"
            value={q}
            onChange={(e) => setFilters({ q: e.target.value })}
          />
          <select
            className="select"
            value={cat}
            onChange={(e) =>
              setFilters({ cat: e.target.value as TaskCategory | "all" })
            }
          >
            <option value="all">All categories</option>
            <option value="assignment">Assignment</option>
            <option value="lecture">Lecture</option>
            <option value="exam">Exam</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
          <select
            className="select"
            value={status}
            onChange={(e) =>
              setFilters({ status: e.target.value as TaskStatus | "all" })
            }
          >
            <option value="all">All status</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <button className="btn btn-ghost" onClick={onClearAll}>
            Clear all
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {[
            { key: "all", label: "All" },
            { key: "todo", label: "To do" },
            { key: "in_progress", label: "In progress" },
            { key: "done", label: "Completed" },
          ].map((b) => {
            const active =
              status === b.key || (b.key === "all" && status === "all");
            return (
              <button
                key={b.key}
                className={`btn btn-small ${
                  active
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : "btn-ghost"
                }`}
                onClick={() =>
                  setFilters({ status: b.key as TaskStatus | "all" })
                }
              >
                {b.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ ALL TASKS ============ */}
      <div style={{ display: "grid", gap: 12 }}>
        {tasksFiltered.map((t) => (
          <TaskCard key={t.id} t={t} />
        ))}
        {tasksFiltered.length === 0 && (
          <div className="card pad" style={{ opacity: 0.7 }}>
            No tasks match your filters.
          </div>
        )}
      </div>
    </div>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString();
}
function remainToDue(dueISO?: string) {
  if (!dueISO) return "";
  const ms = new Date(dueISO + "T23:59:59").getTime() - Date.now();
  if (ms <= 0) return " (đã quá hạn)";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return ` (còn ${h}h ${m}m ${sec}s)`;
}
function fmtHMS(sec: number) {
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  return (h ? `${h}h ` : "") + `${m}m ${s}s`;
}