import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient, assetUrl } from '../api/client';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';

function CrDashboard() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'notice',
    dueDate: '',
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [versions, setVersions] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'notice',
    dueDate: '',
    expiresAt: '',
    file: null,
  });

  const loadMine = async () => {
    const res = await apiClient.get('/content/mine');
    setItems(res.data.items || []);
  };

  useEffect(() => {
    loadMine().catch((err) => console.error('Failed to load CR items', err));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    if (category && ['notice', 'note', 'assignment', 'syllabus'].includes(category)) {
      setForm((prev) => ({ ...prev, category }));
    }
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setForm((prev) => ({ ...prev, file: files[0] || null }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', form.title);
      data.append('description', form.description);
      data.append('category', form.category);
      if (form.dueDate) data.append('dueDate', form.dueDate);
      if (form.file) data.append('file', form.file);

      await apiClient.post('/content', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setForm({ title: '', description: '', category: 'notice', dueDate: '', file: null });
      await loadMine();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload content');
    } finally {
      setLoading(false);
    }
  };

  const openDelete = (it) => {
    setConfirmTarget(it);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!confirmTarget) return;
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

  const openEdit = (it) => {
    const dueDate = it.dueDate ? new Date(it.dueDate).toISOString().slice(0, 16) : '';
    const expiresAt = it.expiresAt ? new Date(it.expiresAt).toISOString().slice(0, 16) : '';
    setEditItem(it);
    setEditForm({
      title: it.title || '',
      description: it.description || '',
      category: it.category || 'notice',
      dueDate,
      expiresAt,
      file: null,
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setEditForm((prev) => ({ ...prev, file: files[0] || null }));
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setError('');
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', editForm.title);
      data.append('description', editForm.description);
      data.append('category', editForm.category);
      if (editForm.dueDate) data.append('dueDate', editForm.dueDate);
      if (editForm.expiresAt) data.append('expiresAt', editForm.expiresAt);
      if (editForm.file) data.append('file', editForm.file);

      await apiClient.put(`/content/${editItem.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setEditOpen(false);
      setEditItem(null);
      await loadMine();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update content');
    } finally {
      setLoading(false);
    }
  };

  const emptyCopy = useMemo(() => {
    return {
      title: 'No uploads yet',
      subtitle: 'Start by uploading a notice, notes, assignment, or syllabus for your division.',
    };
  }, []);

  return (
    <div className="page">
      <h1>Class Head Dashboard</h1>
      <section className="card">
        <h2>Upload Content</h2>
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Title
            <input name="title" value={form.title} onChange={handleChange} required />
          </label>
          <label>
            Category
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="notice">Notice</option>
              <option value="note">Note</option>
              <option value="assignment">Assignment</option>
              <option value="syllabus">Syllabus</option>
            </select>
          </label>
          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
            />
          </label>
          <label>
            Due Date (for assignments)
            <input
              type="datetime-local"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
            />
          </label>
          <label>
            File (PDF / image / doc)
            <input type="file" name="file" onChange={handleChange} />
          </label>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </section>

      <section>
        <h2>Your Uploads</h2>
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
              {it.dueDate && (
                <p className="muted">Due: {new Date(it.dueDate).toLocaleString()}</p>
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
                <button type="button" className="btn-secondary" onClick={() => openEdit(it)}>
                  Edit
                </button>
                <button type="button" className="btn-danger" onClick={() => openDelete(it)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && <EmptyState title={emptyCopy.title} subtitle={emptyCopy.subtitle} />}
        </div>
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="Delete Content"
        message={
          confirmTarget
            ? `Delete "${confirmTarget.title}"? This action cannot be undone.`
            : 'Delete this item?'
        }
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

      <Modal
        open={editOpen}
        title={editItem ? `Edit: ${editItem.title}` : 'Edit'}
        onClose={() => {
          setEditOpen(false);
          setEditItem(null);
        }}
        footer={
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditOpen(false);
                setEditItem(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" form="edit-content-form" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form id="edit-content-form" className="form" onSubmit={submitEdit}>
          <label>
            Title
            <input name="title" value={editForm.title} onChange={handleEditChange} required />
          </label>
          <label>
            Category
            <select name="category" value={editForm.category} onChange={handleEditChange}>
              <option value="notice">Notice</option>
              <option value="note">Note</option>
              <option value="assignment">Assignment</option>
              <option value="syllabus">Syllabus</option>
            </select>
          </label>
          <label>
            Description
            <textarea name="description" value={editForm.description} onChange={handleEditChange} />
          </label>
          <label>
            Due Date (for assignments)
            <input type="datetime-local" name="dueDate" value={editForm.dueDate} onChange={handleEditChange} />
          </label>
          <label>
            Expiry (optional)
            <input
              type="datetime-local"
              name="expiresAt"
              value={editForm.expiresAt}
              onChange={handleEditChange}
            />
          </label>
          <label>
            Replace File (optional)
            <input type="file" name="file" onChange={handleEditChange} />
          </label>
        </form>
      </Modal>
    </div>
  );
}

export default CrDashboard;
