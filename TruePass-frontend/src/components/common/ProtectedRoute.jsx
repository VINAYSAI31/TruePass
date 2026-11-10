import { Navigate } from 'react-router-dom';
import { getSession, homePathFor, portalOf } from '../../services/auth';

// Frontend-only guard (demo). It keeps people from wandering into the wrong portal.
// Real access control is enforced by the backend (401 / 403).
export default function ProtectedRoute({ portal, children }) {
  const session = getSession();

  if (!session) {
    return <Navigate to={portal === 'INTERNAL' ? '/internal/login' : '/vendor/login'} replace />;
  }
  if (portalOf(session.role) !== portal) {
    return <Navigate to={homePathFor(session.role)} replace />;
  }
  return children;
}
