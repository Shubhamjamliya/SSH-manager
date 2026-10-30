import { useEffect, useState } from 'react';
import api from '../api/axios';

const ACTION_LABELS = {
  connect: 'Connected',
  disconnect: 'Disconnected',
  connect_failed: 'Connection failed',
};

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  function refresh() {
    api
      .get('/api/logs')
      .then((res) => setLogs(res.data.logs))
      .finally(() => setLoading(false));
  }

  return (
    <div className="side-panel">
      <h3>Activity log</h3>
      {loading && <p className="muted">Loading...</p>}
      <div className="log-list">
        {logs.map((log) => (
          <div key={log.id} className={`log-item log-${log.action}`}>
            <div className="log-row">
              <span className={`log-badge log-${log.action}`}>{ACTION_LABELS[log.action] || log.action}</span>
              <span className="log-time">{formatTime(log.createdAt)}</span>
            </div>
            <div className="log-target">
              {log.server?.name || 'Unknown server'}
              {log.server?.host ? <span className="muted"> ({log.server.host})</span> : null}
            </div>
            {log.user?.name && <div className="log-user">by {log.user.name}</div>}
            {log.detail && <div className="log-detail">{log.detail}</div>}
          </div>
        ))}
        {!loading && logs.length === 0 && <p className="muted">No activity yet.</p>}
      </div>
    </div>
  );
}
