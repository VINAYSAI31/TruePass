import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getSession, homePathFor, vendorLabel } from '../services/auth';

export default function LoginSelection() {
  const navigate = useNavigate();
  const session = getSession();

  function logout() {
    clearSession();
    navigate(0);
  }

  return (
    <div className="landing">
      <div className="landing-inner">
        <div className="landing-brand">
          <i className="bi bi-shield-check" />
          <h1>Digital Identity Proofing Platform</h1>
          <p>Choose the portal you want to enter.</p>
        </div>

        {session && (
          <div className="alert alert-info d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span>
              Signed in as <strong>{session.username}</strong>
              {session.role !== 'INTERNAL' && ` (${vendorLabel(session.role)})`}.
            </span>
            <span className="d-flex gap-2">
              <Link to={homePathFor(session.role)} className="btn btn-sm btn-primary">
                Continue
              </Link>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={logout}>
                Logout
              </button>
            </span>
          </div>
        )}

        <div className="row g-4">
          <div className="col-md-6">
            <Link to="/internal/login" className="portal-card portal-internal">
              <div className="portal-card-icon">
                <i className="bi bi-building-gear" />
              </div>
              <h2>Internal Operations</h2>
              <p>Create applications, compare vendor results, evaluate decisions and handle manual reviews.</p>
              <span className="portal-card-cta">
                Enter Internal Operations <i className="bi bi-arrow-right" />
              </span>
            </Link>
          </div>
          <div className="col-md-6">
            <Link to="/vendor/login" className="portal-card portal-vendor">
              <div className="portal-card-icon">
                <i className="bi bi-patch-check" />
              </div>
              <h2>Vendor Portal</h2>
              <p>Vendor A and Vendor B receive applications and submit their own verification results.</p>
              <span className="portal-card-cta">
                Enter Vendor Portal <i className="bi bi-arrow-right" />
              </span>
            </Link>
          </div>
        </div>

        <p className="landing-note">
          <i className="bi bi-exclamation-triangle me-1" />
          Demo environment. Login is simulated and is not secure authentication.
        </p>
      </div>
    </div>
  );
}
