import React, { useState, useEffect } from 'react'
import { Card, Form, InputNumber, Switch, Button, Space, Typography, Alert, Row, Col, Select, Divider } from 'antd'
import { SaveOutlined, ReloadOutlined, FilterOutlined } from '@ant-design/icons'
import { useAlert } from '../contexts/AlertContext'

const { Title, Text } = Typography
const { Option } = Select

interface ITADSettingItem {
  id: number
  name: string
  value: string
  description: string
  category: string
  updated_at: string
}

interface ITADSettingsProps {
  onSettingsChange?: () => void
}

export const ITADSettings: React.FC<ITADSettingsProps> = ({ onSettingsChange }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [settings, setSettings] = useState<ITADSettingItem[]>([])
  const { showError, showSuccess } = useAlert()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/itad/settings')
      
      if (!response.ok) {
        throw new Error('設定の取得に失敗しました')
      }
      
      const data = await response.json()
      setSettings(data)
      
      // フォームに現在の設定値を設定
      const formValues: any = {}
      data.forEach((setting: ITADSettingItem) => {
        if (setting.name === 'enabled' || setting.name === 'discord_notifications_enabled') {
          formValues[setting.name] = setting.value === 'true'
        } else {
          formValues[setting.name] = setting.name.includes('discount') ? 
            parseInt(setting.value) : 
            setting.name.includes('price') || setting.name.includes('limit') ? 
            parseInt(setting.value) : setting.value
        }
      })
      
      form.setFieldsValue(formValues)
    } catch (error) {
      console.error('Failed to load ITAD settings:', error)
      showError('ITAD設定の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      setSaveLoading(true)
      
      // 設定値を更新
      const updates = Object.entries(values).map(([name, value]) => ({
        name,
        value: String(value)
      }))
      
      const response = await fetch('/api/v1/itad/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: updates })
      })
      
      if (!response.ok) {
        throw new Error('設定の保存に失敗しました')
      }
      
      showSuccess('ITAD設定を保存しました')
      await loadSettings()
      
      if (onSettingsChange) {
        onSettingsChange()
      }
    } catch (error) {
      console.error('Failed to save ITAD settings:', error)
      showError('ITAD設定の保存に失敗しました')
    } finally {
      setSaveLoading(false)
    }
  }

  const resetToDefaults = async () => {
    try {
      setSaveLoading(true)
      
      const response = await fetch('/api/v1/itad/settings/reset', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('デフォルト設定への復元に失敗しました')
      }
      
      showSuccess('設定をデフォルトに復元しました')
      await loadSettings()
      
      if (onSettingsChange) {
        onSettingsChange()
      }
    } catch (error) {
      console.error('Failed to reset ITAD settings:', error)
      showError('デフォルト設定への復元に失敗しました')
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          <Title level={4} style={{ margin: 0 }}>高割引ゲーム検知設定</Title>
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadSettings}
            loading={loading}
          >
            更新
          </Button>
          <Button 
            onClick={resetToDefaults}
            loading={saveLoading}
          >
            デフォルトに復元
          </Button>
        </Space>
      }
      loading={loading}
    >
      <Alert
        message="高割引ゲーム検知設定"
        description="IsThereAnyDeal APIを使用した高割引ゲームの検知条件を設定できます。設定変更後は次回の自動検知から適用されます。"
        type="info"
        style={{ marginBottom: 24 }}
        showIcon
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          enabled: true,
          min_discount: 50,
          max_price: 3000,
          limit: 50,
          region: 'jp',
          discord_notifications_enabled: true
        }}
      >
        <Row gutter={[24, 16]}>
          {/* 基本設定 */}
          <Col span={24}>
            <Divider orientation="left">基本設定</Divider>
          </Col>
          
          <Col xs={24} md={12}>
            <Form.Item
              name="enabled"
              label="高割引ゲーム検知"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="有効" 
                unCheckedChildren="無効"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="discord_notifications_enabled"
              label="Discord通知"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="有効" 
                unCheckedChildren="無効"
              />
            </Form.Item>
          </Col>

          {/* フィルター条件 */}
          <Col span={24}>
            <Divider orientation="left">フィルター条件</Divider>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="min_discount"
              label="最小割引率 (%)"
              rules={[
                { required: true, message: '最小割引率を入力してください' },
                { type: 'number', min: 1, max: 99, message: '1-99の値を入力してください' }
              ]}
            >
              <InputNumber
                min={1}
                max={99}
                style={{ width: '100%' }}
                addonAfter="%"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="max_price"
              label="最大価格 (円)"
              rules={[
                { required: true, message: '最大価格を入力してください' },
                { type: 'number', min: 100, max: 50000, message: '100-50000の値を入力してください' }
              ]}
            >
              <InputNumber
                min={100}
                max={50000}
                style={{ width: '100%' }}
                addonAfter="円"
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/\$\s?|(,*)/g, '') as any}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="limit"
              label="取得件数"
              rules={[
                { required: true, message: '取得件数を入力してください' },
                { type: 'number', min: 10, max: 100, message: '10-100の値を入力してください' }
              ]}
            >
              <InputNumber
                min={10}
                max={100}
                style={{ width: '100%' }}
                addonAfter="件"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="region"
              label="地域"
              rules={[{ required: true, message: '地域を選択してください' }]}
            >
              <Select style={{ width: '100%' }}>
                <Option value="jp">日本 (JP)</Option>
                <Option value="us">アメリカ (US)</Option>
                <Option value="eu">ヨーロッパ (EU)</Option>
                <Option value="uk">イギリス (UK)</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Row justify="end">
          <Col>
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                設定は自動的に保存され、次回の検知から適用されます
              </Text>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={saveLoading}
              >
                設定を保存
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      {settings.length > 0 && (
        <>
          <Divider />
          <Row>
            <Col span={24}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                最終更新: {settings[0]?.updated_at ? new Date(settings[0].updated_at).toLocaleString('ja-JP') : '不明'}
              </Text>
            </Col>
          </Row>
        </>
      )}
    </Card>
  )
}