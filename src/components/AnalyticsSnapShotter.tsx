import { useEffect } from "react";
import { useStore } from "../lib/store";
import { toISODate, requiredOnDay, doneOnDay } from "../lib/analytics";

const HIT_THRESHOLD = 1.0;

export default function AnalyticsSnapshotter() {
  useEffect(() => {
    let prevDay = toISODate(new Date());

    const tick = () => {
      const nowDay = toISODate(new Date());
      if (nowDay !== prevDay) {
        const yesterday = prevDay;

        const { tasks, saveSlimSnapshot } = useStore.getState();
        const valid = (tasks || []).filter(
          (t) => t.startDate && t.dueDate && t.startDate <= t.dueDate
        );

        const req = valid.reduce((s, t) => s + requiredOnDay(t, yesterday), 0);
        const done = valid.reduce((s, t) => s + doneOnDay(t, yesterday), 0);

        const noReq = req <= 0;
        const pct = noReq ? 0 : Math.max(0, Math.min(1, done / req));
        const hit = !noReq && pct >= HIT_THRESHOLD;

        saveSlimSnapshot(yesterday, { pct, noReq, hit });

        prevDay = nowDay;
      }
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return null;
}