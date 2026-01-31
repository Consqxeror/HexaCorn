import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient, assetUrl } from '../api/client';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

function StudentFeedPage() {
  const location = useLocation();
  const storedUser = JSON.parse(localStorage.getItem('hexacorn_user') || '{}');
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());
  const [crInfo, setCrInfo] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('hexacorn_saved') || '[]';
      const list = JSON.parse(raw);
      const ids = new Set((Array.isArray(list) ? list : []).map((x) => x.id));
      setSavedIds(ids);
    } catch {
      setSavedIds(new Set());
    }
  }, []);

  useEffect(() => {
    apiClient
      .get('/meta/landing')
      .then((res) => setCrInfo(res?.data?.cr || null))
      .catch(() => setCrInfo(null));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat && ['notice', 'note', 'assignment', 'syllabus'].includes(cat)) {
      setCategory(cat);
    }
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      const params = {};
      if (category) params.category = category;
      const res = await apiClient.get('/content', { params });
      setItems(res.data.items || []);
    };
    load().catch((err) => console.error('Failed to load content', err));
  }, [category]);

  const isDueToday = (it) => {
    if (it.category !== 'assignment' || !it.dueDate) return false;
    const d = new Date(it.dueDate);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const toggleSave = (it) => {
    const raw = localStorage.getItem('hexacorn_saved') || '[]';
    let list = [];
    try {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    const exists = list.some((x) => x.id === it.id);
    let next;
    if (exists) {
      next = list.filter((x) => x.id !== it.id);
    } else {
      next = [
        {
          id: it.id,
          title: it.title,
          category: it.category,
          filePath: it.filePath,
          updatedAt: it.updatedAt,
        },
        ...list,
      ].slice(0, 200);
    }

    localStorage.setItem('hexacorn_saved', JSON.stringify(next));
    setSavedIds(new Set(next.map((x) => x.id)));
  };

  const trackDownload = (it) => {
    const raw = localStorage.getItem('hexacorn_downloads') || '[]';
    let list = [];
    try {
      list = JSON.parse(raw);
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    const next = [
      {
        id: it.id,
        title: it.title,
        category: it.category,
        filePath: it.filePath,
        downloadedAt: new Date().toISOString(),
      },
      ...list,
    ].slice(0, 250);

    localStorage.setItem('hexacorn_downloads', JSON.stringify(next));
  };

  const emptyCopy = useMemo(() => {
    if (category === 'notice') return { title: 'No notices yet', subtitle: 'Check back later or contact your CR.' };
    if (category === 'note') return { title: 'No notes uploaded', subtitle: 'Your CR may upload notes soon.' };
    if (category === 'assignment') return { title: 'No assignments available', subtitle: 'Assignments will appear here.' };
    if (category === 'syllabus') return { title: 'No syllabus uploaded', subtitle: 'Contact your CR if needed.' };
    return { title: 'No content available yet', subtitle: 'Select a category or check back later.' };
  }, [category]);

  const openHistory = async (item) => {
    setHistoryItem(item);
    setHistoryOpen(true);
    try {
      const res = await apiClient.get(`/content/${item.id}/versions`);
      setVersions(res?.data?.versions || []);
    } catch {
      setVersions([]);
    }
  };

  return (
    <div className="page">
      <h1>Feed</h1>
      {storedUser?.role === 'cr_pending' && (
        <div className="alert-info">Your Class Representative application is pending admin approval.</div>
      )}
      {storedUser?.lastLoginAt && (
        <p className="muted">Last login: {new Date(storedUser.lastLoginAt).toLocaleString()}</p>
      )}
      {storedUser?.semester && <p className="muted">Semester: {storedUser.semester}</p>}
      {crInfo?.fullName && (
        <div className="alert-info" style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div>
            <strong>Class Head:</strong> {crInfo.fullName}{' '}
            {crInfo.isVerifiedCr && <span className="badge-small verified" style={{ marginLeft: '0.4rem' }}>Verified</span>}
          </div>
          {crInfo.contactNumber && (
            <div>
              <strong>Contact:</strong> {crInfo.contactNumber}
            </div>
          )}
        </div>
      )}
      <p className="muted">Content is automatically filtered to your Department and Division.</p>

      <div className="filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          <option value="notice">Notices</option>
          <option value="note">Notes</option>
          <option value="assignment">Assignments</option>
          <option value="syllabus">Syllabus</option>
        </select>
      </div>

      <div className="grid">
        {items.map((it) => (
          <article key={it.id} className={`card${isDueToday(it) ? ' due-today' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>{it.title}</h3>
              {it.isPinned && <span className="badge-small pinned">Pinned</span>}
            </div>
            <p className="muted">{it.category.toUpperCase()}</p>
            {isDueToday(it) && <div className="badge-small due">Due Today</div>}
            {it.description && <p>{it.description}</p>}
            <p className="muted">Updated: {new Date(it.updatedAt).toLocaleString()}</p>
            {it.filePath && (
              <a
                className="btn-link"
                href={assetUrl(it.filePath)}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackDownload(it)}
              >
                View / Download
              </a>
            )}
            {it.dueDate && <p className="muted">Due: {new Date(it.dueDate).toLocaleString()}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => toggleSave(it)}>
                {savedIds.has(it.id) ? 'Unsave' : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => openHistory(it)}>
                History
              </button>
            </div>
          </article>
        ))}

        {items.length === 0 && <EmptyState title={emptyCopy.title} subtitle={emptyCopy.subtitle} />}
      </div>

      <Modal
        open={historyOpen}
        title={historyItem ? `History: ${historyItem.title}` : 'History'}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryItem(null);
          setVersions([]);
        }}
        footer={
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setHistoryOpen(false);
                setHistoryItem(null);
                setVersions([]);
              }}
            >
              Close
            </button>
          </div>
        }
      >
        {historyItem && (
          <div className="muted" style={{ marginBottom: '0.75rem' }}>
            Current updated at: {new Date(historyItem.updatedAt).toLocaleString()}
          </div>
        )}
        {versions.length === 0 ? (
          <EmptyState title="No previous versions" subtitle="This content has not been updated yet." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Updated On</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td>v{v.versionNumber}</td>
                    <td>{new Date(v.createdAt).toLocaleString()}</td>
                    <td>
                      {v.filePath ? (
                        <a
                          className="btn-link"
                          href={assetUrl(v.filePath)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default StudentFeedPage;
