import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loading, { ErrorState } from '../../components/common/Loading';
import { getSession, vendorLabel } from '../../services/auth';
import { docTypeLabel } from '../../utils/format';

// The two vendors use different field names and ranges. The backend takes the vendor from the session.
const CONFIG = {
  VENDOR_A: {
    statusField: 'result',
    statusLabel: 'Result',
    options: ['VERIFIED', 'REJECTED', 'ERROR'],
    scoreField: 'score',
    scoreLabel: 'Score (0–100)',
    min: 0,
    max: 100,
    step: 1,
  },
  VENDOR_B: {
    statusField: 'verificationStatus',
    statusLabel: 'Verification Status',
    options: ['PASS', 'FAIL', 'ERROR'],
    scoreField: 'confidence',
    scoreLabel: 'Confidence (0–1)',
    min: 0,
    max: 1,
    step: 0.01,
  },
};

export default function SubmitVerification() {
  const { id } = useParams();
  const session = getSession();
  const config = CONFIG[session?.role];

  const { data: application, loading, error, reload } = useAsync(() => api.vendorApplication(id), [id]);

  const [form, setForm] = useState({ vendorReference: '', status: '', score: '', remarks: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(null);
  const [duplicate, setDuplicate] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy || submitted) return; // guard against double clicks / double submits

    const found = {};
    if (!form.vendorReference.trim()) found.vendorReference = 'Vendor reference is required.';
    if (!form.status) found.status = 'Choose a value.';
    const isError = form.status === 'ERROR';
    if (!isError) {
      const n = Number(form.score);
      if (form.score === '' || Number.isNaN(n)) found.score = 'A value is required unless the status is ERROR.';
      else if (n < config.min || n > config.max) found.score = `Must be between ${config.min} and ${config.max}.`;
    }
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    const payload = {
      applicationId: application.id,
      vendorReference: form.vendorReference.trim(),
      [config.statusField]: form.status,
      remarks: form.remarks.trim(),
    };
    if (form.score !== '') payload[config.scoreField] = Number(form.score);

    setBusy(true);
    try {
      const response = await api.submitVendorResponse(payload);
      setSubmitted(response);
    } catch (err) {
      if (err.status === 409) {
        setDuplicate(true); // already answered: lock the form
      } else {
        setFormError(err.message);
        if (err.fieldErrors) setErrors(err.fieldErrors);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!config) {
    return <div className="alert alert-danger">This page is only available to Vendor A and Vendor B.</div>;
  }
  if (loading) return <Loading text="Loading application…" />;
  if (error) {
    return (
      <>
        <PageHeader title="Submit Verification" actions={<Link to="/vendor/applications" className="btn btn-outline-secondary">Back</Link>} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  const locked = application.alreadySubmitted || duplicate;

  return (
    <>
      <PageHeader
        title="Submit Verification"
        subtitle={`${vendorLabel(session.role)} · ${application.applicationReference} · ${application.applicantName} (${docTypeLabel(application.documentType)} ${application.documentReference})`}
        actions={
          <Link to={`/vendor/applications/${application.id}`} className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left me-1" />
            Back to application
          </Link>
        }
      />

      {submitted ? (
        <div className="alert alert-success" role="status">
          <div className="fw-semibold mb-1">
            <i className="bi bi-check-circle me-2" />
            Verification submitted
          </div>
          <div className="small mb-3">
            Your result for {submitted.applicationReference} was recorded as <StatusBadge status={submitted.verificationStatus} /> (vendor reference{' '}
            {submitted.vendorReference}).
          </div>
          <div className="d-flex gap-2">
            <Link to="/vendor/applications" className="btn btn-sm btn-success">
              Back to My Applications
            </Link>
            <Link to="/vendor/history" className="btn btn-sm btn-outline-success">
              Submission History
            </Link>
          </div>
        </div>
      ) : locked ? (
        <div className="alert alert-info" role="status">
          <i className="bi bi-lock me-2" />
          You have already submitted a result for this application, so it cannot be submitted again.
          <div className="mt-2">
            <Link to="/vendor/history" className="btn btn-sm btn-outline-primary">
              View Submission History
            </Link>
          </div>
        </div>
      ) : (
        <div className="panel">
          <form className="panel-body" onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className="alert alert-danger py-2" role="alert">
                {formError}
              </div>
            )}
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="applicationId" className="form-label">
                  Application ID
                </label>
                <input id="applicationId" className="form-control" value={application.id} readOnly disabled />
              </div>
              <div className="col-md-6">
                <label htmlFor="vendorReference" className="form-label">
                  Vendor Reference
                </label>
                <input
                  id="vendorReference"
                  className={`form-control ${errors.vendorReference ? 'is-invalid' : ''}`}
                  value={form.vendorReference}
                  onChange={(e) => update('vendorReference', e.target.value)}
                  placeholder={session.role === 'VENDOR_A' ? 'e.g. A-1001' : 'e.g. B-5001'}
                />
                {errors.vendorReference && <div className="invalid-feedback">{errors.vendorReference}</div>}
              </div>
              <div className="col-md-6">
                <label htmlFor="status" className="form-label">
                  {config.statusLabel}
                </label>
                <select
                  id="status"
                  className={`form-select ${errors.status || errors[config.statusField] ? 'is-invalid' : ''}`}
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                >
                  <option value="">Select…</option>
                  {config.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {(errors.status || errors[config.statusField]) && (
                  <div className="invalid-feedback">{errors.status || errors[config.statusField]}</div>
                )}
              </div>
              <div className="col-md-6">
                <label htmlFor="score" className="form-label">
                  {config.scoreLabel}
                </label>
                <input
                  id="score"
                  type="number"
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  className={`form-control ${errors.score || errors[config.scoreField] ? 'is-invalid' : ''}`}
                  value={form.score}
                  onChange={(e) => update('score', e.target.value)}
                />
                {(errors.score || errors[config.scoreField]) && (
                  <div className="invalid-feedback">{errors.score || errors[config.scoreField]}</div>
                )}
                {form.status === 'ERROR' && <div className="form-text">Optional when the status is ERROR.</div>}
              </div>
              <div className="col-12">
                <label htmlFor="remarks" className="form-label">
                  Remarks
                </label>
                <textarea
                  id="remarks"
                  rows={3}
                  className={`form-control ${errors.remarks ? 'is-invalid' : ''}`}
                  value={form.remarks}
                  onChange={(e) => update('remarks', e.target.value)}
                />
                {errors.remarks && <div className="invalid-feedback">{errors.remarks}</div>}
              </div>
            </div>

            <div className="d-flex align-items-center gap-3 mt-4">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Submitting…' : 'Submit verification'}
              </button>
              <span className="small text-muted">Each vendor can submit once per application.</span>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
