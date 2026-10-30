import { useState } from 'react';
import api from '../api/axios';
import PasswordInput from './PasswordInput.jsx';

export default function AddServerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    authType: 'password',
    password: '',
    privateKey: '',
    passphrase: '',
    group: 'Default',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/api/servers', form);
      onCreated(res.data.server);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add server');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>Add server</h2>
        {error && <div className="error-banner">{error}</div>}
        <label>Name</label>
        <input value={form.name} onChange={(e) => update('name', e.target.value)} required />
        <label>Group</label>
        <input value={form.group} onChange={(e) => update('group', e.target.value)} />
        <div className="field-row">
          <div>
            <label>Host</label>
            <input value={form.host} onChange={(e) => update('host', e.target.value)} required />
          </div>
          <div className="port-field">
            <label>Port</label>
            <input
              type="number"
              value={form.port}
              onChange={(e) => update('port', Number(e.target.value))}
            />
          </div>
        </div>
        <label>Username</label>
        <input value={form.username} onChange={(e) => update('username', e.target.value)} required />

        <label>Authentication</label>
        <div className="auth-type-toggle">
          <button
            type="button"
            className={form.authType === 'password' ? 'auth-type-active' : ''}
            onClick={() => update('authType', 'password')}
          >
            Password
          </button>
          <button
            type="button"
            className={form.authType === 'key' ? 'auth-type-active' : ''}
            onClick={() => update('authType', 'key')}
          >
            SSH key
          </button>
        </div>

        {form.authType === 'password' ? (
          <>
            <label>Password</label>
            <PasswordInput
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              showPassword={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
          </>
        ) : (
          <>
            <label>Private key</label>
            <textarea
              className="key-textarea"
              placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              value={form.privateKey}
              onChange={(e) => update('privateKey', e.target.value)}
              required
              rows={6}
            />
            <label>Passphrase (optional)</label>
            <PasswordInput
              value={form.passphrase}
              onChange={(e) => update('passphrase', e.target.value)}
              showPassword={showPassphrase}
              onToggle={() => setShowPassphrase((v) => !v)}
            />
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Add server'}
          </button>
        </div>
      </form>
    </div>
  );
}
