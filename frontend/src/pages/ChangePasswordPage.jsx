import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

function ChangePasswordPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('hexacorn_user') || 'null');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', { currentPassword, newPassword });
      setOk('Password updated successfully.');

      // Refresh user state
      try {
        const me = await apiClient.get('/auth/me');
        const next = me?.data?.user;
        if (next) localStorage.setItem('hexacorn_user', JSON.stringify(next));
      } catch {
      }

      navigate('/cr/uploads');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Change Password</h1>
      <p className="muted">
        {user?.role === 'cr'
          ? 'For security, Class Heads must change their password on first login.'
          : 'Update your password.'}
      </p>

      <section className="card">
        <form className="form" onSubmit={onSubmit}>
          <label>
            Current Password
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </label>
          <label>
            New Password
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </label>
          {error && <div className="error-text">{error}</div>}
          {ok && <div className="alert-info">{ok}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default ChangePasswordPage;
