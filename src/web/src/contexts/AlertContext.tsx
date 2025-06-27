import React, { createContext, useContext, useState, ReactNode } from 'react'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface Alert {
  id: string
  type: AlertType
  message: string
  details?: string
  duration?: number
}

interface AlertContextType {
  alerts: Alert[]
  showAlert: (type: AlertType, message: string, duration?: number, details?: string) => void
  removeAlert: (id: string) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number, details?: string) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export const useAlert = () => {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}

interface AlertProviderProps {
  children: ReactNode
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([])

  const showAlert = (type: AlertType, message: string, duration = 5000, details?: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    const alert: Alert = { id, type, message, details, duration }
    
    setAlerts(prev => [...prev, alert])

    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id)
      }, duration)
    }
  }

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id))
  }

  const showSuccess = (message: string, duration = 5000) => {
    showAlert('success', message, duration)
  }

  const showError = (message: string, duration = 10000, details?: string) => {
    showAlert('error', message, duration, details)
  }

  const showWarning = (message: string, duration = 7000) => {
    showAlert('warning', message, duration)
  }

  const showInfo = (message: string, duration = 5000) => {
    showAlert('info', message, duration)
  }

  const value: AlertContextType = {
    alerts,
    showAlert,
    removeAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  )
}