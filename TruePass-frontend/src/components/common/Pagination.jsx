export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="d-flex align-items-center justify-content-between px-3 py-2 border-top small text-muted">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="btn-group btn-group-sm">
        <button type="button" className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <i className="bi bi-chevron-left" /> Prev
        </button>
        <button type="button" className="btn btn-outline-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <i className="bi bi-chevron-right" />
        </button>
      </div>
    </div>
  );
}
