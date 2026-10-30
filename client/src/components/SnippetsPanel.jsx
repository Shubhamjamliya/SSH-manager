import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function SnippetsPanel({ onRun }) {
  const [snippets, setSnippets] = useState([]);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [scope, setScope] = useState('private');
  const [error, setError] = useState('');

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    api.get('/api/snippets').then((res) => setSnippets(res.data.snippets));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/snippets', { name, command, scope });
      setName('');
      setCommand('');
      refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add snippet');
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/snippets/${id}`);
      refresh();
    } catch (_err) {
      // ignore - likely not the owner
    }
  }

  return (
    <div className="side-panel">
      <h3>Snippets</h3>
      {error && <div className="error-banner">{error}</div>}

      <form className="snippet-form" onSubmit={handleAdd}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Command" value={command} onChange={(e) => setCommand(e.target.value)} required />
        <div className="snippet-form-row">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="private">Private</option>
            <option value="team">Team</option>
          </select>
          <button type="submit">Add</button>
        </div>
      </form>

      <div className="snippet-list">
        {snippets.map((s) => (
          <div key={s.id} className="snippet-item">
            <div className="snippet-info" onClick={() => onRun(s.command)} title="Run in active terminal">
              <span className="snippet-name">{s.name}</span>
              <code className="snippet-command">{s.command}</code>
            </div>
            <span className={`snippet-scope ${s.scope}`}>{s.scope}</span>
            <button className="snippet-delete" onClick={() => handleDelete(s.id)}>
              x
            </button>
          </div>
        ))}
        {snippets.length === 0 && <p className="muted">No snippets yet.</p>}
      </div>
    </div>
  );
}
