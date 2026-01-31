import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, assetUrl } from '../api/client';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

function StudentDashboard() {
  const storedUser = JSON.parse(localStorage.getItem('hexacorn_user') || '{}');
  const [role] = useState(storedUser.role || 'student');
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [versions, setVersions] = useState([]);

  useEffect(() => {
    const load = async () => {
      const params = {};
      if (category) params.category = category;
      const res = await apiClient.get('/content', { params });
      setItems(res.data.items || []);
    };
    load().catch((err) => console.error('Failed to load content', err));
  }, [category]);

  const emptyCopy = useMemo(() => {
    if (category === 'notice') {
      return {
        title: 'No notices yet',
        subtitle: 'Check back later or contact your CR for updates.',
      };
    }
    if (category === 'note') {
      return {
        title: 'No notes uploaded',
        subtitle: 'Your CR may upload notes soon. Try again later.',
      };
    }
    if (category === 'assignment') {
      return {
        title: 'No assignments available',
        subtitle: 'When assignments are posted, they will appear here automatically.',
      };
    }
    if (category === 'syllabus') {
      return {
        title: 'No syllabus uploaded',
        subtitle: 'If your syllabus is missing, contact your CR or department office.',
      };
    }
    return {
      title: 'No content available yet',
      subtitle: 'Check back later or select a category to narrow down updates.',
    };
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
      <h1>Student Dashboard</h1>
      {role === 'cr_pending' && (
        <div className="alert-info">
          Your Class Representative application is pending admin approval.
        </div>
      )}
      {storedUser?.lastLoginAt && (
        <p className="muted">Last login: {new Date(storedUser.lastLoginAt).toLocaleString()}</p>
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
          <article key={it.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>{it.title}</h3>
              {it.isPinned && <span className="badge-small pinned">Pinned</span>}
            </div>
            <p className="muted">{it.category.toUpperCase()}</p>
            {it.description && <p>{it.description}</p>}
            <p className="muted">Updated: {new Date(it.updatedAt).toLocaleString()}</p>
            {it.filePath && (
              <a
                className="btn-link"
                href={assetUrl(it.filePath)}
                target="_blank"
                rel="noreferrer"
              >
                View / Download
              </a>
            )}
            {it.dueDate && <p className="muted">Due: {new Date(it.dueDate).toLocaleString()}</p>}
            <button type="button" className="btn-secondary" onClick={() => openHistory(it)}>
              History
            </button>
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

export default StudentDashboard;
