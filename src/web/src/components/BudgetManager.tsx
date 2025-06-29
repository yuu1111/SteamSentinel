import React, { useState, useEffect } from 'react'
import { Col, Card, Typography, Progress, Row, Button, Modal, Form, Input, Select, Space, Tag, Alert, Statistic, List, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined, WarningOutlined } from '@ant-design/icons'
import { BudgetData, BudgetSummary, ExpenseData } from '../types'
import { useAlert } from '../contexts/AlertContext'

const { Title, Text } = Typography
const { Option } = Select

interface BudgetManagerProps {
  expenseData: ExpenseData | null
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ expenseData }) => {
  const [budgets, setBudgets] = useState<BudgetData[]>([])
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetData | null>(null)
  const [form] = Form.useForm()
  const { showSuccess, showError } = useAlert()

  useEffect(() => {
    loadBudgets()
  }, [expenseData])

  const loadBudgets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/budgets/summaries')
      
      if (!response.ok) {
        throw new Error('Failed to fetch budgets')
      }
      
      const budgetSummaries = await response.json()
      
      // バックエンドのBudgetSummaryをフロントエンドのBudgetDataに変換
      const convertedBudgets: BudgetData[] = budgetSummaries.map((summary: any) => ({
        id: summary.id.toString(),
        name: summary.name,
        type: summary.period_type as 'monthly' | 'yearly' | 'custom',
        amount: summary.budget_amount,
        period: summary.period_type === 'monthly' 
          ? summary.start_date?.substring(0, 7) // YYYY-MM
          : summary.period_type === 'yearly'
          ? summary.start_date?.substring(0, 4) // YYYY
          : `${summary.start_date} - ${summary.end_date}`,
        spent: summary.spent_amount,
        remaining: summary.remaining_amount,
        alerts: [], // アラート機能は後で実装
        created_at: summary.start_date,
        updated_at: summary.start_date
      }))
      
      setBudgets(convertedBudgets)
      calculateBudgetSummary(convertedBudgets)
    } catch (error) {
      console.error('Failed to load budgets:', error)
      showError('予算データの読み込みに失敗しました')
      
      // フォールバック用のモックデータ
      const fallbackBudgets: BudgetData[] = [
        {
          id: '1',
          name: '月間ゲーム予算',
          type: 'monthly',
          amount: 10000,
          period: '2024-01',
          spent: expenseData?.summary.totalExpenses || 0,
          remaining: 10000 - (expenseData?.summary.totalExpenses || 0),
          alerts: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      setBudgets(fallbackBudgets)
      calculateBudgetSummary(fallbackBudgets)
    } finally {
      setLoading(false)
    }
  }

  const calculateBudgetSummary = (budgetList: BudgetData[]) => {
    const summary: BudgetSummary = {
      totalBudgets: budgetList.length,
      activeBudgets: budgetList.filter(b => b.remaining > 0).length,
      totalAllocated: budgetList.reduce((sum, b) => sum + b.amount, 0),
      totalSpent: budgetList.reduce((sum, b) => sum + b.spent, 0),
      totalRemaining: budgetList.reduce((sum, b) => sum + b.remaining, 0),
      overBudgetCount: budgetList.filter(b => b.remaining < 0).length,
      averageUtilization: budgetList.length > 0 
        ? budgetList.reduce((sum, b) => sum + (b.spent / b.amount * 100), 0) / budgetList.length 
        : 0
    }
    setBudgetSummary(summary)
  }

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true)
      
      const url = editingBudget ? `/api/budgets/${editingBudget.id}` : '/api/budgets'
      const method = editingBudget ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: values.name,
          period_type: values.type,
          budget_amount: values.amount,
          is_active: true
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${editingBudget ? 'update' : 'create'} budget`)
      }
      
      await loadBudgets()
      form.resetFields()
      setShowCreateModal(false)
      setEditingBudget(null)
      showSuccess(editingBudget ? '予算を更新しました' : '予算を作成しました')
    } catch (error) {
      console.error('Budget operation error:', error)
      showError(`予算の${editingBudget ? '更新' : '作成'}に失敗しました: ` + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const deleteBudget = async (budgetId: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete budget')
      }
      
      await loadBudgets()
      showSuccess('予算を削除しました')
    } catch (error) {
      console.error('Failed to delete budget:', error)
      showError('予算の削除に失敗しました: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const getBudgetProgress = (budget: BudgetData) => {
    return Math.min((budget.spent / budget.amount) * 100, 100)
  }

  const getBudgetStatus = (budget: BudgetData) => {
    const progress = getBudgetProgress(budget)
    if (progress >= 100) return { status: 'exception', color: 'error' }
    if (progress >= 80) return { status: 'normal', color: 'warning' }
    return { status: 'normal', color: 'success' }
  }

  const openEditModal = (budget: BudgetData) => {
    setEditingBudget(budget)
    form.setFieldsValue({
      name: budget.name,
      type: budget.type,
      amount: budget.amount
    })
    setShowCreateModal(true)
  }

  const openCreateModal = () => {
    setEditingBudget(null)
    form.resetFields()
    setShowCreateModal(true)
  }

  if (!expenseData) {
    return (
      <Col span={24}>
        <Alert
          message="予算管理"
          description="予算管理機能を使用するには、まず出費データの読み込みが必要です。"
          type="info"
          showIcon
        />
      </Col>
    )
  }

  return (
    <Col span={24}>
      <Card
        title={
          <Space>
            <DollarOutlined />
            <Title level={4} style={{ margin: 0 }}>予算管理</Title>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            予算を追加
          </Button>
        }
      >
        {/* 予算サマリー */}
        {budgetSummary && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={6}>
              <Statistic
                title="総予算数"
                value={budgetSummary.totalBudgets}
                prefix={<DollarOutlined />}
              />
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="予算総額"
                value={budgetSummary.totalAllocated}
                prefix="¥"
                precision={0}
              />
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="支出総額"
                value={budgetSummary.totalSpent}
                prefix="¥"
                precision={0}
                valueStyle={{ color: budgetSummary.overBudgetCount > 0 ? '#f5222d' : '#1890ff' }}
              />
            </Col>
            <Col xs={24} sm={6}>
              <Statistic
                title="平均使用率"
                value={budgetSummary.averageUtilization}
                suffix="%"
                precision={1}
                valueStyle={{ color: budgetSummary.averageUtilization > 80 ? '#faad14' : '#52c41a' }}
              />
            </Col>
          </Row>
        )}

        {/* 予算オーバーアラート */}
        {budgetSummary && budgetSummary.overBudgetCount > 0 && (
          <Alert
            message={`${budgetSummary.overBudgetCount}個の予算が超過しています`}
            type="error"
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 予算リスト */}
        <List
          dataSource={budgets}
          renderItem={(budget) => {
            const progress = getBudgetProgress(budget)
            const { status, color } = getBudgetStatus(budget)
            
            return (
              <List.Item
                actions={[
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(budget)}
                  />,
                  <Popconfirm
                    title="この予算を削除しますか？"
                    onConfirm={() => deleteBudget(budget.id)}
                    okText="削除"
                    cancelText="キャンセル"
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{budget.name}</Text>
                      <Tag color={budget.type === 'monthly' ? 'blue' : budget.type === 'yearly' ? 'green' : 'purple'}>
                        {budget.type === 'monthly' ? '月間' : budget.type === 'yearly' ? '年間' : 'カスタム'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text>期間: {budget.period}</Text>
                      <Progress
                        percent={progress}
                        status={status as any}
                        strokeColor={color === 'error' ? '#f5222d' : color === 'warning' ? '#faad14' : '#52c41a'}
                      />
                      <Space>
                        <Text>支出: ¥{budget.spent.toLocaleString()}</Text>
                        <Text>予算: ¥{budget.amount.toLocaleString()}</Text>
                        <Text type={budget.remaining < 0 ? 'danger' : 'secondary'}>
                          残高: ¥{budget.remaining.toLocaleString()}
                        </Text>
                      </Space>
                    </Space>
                  }
                />
              </List.Item>
            )
          }}
        />

        {budgets.length === 0 && (
          <Alert
            message="予算が設定されていません"
            description="「予算を追加」ボタンから最初の予算を設定してください。"
            type="info"
            showIcon
            action={
              <Button type="primary" onClick={openCreateModal}>
                予算を追加
              </Button>
            }
          />
        )}
      </Card>

      {/* 予算作成/編集モーダル */}
      <Modal
        title={editingBudget ? '予算を編集' : '新しい予算を作成'}
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false)
          setEditingBudget(null)
          form.resetFields()
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ type: 'monthly' }}
        >
          <Form.Item
            name="name"
            label="予算名"
            rules={[{ required: true, message: '予算名を入力してください' }]}
          >
            <Input placeholder="例: 月間ゲーム予算" />
          </Form.Item>

          <Form.Item
            name="type"
            label="予算タイプ"
            rules={[{ required: true, message: '予算タイプを選択してください' }]}
          >
            <Select>
              <Option value="monthly">月間</Option>
              <Option value="yearly">年間</Option>
              <Option value="custom">カスタム</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="予算額（円）"
            rules={[
              { required: true, message: '予算額を入力してください' },
              { type: 'number', min: 1, message: '1円以上を入力してください' }
            ]}
          >
            <Input type="number" placeholder="10000" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setShowCreateModal(false)}>
                キャンセル
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingBudget ? '更新' : '作成'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Col>
  )
}