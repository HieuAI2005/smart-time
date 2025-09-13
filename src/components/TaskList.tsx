import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import TaskCard from "./TaskCard";
import Pagination from "./Pagination";

const PAGE_SIZE = 30;

export default function TaskList() {
  const tasks   = useStore(s => s.tasks);
  const filters = useStore(s => s.filters);

  const filtered = useMemo(() => {
    const q = (filters.q ?? "").toLowerCase().trim();
    return tasks.filter(t => {
      const matchQ = q
        ? (t.title + (t.description ?? "") + (t.tags ?? []).join(" "))
            .toLowerCase().includes(q)
        : true;
      const matchCat    = filters.cat === "all" ? true : t.category === filters.cat;
      const matchStatus = filters.status === "all" ? true : t.status === filters.status;
      return matchQ && matchCat && matchStatus;
    });
  }, [tasks, filters.q, filters.cat, filters.status]);

  const [page, setPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    [filtered.length]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const slice = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {slice.map((t) => <TaskCard key={t.id} t={t} />)}
      {filtered.length === 0 && (
        <div className="card pad" style={{ opacity: 0.7 }}>No tasks match your filters.</div>
      )}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}
    </div>
  );
}