import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import Loading, { EmptyState, ErrorState } from '../../components/common/Loading';
import { formatDateTime, humanize } from '../../utils/format';

const PAGE_SIZE = 15;

const ACTIONS = [
  'APPLICATION_CREATED',
  'VENDOR_RESPONSE_SUBMITTED',
  'VENDOR_RESPONSE_UPDATED',
  'DECISION_EVALUATED',
  'EXCEPTION_CREATED',
  'EXCEPTION_AUTO_RESOLVED',
  'MANUAL_REVIEW_COMPLETED',
];

export default function AuditLogs() {
  const [params, setParams] = useSearchParams();
  const applicationId = params.get('applicationId');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  // Audit entries only carry an application id, so references are looked up from the applications list.
  const { data, loading, error, reload } = useAsync(async () => {
    const [logs, applications] = await Promise.all([
      api.listAuditLogs({ applicationId: applicationId || undefined }),
      api.listApplications(),
    ]);
    const refs = {};
    applications.forEach((a) => {
      refs[a.id] = a.applicationReference;
    });
    return { logs, refs };
  }, [applicationId]);

  const q = search.trim().toLowerCase();
  const rows = (data?.logs || []).filter((l) => {
    if (action && l.action !== action) return false;
    if (!q) return true;
    const ref = data.refs[l.applicationId] || '';
    return [ref, l.performedBy, l.description].some((v) => (v || '').toLowerCase().includes(q));
  });
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtered = Boolean(q || action);

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="Every change in the verification workflow, newest first." />

      {applicationId && (
        <div className="alert alert-info d-flex justify-content-between align-items-center py-2">
          <span>
            Showing the audit trail for application {data?.refs[applicationId] || `#${applicationId}`}.
          </span>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setParams({})}>
            Show all
          </button>
        </div>
      )}

      <div className="panel">
        <div className="filters">
          <input
            className="form-control"
            placeholder="Search reference, user, description…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search audit logs"
          />
          <select
            className="form-select"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {humanize(a)}
              </option>
            ))}
          </select>
          {filtered && (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setSearch('');
                setAction('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <Loading text="Loading audit logs…" />
        ) : error ? (
          <div className="p-3">
            <ErrorState error={error} onRetry={reload} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon="bi-journal-text" title={filtered ? 'No entries match your filters' : 'No audit entries yet'} />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table data-table">
                <thead>
                  <tr>
                    <th>Application Reference</th>
                    <th>Action</th>
                    <th>Performed By</th>
                    <th>Description</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.applicationId && data.refs[l.applicationId] ? (
                          <Link to={`/internal/applications/${l.applicationId}`} className="ref-link">
                            {data.refs[l.applicationId]}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-nowrap">{humanize(l.action)}</td>
                      <td>{l.performedBy}</td>
                      <td style={{ minWidth: 260 }}>{l.description}</td>
                      <td className="text-nowrap">{formatDateTime(l.createdAt)}</td>
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
