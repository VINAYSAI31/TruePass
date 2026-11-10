import { useState } from 'react';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import Loading, { EmptyState, ErrorState } from '../../components/common/Loading';
import { getSession } from '../../services/auth';
import { formatDateTime, formatVendorConfidence } from '../../utils/format';

const PAGE_SIZE = 10;

export default function SubmissionHistory() {
  const session = getSession();
  const { data, loading, error, reload } = useAsync(() => api.vendorResponses(), []);
  const [page, setPage] = useState(1);

  const rows = data || [];
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader title="Submission History" subtitle="Results you have submitted, newest first." />

      <div className="panel">
        {loading ? (
          <Loading text="Loading submissions…" />
        ) : error ? (
          <div className="p-3">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon="bi-clock-history" title="No submissions yet" text="Results you submit will be listed here." />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>Application Reference</th>
                    <th>Vendor Reference</th>
                    <th>Verification Status</th>
                    <th>Confidence</th>
                    <th>Submission Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r) => (
                    <tr key={r.id}>
                      <td className="fw-semibold">{r.applicationReference}</td>
                      <td>{r.vendorReference}</td>
                      <td>
                        <StatusBadge status={r.verificationStatus} />
                      </td>
                      <td>{formatVendorConfidence(r.confidenceScore, session?.vendorId)}</td>
                      <td>{formatDateTime(r.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
