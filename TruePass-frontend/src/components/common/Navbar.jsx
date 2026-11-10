export default function Navbar({ portalLabel, portalClass, userLabel, onToggleSidebar }) {
  return (
    <header className={`topbar ${portalClass}`}>
      <button type="button" className="btn btn-link topbar-toggle" onClick={onToggleSidebar} aria-label="Toggle navigation">
        <i className="bi bi-list" />
      </button>
      <div className="topbar-portal">
        <span className="portal-dot" />
        {portalLabel}
      </div>
      <div className="topbar-spacer" />
      <span className="demo-tag" title="Simulated login. Not real authentication.">
        <i className="bi bi-exclamation-triangle me-1" />
        Demo session
      </span>
      <div className="topbar-user">
        <i className="bi bi-person-circle" />
        <span>{userLabel}</span>
      </div>
    </header>
  );
}
