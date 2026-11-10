import { STATUS_META, humanize } from '../../utils/format';

export default function StatusBadge({ status, label }) {
  const meta = STATUS_META[status] || { label: humanize(status), tone: 'neutral' };
  return <span className={`status-badge tone-${meta.tone}`}>{label || meta.label}</span>;
}
