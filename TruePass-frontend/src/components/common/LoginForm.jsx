import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { homePathFor, portalOf, saveSession } from '../../services/auth';

// Shared demo login form used by both portals.
export default function LoginForm({ portal, accounts }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(accounts[0].username);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await api.demoLogin(username.trim(), password);
      const actual = portalOf(response.role);
      if (actual !== portal) {
        setError(
          actual === 'INTERNAL'
            ? 'This is an Internal Operations account. Use the Internal Operations login instead.'
            : 'This is a Vendor account. Use the Vendor Portal login instead.',
        );
        return;
      }
      saveSession(response);
      navigate(homePathFor(response.role), { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Wrong username or password.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  function fill(account) {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="username" className="form-label">
          Username
        </label>
        <input
          id="username"
          className="form-control"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary w-100" disabled={busy || !username || !password}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="demo-box mt-4">
        <div className="demo-box-title">
          <i className="bi bi-info-circle me-1" />
          Demo credentials
        </div>
        <ul className="list-unstyled mb-2 small">
          {accounts.map((a) => (
            <li key={a.username} className="d-flex justify-content-between align-items-center py-1">
              <span>
                <code>{a.username}</code> / <code>{a.password}</code>
              </span>
              <button type="button" className="btn btn-sm btn-outline-primary py-0" onClick={() => fill(a)}>
                Fill
              </button>
            </li>
          ))}
        </ul>
        <div className="text-muted small">
          Demo only: a simulated login, <strong>not secure authentication</strong>.
        </div>
      </div>
    </form>
  );
}
