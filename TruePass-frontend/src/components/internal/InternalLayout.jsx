import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import Navbar from '../common/Navbar';
import { clearSession, getSession } from '../../services/auth';

const NAV_ITEMS = [
  { to: '/internal', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
  { to: '/internal/applications', label: 'Applications', icon: 'bi-folder2-open' },
  { to: '/internal/create-application', label: 'Create Application', icon: 'bi-plus-circle' },
  { to: '/internal/comparison', label: 'Vendor Comparison', icon: 'bi-columns-gap' },
  { to: '/internal/manual-review', label: 'Manual Review', icon: 'bi-person-check' },
  { to: '/internal/audit-logs', label: 'Audit Logs', icon: 'bi-journal-text' },
];

export default function InternalLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const session = getSession();

  function logout() {
    clearSession();
    navigate('/', { replace: true });
  }

  return (
    <div className="app-shell">
      <Sidebar
        portalLabel="Internal Operations"
        portalClass="portal-internal"
        subtitle={session?.username}
        items={NAV_ITEMS}
        onLogout={logout}
        open={open}
        onClose={() => setOpen(false)}
      />
      <div className="main-area">
        <Navbar
          portalLabel="Internal Operations Portal"
          portalClass="portal-internal"
          userLabel={session?.username}
          onToggleSidebar={() => setOpen((o) => !o)}
        />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
