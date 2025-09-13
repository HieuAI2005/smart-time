type Props = {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
};

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  const clamp = (p: number) => Math.min(Math.max(1, p), totalPages);
  const go = (p: number) => {
    const next = clamp(p);
    if (next !== page) onChange(next);
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const Btn = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} className={`page-btn ${props.className ?? ""}`} />
  );

  return (
    <div className="pagination">
      <Btn onClick={() => go(1)} disabled={!canPrev}>« First</Btn>
      <Btn onClick={() => go(page - 1)} disabled={!canPrev}>‹ Prev</Btn>

      {start > 1 && <span>…</span>}
      {pages.map((p) => (
        <Btn
          key={p}
          onClick={() => go(p)}
          className={p === page ? "active" : ""}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Btn>
      ))}
      {end < totalPages && <span>…</span>}

      <Btn onClick={() => go(page + 1)} disabled={!canNext}>Next ›</Btn>
      <Btn onClick={() => go(totalPages)} disabled={!canNext}>Last »</Btn>
    </div>
  );
}