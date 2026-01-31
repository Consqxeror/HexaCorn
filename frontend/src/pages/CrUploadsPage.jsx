import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, assetUrl } from '../api/client';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';

function CrUploadsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [versions, setVersions] = useState([]);

  const loadMine = async () => {
    const res = await apiClient.get('/content/mine');
    setItems(res.data.items || []);
  };

  useEffect(() => {
    loadMine().catch((err) => console.error('Failed to load CR items', err));
  }, []);

  const emptyCopy = useMemo(() => {
    return { title: 'No uploads yet', subtitle: 'Upload content and it will show here.' };
  }, []);

  const openDelete = (it) => {
    setConfirmTarget(it);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!confirmTarget) return;
    setError('');
    try {
      await apiClient.delete(`/content/${confirmTarget.id}`);
      await loadMine();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  const pinToggle = async (it) => {
    setError('');
    try {
      if (it.isPinned) await apiClient.patch(`/content/${it.id}/unpin`);
      else await apiClient.patch(`/content/${it.id}/pin`);
      await loadMine();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update pin');
    }
  };

  const openHistory = async (it) => {
    setHistoryItem(it);
    setHistoryOpen(true);
    try {
      const res = await apiClient.get(`/content/${it.id}/versions`);
      setVersions(res?.data?.versions || []);
    } catch {
      setVersions([]);
    }
  };

  return (
    <div className="page">
      <h1>My Uploads</h1>
      {error && <div className="error-text">{error}</div>}

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
              <a className="btn-link" href={assetUrl(it.filePath)} target="_blank" rel="noreferrer">
                View / Download
              </a>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {it.category === 'notice' && (
                <button type="button" className="btn-secondary" onClick={() => pinToggle(it)}>
                  {it.isPinned ? 'Unpin' : 'Pin to Top'}
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => openHistory(it)}>
                History
              </button>
              <button type="button" className="btn-danger" onClick={() => openDelete(it)}>
                Delete
              </button>
            </div>
          </article>
        ))}

        {items.length === 0 && <EmptyState title={emptyCopy.title} subtitle={emptyCopy.subtitle} />}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Delete Content"
        message={confirmTarget ? `Delete "${confirmTarget.title}"? This action cannot be undone.` : 'Delete this item?'}
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onClose={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={doDelete}
      />

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
            <button type="button" className="btn-secondary" onClick={() => setHistoryOpen(false)}>
              Close
            </button>
          </div>
        }
      >
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
                        <a className="btn-link" href={assetUrl(v.filePath)} target="_blank" rel="noreferrer">
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

export default CrUploadsPage;
