import React from 'react'
import { Modal, Typography } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

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

  const buttonProps = {
    danger: { type: 'primary' as const, danger: true },
    warning: { type: 'primary' as const },
    primary: { type: 'primary' as const }
  }[variant]

  return (
    <Modal
      open={show}
      title={
        <span>
          <ExclamationCircleOutlined style={{ marginRight: 8, color: variant === 'danger' ? '#ff4d4f' : '#faad14' }} />
          {title}
        </span>
      }
      onCancel={onCancel}
      cancelText={cancelText}
      okText={confirmText}
      onOk={handleConfirm}
      okButtonProps={buttonProps}
      centered
    >
      <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>
        {message}
      </Typography.Text>
    </Modal>
  )
}