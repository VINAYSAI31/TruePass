export default function Loading({ text = 'Loading…' }) {
  return (
    <div className="state-box" role="status">
      <div className="spinner-border spinner-border-sm text-primary" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3 mb-0" role="alert">
      <div>
        <i className="bi bi-exclamation-triangle me-2" />
        {error?.message || 'Something went wrong.'}
      </div>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onRetry()}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'bi-inbox', title, text, children }) {
  return (
    <div className="state-box flex-column text-center">
      <i className={`bi ${icon} state-icon`} />
      <div className="fw-semibold">{title}</div>
      {text && <div className="text-muted small">{text}</div>}
      {children}
    </div>
  );
}
