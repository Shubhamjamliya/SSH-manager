import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext.jsx';
import PasswordInput from './PasswordInput.jsx';

export default function ProfileModal({ onClose }) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [vaultMembers, setVaultMembers] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [vaultError, setVaultError] = useState('');
  const [vaultEmail, setVaultEmail] = useState('');
  const [vaultSaving, setVaultSaving] = useState(false);

  useEffect(() => {
    api
      .get('/api/vault/members')
      .then((res) => setVaultMembers(res.data.members))
      .catch(() => {})
      .finally(() => setVaultLoading(false));
  }, []);

  async function handleGrantVaultAccess(e) {
    e.preventDefault();
    setVaultError('');
    const emailToAdd = vaultEmail.trim();
    if (!emailToAdd) return;
    setVaultSaving(true);
    try {
      const res = await api.post('/api/vault/members', { email: emailToAdd });
      setVaultMembers((prev) => [...prev, res.data.member]);
      setVaultEmail('');
    } catch (err) {
      setVaultError(err.response?.data?.message || 'Could not share vault');
    } finally {
      setVaultSaving(false);
    }
  }

  async function handleRevokeVaultAccess(memberId) {
    try {
      await api.delete(`/api/vault/members/${memberId}`);
      setVaultMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (_err) {
      // ignore
    }
  }

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);
    try {
      const res = await api.put('/api/auth/me', { name, email });
      setUser(res.data.user);
      setProfileSuccess('Profile updated');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setSavingPassword(true);
    try {
      await api.put('/api/auth/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSuccess('Password updated');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Could not update password');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card profile-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Your profile</h2>

        <div className="profile-modal-grid">
          <div className="profile-modal-column">
            <form onSubmit={handleProfileSubmit}>
              <h3>Edit profile</h3>
              {profileError && <div className="error-banner">{profileError}</div>}
              {profileSuccess && <div className="success-banner">{profileSuccess}</div>}
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <div className="modal-actions">
                <button type="submit" disabled={savingProfile}>
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>

            <hr className="profile-divider" />

            <form onSubmit={handlePasswordSubmit}>
              <h3>Change password</h3>
              {passwordError && <div className="error-banner">{passwordError}</div>}
              {passwordSuccess && <div className="success-banner">{passwordSuccess}</div>}
              <label>Current password</label>
              <PasswordInput
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                showPassword={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
              />
              <label>New password</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                showPassword={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
              <div className="modal-actions">
                <button type="submit" disabled={savingPassword}>
                  {savingPassword ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          </div>

          <div className="profile-modal-column">
            <h3>Share your vault</h3>
            <p className="field-hint">
              Give a teammate standing access to every server you own — current and future — instead of sharing
              one server at a time.
            </p>
            {vaultError && <div className="error-banner">{vaultError}</div>}

            {vaultLoading ? (
              <p className="muted">Loading...</p>
            ) : (
              <div className="access-list">
                {vaultMembers.map((m) => (
                  <div key={m.id} className="access-item">
                    <div>
                      <div>{m.name}</div>
                      <div className="muted">{m.email}</div>
                    </div>
                    <button type="button" className="snippet-delete" onClick={() => handleRevokeVaultAccess(m.id)}>
                      x
                    </button>
                  </div>
                ))}
                {vaultMembers.length === 0 && <p className="muted">Your vault isn't shared with anyone yet.</p>}
              </div>
            )}

            <form onSubmit={handleGrantVaultAccess} className="field-row access-add-row">
              <input
                type="email"
                placeholder="teammate@example.com"
                value={vaultEmail}
                onChange={(e) => setVaultEmail(e.target.value)}
              />
              <button type="submit" disabled={vaultSaving}>
                Share
              </button>
            </form>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
