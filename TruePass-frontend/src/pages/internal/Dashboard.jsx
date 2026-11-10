import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import Loading, { EmptyState, ErrorState } from '../../components/common/Loading';
import { docTypeLabel, formatDate } from '../../utils/format';

const SEGMENTS = [
  { key: 'passedApplications', label: 'Passed', tone: 'success' },
  { key: 'rejectedApplications', label: 'Rejected', tone: 'danger' },
  { key: 'waitingApplications', label: 'Waiting for Responses', tone: 'warning' },
  { key: 'manualReviewApplications', label: 'Manual Review', tone: 'review' },
  { key: 'retryApplications', label: 'Retry Required', tone: 'retry' },
];

const SWATCH = {
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
  review: '#7c3aed',
  retry: '#ea580c',
};

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(async () => {
    const [summary, applications] = await Promise.all([api.dashboardSummary(), api.listApplications()]);
    return { summary, applications };
  }, []);

  if (loading) return <Loading text="Loading dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { summary, applications } = data;
  const total = summary.totalApplications || 0;
  const recent = applications.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of identity verification applications."
        actions={
          <Link to="/internal/create-application" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />
            Create Application
          </Link>
        }
      />

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4 col-xl-2">
          <SummaryCard label="Total Applications" value={summary.totalApplications} icon="bi-collection" tone="info" to="/internal/applications" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <SummaryCard label="Passed" value={summary.passedApplications} icon="bi-check-circle" tone="success" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <SummaryCard label="Rejected" value={summary.rejectedApplications} icon="bi-x-circle" tone="danger" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <SummaryCard label="Waiting for Responses" value={summary.waitingApplications} icon="bi-hourglass-split" tone="warning" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <SummaryCard label="Manual Review" value={summary.manualReviewApplications} icon="bi-person-check" tone="review" to="/internal/manual-review" />
        </div>
        <div className="col-6 col-md-4 col-xl-2">
          <SummaryCard label="Retry Required" value={summary.retryApplications} icon="bi-arrow-repeat" tone="retry" />
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <div className="panel h-100">
            <div className="panel-head">
              <h2 className="panel-title">Application status distribution</h2>
              <span className="text-muted small">{total} total</span>
            </div>
            <div className="panel-body">
              {total === 0 ? (
                <div className="text-muted">No applications yet.</div>
              ) : (
                <>
                  <div className="dist-bar" role="img" aria-label="Status distribution">
                    {SEGMENTS.map((s) => {
                      const count = summary[s.key] || 0;
                      if (!count) return null;
                      return (
                        <div
                          key={s.key}
                          className={`dist-seg seg-${s.tone}`}
                          style={{ width: `${(count / total) * 100}%` }}
                          title={`${s.label}: ${count}`}
                        />
                      );
                    })}
                  </div>
                  <div className="dist-legend">
                    {SEGMENTS.map((s) => {
                      const count = summary[s.key] || 0;
                      return (
                        <span key={s.key}>
                          <span className="swatch" style={{ background: SWATCH[s.tone] }} />
                          {s.label}: <strong>{count}</strong> ({Math.round((count / total) * 100)}%)
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="panel h-100">
            <div className="panel-head">
              <h2 className="panel-title">Needs attention</h2>
            </div>
            <div className="panel-body py-2">
              <Link to="/internal/manual-review" className="attention-item">
                <span className="attention-label">
                  <i className="bi bi-person-check me-2 text-muted" />
                  Awaiting manual review
                </span>
                <strong>{summary.manualReviewApplications}</strong>
              </Link>
              <Link to="/internal/applications" className="attention-item">
                <span className="attention-label">
                  <i className="bi bi-hourglass-split me-2 text-muted" />
                  Waiting for vendor responses
                </span>
                <strong>{summary.waitingApplications}</strong>
              </Link>
              <Link to="/internal/applications" className="attention-item">
                <span className="attention-label">
                  <i className="bi bi-arrow-repeat me-2 text-muted" />
                  Retry required
                </span>
                <strong>{summary.retryApplications}</strong>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent applications</h2>
          <Link to="/internal/applications" className="small">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No applications yet" text="Create the first application to start the verification workflow.">
            <Link to="/internal/create-application" className="btn btn-sm btn-primary mt-2">
              Create Application
            </Link>
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="table data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Applicant</th>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/internal/applications/${a.id}`} className="ref-link">
                        {a.applicationReference}
                      </Link>
                    </td>
                    <td>{a.applicantName}</td>
                    <td>{docTypeLabel(a.documentType)}</td>
                    <td>
                      <StatusBadge status={a.applicationStatus} />
                    </td>
                    <td>{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
