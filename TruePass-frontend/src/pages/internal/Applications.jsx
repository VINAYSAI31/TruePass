import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import Loading, { EmptyState, ErrorState } from '../../components/common/Loading';
import { docTypeLabel, formatDate } from '../../utils/format';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'WAITING_FOR_RESPONSES', label: 'Waiting for Responses' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'MANUAL_REVIEW', label: 'Manual Review' },
  { value: 'RETRY', label: 'Retry Required' },
];

export default function Applications() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useAsync(
    () => api.listApplications({ status: status || undefined, search: debounced || undefined }),
    [status, debounced],
  );

  // The list endpoint has no vendor columns, so the comparison endpoint is read for the rows on screen.
  const [comparisons, setComparisons] = useState({});
  const requested = useRef(new Set());

  const rows = data || [];
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    requested.current = new Set();
    setComparisons({});
  }, [data]);

  useEffect(() => {
    pageRows.forEach((a) => {
      if (requested.current.has(a.id)) return;
      requested.current.add(a.id);
      api
        .getComparison(a.id)
        .then((c) => setComparisons((prev) => ({ ...prev, [a.id]: { data: c } })))
        .catch(() => setComparisons((prev) => ({ ...prev, [a.id]: { failed: true } })));
    });
  }, [data, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function vendorCell(entry, key) {
    if (!entry) return <span className="text-muted">…</span>;
    if (entry.failed) return <span className="text-muted">—</span>;
    const response = entry.data[key];
    return <StatusBadge status={response ? response.verificationStatus : 'AWAITING'} />;
  }

  function decisionCell(entry, application) {
    if (!entry) return <span className="text-muted">…</span>;
    if (entry.failed) return <span className="text-muted">—</span>;
    const decision = entry.data.decision;
    if (decision) return <StatusBadge status={decision.finalDecision} />;
    return <StatusBadge status="NOT_EVALUATED" />;
  }

  const filtered = Boolean(status || debounced);

  return (
    <>
      <PageHeader
        title="Applications"
        subtitle="All identity verification applications."
        actions={
          <Link to="/internal/create-application" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1" />
            Create Application
          </Link>
        }
      />

      <div className="panel">
        <div className="filters">
          <input
            className="form-control"
            placeholder="Search name, email, reference…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search applications"
          />
          <select
            className="form-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {filtered && (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setSearch('');
                setStatus('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <Loading text="Loading applications…" />
        ) : error ? (
          <div className="p-3">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtered ? 'No applications match your filters' : 'No applications yet'}
            text={filtered ? 'Try a different search or status.' : 'Create an application to get started.'}
          />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>Application Reference</th>
                    <th>Applicant Name</th>
                    <th>Document Type</th>
                    <th>Created Date</th>
                    <th>Vendor A Status</th>
                    <th>Vendor B Status</th>
                    <th>Final Decision</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((a) => {
                    const entry = comparisons[a.id];
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link to={`/internal/applications/${a.id}`} className="ref-link">
                            {a.applicationReference}
                          </Link>
                        </td>
                        <td>{a.applicantName}</td>
                        <td>{docTypeLabel(a.documentType)}</td>
                        <td>{formatDate(a.createdAt)}</td>
                        <td>{vendorCell(entry, 'vendorA')}</td>
                        <td>{vendorCell(entry, 'vendorB')}</td>
                        <td>{decisionCell(entry, a)}</td>
                        <td>
                          <Link to={`/internal/applications/${a.id}`} className="btn btn-sm btn-outline-primary">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
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
