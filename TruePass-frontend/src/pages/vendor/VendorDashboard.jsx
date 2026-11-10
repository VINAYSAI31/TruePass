import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import SummaryCard from '../../components/common/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import Loading, { EmptyState, ErrorState } from '../../components/common/Loading';
import { getSession, vendorLabel } from '../../services/auth';
import { docTypeLabel, formatDate } from '../../utils/format';

export default function VendorDashboard() {
  const session = getSession();
  const { data, loading, error, reload } = useAsync(async () => {
    const [summary, applications] = await Promise.all([api.vendorDashboardSummary(), api.vendorApplications()]);
    return { summary, applications };
  }, []);

  if (loading) return <Loading text="Loading dashboard…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const { summary, applications } = data;
  const recent = applications.slice(0, 6);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Welcome, ${vendorLabel(session?.role)}. Here is your verification workload.`} />

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <SummaryCard label="Assigned Applications" value={summary.assignedApplications} icon="bi-folder2-open" tone="info" to="/vendor/applications" />
        </div>
        <div className="col-md-4">
          <SummaryCard label="Pending Applications" value={summary.pendingApplications} icon="bi-hourglass-split" tone="warning" />
        </div>
        <div className="col-md-4">
          <SummaryCard label="Completed Applications" value={summary.completedApplications} icon="bi-check-circle" tone="success" to="/vendor/history" />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Recent assigned applications</h2>
          <Link to="/vendor/applications" className="small">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState title="No applications assigned yet" text="New applications from the Internal Operations team will appear here." />
        ) : (
          <div className="table-responsive">
            <table className="table data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Applicant</th>
                  <th>Document</th>
                  <th>Assigned</th>
                  <th>Submission</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`/vendor/applications/${a.id}`} className="ref-link">
                        {a.applicationReference}
                      </Link>
                    </td>
                    <td>{a.applicantName}</td>
                    <td>{docTypeLabel(a.documentType)}</td>
                    <td>{formatDate(a.createdAt)}</td>
                    <td>
                      <StatusBadge status={a.alreadySubmitted ? 'SUBMITTED' : 'PENDING'} />
                    </td>
                    <td>
                      {a.alreadySubmitted ? (
                        <Link to={`/vendor/applications/${a.id}`} className="btn btn-sm btn-outline-secondary">
                          View
                        </Link>
                      ) : (
                        <Link to={`/vendor/applications/${a.id}/submit`} className="btn btn-sm btn-primary">
                          Submit
                        </Link>
                      )}
                    </td>
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
