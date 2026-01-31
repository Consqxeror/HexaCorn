import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';

function Navbar({ user, onLogout, onUserUpdate }) {
  const [loading, setLoading] = useState(false);

  const handleApplyCr = async () => {
    try {
      setLoading(true);
      await apiClient.post('/auth/apply-cr');
      const newUser = { ...user, role: 'cr_pending' };
      localStorage.setItem('hexacorn_user', JSON.stringify(newUser));
      onUserUpdate && onUserUpdate(newUser);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to apply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-logo">HexaCorn</span>
      </div>
      <nav className="navbar-right">
        {!user && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
        {user && (
          <>
            {user.role === 'student' && (
              <button
                className="btn-secondary"
                disabled={loading}
                onClick={handleApplyCr}
              >
                {loading ? 'Applying...' : 'Apply as CR'}
              </button>
            )}
            {user.role === 'cr_pending' && <span className="badge">CR Pending</span>}
            {(user.role === 'student' || user.role === 'cr_pending') && <span className="badge">Student</span>}
            {user.role === 'cr' && <span className="badge">CR</span>}
            {user.role === 'admin' && <span className="badge">Admin</span>}
            <button className="btn-secondary" onClick={onLogout}>
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
