import React from 'react';

function SystemBanner({ tone, message, onClose }) {
  if (!message) return null;
  const cls =
    tone === 'warning'
      ? 'banner warning'
      : tone === 'success'
        ? 'banner success'
        : tone === 'danger'
          ? 'banner danger'
          : 'banner';

  return (
    <div className={cls} role="status">
      <div className="banner-message">{message}</div>
      {onClose && (
        <button type="button" className="btn-secondary" onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export default SystemBanner;
