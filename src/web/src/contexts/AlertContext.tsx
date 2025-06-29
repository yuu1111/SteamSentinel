import React, { createContext, useContext, ReactNode } from 'react'
import { App } from 'antd'
import { NotificationType, GameAlertData, SpendingAlertData } from '../services/NotificationService'

interface AlertContextType {
  // 基本的なメッセージ (軽量、短時間表示)
  showMessage: (type: NotificationType, message: string) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
  
  // 詳細通知 (リッチ、長時間表示、詳細情報付き)
  showNotification: (type: NotificationType, title: string, content?: string, duration?: number) => void
  showSuccessNotification: (title: string, content?: string, duration?: number) => void
  showErrorNotification: (title: string, content?: string, duration?: number) => void
  showWarningNotification: (title: string, content?: string, duration?: number) => void
  showInfoNotification: (title: string, content?: string, duration?: number) => void
  
  // 専用アラート
  showGameAlert: (gameData: GameAlertData) => void
  showSpendingAlert: (spendingData: SpendingAlertData) => void
  
  // ユーティリティ
  clearAll: () => void
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
  const { message, notification } = App.useApp()

  // 基本的なメッセージ (軽量、短時間表示)
  const showMessage = (type: NotificationType, messageText: string) => {
    message[type](messageText)
  }

  const showSuccess = (messageText: string) => {
    message.success(messageText)
  }

  const showError = (messageText: string) => {
    message.error(messageText)
  }

  const showWarning = (messageText: string) => {
    message.warning(messageText)
  }

  const showInfo = (messageText: string) => {
    message.info(messageText)
  }

  // 詳細通知 (リッチ、長時間表示、詳細情報付き)
  const showNotification = (type: NotificationType, title: string, content?: string, duration?: number) => {
    notification[type]({
      message: title,
      description: content,
      duration: duration || 4.5,
      placement: 'topRight'
    })
  }

  const showSuccessNotification = (title: string, content?: string, duration?: number) => {
    notification.success({
      message: title,
      description: content,
      duration: duration || 4.5,
      placement: 'topRight'
    })
  }

  const showErrorNotification = (title: string, content?: string, duration?: number) => {
    notification.error({
      message: title,
      description: content,
      duration: duration || 0, // エラーは手動で閉じる
      placement: 'topRight'
    })
  }

  const showWarningNotification = (title: string, content?: string, duration?: number) => {
    notification.warning({
      message: title,
      description: content,
      duration: duration || 6,
      placement: 'topRight'
    })
  }

  const showInfoNotification = (title: string, content?: string, duration?: number) => {
    notification.info({
      message: title,
      description: content,
      duration: duration || 4.5,
      placement: 'topRight'
    })
  }

  // 専用アラート
  const showGameAlert = (gameData: GameAlertData) => {
    const { name, alertType, price, discount, previousLow } = gameData
    
    let title = ''
    let description = ''

    switch (alertType) {
      case 'new_low':
        title = `${name} - 新最安値！`
        description = `¥${price?.toLocaleString()} (前回最安値: ¥${previousLow?.toLocaleString()})`
        break
      case 'sale_start':
        title = `${name} - セール開始`
        description = discount ? `¥${price?.toLocaleString()} (${discount}% OFF)` : `¥${price?.toLocaleString()}`
        break
      case 'threshold_met':
        title = `${name} - 価格条件達成`
        description = `¥${price?.toLocaleString()}に値下がりしました`
        break
      case 'free_game':
        title = `${name} - 無料配布中！`
        description = '期間限定で無料で入手できます'
        break
    }

    notification.success({
      message: title,
      description,
      duration: 0, // 手動で閉じる
      placement: 'topRight'
    })
  }

  const showSpendingAlert = (spendingData: SpendingAlertData) => {
    const { type, title, amount, budgetName, percentage } = spendingData
    
    let description = ''
    let notificationType: 'warning' | 'error' | 'info' = 'info'

    switch (type) {
      case 'unusual_spending':
        description = `¥${amount.toLocaleString()}の大きな支出が検出されました`
        notificationType = 'warning'
        break
      case 'budget_warning':
        description = `${budgetName}: 予算の${percentage}%を使用 (¥${amount.toLocaleString()})`
        notificationType = 'warning'
        break
      case 'budget_exceeded':
        description = `${budgetName}: 予算を¥${amount.toLocaleString()}超過しました`
        notificationType = 'error'
        break
      case 'savings_milestone':
        description = `¥${amount.toLocaleString()}の節約を達成しました！`
        notificationType = 'info'
        break
    }

    notification[notificationType]({
      message: title,
      description,
      duration: type === 'budget_exceeded' ? 0 : 6,
      placement: 'topRight'
    })
  }

  // ユーティリティ
  const clearAll = () => {
    notification.destroy()
    message.destroy()
  }

  const value: AlertContextType = {
    showMessage,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    showSuccessNotification,
    showErrorNotification,
    showWarningNotification,
    showInfoNotification,
    showGameAlert,
    showSpendingAlert,
    clearAll,
  }

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  )
}