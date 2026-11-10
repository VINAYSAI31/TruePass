import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import useAsync from '../../hooks/useAsync';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import VendorResponseCard from '../../components/internal/VendorResponseCard';
import Loading, { EmptyState, ErrorState } from '../../components/common/Loading';
import { STATUS_META, formatDate, formatDateTime } from '../../utils/format';

function DecisionResult({ decision, reviewLink }) {
  const tone = STATUS_META[decision.finalDecision]?.tone || 'neutral';
  const waiting = decision.finalDecision === 'WAITING_FOR_RESPONSES';
  const isReview = decision.finalDecision === 'MANUAL_REVIEW';

  return (
    <div className={`decision-box tone-${tone}`}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div>
          <div className="small text-muted">Decision from backend</div>
          <div className="decision-big">
            <StatusBadge status={decision.finalDecision} />
          </div>
        </div>
        <div className="small text-muted">Evaluated {formatDateTime(decision.evaluatedAt)}</div>
      </div>

      {waiting && (
        <div className="alert alert-warning py-2 small mb-2">
          <i className="bi bi-hourglass-split me-1" />
          WAITING_FOR_RESPONSES: at least one vendor has not responded yet, so no decision can be made.
        </div>
      )}

      <div className="mb-2">
        <span className="fw-semibold">Reason: </span>
        {decision.decisionReason}
      </div>
      <div className="small text-muted">
        Vendor A: {decision.vendorAStatus || 'no response'} · Vendor B: {decision.vendorBStatus || 'no response'} · Application status:{' '}
        {STATUS_META[decision.applicationStatus]?.label || decision.applicationStatus}
      </div>

      {isReview && (
        <Link to={reviewLink} className="btn btn-sm btn-primary mt-3">
          <i className="bi bi-person-check me-1" />
          Go to Manual Review
        </Link>
      )}
    </div>
  );
}

export default function VendorComparison() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('applicationId');
  const [search, setSearch] = useState('');

  const list = useAsync(() => api.listApplications(), []);

  const selected = useAsync(
    () => (selectedId ? api.getComparison(selectedId) : Promise.resolve(null)),
    [selectedId],
  );

  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState('');
  const [result, setResult] = useState(null);
  const [reviewLink, setReviewLink] = useState('/internal/manual-review');

  // A new selection starts clean.
  useEffect(() => {
    setResult(null);
    setEvalError('');
    setReviewLink('/internal/manual-review');
  }, [selectedId]);

  function select(id) {
    setParams({ applicationId: String(id) });
  }

  async function evaluate() {
    setEvaluating(true);
    setEvalError('');
    try {
      const decision = await api.evaluateDecision(selectedId);
      setResult(decision);
      if (decision.finalDecision === 'MANUAL_REVIEW') {
        try {
          const open = await api.listExceptions({ status: 'OPEN' });
          const match = open.find((x) => String(x.applicationId) === String(selectedId));
          if (match) setReviewLink(`/internal/manual-review/${match.id}`);
        } catch {
          /* the generic queue link is still shown */
        }
      }
      // Pull fresh data (application status, stored decision) and the list badges.
      selected.reload(true);
      list.reload(true);
    } catch (err) {
      setEvalError(err.message);
    } finally {
      setEvaluating(false);
    }
  }

  const apps = (list.data || []).filter((a) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return a.applicationReference.toLowerCase().includes(q) || a.applicantName.toLowerCase().includes(q);
  });

  const comparison = selected.data;
  const shownDecision = result || comparison?.decision;

  return (
    <>
      <PageHeader
        title="Vendor Comparison"
        subtitle="Compare both vendor responses and ask the backend to evaluate the decision."
      />

      <div className="compare-layout">
        {/* Application picker */}
        <div className="panel">
          <div className="filters">
            <input
              className="form-control"
              placeholder="Search applications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search applications"
            />
          </div>
          <div className="app-picker">
            {list.loading ? (
              <Loading />
            ) : list.error ? (
              <div className="p-3">
                <ErrorState error={list.error} onRetry={list.reload} />
              </div>
            ) : apps.length === 0 ? (
              <EmptyState title="No applications" text="Nothing matches yet." />
            ) : (
              apps.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className={`picker-item ${String(a.id) === selectedId ? 'selected' : ''}`}
                  onClick={() => select(a.id)}
                >
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <span className="fw-semibold">{a.applicationReference}</span>
                    <StatusBadge status={a.applicationStatus} />
                  </div>
                  <div className="small text-muted">
                    {a.applicantName} · {formatDate(a.createdAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Comparison panel */}
        <div>
          {!selectedId ? (
            <div className="panel">
              <EmptyState icon="bi-columns-gap" title="Select an application" text="Choose an application on the left to compare Vendor A and Vendor B." />
            </div>
          ) : selected.loading ? (
            <div className="panel">
              <Loading text="Loading comparison…" />
            </div>
          ) : selected.error ? (
            <ErrorState error={selected.error} onRetry={selected.reload} />
          ) : (
            <>
              <div className="panel mb-3">
                <div className="panel-body d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="fw-semibold fs-5">{comparison.application.applicationReference}</div>
                    <div className="text-muted small">
                      {comparison.application.applicantName} ·{' '}
                      <Link to={`/internal/applications/${comparison.application.id}`}>View application</Link>
                    </div>
                  </div>
                  <StatusBadge status={comparison.application.applicationStatus} />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <VendorResponseCard title="Vendor A" variant="vendor-a" response={comparison.vendorA} />
                </div>
                <div className="col-md-6">
                  <VendorResponseCard title="Vendor B" variant="vendor-b" response={comparison.vendorB} />
                </div>
              </div>

              <div className="panel">
                <div className="panel-body">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div>
                      <div className="fw-semibold">Decision</div>
                      <div className="small text-muted">The decision is calculated by the backend, not in the browser.</div>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={evaluate} disabled={evaluating}>
                      {evaluating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Evaluating…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-play-circle me-1" />
                          Evaluate Decision
                        </>
                      )}
                    </button>
                  </div>

                  {evalError && (
                    <div className="alert alert-danger py-2" role="alert">
                      {evalError}
                    </div>
                  )}

                  {shownDecision ? (
                    <>
                      {!result && <div className="small text-muted mb-2">Last stored decision</div>}
                      <DecisionResult decision={shownDecision} reviewLink={reviewLink} />
                    </>
                  ) : (
                    <div className="text-muted">No decision yet. Click Evaluate Decision to run the backend rules.</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
