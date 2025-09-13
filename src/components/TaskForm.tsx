import { useState } from "react";
import { useStore } from "../lib/store";
import type { TaskCategory } from "../lib/types";

const CATEGORIES: { label: string; value: TaskCategory }[] = [
  { label: "Assignment", value: "assignment" },
  { label: "Lecture",    value: "lecture" },
  { label: "Exam",       value: "exam" },
  { label: "Work",       value: "work" },
  { label: "Personal",   value: "personal" },
];

export default function TaskForm() {
  const add   = useStore((s) => s.add);
  const tasks = useStore((s) => s.tasks); 

  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [category, setCategory]         = useState<TaskCategory>("assignment");
  const [tags, setTags]                 = useState("");

  const [dailyH, setDailyH]             = useState<string>("2");
  const [dailyM, setDailyM]             = useState<string>("30");

  const [startDate, setStartDate]       = useState<string>("");
  const [dueDate, setDueDate]           = useState<string>("");

  const [earliest, setEarliest]         = useState<string>("22:00");

  const [titleError, setTitleError]     = useState<string>("");

  const norm = (s: string) =>
    s.trim().toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, ""); 

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const t = title.trim();
    if (!t) {
      setTitleError("Tên task không được để trống.");
      return;
    }

    const newKey = norm(t);
    const isDup = (tasks || []).some((tk) => norm(tk.title) === newKey);
    if (isDup) {
      setTitleError("Tên task đã tồn tại, vui lòng đặt tên khác.");
      return;
    }

    setTitleError(""); 

    const h = Math.max(0, parseInt(dailyH.replace(/\D/g, "") || "0", 10));
    const mRaw = Math.max(0, parseInt(dailyM.replace(/\D/g, "") || "0", 10));
    const m = Math.min(59, mRaw);
    const dailyMinutes = Math.max(1, h * 60 + m);

    const sd = startDate || new Date().toISOString().slice(0, 10);
    const dd = dueDate || sd;
    if (sd > dd) {
      alert("Due date must be on/after start date.");
      return;
    }

    add({
      title: t,
      description: description.trim() || undefined,
      category,
      status: "todo",

      dailyMinutes,
      startDate: sd,
      dueDate: dd,
      autoScheduleRule: { earliestHHmm: earliest || "22:00" },

      tags: tags
        ? tags.split(",").map((x) => x.trim()).filter(Boolean)
        : [],
    });

    // reset form
    setTitle("");
    setDescription("");
    setCategory("assignment");
    setTags("");
    setDailyH("0");
    setDailyM("30");
    setStartDate("");
    setDueDate("");
    setEarliest("22:00");
    setTitleError("");
  };

  return (
    <form onSubmit={submit} className="card pad">
      <div className="grid grid-2">
        {/* Title */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label">Title</label>
          <input
            className={`input ${titleError ? "input-error" : ""}`}
            placeholder="e.g., CNPM Assignment 3"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError("");
            }}
            aria-invalid={!!titleError}
            aria-describedby={titleError ? "title-error" : undefined}
          />
          {titleError && (
            <div id="title-error" className="text-red-500 text-sm" style={{ marginTop: 6 }}>
              {titleError}
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="label">Category</label>
          <select
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Daily work time (hours + minutes) */}
        <div>
          <label className="label">Daily work time</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={dailyH}
              onChange={(e) => setDailyH(e.target.value.replace(/\D/g, ""))}
              style={{ width: 80, textAlign: "center" }}
              placeholder="0"
              aria-label="Hours per day"
            />
            <span>h</span>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={dailyM}
              onChange={(e) => setDailyM(e.target.value.replace(/\D/g, ""))}
              style={{ width: 80, textAlign: "center" }}
              placeholder="30"
              aria-label="Minutes per day"
            />
            <span>m</span>
          </div>
        </div>

        {/* Start / Due dates */}
        <div>
          <label className="label">Start date</label>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Due date</label>
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Earliest start time in a day (optional) */}
        <div>
          <label className="label">Earliest time (per day)</label>
          <input
            className="input"
            type="time"
            value={earliest}
            onChange={(e) => setEarliest(e.target.value)}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="label">Tags (comma separated)</label>
          <input
            className="input"
            placeholder="math, group, urgent"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        {/* Description */}
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label">Description</label>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12 }}>
          <button className="btn btn-primary" type="submit">Add Task</button>
        </div>
      </div>
    </form>
  );
}