import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import Navbar from '../common/Navbar';
import { clearSession, getSession, vendorLabel } from '../../services/auth';

const NAV_ITEMS = [
  { to: '/vendor', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
  { to: '/vendor/applications', label: 'My Applications', icon: 'bi-folder2-open' },
  { to: '/vendor/history', label: 'Submission History', icon: 'bi-clock-history' },
];

export default function VendorLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const session = getSession();
  const name = vendorLabel(session?.role);

  function logout() {
    clearSession();
    navigate('/', { replace: true });
  }

  return (
    <div className="app-shell">
      <Sidebar
        portalLabel={`Vendor Portal · ${name}`}
        portalClass="portal-vendor"
        subtitle={session?.username}
        items={NAV_ITEMS}
        onLogout={logout}
        open={open}
        onClose={() => setOpen(false)}
      />
      <div className="main-area">
        <Navbar
          portalLabel={`Vendor Portal · ${name}`}
          portalClass="portal-vendor"
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
