import React, { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import { assetUrl } from '../api/client';

function StudentDownloadsPage() {
  const [downloads, setDownloads] = useState([]);

  useEffect(() => {
    const raw = localStorage.getItem('hexacorn_downloads') || '[]';
    try {
      setDownloads(JSON.parse(raw));
    } catch {
      setDownloads([]);
    }
  }, []);

  const has = useMemo(() => Array.isArray(downloads) && downloads.length > 0, [downloads]);

  return (
    <div className="page">
      <h1>Downloads</h1>
      <p className="muted">Recent downloads (stored locally on this device).</p>

      {!has ? (
        <EmptyState title="No downloads yet" subtitle="Download a file from the Feed and it will show here." />
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Downloaded On</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {downloads.map((d) => (
                <tr key={`${d.id}-${d.downloadedAt}`}>
                  <td>{d.title}</td>
                  <td>{(d.category || '').toUpperCase()}</td>
                  <td>{new Date(d.downloadedAt).toLocaleString()}</td>
                  <td>
                    {d.filePath ? (
                      <a className="btn-link" href={assetUrl(d.filePath)} target="_blank" rel="noreferrer">
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
    </div>
  );
}

export default StudentDownloadsPage;
