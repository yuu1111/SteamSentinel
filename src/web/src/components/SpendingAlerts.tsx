import React, { useState, useEffect } from 'react'
import { SpendingAlert, ExpenseData, BudgetData } from '../types'

interface SpendingAlertsProps {
  expenseData: ExpenseData | null
  budgets?: BudgetData[]
}

export const SpendingAlerts: React.FC<SpendingAlertsProps> = ({ 
  expenseData, 
  budgets = [] 
}) => {
  const [alerts, setAlerts] = useState<SpendingAlert[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    if (expenseData) {
      generateSpendingAlerts()
    }
  }, [expenseData, budgets])

  const generateSpendingAlerts = () => {
    const newAlerts: SpendingAlert[] = []

    if (!expenseData) return

    // 1. 異常支出パターン検知
    const recentPurchases = expenseData.recentPurchases.slice(0, 5)
    const averagePrice = expenseData.summary.averagePrice
    
    recentPurchases.forEach(purchase => {
      if (purchase.trigger_price > averagePrice * 2) {
        newAlerts.push({
          id: `unusual_${purchase.steam_app_id}`,
          type: 'unusual_spending',
          title: '高額購入を検知',
          message: `${purchase.game_name}の購入価格(¥${purchase.trigger_price.toLocaleString()})が平均購入価格の2倍を超えています`,
          severity: 'warning',
          data: { purchase },
          isRead: false,
          created_at: purchase.created_at
        })
      }
    })

    // 2. 月間支出トレンド分析
    const monthlyTrends = expenseData.monthlyTrends.expenses
    if (monthlyTrends.length >= 2) {
      const latestMonth = monthlyTrends[monthlyTrends.length - 1]
      const previousMonth = monthlyTrends[monthlyTrends.length - 2]
      const increaseRate = ((latestMonth.amount - previousMonth.amount) / previousMonth.amount) * 100

      if (increaseRate > 50) {
        newAlerts.push({
          id: `trend_increase_${latestMonth.month}`,
          type: 'unusual_spending',
          title: '支出急増を検知',
          message: `前月比${increaseRate.toFixed(1)}%の支出増加です。予算管理にご注意ください`,
          severity: 'danger',
          data: { currentMonth: latestMonth, previousMonth, increaseRate },
          isRead: false,
          created_at: new Date().toISOString()
        })
      } else if (increaseRate > 25) {
        newAlerts.push({
          id: `trend_moderate_${latestMonth.month}`,
          type: 'unusual_spending',
          title: '支出増加を検知',
          message: `前月比${increaseRate.toFixed(1)}%の支出増加が見られます`,
          severity: 'warning',
          data: { currentMonth: latestMonth, previousMonth, increaseRate },
          isRead: false,
          created_at: new Date().toISOString()
        })
      }
    }

    // 3. 予算関連アラート
    budgets.forEach(budget => {
      const utilization = (budget.spent / budget.amount) * 100
      
      if (budget.remaining < 0) {
        newAlerts.push({
          id: `budget_exceeded_${budget.id}`,
          type: 'budget_exceeded',
          title: '予算超過',
          message: `${budget.name}の予算を¥${Math.abs(budget.remaining).toLocaleString()}超過しています`,
          severity: 'danger',
          data: { budget },
          isRead: false,
          created_at: new Date().toISOString()
        })
      } else if (utilization >= 80) {
        newAlerts.push({
          id: `budget_warning_${budget.id}`,
          type: 'budget_warning',
          title: '予算使用率警告',
          message: `${budget.name}の使用率が${utilization.toFixed(0)}%に達しました`,
          severity: 'warning',
          data: { budget, utilization },
          isRead: false,
          created_at: new Date().toISOString()
        })
      }
    })

    // 4. 節約マイルストーン
    const totalSavings = expenseData.summary.totalSavings
    const savingsRate = expenseData.summary.savingsRate

    if (totalSavings >= 50000 && savingsRate >= 30) {
      newAlerts.push({
        id: `savings_milestone_50k`,
        type: 'savings_milestone',
        title: '節約マイルストーン達成',
        message: `総節約額¥${totalSavings.toLocaleString()}、節約率${savingsRate.toFixed(1)}%を達成しました！`,
        severity: 'success',
        data: { totalSavings, savingsRate },
        isRead: false,
        created_at: new Date().toISOString()
      })
    } else if (totalSavings >= 10000) {
      newAlerts.push({
        id: `savings_milestone_10k`,
        type: 'savings_milestone',
        title: '節約目標達成',
        message: `¥${totalSavings.toLocaleString()}の節約を達成しました！`,
        severity: 'success',
        data: { totalSavings },
        isRead: false,
        created_at: new Date().toISOString()
      })
    }

    // 5. 低割引率購入の警告
    const lowDiscountPurchases = recentPurchases.filter(p => p.discount_percent < 20)
    if (lowDiscountPurchases.length >= 3) {
      newAlerts.push({
        id: `low_discount_pattern`,
        type: 'unusual_spending',
        title: '低割引率購入パターン',
        message: `最近の購入で割引率20%未満の商品が${lowDiscountPurchases.length}件あります。もう少し待てばより良い価格で購入できるかもしれません`,
        severity: 'info',
        data: { lowDiscountPurchases },
        isRead: false,
        created_at: new Date().toISOString()
      })
    }

    // 最新順にソート
    newAlerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setAlerts(newAlerts)
  }

  const getAlertIcon = (type: SpendingAlert['type']) => {
    switch (type) {
      case 'unusual_spending': return 'exclamation-triangle'
      case 'budget_warning': return 'exclamation-circle'
      case 'budget_exceeded': return 'x-circle'
      case 'savings_milestone': return 'trophy'
      default: return 'info-circle'
    }
  }

  const getSeverityColor = (severity: SpendingAlert['severity']) => {
    switch (severity) {
      case 'success': return 'success'
      case 'info': return 'info'
      case 'warning': return 'warning'
      case 'danger': return 'danger'
      default: return 'secondary'
    }
  }

  const markAsRead = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ))
  }

  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId))
  }

  const displayedAlerts = showAll ? alerts : alerts.slice(0, 5)
  const unreadCount = alerts.filter(alert => !alert.isRead).length

  if (!expenseData) {
    return (
      <div className="row">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            支出アラートデータを読み込み中...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <h4>
            <i className="bi bi-bell me-2"></i>支出アラート
            {unreadCount > 0 && (
              <span className="badge bg-danger ms-2">{unreadCount}</span>
            )}
          </h4>
          {alerts.length > 5 && (
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? '折りたたむ' : `すべて表示 (${alerts.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Alert Summary */}
      <div className="col-12 mb-4">
        <div className="row">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <i className="bi bi-bell-fill display-4 text-primary mb-2"></i>
                <h5>{alerts.length}</h5>
                <small className="text-muted">総アラート数</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <i className="bi bi-exclamation-triangle-fill display-4 text-danger mb-2"></i>
                <h5>{alerts.filter(a => a.severity === 'danger').length}</h5>
                <small className="text-muted">重要</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <i className="bi bi-exclamation-circle-fill display-4 text-warning mb-2"></i>
                <h5>{alerts.filter(a => a.severity === 'warning').length}</h5>
                <small className="text-muted">警告</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <i className="bi bi-trophy-fill display-4 text-success mb-2"></i>
                <h5>{alerts.filter(a => a.type === 'savings_milestone').length}</h5>
                <small className="text-muted">達成</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-list-ul me-2"></i>アラート一覧
            </h5>
          </div>
          <div className="card-body">
            {displayedAlerts.length > 0 ? (
              <div className="list-group list-group-flush">
                {displayedAlerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`list-group-item ${!alert.isRead ? 'list-group-item-action border-start border-3 border-primary' : ''}`}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center mb-2">
                          <i className={`bi bi-${getAlertIcon(alert.type)} text-${getSeverityColor(alert.severity)} me-2`}></i>
                          <h6 className="mb-0">{alert.title}</h6>
                          {!alert.isRead && (
                            <span className="badge bg-primary ms-2">NEW</span>
                          )}
                        </div>
                        <p className="mb-1 text-muted">{alert.message}</p>
                        <small className="text-muted">
                          {new Date(alert.created_at).toLocaleString('ja-JP')}
                        </small>
                      </div>
                      <div className="btn-group btn-group-sm">
                        {!alert.isRead && (
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => markAsRead(alert.id)}
                            title="既読にする"
                          >
                            <i className="bi bi-check"></i>
                          </button>
                        )}
                        <button 
                          className="btn btn-outline-danger"
                          onClick={() => dismissAlert(alert.id)}
                          title="削除"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    </div>
                    
                    {/* Alert Details */}
                    {alert.type === 'unusual_spending' && alert.data?.purchase && (
                      <div className="mt-2 p-2 bg-light rounded">
                        <small>
                          <strong>購入詳細:</strong> {alert.data.purchase.game_name} - 
                          ¥{alert.data.purchase.trigger_price.toLocaleString()} 
                          ({alert.data.purchase.discount_percent}% OFF)
                        </small>
                      </div>
                    )}
                    
                    {alert.type === 'budget_warning' && alert.data?.budget && (
                      <div className="mt-2 p-2 bg-light rounded">
                        <small>
                          <strong>予算詳細:</strong> {alert.data.budget.name} - 
                          ¥{alert.data.budget.spent.toLocaleString()} / ¥{alert.data.budget.amount.toLocaleString()}
                        </small>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-bell-slash display-1 text-muted mb-3"></i>
                <p className="text-muted">現在アラートはありません。</p>
                <small className="text-muted">
                  支出パターンや予算の変化を監視してアラートを生成します。
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}