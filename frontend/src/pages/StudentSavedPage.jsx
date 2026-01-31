import React, { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { assetUrl } from '../api/client';

function StudentSavedPage() {
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem('hexacorn_saved') || '[]';
    try {
      setSaved(JSON.parse(raw));
    } catch {
      setSaved([]);
    }
  }, []);

  const has = useMemo(() => Array.isArray(saved) && saved.length > 0, [saved]);

  return (
    <div className="page">
      <h1>Saved</h1>
      <p className="muted">Items you bookmarked will appear here (stored locally).</p>

      {!has ? (
        <EmptyState title="Nothing saved yet" subtitle="Open a notice/note and use Save to bookmark it." />
      ) : (
        <div className="grid">
          {saved.map((it) => (
            <article key={it.id} className="card">
              <h3>{it.title}</h3>
              <p className="muted">{(it.category || '').toUpperCase()}</p>
              {it.updatedAt && <p className="muted">Updated: {new Date(it.updatedAt).toLocaleString()}</p>}
              {it.filePath && (
                <a className="btn-link" href={assetUrl(it.filePath)} target="_blank" rel="noreferrer">
                  View / Download
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentSavedPage;
