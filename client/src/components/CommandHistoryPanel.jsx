import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function CommandHistoryPanel({ serverId, onRun }) {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!serverId) {
      setHistory([]);
      return;
    }
    api.get('/api/command-history', { params: { serverId } }).then((res) => setHistory(res.data.history));
  }, [serverId]);

  const filtered = history.filter((h) => h.command.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="side-panel">
      <h3>Command history</h3>
      {!serverId ? (
        <p className="muted">Open a terminal to see its history.</p>
      ) : (
        <>
          <input
            className="history-search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="snippet-list">
            {filtered.map((h) => (
              <div key={h.id} className="history-item" onClick={() => onRun(h.command)} title="Run again">
                <code>{h.command}</code>
              </div>
            ))}
            {filtered.length === 0 && <p className="muted">No commands yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}
