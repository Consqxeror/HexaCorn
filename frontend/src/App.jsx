import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentFeedPage from './pages/StudentFeedPage';
import StudentSavedPage from './pages/StudentSavedPage';
import StudentDownloadsPage from './pages/StudentDownloadsPage';
import StudentArchivePage from './pages/StudentArchivePage';
import CrUploadPage from './pages/CrUploadPage';
import CrUploadsPage from './pages/CrUploadsPage';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import { ThemeProvider } from './context/ThemeContext';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import { apiClient } from './api/client';
import SystemBanner from './components/SystemBanner';
import SessionWarning from './components/SessionWarning';
import Footer from './components/Footer';

function getStoredUser() {
  const raw = localStorage.getItem('hexacorn_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function roleToLabel(role) {
  if (role === 'admin') return 'Admin';
  if (role === 'cr') return 'Class Head';
  if (role === 'cr_pending') return 'CR Pending';
  return 'Student';
}

function roleHomePath(role) {
  if (role === 'admin') return '/admin/overview';
  if (role === 'cr') return '/cr/uploads';
  return '/student/feed';
}

function App() {
  const [user, setUser] = useState(getStoredUser);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [roleBanner, setRoleBanner] = useState(null);
  const [maintenance, setMaintenance] = useState({ enabled: false, message: '' });
  const [branding, setBranding] = useState(null);
  const [globalAnnouncement, setGlobalAnnouncement] = useState(null);
  const [globalAnnouncementTone, setGlobalAnnouncementTone] = useState('info');
  const [uploadRules, setUploadRules] = useState(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);

  const [sessionWarningOpen, setSessionWarningOpen] = useState(false);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(null);
  const lastActivityRef = useRef(Date.now());
  const lastWarningAtRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'cr' && user.mustChangePassword && location.pathname !== '/change-password') {
      navigate('/change-password');
      return;
    }

    const landingSeen = sessionStorage.getItem('hexacorn_landing_seen') === '1';
    const isAuthPage =
      location.pathname === '/' ||
      location.pathname === '/login' ||
      location.pathname === '/register';

    if (!isAuthPage) return;

    if (user.role === 'admin') {
      navigate('/admin/overview');
      return;
    }

    if (!landingSeen) navigate('/landing');
    else navigate(roleHomePath(user.role));
  }, [user, navigate, location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const token = localStorage.getItem('hexacorn_token');
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get('/auth/me');
        const next = res?.data?.user;
        if (!next) return;
        const current = JSON.parse(localStorage.getItem('hexacorn_user') || 'null');
        const changed =
          !current ||
          current.role !== next.role ||
          Boolean(current.mustChangePassword) !== Boolean(next.mustChangePassword) ||
          String(current.departmentId || '') !== String(next.departmentId || '') ||
          String(current.divisionId || '') !== String(next.divisionId || '') ||
          String(current.semester || '') !== String(next.semester || '');

        if (changed) {
          const from = current?.role;
          localStorage.setItem('hexacorn_user', JSON.stringify(next));
          setUser(next);
          setNotificationsCount((n) => n + 1);
          if (from && from !== next.role) {
            const msg = `Your role has been updated to ${roleToLabel(next.role)}. New features are now available.`;
            setRoleBanner(msg);
            setTimeout(() => setRoleBanner(null), 6500);
          }

          if (next.role === 'cr' && next.mustChangePassword && location.pathname !== '/change-password') {
            navigate('/change-password');
          }
        }
      } catch {
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const load = async () => {
      try {
        const res = await apiClient.get('/meta/system');
        if (!alive) return;
        const enabled = Boolean(res?.data?.maintenanceMode);
        const message = res?.data?.maintenanceMessage || '';
        setMaintenance({ enabled, message });

        setBranding(res?.data?.branding || null);
        setUploadRules(res?.data?.uploadRules || null);
        const ann = res?.data?.globalAnnouncement || null;
        const tone = res?.data?.globalAnnouncementTone || 'info';
        setGlobalAnnouncement(ann);
        setGlobalAnnouncementTone(tone);
        if (ann) setAnnouncementDismissed(false);
      } catch {
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const onActivity = () => {
      lastActivityRef.current = Date.now();
      if (sessionWarningOpen) {
        setSessionWarningOpen(false);
        setSessionSecondsLeft(null);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    const IDLE_MS = 30 * 60 * 1000;
    const WARN_MS = 2 * 60 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const idleFor = now - lastActivityRef.current;

      if (idleFor >= IDLE_MS) {
        handleLogout();
        return;
      }

      const left = Math.max(0, IDLE_MS - idleFor);
      if (left <= WARN_MS) {
        if (!sessionWarningOpen && now - lastWarningAtRef.current > 30000) {
          lastWarningAtRef.current = now;
          setSessionWarningOpen(true);
        }
        setSessionSecondsLeft(Math.ceil(left / 1000));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [user, sessionWarningOpen]);

  const menu = useMemo(() => {
    if (!user) {
      return [
        { label: 'Login', to: '/login' },
        { label: 'Register', to: '/register' },
      ];
    }

    if (user.role === 'admin') {
      return [
        { label: 'Overview', to: '/admin/overview' },
        { label: 'CR Requests', to: '/admin/cr-requests' },
        { label: 'Students', to: '/admin/students' },
        { label: 'CRs', to: '/admin/crs' },
        { label: 'Create CR', to: '/admin/create-cr' },
      ];
    }

    if (user.role === 'cr') {
      return [
        { label: 'Upload', to: '/cr/upload' },
        { label: 'My Uploads', to: '/cr/uploads' },
      ];
    }

    return [
      { label: 'Feed', to: '/student/feed' },
      { label: 'Saved', to: '/student/saved' },
      { label: 'Downloads', to: '/student/downloads' },
      { label: 'Archive', to: '/student/archive' },
    ];
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('hexacorn_token');
    localStorage.removeItem('hexacorn_user');
    sessionStorage.removeItem('hexacorn_landing_seen');
    setUser(null);
    navigate('/login');
  };

  const handleApplyCr = async () => {
    try {
      await apiClient.post('/auth/apply-cr');
      const next = { ...user, role: 'cr_pending' };
      localStorage.setItem('hexacorn_user', JSON.stringify(next));
      setUser(next);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to apply');
    }
  };

  const handleQuickUpload = (category) => {
    navigate(`/cr/upload?category=${encodeURIComponent(category)}`);
  };

  return (
    <ThemeProvider>
      <div className="app-root">
        <TopBar
          user={user}
          branding={branding}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(true)}
          onApplyCr={handleApplyCr}
          onQuickUpload={handleQuickUpload}
          onSearch={(val) => {
            if (typeof val === 'string') setSearchValue(val);
          }}
          searchValue={searchValue}
          notifications={notificationsCount}
        />

        {maintenance.enabled && (
          <SystemBanner
            tone="warning"
            message={maintenance.message || 'Maintenance mode is enabled. Uploads and edits are temporarily disabled.'}
          />
        )}
        {!announcementDismissed && globalAnnouncement && (
          <SystemBanner
            tone={
              globalAnnouncementTone === 'danger'
                ? 'danger'
                : globalAnnouncementTone === 'warning'
                  ? 'warning'
                  : globalAnnouncementTone === 'success'
                    ? 'success'
                    : 'info'
            }
            message={globalAnnouncement}
            onClose={() => setAnnouncementDismissed(true)}
          />
        )}
        {roleBanner && <SystemBanner tone="success" message={roleBanner} onClose={() => setRoleBanner(null)} />}

        <SessionWarning
          open={sessionWarningOpen}
          secondsLeft={sessionSecondsLeft}
          onStayLoggedIn={() => {
            lastActivityRef.current = Date.now();
            setSessionWarningOpen(false);
            setSessionSecondsLeft(null);
          }}
          onLogout={handleLogout}
        />
        <div className="layout">
          <Sidebar menu={menu} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage onLogin={setUser} />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route
            path="/change-password"
            element={user ? <ChangePasswordPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/landing"
            element={user ? <LandingPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/student"
            element={
              user && (user.role === 'student' || user.role === 'cr_pending') ? (
                <Navigate to="/student/feed" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/feed"
            element={
              user && (user.role === 'student' || user.role === 'cr_pending') ? (
                <StudentFeedPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/saved"
            element={
              user && (user.role === 'student' || user.role === 'cr_pending') ? (
                <StudentSavedPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/downloads"
            element={
              user && (user.role === 'student' || user.role === 'cr_pending') ? (
                <StudentDownloadsPage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/student/archive"
            element={
              user && (user.role === 'student' || user.role === 'cr_pending') ? (
                <StudentArchivePage />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/cr"
            element={
              user && user.role === 'cr' ? <Navigate to="/cr/uploads" replace /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/cr/upload"
            element={user && user.role === 'cr' ? <CrUploadPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/cr/uploads"
            element={user && user.role === 'cr' ? <CrUploadsPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin"
            element={
              user && user.role === 'admin' ? <Navigate to="/admin/overview" replace /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/admin/:tab"
            element={
              user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" replace />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
          </main>
        </div>

        <Footer branding={branding} />
      </div>
    </ThemeProvider>
  );
}

export default App;
