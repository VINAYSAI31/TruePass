import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import Loading, { EmptyState, ErrorState } from '../../components/common/Loading';
import { docTypeLabel, formatDate } from '../../utils/format';

const PAGE_SIZE = 10;

export default function MyApplications() {
  const { data, loading, error, reload } = useAsync(() => api.vendorApplications(), []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  const q = search.trim().toLowerCase();
  const rows = (data || []).filter((a) => {
    if (filter === 'PENDING' && a.alreadySubmitted) return false;
    if (filter === 'SUBMITTED' && !a.alreadySubmitted) return false;
    if (!q) return true;
    return [a.applicationReference, a.applicantName, a.documentReference].some((v) => (v || '').toLowerCase().includes(q));
  });
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader title="My Applications" subtitle="Applications waiting for your verification result." />

      <div className="panel">
        <div className="filters">
          <input
            className="form-control"
            placeholder="Search reference or applicant…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search applications"
          />
          <select
            className="form-select"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by submission status"
          >
            <option value="">All submissions</option>
            <option value="PENDING">Pending</option>
            <option value="SUBMITTED">Submitted</option>
          </select>
        </div>

        {loading ? (
          <Loading text="Loading applications…" />
        ) : error ? (
          <div className="p-3">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No applications found" text="Nothing matches your filters, or no applications are assigned yet." />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>Application Reference</th>
                    <th>Applicant Name</th>
                    <th>Document Type</th>
                    <th>Assigned Date</th>
                    <th>Submission Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((a) => (
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
                      <td className="text-nowrap">
                        <Link to={`/vendor/applications/${a.id}`} className="btn btn-sm btn-outline-secondary me-2">
                          View
                        </Link>
                        {!a.alreadySubmitted && (
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
            <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
