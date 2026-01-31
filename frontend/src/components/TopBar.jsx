import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import { apiClient, assetUrl } from '../api/client';

function TopBar({
  user,
  branding,
  onLogout,
  onToggleSidebar,
  onApplyCr,
  onQuickUpload,
  onSearch,
  searchValue,
  notifications,
}) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();
  const [shrunk, setShrunk] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const onScroll = () => setShrunk(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setQuickOpen(false);
    setNotifOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get('/content', { params: { category: 'notice' } })
      .then((res) => {
        const items = Array.isArray(res.data.items) ? res.data.items : [];
        setNotices(items.slice(0, 5));
      })
      .catch(() => {});
  }, [user?.id, user?.role]);

  const roleLabel = useMemo(() => {
    if (!user) return '';
    if (user.role === 'admin') return 'Admin';
    if (user.role === 'cr') return 'CR';
    if (user.role === 'cr_pending') return 'CR Pending';
    return 'Student';
  }, [user]);

  return (
    <header className={`topbar sticky${shrunk ? ' shrunk' : ''}`}>
      <button className="sidebar-hamburger" onClick={onToggleSidebar}>
        ☰
      </button>
      <span className="topbar-logo">
        {branding?.collegeLogoPath && (
          <img
            className="brand-logo"
            src={assetUrl(branding.collegeLogoPath)}
            alt="College Logo"
          />
        )}
        <span className="brand-title">{branding?.collegeName || 'HexaCorn'}</span>
      </span>
      {user && (
        <form
          className="topbar-search"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch && onSearch();
          }}
        >
          <input
            value={searchValue}
            onChange={(e) => onSearch && onSearch(e.target.value)}
            placeholder="Search content..."
          />
        </form>
      )}
      <div className="topbar-actions">
        {user && user.role === 'cr' && (
          <div className="quick-action-dropdown">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setQuickOpen((v) => !v)}
            >
              + Upload
            </button>
            {quickOpen && (
              <div className="dropdown-menu">
                <button type="button" onClick={() => onQuickUpload && onQuickUpload('notice')}>
                  Upload Notice
                </button>
                <button type="button" onClick={() => onQuickUpload && onQuickUpload('note')}>
                  Upload Notes
                </button>
                <button
                  type="button"
                  onClick={() => onQuickUpload && onQuickUpload('assignment')}
                >
                  Upload Assignment
                </button>
              </div>
            )}
          </div>
        )}
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
        <div className="notification-bell">
          <button type="button" className="btn-secondary" onClick={() => setNotifOpen((v) => !v)}>
            🔔
            {notifications > 0 && <span className="notif-badge">{notifications}</span>}
          </button>
          {notifOpen && (
            <div className="dropdown-menu right">
              <div className="dropdown-title">Recent Notices</div>
              {notices.map((n) => (
                <div key={n.id} className="dropdown-item">
                  {n.title}
                </div>
              ))}
              {notices.length === 0 && <div className="dropdown-item muted">No notices yet</div>}
            </div>
          )}
        </div>
        <div className="profile-dropdown">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setProfileOpen((v) => !v)}
          >
            {user?.fullName || 'Profile'} ▼
          </button>
          {profileOpen && (
            <div className="dropdown-menu right">
              <div className="dropdown-item">Role: {roleLabel}</div>
              {user?.role === 'student' && (
                <button type="button" className="dropdown-item" onClick={onApplyCr}>
                  Apply as CR
                </button>
              )}
              <button type="button" className="dropdown-item" onClick={onLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
