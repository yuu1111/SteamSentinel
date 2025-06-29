import React, { useState, useEffect } from 'react'
import { Card, Alert, Button, Space, Typography, Row, Col, List, Badge, Statistic } from 'antd'
import { 
  BellOutlined, 
  WarningOutlined, 
  ExclamationCircleOutlined, 
  CloseCircleOutlined, 
  TrophyOutlined, 
  CheckOutlined, 
  CloseOutlined,
  StopOutlined,
  UnorderedListOutlined
} from '@ant-design/icons'
import { SpendingAlert, ExpenseData, BudgetData } from '../types'
import { formatRelativeTime } from '../utils/dateUtils'

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

    if (!expenseData) {return}

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
      case 'unusual_spending': return <WarningOutlined />
      case 'budget_warning': return <ExclamationCircleOutlined />
      case 'budget_exceeded': return <CloseCircleOutlined />
      case 'savings_milestone': return <TrophyOutlined />
      default: return <BellOutlined />
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
      <Alert
        type="info"
        message="支出アラートデータを読み込み中..."
        icon={<BellOutlined />}
        showIcon
      />
    )
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header */}
      <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          <BellOutlined style={{ marginRight: 8 }} />
          支出アラート
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ marginLeft: 8 }} />
          )}
        </Typography.Title>
        {alerts.length > 5 && (
          <Button 
            type="link"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? '折りたたむ' : `すべて表示 (${alerts.length})`}
          </Button>
        )}
      </Space>

      {/* Alert Summary */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="総アラート数"
              value={alerts.length}
              prefix={<BellOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="重要"
              value={alerts.filter(a => a.severity === 'danger').length}
              prefix={<WarningOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="警告"
              value={alerts.filter(a => a.severity === 'warning').length}
              prefix={<ExclamationCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="達成"
              value={alerts.filter(a => a.type === 'savings_milestone').length}
              prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts List */}
      <Card
        title={
          <Space>
            <UnorderedListOutlined />
            アラート一覧
          </Space>
        }
      >
        {displayedAlerts.length > 0 ? (
          <List
            dataSource={displayedAlerts}
            renderItem={(alert) => (
              <List.Item
                key={alert.id}
                actions={[
                  !alert.isRead && (
                    <Button
                      type="text"
                      icon={<CheckOutlined />}
                      onClick={() => markAsRead(alert.id)}
                      title="既読にする"
                    />
                  ),
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => dismissAlert(alert.id)}
                    title="削除"
                  />
                ].filter(Boolean)}
                style={{
                  borderLeft: !alert.isRead ? '3px solid #1890ff' : 'none',
                  paddingLeft: !alert.isRead ? 16 : 0
                }}
              >
                <List.Item.Meta
                  avatar={getAlertIcon(alert.type)}
                  title={
                    <Space>
                      {alert.title}
                      {!alert.isRead && <Badge status="processing" text="NEW" />}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Typography.Text>{alert.message}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {formatRelativeTime(alert.created_at)}
                      </Typography.Text>
                      
                      {/* Alert Details */}
                      {alert.type === 'unusual_spending' && alert.data?.purchase && (
                        <Alert
                          type="info"
                          message={
                            <Typography.Text style={{ fontSize: 12 }}>
                              <strong>購入詳細:</strong> {alert.data.purchase.game_name} - 
                              ¥{alert.data.purchase.trigger_price.toLocaleString()} 
                              ({alert.data.purchase.discount_percent}% OFF)
                            </Typography.Text>
                          }
                          showIcon={false}
                          style={{ marginTop: 8 }}
                        />
                      )}
                      
                      {alert.type === 'budget_warning' && alert.data?.budget && (
                        <Alert
                          type="warning"
                          message={
                            <Typography.Text style={{ fontSize: 12 }}>
                              <strong>予算詳細:</strong> {alert.data.budget.name} - 
                              ¥{alert.data.budget.spent.toLocaleString()} / ¥{alert.data.budget.amount.toLocaleString()}
                            </Typography.Text>
                          }
                          showIcon={false}
                          style={{ marginTop: 8 }}
                        />
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <StopOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              現在アラートはありません。
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              支出パターンや予算の変化を監視してアラートを生成します。
            </Typography.Text>
          </div>
        )}
      </Card>
    </Space>
  )
}