import { notification, message } from 'antd'
import { ShoppingCartOutlined, DollarOutlined, WarningOutlined, CheckCircleOutlined, InfoCircleOutlined, GiftOutlined } from '@ant-design/icons'
import React from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface NotificationConfig {
  title: string
  content?: string
  duration?: number
  actions?: Array<{ label: string; onClick: () => void }>
}

export interface GameAlertData {
  name: string
  steamAppId: number
  alertType: 'new_low' | 'sale_start' | 'threshold_met' | 'free_game'
  price?: number
  originalPrice?: number
  discount?: number
  previousLow?: number
}

export interface SpendingAlertData {
  type: 'unusual_spending' | 'budget_warning' | 'budget_exceeded' | 'savings_milestone'
  title: string
  amount: number
  budgetName?: string
  percentage?: number
}

class AntNotificationService {
  // 軽量メッセージ (2-3秒表示、簡単なフィードバック用)
  message = {
    success: (content: string) => {
      message.success({
        content,
        duration: 3,
        style: { fontSize: '15px' }
      })
    },
    
    error: (content: string) => {
      message.error({
        content,
        duration: 4,
        style: { fontSize: '15px' }
      })
    },
    
    warning: (content: string) => {
      message.warning({
        content,
        duration: 4,
        style: { fontSize: '15px' }
      })
    },
    
    info: (content: string) => {
      message.info({
        content,
        duration: 3,
        style: { fontSize: '15px' }
      })
    }
  }

  // リッチ通知 (詳細情報、アクション付き)
  notify = {
    success: (config: NotificationConfig) => {
      notification.success({
        message: config.title,
        description: config.content,
        duration: config.duration || 4.5,
        placement: 'topRight',
        icon: React.createElement(CheckCircleOutlined, { style: { color: '#52c41a' } }),
        style: { fontSize: '15px' }
      })
    },
    
    error: (config: NotificationConfig) => {
      notification.error({
        message: config.title,
        description: config.content,
        duration: config.duration || 0, // エラーは手動で閉じる
        placement: 'topRight',
        icon: React.createElement(WarningOutlined, { style: { color: '#ff4d4f' } }),
        style: { fontSize: '15px' }
      })
    },
    
    warning: (config: NotificationConfig) => {
      notification.warning({
        message: config.title,
        description: config.content,
        duration: config.duration || 6,
        placement: 'topRight',
        icon: React.createElement(WarningOutlined, { style: { color: '#faad14' } }),
        style: { fontSize: '15px' }
      })
    },
    
    info: (config: NotificationConfig) => {
      notification.info({
        message: config.title,
        description: config.content,
        duration: config.duration || 4.5,
        placement: 'topRight',
        icon: React.createElement(InfoCircleOutlined, { style: { color: '#1890ff' } }),
        style: { fontSize: '15px' }
      })
    }
  }

  // ゲーム価格アラート専用通知
  gameAlert = (gameData: GameAlertData) => {
    const { name, steamAppId, alertType, price, discount, previousLow } = gameData
    
    let title = ''
    let description = ''
    let icon = ShoppingCartOutlined
    let color = '#52c41a'

    switch (alertType) {
      case 'new_low':
        title = `${name} - 新最安値！`
        description = `¥${price?.toLocaleString()} (前回最安値: ¥${previousLow?.toLocaleString()})`
        color = '#ff4d4f'
        break
      case 'sale_start':
        title = `${name} - セール開始`
        description = discount ? `¥${price?.toLocaleString()} (${discount}% OFF)` : `¥${price?.toLocaleString()}`
        color = '#1890ff'
        break
      case 'threshold_met':
        title = `${name} - 価格条件達成`
        description = `¥${price?.toLocaleString()}に値下がりしました`
        color = '#52c41a'
        break
      case 'free_game':
        title = `${name} - 無料配布中！`
        description = '期間限定で無料で入手できます'
        icon = GiftOutlined
        color = '#722ed1'
        break
    }

    notification.open({
      message: title,
      description,
      duration: 0, // 手動で閉じる
      placement: 'topRight',
      icon: React.createElement(icon, { style: { color } }),
      btn: React.createElement('div', {
        style: { display: 'flex', gap: '8px', marginTop: '8px' }
      }, [
        React.createElement('a', {
          key: 'steam',
          href: `https://store.steampowered.com/app/${steamAppId}/`,
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            color: '#1890ff',
            textDecoration: 'none',
            fontSize: '14px'
          }
        }, 'Steam ストア'),
        React.createElement('span', { key: 'separator', style: { color: '#d9d9d9' } }, '|'),
        React.createElement('a', {
          key: 'steamdb',
          href: `https://steamdb.info/app/${steamAppId}/`,
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            color: '#1890ff',
            textDecoration: 'none',
            fontSize: '14px'
          }
        }, 'SteamDB')
      ]),
      style: { fontSize: '15px' }
    })
  }

  // 財務アラート専用通知
  spendingAlert = (spendingData: SpendingAlertData) => {
    const { type, title, amount, budgetName, percentage } = spendingData
    
    let description = ''
    let notificationType: 'warning' | 'error' | 'info' = 'info'
    let color = '#1890ff'

    switch (type) {
      case 'unusual_spending':
        description = `¥${amount.toLocaleString()}の大きな支出が検出されました`
        notificationType = 'warning'
        color = '#faad14'
        break
      case 'budget_warning':
        description = `${budgetName}: 予算の${percentage}%を使用 (¥${amount.toLocaleString()})`
        notificationType = 'warning'
        color = '#faad14'
        break
      case 'budget_exceeded':
        description = `${budgetName}: 予算を¥${amount.toLocaleString()}超過しました`
        notificationType = 'error'
        color = '#ff4d4f'
        break
      case 'savings_milestone':
        description = `¥${amount.toLocaleString()}の節約を達成しました！`
        notificationType = 'info'
        color = '#52c41a'
        break
    }

    notification[notificationType]({
      message: title,
      description,
      duration: type === 'budget_exceeded' ? 0 : 6,
      placement: 'topRight',
      icon: React.createElement(DollarOutlined, { style: { color } }),
      style: { fontSize: '15px' }
    })
  }

  // 設定関数
  configure = () => {
    // グローバル設定
    notification.config({
      placement: 'topRight',
      duration: 4.5,
      maxCount: 5, // 最大5個まで表示
      rtl: false
    })

    message.config({
      duration: 3,
      maxCount: 3,
      rtl: false
    })
  }

  // 全通知をクリア
  clear = () => {
    notification.destroy()
    message.destroy()
  }
}

// シングルトンインスタンス
export const notificationService = new AntNotificationService()

// 初期設定を実行
notificationService.configure()

export default notificationService