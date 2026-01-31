import React, { useMemo } from 'react';
import Modal from './Modal';

function ConfirmModal({
  open,
  title,
  message,
  confirmText,
  cancelText,
  tone,
  onConfirm,
  onClose,
}) {
  const confirmClass = useMemo(() => {
    if (tone === 'danger') return 'btn-danger';
    return 'btn-primary';
  }, [tone]);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={() => {
              onConfirm && onConfirm();
            }}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      }
    >
      <div className="confirm-message">{message}</div>
    </Modal>
  );
}

export default ConfirmModal;
