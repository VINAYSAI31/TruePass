export const DOCUMENT_TYPES = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving Licence' },
  { value: 'NATIONAL_ID', label: 'National ID' },
];

export function humanize(value) {
  if (!value) return '—';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function docTypeLabel(value) {
  const found = DOCUMENT_TYPES.find((d) => d.value === value);
  if (found) return found.label;
  return humanize(value);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Backend stores every confidence as a 0-100 score.
export function formatScore(value) {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return `${Number.isInteger(n) ? n : n.toFixed(1)} / 100`;
}

// Show a vendor its own format: Vendor A 0-100, Vendor B 0-1.
export function formatVendorConfidence(score, vendorId) {
  if (score === null || score === undefined) return '—';
  const n = Number(score);
  if (Number.isNaN(n)) return '—';
  if (vendorId === 'VENDOR_B') return (n / 100).toFixed(2);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Status -> label + colour tone (tones are styled in App.css)
export const STATUS_META = {
  PASSED: { label: 'Passed', tone: 'success' },
  PASS: { label: 'Pass', tone: 'success' },
  VERIFIED: { label: 'Verified', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  REJECT: { label: 'Reject', tone: 'danger' },
  NOT_VERIFIED: { label: 'Not Verified', tone: 'danger' },
  WAITING_FOR_RESPONSES: { label: 'Waiting for Responses', tone: 'warning' },
  MANUAL_REVIEW: { label: 'Manual Review', tone: 'review' },
  RETRY: { label: 'Retry Required', tone: 'retry' },
  ERROR: { label: 'Error', tone: 'retry' },
  SUBMITTED: { label: 'Submitted', tone: 'success' },
  UPDATED: { label: 'Updated', tone: 'info' },
  PENDING: { label: 'Pending', tone: 'warning' },
  AWAITING: { label: 'Awaiting response', tone: 'neutral' },
  NOT_EVALUATED: { label: 'Not evaluated', tone: 'neutral' },
  OPEN: { label: 'Open', tone: 'warning' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
  HIGH: { label: 'High', tone: 'danger' },
  MEDIUM: { label: 'Medium', tone: 'warning' },
  LOW: { label: 'Low', tone: 'neutral' },
};
