import { useState } from "react";
import { addDays } from "date-fns";
import { useStore } from "../lib/store";
import type { Task } from "../lib/types";
import { CheckCircle2, Trash2, Pencil, Plus, X } from "lucide-react";

export default function TaskCard({ t }: { t: Task }) {
  const update        = useStore((s) => s.update);
  const remove        = useStore((s) => s.remove);
  const startNow      = useStore((s) => s.startNow);
  const pause         = useStore((s) => s.pause);
  const toggleStatus  = useStore((s) => s.toggleStatus);
  const addSubtask    = useStore((s) => s.addSubtask);
  const toggleSubtask = useStore((s) => s.toggleSubtask);
  const updateSubtask = useStore((s) => s.updateSubtask);
  const removeSubtask = useStore((s) => s.removeSubtask);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle]       = useState(t.title);
  const [desc, setDesc]         = useState(t.description ?? "");
  const [daily, setDaily]       = useState<number>(t.dailyMinutes ?? (t as any).plannedMinutes ?? 0);
  const [startDate, setStartDate] = useState<string>(t.startDate ?? "");
  const [dueDate, setDueDate]     = useState<string>(t.dueDate ?? "");
  const [newSub, setNewSub]     = useState("");

  const fmtHM = (mins?: number) => {
    const m = Math.max(0, Math.round(mins || 0));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return h ? `${h}h ${r}m` : `${r}m`;
  };

  const commitEdit = () => {
    update(t.id, {
      title,
      description: desc || undefined,
      dailyMinutes: Math.max(0, Number.isFinite(daily) ? daily : 0),
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
    });
    setShowModal(false);
  };

  const cl = t.checklist ?? [];
  const doneCount = cl.filter((s) => s.done).length;
  const pct = cl.length ? Math.round((doneCount / cl.length) * 100) : 0;

  return (
    <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{t.title}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {t.category} • created {new Date(t.createdAt).toLocaleString()}
            {t.completedAt ? ` • done ${new Date(t.completedAt).toLocaleString()}` : ""}
          </div>
        </div>
        <span className={`pill ${t.dueDate ? "gray" : "gray"}`}>
          {t.dueDate ? `Due: ${t.dueDate}` : "No deadline"}
        </span>
      </div>

      {/* Description */}
      {t.description && <p style={{ margin: 0 }}>{t.description}</p>}

      {/* Checklist progress */}
      <div className="progressbar" title={`${pct}%`}>
        <span style={{ width: `${pct}%` }} />
      </div>

      {/* Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 13 }}>
        { (t.dailyMinutes ?? (t as any).plannedMinutes) ? (
          <span className="pill gray">Plan {fmtHM(t.dailyMinutes ?? (t as any).plannedMinutes)}</span>
        ) : (
          <span className="pill gray">No plan</span>
        ) }
      </div>

      {/* Checklist */}
      <div className="checklist">
        {(t.checklist ?? []).map((s) => (
          <div key={s.id} className="subitem">
            <input
              type="checkbox"
              checked={s.done}
              onChange={() => toggleSubtask(t.id, s.id)}
            />
            <input
              type="text"
              className="input"
              value={s.text}
              onChange={(e) => updateSubtask(t.id, s.id, e.target.value)}
            />
            <button
              className="btn btn-ghost btn-small"
              onClick={() => removeSubtask(t.id, s.id)}
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Add checklist item..."
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
          />
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (newSub.trim()) {
                addSubtask(t.id, newSub.trim());
                setNewSub("");
              }
            }}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="action-row" style={{ marginTop: 4 }}>
        <button className="btn btn-ghost" onClick={() => toggleStatus(t.id)}>
          <CheckCircle2 size={16} className="icon" />{" "}
          {t.status === "done" ? "Mark as TODO" : "Mark as Done"}
        </button>

        <button className="btn btn-ghost" onClick={() => setShowModal(true)}>
          <Pencil size={16} className="icon" /> Edit
        </button>

        {t.status === "in_progress" ? (
          <button className="btn btn-ghost btn-small" onClick={() => pause(t.id)}>
            Pause
          </button>
        ) : (
          <button className="btn btn-ghost btn-small" onClick={() => startNow(t.id)}>
            Start now
          </button>
        )}
        
        <button
          className="btn btn-ghost btn-small"
          onClick={() => update(t.id, { dueDate: new Date().toISOString().slice(0, 10) })}
        >
          Today
        </button>
        <button
          className="btn btn-ghost btn-small"
          onClick={() =>
            update(t.id, {
              dueDate: addDays(new Date(t.dueDate || new Date()), 1).toISOString().slice(0, 10),
            })
          }
        >
          +1d
        </button>
        <button
          className="btn btn-ghost btn-small"
          onClick={() =>
            update(t.id, {
              dueDate: addDays(new Date(t.dueDate || new Date()), 3).toISOString().slice(0, 10),
            })
          }
        >
          +3d
        </button>
        <button
          className="btn btn-ghost btn-small"
          onClick={() =>
            update(t.id, {
              dueDate: addDays(new Date(t.dueDate || new Date()), 7).toISOString().slice(0, 10),
            })
          }
        >
          +1w
        </button>

        <span className="spacer" />
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm(`Delete "${t.title}"?`)) remove(t.id);
          }}
        >
          <Trash2 size={16} className="icon" /> Delete
        </button>
      </div>

      {/* EDIT MODAL */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <strong>Edit task</strong>
              <button className="icon-btn" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-2">
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="label">Title</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div>
                <label className="label">Daily minutes</label>
                <input
                  type="number"
                  className="input"
                  value={daily}
                  onChange={(e) => setDaily(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>

              <div>
                <label className="label">Start date</label>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Due date</label>
                <input
                  type="date"
                  className="input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={commitEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}