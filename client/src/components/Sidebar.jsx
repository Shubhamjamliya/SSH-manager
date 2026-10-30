import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({
  servers,
  statuses,
  onConnect,
  onAddServer,
  onOpenProfile,
  onManageAccess,
  mobileOpen,
}) {
  const { user, logout } = useAuth();
  const [showConnections, setShowConnections] = useState(false);

  const groups = servers.reduce((acc, server) => {
    acc[server.group] = acc[server.group] || [];
    acc[server.group].push(server);
    return acc;
  }, {});

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <div className="sidebar-header">
        <span className="brand-logo">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 16l-3.5 3.5M16 8l3.5-3.5" strokeLinecap="round" />
            <rect x="2.5" y="13.5" width="6" height="6" rx="1.5" transform="rotate(-45 5.5 16.5)" />
            <rect x="15.5" y="0.5" width="6" height="6" rx="1.5" transform="rotate(-45 18.5 3.5)" />
          </svg>
        </span>
        <h1>ServerPilot</h1>
        <span className="live-badge">LIVE</span>
      </div>

      <div className="sidebar-stats">
        <div>
          <strong>{servers.length}</strong>
          <span>Servers</span>
        </div>
        <div className="sidebar-stats-divider" />
        <div>
          <strong>{Object.values(statuses).filter((s) => s === 'connected').length}</strong>
          <span>Connected</span>
        </div>
      </div>

      <button className="add-server-btn" onClick={onAddServer}>
        + Add server
      </button>

      <button
        className={`connections-toggle ${showConnections ? 'connections-toggle-open' : ''}`}
        onClick={() => setShowConnections((v) => !v)}
      >
        <span>Connections</span>
        <span className="connections-count">{servers.length}</span>
        <svg
          className="connections-chevron"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showConnections && (
        <div className="server-groups">
          {Object.entries(groups).map(([group, list]) => (
            <div key={group} className="server-group">
              <h3>{group}</h3>
              {list.map((server) => (
                <div
                  key={server.id}
                  className="server-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => onConnect(server)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onConnect(server);
                  }}
                >
                  <span className="connection-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M9 7V3m6 4V3M8 7h8a1 1 0 0 1 1 1v3a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 16v3m-3 2h6" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="server-item-info">
                    <div className="server-name">{server.name}</div>
                    <div className="server-host">{server.host}</div>
                  </div>
                  <button
                    type="button"
                    className="server-item-access-btn"
                    title="Manage access"
                    onClick={(e) => {
                      e.stopPropagation();
                      onManageAccess(server);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="3" />
                      <path d="M5 20c0-3 3-5 7-5s7 2 7 5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <span className={`status-dot ${statuses[server.id] || 'offline'}`} />
                </div>
              ))}
            </div>
          ))}
          {servers.length === 0 && <p className="muted">No servers yet.</p>}
        </div>
      )}

      <div className="sidebar-footer">
        <button className="user-info" onClick={onOpenProfile} title="Manage profile">
          <span className="user-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</span>
          <span className="user-info-text">
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </span>
        </button>
        <button className="logout-btn" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
