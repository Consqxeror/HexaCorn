import React from 'react';
import Modal from './Modal';

function SessionWarning({ open, secondsLeft, onStayLoggedIn, onLogout }) {
  return (
    <Modal
      open={open}
      title="Session Expiring"
      onClose={onStayLoggedIn}
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onStayLoggedIn}>
            Stay Logged In
          </button>
          <button type="button" className="btn-danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      }
    >
      <div className="confirm-message">
        Your session is about to expire{typeof secondsLeft === 'number' ? ` in ${secondsLeft}s` : ''}.
      </div>
    </Modal>
  );
}

export default SessionWarning;
