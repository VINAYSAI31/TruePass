import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import VendorResponseCard from '../../components/internal/VendorResponseCard';
import Loading, { ErrorState } from '../../components/common/Loading';
import { docTypeLabel, formatDateTime, humanize } from '../../utils/format';

const REASON_CODES = [
  'MANUAL_VERIFICATION',
  'DOCUMENT_MISMATCH',
  'VENDOR_DISCREPANCY',
  'LOW_CONFIDENCE',
  'SUSPECTED_FRAUD',
  'TECHNICAL_ISSUE',
  'OTHER',
];

const ACTIONS = [
  { decision: 'APPROVE', label: 'Approve', icon: 'bi-check-circle', className: 'btn-success', outcome: 'Passed' },
  { decision: 'REJECT', label: 'Reject', icon: 'bi-x-circle', className: 'btn-danger', outcome: 'Rejected' },
  { decision: 'RETRY', label: 'Retry', icon: 'bi-arrow-repeat', className: 'btn-warning', outcome: 'Retry Required' },
];

export default function ReviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useAsync(async () => {
    const exception = await api.getException(id);
    const [application, comparison] = await Promise.all([
      api.getApplication(exception.applicationId),
      api.getComparison(exception.applicationId),
    ]);
    return { exception, application, comparison };
  }, [id]);

  const [form, setForm] = useState({ reviewerName: 'Internal Admin', reasonCode: '', comments: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function submit(action) {
    const found = {};
    if (!form.reviewerName.trim()) found.reviewerName = 'Reviewer name is required.';
    if (!form.reasonCode) found.reasonCode = 'Choose a reason code.';
    if (!form.comments.trim()) found.comments = 'Add a short comment for the audit trail.';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    if (!window.confirm(`${action.label} this application? This closes the exception and cannot be undone.`)) return;

    setBusy(true);
    try {
      const result = await api.reviewException(id, {
        reviewerName: form.reviewerName.trim(),
        decision: action.decision,
        reasonCode: form.reasonCode,
        comments: form.comments.trim(),
      });
      navigate('/internal/manual-review', {
        state: {
          flash: `${result.applicationReference}: review completed (${action.label}). Application is now ${action.outcome}.`,
        },
      });
    } catch (err) {
      setFormError(err.message);
      if (err.fieldErrors) setErrors(err.fieldErrors);
      if (err.status === 409) reload(true);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading text="Loading review…" />;
  if (error) {
    return (
      <>
        <PageHeader title="Review" actions={<Link to="/internal/manual-review" className="btn btn-outline-secondary">Back to queue</Link>} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  const { exception, application: a, comparison } = data;
  const resolved = exception.queueStatus === 'RESOLVED';

  return (
    <>
      <PageHeader
        title={`Review ${exception.applicationReference}`}
        subtitle={`Exception #${exception.id}`}
        actions={
          <Link to="/internal/manual-review" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1" />
            Back to queue
          </Link>
        }
      />

      <div className="panel mb-3">
        <div className="panel-body d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <div className="small text-muted">Exception reason</div>
            <div className="fw-semibold">{exception.reason}</div>
            <div className="small text-muted mt-1">Raised {formatDateTime(exception.createdAt)}</div>
          </div>
          <div className="d-flex gap-2">
            <StatusBadge status={exception.priority} label={`${humanize(exception.priority)} priority`} />
            <StatusBadge status={exception.queueStatus} />
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-lg-4">
          <div className="panel h-100">
            <div className="panel-head">
              <h2 className="panel-title">Application</h2>
              <StatusBadge status={a.applicationStatus} />
            </div>
            <div className="panel-body">
              <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
                <dt>Applicant</dt>
                <dd>{a.applicantName}</dd>
                <dt>Email</dt>
                <dd>{a.email}</dd>
                <dt>Phone</dt>
                <dd>{a.phoneNumber}</dd>
                <dt>Document</dt>
                <dd>{docTypeLabel(a.documentType)}</dd>
                <dt>Doc. reference</dt>
                <dd>{a.documentReference}</dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <VendorResponseCard title="Vendor A" variant="vendor-a" response={comparison.vendorA} />
        </div>
        <div className="col-lg-4">
          <VendorResponseCard title="Vendor B" variant="vendor-b" response={comparison.vendorB} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{resolved ? 'Review outcome' : 'Review decision'}</h2>
        </div>
        <div className="panel-body">
          {resolved ? (
            <dl className="kv">
              <dt>Reviewed by</dt>
              <dd>{exception.reviewerName || '—'}</dd>
              <dt>Comments</dt>
              <dd>{exception.reviewerComments || '—'}</dd>
              <dt>Resolved</dt>
              <dd>{formatDateTime(exception.resolvedAt)}</dd>
            </dl>
          ) : (
            <>
              {formError && (
                <div className="alert alert-danger py-2" role="alert">
                  {formError}
                </div>
              )}
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="reviewerName" className="form-label">
                    Reviewer Name
                  </label>
                  <input
                    id="reviewerName"
                    className={`form-control ${errors.reviewerName ? 'is-invalid' : ''}`}
                    value={form.reviewerName}
                    onChange={(e) => update('reviewerName', e.target.value)}
                  />
                  {errors.reviewerName && <div className="invalid-feedback">{errors.reviewerName}</div>}
                </div>
                <div className="col-md-6">
                  <label htmlFor="reasonCode" className="form-label">
                    Reason Code
                  </label>
                  <select
                    id="reasonCode"
                    className={`form-select ${errors.reasonCode ? 'is-invalid' : ''}`}
                    value={form.reasonCode}
                    onChange={(e) => update('reasonCode', e.target.value)}
                  >
                    <option value="">Select a reason…</option>
                    {REASON_CODES.map((c) => (
                      <option key={c} value={c}>
                        {humanize(c)}
                      </option>
                    ))}
                  </select>
                  {errors.reasonCode && <div className="invalid-feedback">{errors.reasonCode}</div>}
                </div>
                <div className="col-12">
                  <label htmlFor="comments" className="form-label">
                    Comments
                  </label>
                  <textarea
                    id="comments"
                    rows={3}
                    className={`form-control ${errors.comments ? 'is-invalid' : ''}`}
                    value={form.comments}
                    onChange={(e) => update('comments', e.target.value)}
                    placeholder="Explain the reasoning behind your decision"
                  />
                  {errors.comments && <div className="invalid-feedback">{errors.comments}</div>}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mt-4">
                {ACTIONS.map((action) => (
                  <button
                    key={action.decision}
                    type="button"
                    className={`btn ${action.className}`}
                    disabled={busy}
                    onClick={() => submit(action)}
                  >
                    <i className={`bi ${action.icon} me-1`} />
                    {action.label}
                  </button>
                ))}
              </div>
              <div className="small text-muted mt-2">
                Approve marks the application Passed, Reject marks it Rejected, Retry sends it back for another vendor check.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
