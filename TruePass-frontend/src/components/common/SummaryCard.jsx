import { Link } from 'react-router-dom';

export default function SummaryCard({ label, value, icon, tone = 'info', to, hint }) {
  const body = (
    <div className="kpi-card">
      <div className={`kpi-icon tone-${tone}`}>
        <i className={`bi ${icon}`} />
      </div>
      <div className="kpi-text">
        <div className="kpi-value">{value ?? '—'}</div>
        <div className="kpi-label">{label}</div>
        {hint && <div className="kpi-hint">{hint}</div>}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="kpi-link">
      {body}
    </Link>
  ) : (
    body
  );
}
