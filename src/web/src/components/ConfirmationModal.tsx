import React from 'react'

interface ConfirmationModalProps {
  show: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'primary'
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  const handleConfirm = () => {
    onConfirm()
    onCancel() // Close modal after confirm
  }

  if (!show) {
    return null
  }

  const buttonClass = {
    danger: 'btn-danger',
    warning: 'btn-warning', 
    primary: 'btn-primary'
  }[variant]

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {cancelText}
            </button>
            <button type="button" className={`btn ${buttonClass}`} onClick={handleConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}