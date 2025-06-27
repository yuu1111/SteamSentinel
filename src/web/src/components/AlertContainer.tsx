import React from 'react'
import { useAlert } from '../contexts/AlertContext'

const AlertContainer: React.FC = () => {
  const { alerts, removeAlert } = useAlert()

  if (alerts.length === 0) return null

  return (
    <div className="alert-container position-fixed" style={{ 
      top: '20px', 
      right: '20px', 
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      {alerts.map(alert => (
        <div
          key={alert.id}
          className={`alert alert-${alert.type === 'error' ? 'danger' : alert.type} alert-dismissible fade show mb-2`}
          role="alert"
        >
          <div className="d-flex align-items-start">
            <div className="me-2">
              {alert.type === 'success' && <i className="bi bi-check-circle-fill"></i>}
              {alert.type === 'error' && <i className="bi bi-exclamation-triangle-fill"></i>}
              {alert.type === 'warning' && <i className="bi bi-exclamation-triangle-fill"></i>}
              {alert.type === 'info' && <i className="bi bi-info-circle-fill"></i>}
            </div>
            <div className="flex-grow-1">
              <div>{alert.message}</div>
              {alert.details && (
                <details className="mt-2">
                  <summary className="small text-muted" style={{ cursor: 'pointer' }}>
                    詳細を表示
                  </summary>
                  <pre className="small mt-1 mb-0" style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    fontSize: '0.75rem'
                  }}>
                    {alert.details}
                  </pre>
                </details>
              )}
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => removeAlert(alert.id)}
            aria-label="Close"
          ></button>
        </div>
      ))}
    </div>
  )
}

export default AlertContainer