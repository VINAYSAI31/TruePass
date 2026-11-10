import StatusBadge from '../common/StatusBadge';
import { formatDateTime } from '../../utils/format';

// One vendor's normalised response, as returned by the comparison endpoint.
export default function VendorResponseCard({ title, variant, response }) {
  const score = response ? Number(response.confidenceScore) : null;
  const hasScore = score !== null && !Number.isNaN(score);

  return (
    <div className={`vendor-card ${variant}`}>
      <div className="vendor-card-head">
        <span>{title}</span>
        {response && <StatusBadge status={response.responseStatus} />}
      </div>

      {!response ? (
        <div className="state-box flex-column text-center">
          <i className="bi bi-hourglass-split state-icon" />
          <div className="fw-semibold">No response yet</div>
          <div className="small">Waiting for {title} to submit a result.</div>
        </div>
      ) : (
        <div className="p-3">
          <dl className="kv mb-0">
            <dt>Verification status</dt>
            <dd>
              <StatusBadge status={response.verificationStatus} />
            </dd>
            <dt>Confidence score</dt>
            <dd>
              {hasScore ? (
                <>
                  <strong>{Number.isInteger(score) ? score : score.toFixed(1)}</strong> / 100
                  <div className="score-bar">
                    <span style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
                  </div>
                </>
              ) : (
                '—'
              )}
            </dd>
            <dt>Vendor reference</dt>
            <dd>{response.vendorReference}</dd>
            <dt>Remarks</dt>
            <dd>{response.remarks || '—'}</dd>
            <dt>Submitted</dt>
            <dd>{formatDateTime(response.submittedAt)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
