import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

function CrUploadPage() {
  const location = useLocation();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'notice',
    semester: '',
    dueDate: '',
    expiresAt: '',
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [uploadRules, setUploadRules] = useState(null);
  const [dupConfirmOpen, setDupConfirmOpen] = useState(false);
  const [dupPayload, setDupPayload] = useState(null);

  useEffect(() => {
    apiClient
      .get('/meta/system')
      .then((res) => setUploadRules(res?.data?.uploadRules || null))
      .catch(() => setUploadRules(null));
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
    if (name === 'file') setForm((p) => ({ ...p, file: files[0] || null }));
    else setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', form.title);
      data.append('description', form.description);
      data.append('category', form.category);
      data.append('semester', form.semester);
      if (form.dueDate) data.append('dueDate', form.dueDate);
      if (form.expiresAt) data.append('expiresAt', form.expiresAt);
      if (form.file) data.append('file', form.file);

      await apiClient.post('/content', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setOk('Uploaded successfully');
      setForm({ title: '', description: '', category: 'notice', semester: '', dueDate: '', expiresAt: '', file: null });
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'DUPLICATE_UPLOAD') {
        setDupPayload({
          title: form.title,
          description: form.description,
          category: form.category,
          semester: form.semester,
          dueDate: form.dueDate,
          expiresAt: form.expiresAt,
          file: form.file,
        });
        setDupConfirmOpen(true);
      } else {
        setError(err?.response?.data?.message || 'Failed to upload');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitDuplicate = async () => {
    if (!dupPayload) return;
    setError('');
    setOk('');
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', dupPayload.title);
      data.append('description', dupPayload.description);
      data.append('category', dupPayload.category);
      data.append('semester', dupPayload.semester);
      data.append('allowDuplicate', 'true');
      if (dupPayload.dueDate) data.append('dueDate', dupPayload.dueDate);
      if (dupPayload.expiresAt) data.append('expiresAt', dupPayload.expiresAt);
      if (dupPayload.file) data.append('file', dupPayload.file);
      await apiClient.post('/content', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      setOk('Uploaded successfully');
      setForm({ title: '', description: '', category: 'notice', semester: '', dueDate: '', expiresAt: '', file: null });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to upload');
    } finally {
      setLoading(false);
      setDupConfirmOpen(false);
      setDupPayload(null);
    }
  };

  return (
    <div className="page">
      <h1>Upload</h1>
      <section className="card">
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
            Semester / Year
            <select name="semester" value={form.semester} onChange={handleChange} required>
              <option value="">Select semester/year</option>
              <option value="FY">FY (First Year)</option>
              <option value="SY">SY (Second Year)</option>
              <option value="TY">TY (Third Year)</option>
              <option value="SEM1">Semester 1</option>
              <option value="SEM2">Semester 2</option>
              <option value="SEM3">Semester 3</option>
              <option value="SEM4">Semester 4</option>
              <option value="SEM5">Semester 5</option>
              <option value="SEM6">Semester 6</option>
            </select>
          </label>
          <label>
            Description
            <textarea name="description" value={form.description} onChange={handleChange} />
          </label>
          <label>
            Due Date (for assignments)
            <input type="datetime-local" name="dueDate" value={form.dueDate} onChange={handleChange} />
          </label>
          <label>
            Expiry (optional)
            <input type="datetime-local" name="expiresAt" value={form.expiresAt} onChange={handleChange} />
          </label>
          <label>
            File
            <input type="file" name="file" onChange={handleChange} />
          </label>

          {uploadRules?.uploadMaxSizeMb && (
            <div className="muted">Max file size: {uploadRules.uploadMaxSizeMb}MB</div>
          )}
          {uploadRules?.uploadAllowedMimeTypes && (
            <div className="muted">Allowed types: {uploadRules.uploadAllowedMimeTypes}</div>
          )}

          {error && <div className="error-text">{error}</div>}
          {ok && <div className="alert-info">{ok}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </section>

      <ConfirmModal
        open={dupConfirmOpen}
        title="Duplicate Upload"
        message="A file with the same title for this division and semester already exists. Upload anyway?"
        confirmText="Upload Anyway"
        cancelText="Cancel"
        tone="danger"
        onClose={() => {
          setDupConfirmOpen(false);
          setDupPayload(null);
        }}
        onConfirm={submitDuplicate}
      />
    </div>
  );
}

export default CrUploadPage;
