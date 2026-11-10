import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loading, { ErrorState } from '../../components/common/Loading';
import { docTypeLabel, formatDateTime, formatScore } from '../../utils/format';

function VendorSummary({ title, response }) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
      <div>
        <div className="fw-semibold">{title}</div>
        {response && (
          <div className="small text-muted">
            {response.vendorReference} · {formatScore(response.confidenceScore)} · {formatDateTime(response.submittedAt)}
          </div>
        )}
      </div>
      <StatusBadge status={response ? response.verificationStatus : 'AWAITING'} />
    </div>
  );
}

export default function ApplicationDetails() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(async () => {
    const [application, comparison] = await Promise.all([api.getApplication(id), api.getComparison(id)]);
    return { application, comparison };
  }, [id]);

  if (loading) return <Loading text="Loading application…" />;
  if (error) {
    return (
      <>
        <PageHeader title="Application" actions={<Link to="/internal/applications" className="btn btn-outline-secondary">Back</Link>} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  const { application: a, comparison } = data;
  const decision = comparison.decision;

  return (
    <>
      <PageHeader
        title={a.applicationReference}
        subtitle={`Application for ${a.applicantName}`}
        actions={
          <>
            <Link to="/internal/applications" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-1" />
              Back
            </Link>
            <Link to={`/internal/audit-logs?applicationId=${a.id}`} className="btn btn-outline-secondary">
              <i className="bi bi-journal-text me-1" />
              Audit trail
            </Link>
            <Link to={`/internal/comparison?applicationId=${a.id}`} className="btn btn-primary">
              <i className="bi bi-columns-gap me-1" />
              Compare vendors
            </Link>
          </>
        }
      />

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="panel h-100">
            <div className="panel-head">
              <h2 className="panel-title">Applicant &amp; document</h2>
              <StatusBadge status={a.applicationStatus} />
            </div>
            <div className="panel-body">
              <dl className="kv">
                <dt>Application ID</dt>
                <dd>{a.id}</dd>
                <dt>Applicant name</dt>
                <dd>{a.applicantName}</dd>
                <dt>Email</dt>
                <dd>{a.email}</dd>
                <dt>Phone</dt>
                <dd>{a.phoneNumber}</dd>
                <dt>Document type</dt>
                <dd>{docTypeLabel(a.documentType)}</dd>
                <dt>Document reference</dt>
                <dd>{a.documentReference}</dd>
                <dt>Created</dt>
                <dd>{formatDateTime(a.createdAt)}</dd>
                <dt>Last updated</dt>
                <dd>{formatDateTime(a.updatedAt)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel mb-3">
            <div className="panel-head">
              <h2 className="panel-title">Vendor responses</h2>
            </div>
            <div className="panel-body py-2">
              <VendorSummary title="Vendor A" response={comparison.vendorA} />
              <VendorSummary title="Vendor B" response={comparison.vendorB} />
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Final decision</h2>
              {decision && <StatusBadge status={decision.finalDecision} />}
            </div>
            <div className="panel-body">
              {decision ? (
                <>
                  <p className="mb-1">{decision.decisionReason}</p>
                  <div className="small text-muted">Evaluated {formatDateTime(decision.evaluatedAt)}</div>
                </>
              ) : (
                <p className="text-muted mb-0">
                  Not evaluated yet. Use <Link to={`/internal/comparison?applicationId=${a.id}`}>Vendor Comparison</Link> to run the decision.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
