import { Link } from 'react-router-dom';
import LoginForm from '../components/common/LoginForm';
import { DEMO_ACCOUNTS } from '../services/auth';

export default function VendorLogin() {
  return (
    <div className="landing">
      <div className="login-card portal-vendor">
        <div className="login-head">
          <span className="portal-pill">Vendor Portal</span>
          <h1>Vendor Portal Login</h1>
          <p>Vendor A and Vendor B sign in here to submit verification results.</p>
        </div>
        <LoginForm portal="VENDOR" accounts={DEMO_ACCOUNTS.VENDOR} />
        <div className="text-center mt-3">
          <Link to="/" className="small">
            <i className="bi bi-arrow-left" /> Back to portal selection
          </Link>
        </div>
      </div>
    </div>
  );
}
