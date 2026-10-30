import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({ servers, statuses, onConnect, onAddServer, onOpenProfile }) {
  const { user, logout } = useAuth();
  const [showConnections, setShowConnections] = useState(false);

  const groups = servers.reduce((acc, server) => {
    acc[server.group] = acc[server.group] || [];
    acc[server.group].push(server);
    return acc;
  }, {});

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>ServerPilot</h1>
        <span className="live-badge">LIVE</span>
      </div>

      <div className="sidebar-stats">
        <div>
          <strong>{servers.length}</strong>
          <span>Servers</span>
        </div>
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
                <button key={server.id} className="server-item" onClick={() => onConnect(server)}>
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
                  <span className={`status-dot ${statuses[server.id] || 'offline'}`} />
                </button>
              ))}
            </div>
          ))}
          {servers.length === 0 && <p className="muted">No servers yet.</p>}
        </div>
      )}

      <div className="sidebar-footer">
        <button className="user-info" onClick={onOpenProfile} title="Manage profile">
          <strong>{user?.name}</strong>
          <span>{user?.role}</span>
        </button>
        <button className="secondary" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
