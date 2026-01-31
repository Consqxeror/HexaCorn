import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, assetUrl } from '../api/client';
import EmptyState from '../components/EmptyState';

function StudentArchivePage() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('');

  useEffect(() => {
    const load = async () => {
      const params = {};
      if (category) params.category = category;
      const res = await apiClient.get('/content/archive', { params });
      setItems(res?.data?.items || []);
    };
    load().catch((err) => console.error('Failed to load archive', err));
  }, [category]);

  const emptyCopy = useMemo(() => {
    return {
      title: 'No archived content',
      subtitle: 'Expired items will appear here automatically.',
    };
  }, []);

  return (
    <div className="page">
      <h1>Archive</h1>
      <p className="muted">Expired content is moved here for reference.</p>

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
            <h3>{it.title}</h3>
            <p className="muted">{it.category.toUpperCase()}</p>
            {it.description && <p>{it.description}</p>}
            {it.expiresAt && <p className="muted">Expired: {new Date(it.expiresAt).toLocaleString()}</p>}
            {it.filePath && (
              <a className="btn-link" href={assetUrl(it.filePath)} target="_blank" rel="noreferrer">
                View / Download
              </a>
            )}
          </article>
        ))}

        {items.length === 0 && <EmptyState title={emptyCopy.title} subtitle={emptyCopy.subtitle} />}
      </div>
    </div>
  );
}

export default StudentArchivePage;
