import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { toISODate, requiredOnDay, doneOnDay, liveMinutesToday } from "../lib/analytics";
import type { Task } from "../lib/types";

type Mood = "success" | "warning" | "angry";

const sounds = {
  success: typeof Audio !== "undefined" ? new Audio("/sounds/success.mp3") : null,
  warning: typeof Audio !== "undefined" ? new Audio("/sounds/warning.mp3") : null,
  angry:   typeof Audio !== "undefined" ? new Audio("/sounds/angry.mp3") : null,
};

function playOnce(mood: Mood) {
  const a = sounds[mood];
  if (!a) return;
  try { a.currentTime = 0; a.loop = false; a.volume = 0.9; a.play().catch(() => {}); } catch {}
}
function playWarningLoop() {
  const a = sounds.warning;
  if (!a) return;
  try { a.currentTime = 0; a.loop = true; a.volume = 0.95; a.play().catch(() => {}); } catch {}
}
function stopWarningLoop() {
  const a = sounds.warning;
  if (!a) return;
  try { a.pause(); a.currentTime = 0; a.loop = false; } catch {}
}

function setTheme(mood: Mood, ttlMs = 6000) {
  const body = document.body;
  const cls = mood === "success" ? "theme-success" : mood === "warning" ? "theme-warning" : "theme-angry";
  body.classList.add(cls);
  setTimeout(() => body.classList.remove(cls), ttlMs);
}

function isDoneOnTime(task: Task, completedISO: string) {
  if (!task.dueDate) return true;
  return completedISO <= task.dueDate;
}

export default function CompletionNotifier() {
  const tasks = useStore((s) => s.tasks);
  const pause = useStore((s) => s.pause);

  const [toast, setToast] = useState<{ title: string; msg: string; mood: Mood } | null>(null);

  const [modalTask, setModalTask] = useState<{ id: string; title: string } | null>(null);

  const prevById = useRef<Map<string, Task>>(new Map());
  const celebratedToday = useRef<Set<string>>(new Set());
  const alertedToday = useRef<Set<string>>(new Set());

  const todayISO = useMemo(() => toISODate(new Date()), []); 
  useEffect(() => {
    let prevDay = toISODate(new Date());
    const timer = setInterval(() => {
      const now = toISODate(new Date());
      if (now !== prevDay) {
        celebratedToday.current.clear();
        alertedToday.current.clear();
        stopWarningLoop();
        setModalTask(null);

        const yesterday = prevDay;
        const state = useStore.getState();
        const activeYesterday = (state.tasks || []).filter(
          (t) => t.startDate && t.dueDate && yesterday >= t.startDate && yesterday <= t.dueDate
        );

        const missed = activeYesterday.some((t) => {
          const req = t.dailyMinutes ?? 0;
          const done = t.progress?.[yesterday] ?? 0;
          return req > 0 && done < req;
        });

        if (missed) {
          setToast({
            title: "Oh no! You missed yesterday 😠",
            msg: "Push harder today to catch up!",
            mood: "angry",
          });
          playOnce("angry");
          setTheme("angry");
        }

        prevDay = now;
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const map = new Map<string, Task>();
    tasks.forEach((t) => map.set(t.id, t));

    tasks.forEach((t) => {
      const prev = prevById.current.get(t.id);

      const justFinished = prev && prev.status !== "done" && t.status === "done";
      if (justFinished) {
        const completedISO = t.completedAt ?? toISODate(new Date());
        if (isDoneOnTime(t, completedISO)) {
          setToast({
            title: "Great job! 🎉",
            msg: `You finished "${t.title}" on time.`,
            mood: "success",
          });
          playOnce("success");
          setTheme("success");
        } else {
          setToast({
            title: "Finished but overdue ⏰",
            msg: `You finished "${t.title}" after the deadline. Try to be earlier next time!`,
            mood: "warning",
          });
          playOnce("warning");
          setTheme("warning");
        }
      }

      const reqToday = requiredOnDay(t, todayISO);
      if (reqToday > 0) {
        const prevDone = prev ? prev.progress?.[todayISO] ?? 0 : 0;
        const nowDone = t.progress?.[todayISO] ?? 0;
        const crossedToComplete = prevDone < reqToday && nowDone >= reqToday;

        if (crossedToComplete && !celebratedToday.current.has(t.id)) {
          celebratedToday.current.add(t.id);
          const completedISO = toISODate(new Date());
          if (isDoneOnTime(t, completedISO)) {
            setToast({
              title: "Today's target done! 🎉",
              msg: `Completed today's quota for "${t.title}".`,
              mood: "success",
            });
            playOnce("success");
            setTheme("success");
          } else {
            setToast({
              title: "Done but overdue ⏰",
              msg: `Completed today's quota for "${t.title}" after the deadline.`,
              mood: "warning",
            });
            playOnce("warning");
            setTheme("warning");
          }
        }
      }
    });

    prevById.current = map;
  }, [tasks, todayISO]);

  useEffect(() => {
    const id = setInterval(() => {
      const { tasks } = useStore.getState();
      const today = toISODate(new Date());

      for (const t of tasks) {
        const req = requiredOnDay(t, today);
        if (req <= 0) continue;

        const base = doneOnDay(t, today);
        const live = liveMinutesToday(t, today);
        const total = base + live;

        if (total >= req && t.runningFrom && !alertedToday.current.has(t.id)) {
          alertedToday.current.add(t.id);
          setModalTask({ id: t.id, title: t.title });
          playWarningLoop();
          break;
        }
      }
    }, 2000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const onModalDone = () => {
    if (!modalTask) return;
    stopWarningLoop();
    pause(modalTask.id);
    setModalTask(null);
  };

  const onModalSnooze = () => {
    stopWarningLoop();
    setModalTask(null);
  };

  return (
    <>
      {toast && (
        <div className={`toast ${toast.mood}`}>
          <h4>{toast.title}</h4>
          <div>{toast.msg}</div>
        </div>
      )}

      {modalTask && (
        <div className="modal-backdrop" onClick={onModalSnooze}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <strong>Time's up for today</strong>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div>
                You have reached today's target for "<b>{modalTask.title}</b>".
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                The warning sound will keep playing until you click <b>Done</b>.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={onModalSnooze}>
                Keep running
              </button>
              <button className="btn btn-primary" onClick={onModalDone}>
                Done (stop & save)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}