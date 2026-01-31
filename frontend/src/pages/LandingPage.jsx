import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import EmptyState from '../components/EmptyState';

function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'cr') return '/cr';
  return '/student/feed';
}

function LandingPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('hexacorn_user') || 'null');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin');
      return;
    }

    apiClient
      .get('/meta/landing')
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (!user) return null;

  const dept = data?.department?.name;
  const div = data?.division?.name;
  const crName = data?.cr?.fullName;
  const crContact = data?.cr?.contactNumber;
  const crVerified = Boolean(data?.cr?.isVerifiedCr);
  const latest = data?.latestNotice;

  return (
    <div className="page">
      <h1>Welcome</h1>
      <p className="muted">Quick summary for your Department & Division before you continue.</p>

      {loading ? (
        <div className="card">Loading...</div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <section className="card">
            <h2>Department</h2>
            <p style={{ fontSize: '1.1rem', fontWeight: 800 }}>{dept || '-'}</p>
            <p className="muted">Division: {div || '-'}</p>
          </section>

          <section className="card">
            <h2>Class Head (CR)</h2>
            {crName ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{crName}</p>
                  {crVerified && <span className="badge-small verified">Verified</span>}
                </div>
                {crContact && <p className="muted">Contact: {crContact}</p>}
              </>
            ) : (
              <EmptyState title="CR not assigned" subtitle="Your division CR may not be assigned yet." />
            )}
          </section>

          <section className="card">
            <h2>Latest Notice</h2>
            {latest ? (
              <>
                <p style={{ fontSize: '1.05rem', fontWeight: 800 }}>{latest.title}</p>
                <p className="muted">Updated: {new Date(latest.updatedAt).toLocaleString()}</p>
                <Link className="btn-link" to={`/student/feed?category=notice`}>
                  Open Notices
                </Link>
              </>
            ) : (
              <EmptyState title="No notice yet" subtitle="Check back later or contact your CR." />
            )}
          </section>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            sessionStorage.setItem('hexacorn_landing_seen', '1');
            navigate(roleHome(user.role));
          }}
        >
          Continue
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            sessionStorage.setItem('hexacorn_landing_seen', '1');
            navigate('/student/feed');
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default LandingPage;
