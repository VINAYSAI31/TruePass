import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Loading, { ErrorState } from '../../components/common/Loading';
import { getSession } from '../../services/auth';
import { docTypeLabel, formatDateTime, formatVendorConfidence } from '../../utils/format';

export default function VendorApplicationDetails() {
  const { id } = useParams();
  const session = getSession();

  // Only this vendor's own data is requested. The backend never returns the other vendor's response.
  const { data, loading, error, reload } = useAsync(async () => {
    const application = await api.vendorApplication(id);
    let ownResponse = null;
    if (application.alreadySubmitted) {
      const responses = await api.vendorResponses();
      ownResponse = responses.find((r) => String(r.applicationId) === String(application.id)) || null;
    }
    return { application, ownResponse };
  }, [id]);

  if (loading) return <Loading text="Loading application…" />;
  if (error) {
    return (
      <>
        <PageHeader title="Application" actions={<Link to="/vendor/applications" className="btn btn-outline-secondary">Back</Link>} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  const { application: a, ownResponse } = data;

  return (
    <>
      <PageHeader
        title={a.applicationReference}
        subtitle="Details required to verify this applicant."
        actions={
          <>
            <Link to="/vendor/applications" className="btn btn-outline-secondary">
              <i className="bi bi-arrow-left me-1" />
              Back
            </Link>
            {!a.alreadySubmitted && (
              <Link to={`/vendor/applications/${a.id}/submit`} className="btn btn-primary">
                <i className="bi bi-send me-1" />
                Submit verification
              </Link>
            )}
          </>
        }
      />

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="panel h-100">
            <div className="panel-head">
              <h2 className="panel-title">Applicant &amp; document</h2>
              <StatusBadge status={a.alreadySubmitted ? 'SUBMITTED' : 'PENDING'} />
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
                <dt>Assigned</dt>
                <dd>{formatDateTime(a.createdAt)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel h-100">
            <div className="panel-head">
              <h2 className="panel-title">Your submission</h2>
            </div>
            <div className="panel-body">
              {!a.alreadySubmitted ? (
                <>
                  <p className="text-muted">You have not submitted a result for this application yet.</p>
                  <Link to={`/vendor/applications/${a.id}/submit`} className="btn btn-primary">
                    Submit verification
                  </Link>
                </>
              ) : ownResponse ? (
                <dl className="kv" style={{ gridTemplateColumns: '120px 1fr' }}>
                  <dt>Vendor reference</dt>
                  <dd>{ownResponse.vendorReference}</dd>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={ownResponse.verificationStatus} />
                  </dd>
                  <dt>Confidence</dt>
                  <dd>{formatVendorConfidence(ownResponse.confidenceScore, session?.vendorId)}</dd>
                  <dt>Remarks</dt>
                  <dd>{ownResponse.remarks || '—'}</dd>
                  <dt>Submitted</dt>
                  <dd>{formatDateTime(ownResponse.submittedAt)}</dd>
                </dl>
              ) : (
                <p className="text-muted mb-0">Your submission was recorded. See Submission History for details.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
