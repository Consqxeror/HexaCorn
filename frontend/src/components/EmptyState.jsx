import React from 'react';

function EmptyState({ title, subtitle }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-illus" aria-hidden="true">
        <svg viewBox="0 0 200 120" width="200" height="120">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="rgba(99,102,241,0.35)" />
              <stop offset="1" stopColor="rgba(16,185,129,0.25)" />
            </linearGradient>
          </defs>
          <rect x="18" y="18" width="164" height="84" rx="14" fill="url(#g)" />
          <rect x="32" y="34" width="120" height="10" rx="5" fill="rgba(255,255,255,0.6)" />
          <rect x="32" y="54" width="136" height="10" rx="5" fill="rgba(255,255,255,0.45)" />
          <rect x="32" y="74" width="96" height="10" rx="5" fill="rgba(255,255,255,0.35)" />
        </svg>
      </div>
      <div className="empty-title">{title}</div>
      {subtitle && <div className="empty-subtitle">{subtitle}</div>}
    </div>
  );
}

export default EmptyState;
