import React, { useState, useEffect } from 'react'
import { Modal, Form, InputNumber, DatePicker, Typography, Space, Alert, Button, Select } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { Game } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import dayjs from 'dayjs'

const { Text, Title } = Typography

interface PurchaseModalProps {
  visible: boolean
  game: Game | null
  onClose: () => void
  onSuccess: () => void
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  visible,
  game,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [budgets, setBudgets] = useState<any[]>([])
  const { showError, showSuccess } = useAlert()

  // 予算一覧を取得
  useEffect(() => {
    const loadBudgets = async () => {
      try {
        console.log('Loading budgets for purchase modal...')
        const response = await api.get('/budgets/summaries')
        console.log('Budget API response:', {
          success: response.success,
          dataLength: response.data?.length,
          data: response.data,
          error: response.error
        })
        
        // `/api/budgets/summaries` は直接配列を返す（api.get()を使用するとwrapperが追加される）
        const budgetData = response.data || response
        
        if (Array.isArray(budgetData)) {
          console.log('Processing budgets:', budgetData)
          const activeBudgets = budgetData.filter((budget: any) => {
            console.log('Checking budget:', {
              id: budget.id,
              name: budget.name, 
              is_active: budget.is_active,
              type: typeof budget.is_active,
              remaining_amount: budget.remaining_amount
            })
            return budget.is_active === true || budget.is_active === 1
          })
          console.log('Filtered active budgets:', activeBudgets)
          setBudgets(activeBudgets)
        } else {
          console.error('Invalid budget response format:', {
            responseType: typeof response,
            isArray: Array.isArray(response),
            budgetDataType: typeof budgetData,
            response: response
          })
          setBudgets([])
        }
      } catch (error) {
        console.error('Failed to load budgets:', error)
        showError('予算の取得に失敗しました')
        setBudgets([])
      }
    }

    if (visible) {
      loadBudgets()
    }
  }, [visible, showError])

  // モーダルが開かれたときにフォームをリセット
  React.useEffect(() => {
    if (visible && game) {
      if (game.is_purchased) {
        // 既に購入済みの場合は既存の値を設定
        form.setFieldsValue({
          price: game.purchase_price,
          date: game.purchase_date ? dayjs(game.purchase_date) : dayjs(),
          budget_id: (game as any).budget_id || undefined
        })
      } else {
        // 未購入の場合は初期値を設定
        form.setFieldsValue({
          price: game.latestPrice?.current_price || undefined,
          date: dayjs(),
          budget_id: undefined
        })
      }
    }
  }, [visible, game, form])

  const handleSubmit = async (values: any) => {
    if (!game) return

    try {
      setLoading(true)
      
      const response = await api.put(`/games/${game.id}/mark-purchased`, {
        purchase_price: values.price,
        purchase_date: values.date.format('YYYY-MM-DD'),
        budget_id: values.budget_id || null
      })

      if (response.success) {
        showSuccess(`${game.name}を購入済みとしてマークしました`)
        form.resetFields()
        onSuccess()
        onClose()
      } else {
        showError('購入済みマークの更新に失敗しました')
      }
    } catch (error) {
      console.error('Failed to mark as purchased:', error)
      showError('購入済みマークの更新中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleUnmark = async () => {
    if (!game) return

    Modal.confirm({
      title: '購入済みマークを解除',
      content: `${game.name}の購入済みマークを解除しますか？`,
      okText: '解除',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          setLoading(true)
          console.log('Unmarking game:', game.id)
          
          const response = await api.put(`/games/${game.id}/unmark-purchased`)
          console.log('Unmark response:', response)

          if (response.success) {
            showSuccess(`${game.name}の購入済みマークを解除しました`)
            form.resetFields()
            onSuccess()
            onClose()
          } else {
            showError('購入済みマークの解除に失敗しました: ' + (response.error || '不明なエラー'))
          }
        } catch (error) {
          console.error('Failed to unmark as purchased:', error)
          showError('購入済みマークの解除中にエラーが発生しました')
        } finally {
          setLoading(false)
        }
      }
    })
  }

  return (
    <Modal
      title={
        <Space>
          <ShoppingCartOutlined />
          {game?.is_purchased ? '購入情報を編集' : '購入済みとしてマーク'}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={game?.is_purchased ? '更新' : 'マーク'}
      cancelText="キャンセル"
      width={500}
      footer={game?.is_purchased ? (
        <Space key="actions" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button
            danger
            onClick={handleUnmark}
            loading={loading}
          >
            購入済みマークを解除
          </Button>
          <Space>
            <Button onClick={onClose}>
              キャンセル
            </Button>
            <Button type="primary" onClick={() => form.submit()} loading={loading}>
              更新
            </Button>
          </Space>
        </Space>
      ) : undefined}
    >
      {game && (
        <>
          <Title level={4} style={{ marginBottom: 16 }}>{game.name}</Title>
          
          {game.latestPrice && (
            <Alert
              message={`現在の価格: ¥${game.latestPrice.current_price.toLocaleString()} (${game.latestPrice.discount_percent}% OFF)`}
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="price"
              label="購入価格（円）"
              rules={[
                { required: true, message: '購入価格を入力してください' },
                { type: 'number', min: 0, message: '0円以上を入力してください' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="購入価格を入力"
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\¥\s?|(,*)/g, '') as any}
                min={0}
              />
            </Form.Item>

            <Form.Item
              name="date"
              label="購入日"
              rules={[{ required: true, message: '購入日を選択してください' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="YYYY年MM月DD日"
                placeholder="購入日を選択"
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </Form.Item>

            <Form.Item
              name="budget_id"
              label="使用予算"
              help={
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  この購入に使用した予算を選択（省略可）{budgets.length > 0 ? ` - ${budgets.length}件の予算が利用可能` : ' - 予算が設定されていません'}
                </Typography.Text>
              }
            >
              <Select
                style={{ width: '100%' }}
                placeholder={budgets.length > 0 ? "予算を選択（省略可）" : "予算が設定されていません"}
                allowClear
                disabled={budgets.length === 0}
                options={budgets.map(budget => ({
                  value: budget.id,
                  label: `${budget.name} (残高: ¥${(budget.remaining_amount || 0).toLocaleString()})`
                }))}
                notFoundContent={budgets.length === 0 ? "予算が設定されていません" : "該当なし"}
              />
            </Form.Item>

            {game.is_purchased && game.purchase_price && (
              <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
                <Text type="secondary">
                  元の購入価格: ¥{game.purchase_price.toLocaleString()}
                </Text>
                {game.purchase_date && (
                  <Text type="secondary">
                    元の購入日: {dayjs(game.purchase_date).format('YYYY年MM月DD日')}
                  </Text>
                )}
              </Space>
            )}
          </Form>
        </>
      )}
    </Modal>
  )
}