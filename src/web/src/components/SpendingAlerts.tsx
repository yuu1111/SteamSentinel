import React, { useState, useEffect } from 'react'
import { Col, Card, Typography, Alert, Badge, Space, Button, List, Tag } from 'antd'
import { ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { SpendingAlert, ExpenseData, BudgetData } from '../types'
import { formatRelativeTime } from '../utils/dateUtils'

const { Title, Text } = Typography

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
    const monthlyTrends = expenseData.monthlyTrends?.expenses || []
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
          data: { budget },
          isRead: false,
          created_at: new Date().toISOString()
        })
      }
    })

    // 4. 節約マイルストーン
    const totalSavings = expenseData.summary.totalSavings || 0
    if (totalSavings >= 10000) {
      const milestoneValue = Math.floor(totalSavings / 10000) * 10000
      newAlerts.push({
        id: `savings_milestone_${milestoneValue}`,
        type: 'savings_milestone',
        title: '節約マイルストーン達成',
        message: `おめでとうございます！累計¥${milestoneValue.toLocaleString()}の節約を達成しました`,
        severity: 'success',
        data: { milestone: milestoneValue, totalSavings },
        isRead: false,
        created_at: new Date().toISOString()
      })
    }

    setAlerts(newAlerts)
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'danger': return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'warning': return <WarningOutlined style={{ color: '#faad14' }} />
      case 'success': return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      default: return <InfoCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'danger': return 'error'
      case 'warning': return 'warning'
      case 'success': return 'success'
      default: return 'info'
    }
  }

  const displayedAlerts = showAll ? alerts : alerts.slice(0, 3)
  const unreadCount = alerts.filter(alert => !alert.isRead).length

  return (
    <Col span={24}>
      <Card
        title={
          <Space>
            <Title level={4} style={{ margin: 0 }}>支出アラート</Title>
            {unreadCount > 0 && (
              <Badge count={unreadCount} style={{ backgroundColor: '#f5222d' }} />
            )}
          </Space>
        }
        extra={
          alerts.length > 3 && (
            <Button 
              type="link" 
              size="small"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? '折りたたみ' : `すべて表示 (${alerts.length})`}
            </Button>
          )
        }
      >
        {alerts.length === 0 ? (
          <Alert
            message="現在、支出アラートはありません"
            description="支出パターンが正常範囲内です。"
            type="success"
            showIcon
          />
        ) : (
          <List
            dataSource={displayedAlerts}
            renderItem={(alert) => (
              <List.Item>
                <List.Item.Meta
                  avatar={getSeverityIcon(alert.severity)}
                  title={
                    <Space>
                      <Text strong>{alert.title}</Text>
                      <Tag color={getSeverityColor(alert.severity)}>
                        {alert.type === 'unusual_spending' ? '異常支出' :
                         alert.type === 'budget_exceeded' ? '予算超過' :
                         alert.type === 'budget_warning' ? '予算警告' :
                         alert.type === 'savings_milestone' ? '節約達成' : 'その他'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Text>{alert.message}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatRelativeTime(alert.created_at)}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </Col>
  )
}