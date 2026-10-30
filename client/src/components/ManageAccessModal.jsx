import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function ManageAccessModal({ server, onClose }) {
  const [owner, setOwner] = useState(null);
  const [sharedWith, setSharedWith] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/servers/${server.id}/access`)
      .then((res) => {
        setOwner(res.data.owner);
        setSharedWith(res.data.sharedWith);
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load access list'))
      .finally(() => setLoading(false));
  }, [server.id]);

  async function saveAccess(emails) {
    setError('');
    setSaving(true);
    try {
      const res = await api.put(`/api/servers/${server.id}/access`, { emails });
      setSharedWith(res.data.sharedWith);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update access');
    } finally {
      setSaving(false);
    }
  }

  function handleAdd(e) {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    const emails = [...new Set([...sharedWith.map((u) => u.email), email])];
    setNewEmail('');
    saveAccess(emails);
  }

  function handleRemove(email) {
    const emails = sharedWith.map((u) => u.email).filter((e) => e !== email);
    saveAccess(emails);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Manage access</h2>
        <p className="muted">{server.name}</p>
        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <p className="muted">Loading...</p>
        ) : (
          <>
            <label>Owner</label>
            <div className="access-item access-item-owner">
              <span>{owner?.name}</span>
              <span className="muted">{owner?.email}</span>
            </div>

            <label>Shared with</label>
            <div className="access-list">
              {sharedWith.map((u) => (
                <div key={u.id} className="access-item">
                  <div>
                    <div>{u.name}</div>
                    <div className="muted">{u.email}</div>
                  </div>
                  <button type="button" className="snippet-delete" onClick={() => handleRemove(u.email)}>
                    x
                  </button>
                </div>
              ))}
              {sharedWith.length === 0 && <p className="muted">Not shared with anyone yet.</p>}
            </div>

            <form onSubmit={handleAdd} className="field-row access-add-row">
              <input
                type="email"
                placeholder="teammate@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <button type="submit" disabled={saving}>
                Add
              </button>
            </form>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
