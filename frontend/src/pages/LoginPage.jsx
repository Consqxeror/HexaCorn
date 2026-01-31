import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient, assetUrl } from '../api/client';

function LoginPage({ onLogin }) {
  const [branding, setBranding] = useState(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .get('/meta/system')
      .then((res) => setBranding(res?.data?.branding || null))
      .catch(() => setBranding(null));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { identifier, password });
      const { token, user } = res.data;
      localStorage.setItem('hexacorn_token', token);
      localStorage.setItem('hexacorn_user', JSON.stringify(user));
      onLogin(user);
      if (user.role === 'admin') navigate('/admin/overview');
      else navigate('/landing');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {branding?.collegeLogoPath && (
            <img
              className="brand-logo"
              src={assetUrl(branding.collegeLogoPath)}
              alt="College Logo"
            />
          )}
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{branding?.collegeName || 'HexaCorn'}</div>
            {branding?.academicYear && <div className="muted">Academic Year: {branding.academicYear}</div>}
          </div>
        </div>
        <h1>Login</h1>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Contact Number or Email
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="muted">
          New student? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
