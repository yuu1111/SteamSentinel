import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Radio, InputNumber, Checkbox, Button, Space, Typography, Divider } from 'antd'
import { Game } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

interface AddGameModalProps {
  show: boolean
  onHide: () => void
  onGameAdded: () => void
}

export const AddGameModal: React.FC<AddGameModalProps> = ({ show, onHide, onGameAdded }) => {
  const [formData, setFormData] = useState({
    steamAppId: '',
    gameName: '',
    thresholdType: 'price' as 'price' | 'discount' | 'any_sale',
    priceThreshold: '',
    discountThreshold: '',
    gameEnabled: true,
    alertEnabled: true
  })
  const [loading, setLoading] = useState(false)
  const { showError, showSuccess } = useAlert()

  const resetForm = () => {
    setFormData({
      steamAppId: '',
      gameName: '',
      thresholdType: 'price',
      priceThreshold: '',
      discountThreshold: '',
      gameEnabled: true,
      alertEnabled: true
    })
  }

  const handleSubmit = async () => {
    
    const steamAppId = parseInt(formData.steamAppId)
    const gameName = formData.gameName.trim()
    
    if (isNaN(steamAppId) || steamAppId <= 0) {
      showError('有効なSteam App IDを入力してください')
      return
    }
    
    // ゲーム名は空でもOK（バックエンドでSteam APIから取得）
    // if (!gameName) {
    //   showError('ゲーム名は必須です')
    //   return
    // }

    if (formData.thresholdType === 'price' && formData.priceThreshold && parseInt(formData.priceThreshold) <= 0) {
      showError('価格閾値は0より大きい値を入力してください')
      return
    }

    if (formData.thresholdType === 'discount' && formData.discountThreshold) {
      const discount = parseInt(formData.discountThreshold)
      if (discount < 1 || discount > 99) {
        showError('割引率は1-99の範囲で入力してください')
        return
      }
    }

    try {
      setLoading(true)
      
      const response = await api.post('/games', {
        steam_app_id: steamAppId,
        name: gameName,
        price_threshold: formData.thresholdType === 'price' ? parseInt(formData.priceThreshold) || null : null,
        price_threshold_type: formData.thresholdType,
        discount_threshold_percent: formData.thresholdType === 'discount' ? parseInt(formData.discountThreshold) || null : null,
        enabled: formData.gameEnabled,
        alert_enabled: formData.alertEnabled
      })

      if (response.success) {
        const message = response.message || `${gameName} を追加しました`
        showSuccess(message)
        resetForm()
        onHide()
        onGameAdded()
      } else {
        showError('ゲームの追加に失敗しました: ' + response.error)
      }
    } catch (error) {
      console.error('Game addition error:', error)
      showError('ゲームの追加中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (show) {
      resetForm()
    }
  }, [show])

  return (
    <Modal
      title="ゲーム追加"
      open={show}
      onCancel={onHide}
      footer={null}
      width={600}
    >
      <Form onFinish={handleSubmit} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="Steam App ID *"
          required
          help={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              SteamのストアページURLから取得できます<br />
              例: https://store.steampowered.com/app/730/ → 730
            </Typography.Text>
          }
        >
          <Input
            style={{ width: '100%' }}
            value={formData.steamAppId}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '')
              setFormData(prev => ({ ...prev, steamAppId: value }))
            }}
            onPaste={(e) => {
              e.preventDefault()
              const pastedText = e.clipboardData.getData('text')
              const numericOnly = pastedText.replace(/[^0-9]/g, '')
              setFormData(prev => ({ ...prev, steamAppId: numericOnly }))
            }}
            placeholder="Steam App IDを入力（数字のみ）"
          />
        </Form.Item>

        <Form.Item
          label="ゲーム名"
          help={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              空欄にすると、Steam APIからゲーム名を自動取得します
            </Typography.Text>
          }
        >
          <Input
            value={formData.gameName}
            onChange={(e) => setFormData(prev => ({ ...prev, gameName: e.target.value }))}
            placeholder="空欄の場合、Steamから自動取得されます"
          />
        </Form.Item>

        <Form.Item label="アラート条件">
          <Radio.Group
            value={formData.thresholdType}
            onChange={(e) => setFormData(prev => ({ ...prev, thresholdType: e.target.value }))}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="price">価格閾値 - 指定した金額以下になったら通知</Radio>
              <Radio value="discount">割引率閾値 - 指定した割引率以上になったら通知</Radio>
              <Radio value="any_sale">セール開始 - 1円でも安くなったら通知</Radio>
            </Space>
          </Radio.Group>

          {formData.thresholdType === 'price' && (
            <div style={{ marginTop: 12 }}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="例: 2000"
                min={0}
                step={1}
                value={formData.priceThreshold ? parseInt(formData.priceThreshold) : undefined}
                onChange={(value) => setFormData(prev => ({ ...prev, priceThreshold: value?.toString() || '' }))}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                この金額以下になったときにアラートを送信
              </Typography.Text>
            </div>
          )}

          {formData.thresholdType === 'discount' && (
            <div style={{ marginTop: 12 }}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="例: 50"
                min={1}
                max={99}
                step={1}
                value={formData.discountThreshold ? parseInt(formData.discountThreshold) : undefined}
                onChange={(value) => setFormData(prev => ({ ...prev, discountThreshold: value?.toString() || '' }))}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                この割引率以上になったときにアラートを送信（%）
              </Typography.Text>
            </div>
          )}
        </Form.Item>

        <Form.Item>
          <Space direction="vertical">
            <Checkbox
              checked={formData.gameEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, gameEnabled: e.target.checked }))}
            >
              監視を有効にする
            </Checkbox>
            <Checkbox
              checked={formData.alertEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, alertEnabled: e.target.checked }))}
            >
              アラートを有効にする
            </Checkbox>
          </Space>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onHide}>キャンセル</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {loading ? '追加中...' : '追加'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}

interface EditGameModalProps {
  show: boolean
  game: Game | null
  onHide: () => void
  onGameUpdated: () => void
}

export const EditGameModal: React.FC<EditGameModalProps> = ({ show, game, onHide, onGameUpdated }) => {
  const [formData, setFormData] = useState({
    gameName: '',
    thresholdType: 'price' as 'price' | 'discount' | 'any_sale',
    priceThreshold: '',
    discountThreshold: '',
    gameEnabled: true,
    alertEnabled: true,
    manualHistoricalLow: ''
  })
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const { showError, showSuccess } = useAlert()

  useEffect(() => {
    if (show && game) {
      const newFormData = {
        gameName: game.name || '',
        thresholdType: game.price_threshold_type || 'price',
        priceThreshold: game.price_threshold?.toString() || '',
        discountThreshold: game.discount_threshold_percent?.toString() || '',
        gameEnabled: Boolean(game.enabled),
        alertEnabled: Boolean(game.alert_enabled),
        manualHistoricalLow: game.manual_historical_low?.toString() || ''
      }
      setFormData(newFormData)
      
      // Formの値を明示的に設定
      form.setFieldsValue({
        gameName: newFormData.gameName,
        thresholdType: newFormData.thresholdType,
        priceThreshold: newFormData.priceThreshold ? parseInt(newFormData.priceThreshold) : undefined,
        discountThreshold: newFormData.discountThreshold ? parseInt(newFormData.discountThreshold) : undefined,
        gameEnabled: newFormData.gameEnabled,
        alertEnabled: newFormData.alertEnabled,
        manualHistoricalLow: newFormData.manualHistoricalLow ? parseInt(newFormData.manualHistoricalLow) : undefined
      })
    }
  }, [show, game, form])

  const handleSubmit = async (values: any) => {
    if (!game) {return}

    const gameName = values.gameName?.trim()
    
    if (!gameName) {
      showError('ゲーム名は必須です')
      return
    }

    if (values.thresholdType === 'price' && values.priceThreshold && values.priceThreshold <= 0) {
      showError('価格閾値は0より大きい値を入力してください')
      return
    }

    if (values.thresholdType === 'discount' && values.discountThreshold) {
      if (values.discountThreshold < 1 || values.discountThreshold > 99) {
        showError('割引率は1-99の範囲で入力してください')
        return
      }
    }

    try {
      setLoading(true)
      
      const response = await api.put(`/games/${game.id}`, {
        name: gameName,
        price_threshold: values.thresholdType === 'price' ? values.priceThreshold || null : null,
        price_threshold_type: values.thresholdType,
        discount_threshold_percent: values.thresholdType === 'discount' ? values.discountThreshold || null : null,
        enabled: Boolean(values.gameEnabled),
        alert_enabled: Boolean(values.alertEnabled),
        manual_historical_low: values.manualHistoricalLow || null
      })

      if (response.success) {
        showSuccess(`${gameName} の設定を更新しました`)
        onHide()
        onGameUpdated()
      } else {
        showError('ゲーム設定の更新に失敗しました: ' + response.error)
      }
    } catch {
      showError('ゲーム設定の保存中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (!show || !game) {return null}

  return (
    <Modal
      title="ゲーム設定を編集"
      open={show}
      onCancel={onHide}
      footer={null}
      width={700}
    >
      <Form 
        form={form}
        onFinish={handleSubmit} 
        layout="vertical" 
        style={{ marginTop: 16 }}
        key={game?.id}
      >
        <Form.Item
          label="Steam App ID"
          help={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Steam App IDは変更できません
            </Typography.Text>
          }
        >
          <InputNumber
            style={{ width: '100%' }}
            value={game.steam_app_id}
            disabled
          />
        </Form.Item>

        <Form.Item 
          label="ゲーム名 *" 
          name="gameName"
          rules={[{ required: true, message: 'ゲーム名は必須です' }]}
        >
          <Input placeholder="ゲーム名を入力" />
        </Form.Item>

        <Form.Item label="アラート条件">
          <Radio.Group
            value={formData.thresholdType}
            onChange={(e) => setFormData(prev => ({ ...prev, thresholdType: e.target.value }))}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="price">価格閾値 - 指定した金額以下になったら通知</Radio>
              <Radio value="discount">割引率閾値 - 指定した割引率以上になったら通知</Radio>
              <Radio value="any_sale">セール開始 - 1円でも安くなったら通知</Radio>
            </Space>
          </Radio.Group>

          {formData.thresholdType === 'price' && (
            <div style={{ marginTop: 12 }}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="例: 2000"
                min={0}
                step={1}
                value={formData.priceThreshold ? parseInt(formData.priceThreshold) : undefined}
                onChange={(value) => setFormData(prev => ({ ...prev, priceThreshold: value?.toString() || '' }))}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                この金額以下になったときにアラートを送信
              </Typography.Text>
            </div>
          )}

          {formData.thresholdType === 'discount' && (
            <div style={{ marginTop: 12 }}>
              <InputNumber
                style={{ width: '100%' }}
                placeholder="例: 50"
                min={1}
                max={99}
                step={1}
                value={formData.discountThreshold ? parseInt(formData.discountThreshold) : undefined}
                onChange={(value) => setFormData(prev => ({ ...prev, discountThreshold: value?.toString() || '' }))}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                この割引率以上になったときにアラートを送信（%）
              </Typography.Text>
            </div>
          )}
        </Form.Item>

        <Form.Item>
          <Space direction="vertical">
            <Checkbox
              checked={formData.gameEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, gameEnabled: e.target.checked }))}
            >
              監視を有効にする
            </Checkbox>
            <Checkbox
              checked={formData.alertEnabled}
              onChange={(e) => setFormData(prev => ({ ...prev, alertEnabled: e.target.checked }))}
            >
              アラートを有効にする
            </Checkbox>
          </Space>
        </Form.Item>

        <Divider orientation="left">
          <Typography.Text strong>手動設定</Typography.Text>
        </Divider>
        
        <Form.Item
          label="手動最安値"
          help={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              APIの最安値より優先される手動設定の最安値
            </Typography.Text>
          }
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="例: 1000"
            min={0}
            step={1}
            value={formData.manualHistoricalLow ? parseInt(formData.manualHistoricalLow) : undefined}
            onChange={(value) => setFormData(prev => ({ ...prev, manualHistoricalLow: value?.toString() || '' }))}
          />
        </Form.Item>


        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onHide}>キャンセル</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  )
}