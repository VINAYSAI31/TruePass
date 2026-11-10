import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { DOCUMENT_TYPES } from '../../utils/format';

const EMPTY = {
  applicantName: '',
  email: '',
  phoneNumber: '',
  documentType: 'PASSPORT',
  documentReference: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};
  if (!form.applicantName.trim()) errors.applicantName = 'Applicant name is required.';
  if (!form.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address.';
  if (!form.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required.';
  if (!form.documentReference.trim()) errors.documentReference = 'Document reference is required.';
  return errors;
}

export default function CreateApplication() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [created, setCreated] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const result = await api.createApplication({
        applicantName: form.applicantName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        documentType: form.documentType,
        documentReference: form.documentReference.trim(),
      });
      setCreated(result);
      setForm(EMPTY);
    } catch (err) {
      setFormError(err.message);
      if (err.fieldErrors) setErrors(err.fieldErrors);
    } finally {
      setBusy(false);
    }
  }

  const field = (name, label, props = {}) => (
    <div className={props.col || 'col-md-6'}>
      <label htmlFor={name} className="form-label">
        {label}
      </label>
      <input
        id={name}
        className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
        value={form[name]}
        onChange={(e) => update(name, e.target.value)}
        {...props.input}
      />
      {errors[name] && <div className="invalid-feedback">{errors[name]}</div>}
    </div>
  );

  return (
    <>
      <PageHeader title="Create Application" subtitle="Register a new identity verification application." />

      {created && (
        <div className="alert alert-success" role="status">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <i className="bi bi-check-circle me-2" />
              Application created. Reference: <strong>{created.applicationReference}</strong>
              <div className="small mt-1">Both vendors can now see it and submit their results.</div>
            </div>
            <div className="d-flex gap-2">
              <Link to={`/internal/applications/${created.id}`} className="btn btn-sm btn-outline-success">
                View application
              </Link>
              <Link to="/internal/applications" className="btn btn-sm btn-success">
                Go to Applications
              </Link>
            </div>
          </div>
        </div>
      )}

      {formError && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2" />
          {formError}
        </div>
      )}

      <div className="panel">
        <form className="panel-body" onSubmit={handleSubmit} noValidate>
          <div className="row g-3">
            {field('applicantName', 'Applicant Name', { input: { placeholder: 'e.g. Asha Raman' } })}
            {field('email', 'Email', { input: { type: 'email', placeholder: 'name@example.com' } })}
            {field('phoneNumber', 'Phone Number', { input: { placeholder: '+91 98765 43210' } })}
            <div className="col-md-6">
              <label htmlFor="documentType" className="form-label">
                Document Type
              </label>
              <select
                id="documentType"
                className="form-select"
                value={form.documentType}
                onChange={(e) => update('documentType', e.target.value)}
              >
                {DOCUMENT_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            {field('documentReference', 'Document Reference', { input: { placeholder: 'e.g. P1234567' } })}
          </div>

          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create Application'}
            </button>
            <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={() => { setForm(EMPTY); setErrors({}); setFormError(''); }}>
              Clear
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
