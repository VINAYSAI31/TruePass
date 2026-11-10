import { NavLink } from 'react-router-dom';

export default function Sidebar({ portalLabel, portalClass, subtitle, items, onLogout, open, onClose }) {
  return (
    <>
      <aside className={`sidebar ${portalClass} ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <i className="bi bi-shield-check" />
          <div>
            <div className="brand-title">Identity Proofing</div>
            <div className="brand-sub">Digital verification platform</div>
          </div>
        </div>

        <div className="sidebar-portal">
          <span className="portal-pill">{portalLabel}</span>
          {subtitle && <span className="portal-user">{subtitle}</span>}
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-link logout" onClick={onLogout}>
            <i className="bi bi-box-arrow-left" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
    </>
  );
}
