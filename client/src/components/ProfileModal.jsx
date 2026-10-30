import { useState } from 'react';
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

        <form onSubmit={handleProfileSubmit}>
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

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
