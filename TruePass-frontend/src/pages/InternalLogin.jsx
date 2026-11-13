import { Link } from 'react-router-dom';
import LoginForm from '../components/common/LoginForm';
import { DEMO_ACCOUNTS } from '../services/auth';

export default function InternalLogin() {
  return (
    <div className="landing">
      <div className="login-card portal-internal">
        <div className="login-head">
          <span className="portal-pill">Internal Operation</span>
          <h1>Internal OperationLoginsdof</h1>
          <p>Staff portal for managing applications and decisions.</p>
        </div>
        <LoginForm portal="INTERNAL" accounts={DEMO_ACCOUNTS.INTERNAL} />
        <div className="text-center mt-3">
          <Link to="/" className="small">
            <i className="bi bi-arrow-left" /> Back to portal selection
          </Link>
        </div>
      </div>
    </div>
  );
}
