import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import Loading, { EmptyState, ErrorState } from '../../components/common/Loading';
import { formatDateTime } from '../../utils/format';

const PAGE_SIZE = 10;

const QUEUE_FILTERS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: '', label: 'All' },
];

export default function ManualReview() {
  const location = useLocation();
  const flash = location.state?.flash;
  const [queue, setQueue] = useState('OPEN');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAsync(async () => {
    const [exceptions, applications] = await Promise.all([
      api.listExceptions({ status: queue || undefined }),
      api.listApplications(),
    ]);
    const names = {};
    applications.forEach((a) => {
      names[a.id] = a.applicantName;
    });
    return { exceptions, names };
  }, [queue]);

  const rows = data?.exceptions || [];
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader title="Manual Review" subtitle="Exception queue for applications that need a human decision." />

      {flash && (
        <div className="alert alert-success" role="status">
          <i className="bi bi-check-circle me-2" />
          {flash}
        </div>
      )}

      <div className="panel">
        <div className="filters align-items-center">
          <div className="btn-group" role="group" aria-label="Queue status">
            {QUEUE_FILTERS.map((f) => (
              <button
                key={f.label}
                type="button"
                className={`btn btn-sm ${queue === f.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => {
                  setQueue(f.value);
                  setPage(1);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => reload()}>
            <i className="bi bi-arrow-clockwise me-1" />
            Refresh
          </button>
        </div>

        {loading ? (
          <Loading text="Loading queue…" />
        ) : error ? (
          <div className="p-3">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon="bi-check2-circle"
            title={queue === 'OPEN' ? 'The queue is clear' : 'No exceptions found'}
            text={queue === 'OPEN' ? 'No applications are waiting for manual review.' : undefined}
          />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>Application Reference</th>
                    <th>Applicant</th>
                    <th>Exception Reason</th>
                    <th>Priority</th>
                    <th>Queue Status</th>
                    <th>Created Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <Link to={`/internal/manual-review/${x.id}`} className="ref-link">
                          {x.applicationReference}
                        </Link>
                      </td>
                      <td>{data.names[x.applicationId] || '—'}</td>
                      <td style={{ maxWidth: 340 }}>{x.reason}</td>
                      <td>
                        <StatusBadge status={x.priority} />
                      </td>
                      <td>
                        <StatusBadge status={x.queueStatus} />
                      </td>
                      <td>{formatDateTime(x.createdAt)}</td>
                      <td>
                        <Link to={`/internal/manual-review/${x.id}`} className="btn btn-sm btn-outline-primary">
                          View
                        </Link>
                      </td>
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
