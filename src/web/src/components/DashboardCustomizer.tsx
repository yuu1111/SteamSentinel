import React, { useState } from 'react'
import { Modal, Card, Typography, Tabs, Row, Col, Input, Select, Switch, Button, Space, Tag } from 'antd'
import { SettingOutlined, LayoutOutlined, AppstoreOutlined, BgColorsOutlined, SlidersFilled, SunOutlined, MoonOutlined, CheckCircleOutlined, DownloadOutlined, RedoOutlined, AlertOutlined, ShoppingCartOutlined, LineChartOutlined, FireOutlined } from '@ant-design/icons'
import { DashboardLayout, DashboardWidget, DashboardTheme, UserPreferences } from '../types'
import { useAlert } from '../contexts/AlertContext'

const { Text, Title } = Typography
const { TabPane } = Tabs
const { Option } = Select

interface DashboardCustomizerProps {
  show: boolean
  currentLayout?: DashboardLayout
  onLayoutChange?: (layout: DashboardLayout) => void
  onClose: () => void
}

export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  show,
  currentLayout,
  onLayoutChange,
  onClose
}) => {
  const [layout, setLayout] = useState<DashboardLayout>(
    currentLayout || getDefaultLayout()
  )
  const [activeTab, setActiveTab] = useState<'layout' | 'widgets' | 'theme' | 'preferences'>('layout')
  const [themes] = useState<DashboardTheme[]>(getAvailableThemes())
  const [preferences, setPreferences] = useState<UserPreferences>(getDefaultPreferences())
  const { showSuccess, showError } = useAlert()

  function getDefaultLayout(): DashboardLayout {
    return {
      id: 'default',
      name: 'デフォルトレイアウト',
      description: 'SteamSentinelの標準ダッシュボードレイアウト',
      widgets: [
        {
          id: 'statistics',
          type: 'statistics',
          title: '統計カード',
          size: 'large',
          position: { x: 0, y: 0, w: 12, h: 2 },
          isVisible: true
        },
        {
          id: 'charts',
          type: 'charts',
          title: '分析チャート',
          size: 'large',
          position: { x: 0, y: 2, w: 12, h: 4 },
          isVisible: true
        },
        {
          id: 'roi',
          type: 'roi',
          title: 'ROI分析',
          size: 'large',
          position: { x: 0, y: 6, w: 12, h: 3 },
          isVisible: true
        },
        {
          id: 'budget',
          type: 'budget',
          title: '予算管理',
          size: 'large',
          position: { x: 0, y: 9, w: 12, h: 4 },
          isVisible: true
        },
        {
          id: 'alerts',
          type: 'alerts',
          title: '支出アラート',
          size: 'large',
          position: { x: 0, y: 13, w: 12, h: 3 },
          isVisible: true
        },
        {
          id: 'purchases',
          type: 'purchases',
          title: '購入履歴',
          size: 'medium',
          position: { x: 0, y: 16, w: 12, h: 2 },
          isVisible: true
        },
        {
          id: 'high_discount',
          type: 'high_discount',
          title: '高割引ゲーム',
          size: 'large',
          position: { x: 0, y: 18, w: 12, h: 3 },
          isVisible: true
        }
      ],
      theme: 'auto',
      colorScheme: 'blue',
      isDefault: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  function getAvailableThemes(): DashboardTheme[] {
    return [
      {
        id: 'blue',
        name: 'ブルー',
        colors: {
          primary: '#1890ff',
          secondary: '#6c757d',
          success: '#52c41a',
          warning: '#faad14',
          danger: '#f5222d',
          info: '#13c2c2',
          background: '#ffffff',
          surface: '#f5f5f5',
          text: '#262626'
        }
      },
      {
        id: 'green',
        name: 'グリーン',
        colors: {
          primary: '#52c41a',
          secondary: '#6c757d',
          success: '#73d13d',
          warning: '#faad14',
          danger: '#f5222d',
          info: '#13c2c2',
          background: '#ffffff',
          surface: '#f5f5f5',
          text: '#262626'
        }
      },
      {
        id: 'dark',
        name: 'ダーク',
        colors: {
          primary: '#722ed1',
          secondary: '#6c757d',
          success: '#52c41a',
          warning: '#faad14',
          danger: '#f5222d',
          info: '#13c2c2',
          background: '#141414',
          surface: '#1f1f1f',
          text: '#ffffff'
        }
      }
    ]
  }

  function getDefaultPreferences(): UserPreferences {
    return {
      id: 'default',
      userId: 'user1',
      dashboard: {
        defaultView: 'overview',
        autoRefresh: false,
        refreshInterval: 300,
        compactMode: false
      },
      notifications: {
        budget_alerts: true,
        spending_alerts: true,
        milestone_alerts: true,
        email_notifications: false,
        sound_enabled: true
      },
      display: {
        theme: 'auto',
        language: 'ja',
        currency: 'JPY',
        dateFormat: 'YYYY/MM/DD',
        numberFormat: 'ja-JP'
      },
      privacy: {
        analytics_enabled: true,
        crash_reporting: true,
        usage_statistics: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  const getWidgetTypeIcon = (type: DashboardWidget['type']) => {
    switch (type) {
      case 'statistics': return <AppstoreOutlined />
      case 'charts': return <BgColorsOutlined />
      case 'roi': return <SlidersFilled />
      case 'budget': return <SettingOutlined />
      case 'alerts': return <AlertOutlined />
      case 'purchases': return <ShoppingCartOutlined />
      case 'trends': return <LineChartOutlined />
      case 'high_discount': return <FireOutlined />
      default: return <AppstoreOutlined />
    }
  }

  const getWidgetTypeName = (type: DashboardWidget['type']) => {
    switch (type) {
      case 'statistics': return '統計カード'
      case 'charts': return '分析チャート'
      case 'roi': return 'ROI分析'
      case 'budget': return '予算管理'
      case 'alerts': return '支出アラート'
      case 'purchases': return '購入履歴'
      case 'trends': return 'トレンド分析'
      case 'high_discount': return '高割引ゲーム'
      default: return 'ウィジェット'
    }
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, isVisible: !widget.isVisible } : widget
      )
    }))
  }

  const updateWidgetSize = (widgetId: string, size: DashboardWidget['size']) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, size } : widget
      )
    }))
  }

  const saveLayout = () => {
    try {
      const updatedLayout = {
        ...layout,
        updated_at: new Date().toISOString()
      }
      
      if (onLayoutChange) {
        onLayoutChange(updatedLayout)
      }
      
      localStorage.setItem('dashboard_layout', JSON.stringify(updatedLayout))
      localStorage.setItem('user_preferences', JSON.stringify(preferences))
      
      showSuccess('ダッシュボード設定を保存しました')
      onClose()
    } catch (error) {
      showError('設定の保存に失敗しました')
    }
  }

  const resetToDefault = () => {
    setLayout(getDefaultLayout())
    setPreferences(getDefaultPreferences())
    showSuccess('デフォルト設定にリセットしました')
  }

  const exportSettings = () => {
    const settings = {
      layout,
      preferences,
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `steamsentinel-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showSuccess('設定をエクスポートしました')
  }

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          ダッシュボード カスタマイズ
        </Space>
      }
      open={show}
      onCancel={onClose}
      footer={[
        <Space key="actions">
          <Button icon={<DownloadOutlined />} onClick={exportSettings}>
            エクスポート
          </Button>
          <Button icon={<RedoOutlined />} onClick={resetToDefault}>
            リセット
          </Button>
          <Button onClick={onClose}>
            キャンセル
          </Button>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={saveLayout}>
            保存
          </Button>
        </Space>
      ]}
      width={1000}
    >
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as any)}>
        <TabPane
          tab={
            <Space>
              <LayoutOutlined />
              レイアウト
            </Space>
          }
          key="layout"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>レイアウト情報</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Text>レイアウト名</Text>
                <Input
                  value={layout.name}
                  onChange={(e) => setLayout(prev => ({ ...prev, name: e.target.value }))}
                  style={{ marginTop: 8 }}
                />
              </Col>
              <Col span={12}>
                <Text>説明</Text>
                <Input
                  value={layout.description || ''}
                  onChange={(e) => setLayout(prev => ({ ...prev, description: e.target.value }))}
                  style={{ marginTop: 8 }}
                />
              </Col>
            </Row>
            
            <Title level={5}>レイアウトプレビュー</Title>
            <Card style={{ backgroundColor: '#fafafa', minHeight: '400px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {layout.widgets
                  .filter(widget => widget.isVisible)
                  .sort((a, b) => a.position.y - b.position.y)
                  .map(widget => (
                    <Card key={widget.id} size="small" style={{ 
                      height: widget.size === 'small' ? '60px' : widget.size === 'medium' ? '120px' : '180px'
                    }}>
                      <Space>
                        {getWidgetTypeIcon(widget.type)}
                        <div>
                          <Text strong>{widget.title}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {getWidgetTypeName(widget.type)}
                          </Text>
                        </div>
                      </Space>
                    </Card>
                  ))}
              </Space>
            </Card>
          </Space>
        </TabPane>

        <TabPane
          tab={
            <Space>
              <AppstoreOutlined />
              ウィジェット
            </Space>
          }
          key="widgets"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>ウィジェット設定</Title>
            <Row gutter={[16, 16]}>
              {layout.widgets.map(widget => (
                <Col key={widget.id} xs={24} lg={12}>
                  <Card>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Space>
                            {getWidgetTypeIcon(widget.type)}
                            <Text strong>{widget.title}</Text>
                          </Space>
                        </Col>
                        <Col>
                          <Switch
                            checked={widget.isVisible}
                            onChange={() => toggleWidgetVisibility(widget.id)}
                          />
                        </Col>
                      </Row>
                      
                      <div>
                        <Text>サイズ</Text>
                        <Select
                          value={widget.size}
                          onChange={(value) => updateWidgetSize(widget.id, value)}
                          style={{ width: '100%', marginTop: 8 }}
                        >
                          <Option value="small">小</Option>
                          <Option value="medium">中</Option>
                          <Option value="large">大</Option>
                          <Option value="full">全幅</Option>
                        </Select>
                      </div>
                      
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {getWidgetTypeName(widget.type)}
                      </Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Space>
        </TabPane>

        <TabPane
          tab={
            <Space>
              <BgColorsOutlined />
              テーマ
            </Space>
          }
          key="theme"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>カラーテーマ</Title>
            <Row gutter={[16, 16]}>
              {themes.map(theme => (
                <Col key={theme.id} xs={24} lg={8}>
                  <Card
                    hoverable
                    style={{
                      borderColor: layout.colorScheme === theme.id ? '#1890ff' : undefined,
                      borderWidth: layout.colorScheme === theme.id ? 2 : undefined
                    }}
                    onClick={() => setLayout(prev => ({ ...prev, colorScheme: theme.id }))}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text strong>{theme.name}</Text>
                      <Row>
                        {Object.entries(theme.colors).slice(0, 6).map(([key, color]) => (
                          <Col key={key} span={4}>
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: color,
                                borderRadius: '3px',
                                border: '1px solid #d9d9d9'
                              }}
                              title={key}
                            />
                          </Col>
                        ))}
                      </Row>
                      {layout.colorScheme === theme.id && (
                        <Tag color="blue" icon={<CheckCircleOutlined />}>
                          選択中
                        </Tag>
                      )}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
            
            <Title level={5}>テーマモード</Title>
            <Space size="large">
              <Button
                type={layout.theme === 'light' ? 'primary' : 'default'}
                icon={<SunOutlined />}
                onClick={() => setLayout(prev => ({ ...prev, theme: 'light' }))}
              >
                ライト
              </Button>
              <Button
                type={layout.theme === 'dark' ? 'primary' : 'default'}
                icon={<MoonOutlined />}
                onClick={() => setLayout(prev => ({ ...prev, theme: 'dark' }))}
              >
                ダーク
              </Button>
              <Button
                type={layout.theme === 'auto' ? 'primary' : 'default'}
                onClick={() => setLayout(prev => ({ ...prev, theme: 'auto' }))}
              >
                自動
              </Button>
            </Space>
          </Space>
        </TabPane>

        <TabPane
          tab={
            <Space>
              <SlidersFilled />
              設定
            </Space>
          }
          key="preferences"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>ダッシュボード設定</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Text>デフォルトビュー</Text>
                <Select
                  value={preferences.dashboard.defaultView}
                  onChange={(value) => setPreferences(prev => ({
                    ...prev,
                    dashboard: { ...prev.dashboard, defaultView: value as any }
                  }))}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <Option value="overview">概要</Option>
                  <Option value="monitoring">監視統計</Option>
                  <Option value="expenses">出費分析</Option>
                </Select>
              </Col>
              <Col span={12}>
                <Text>自動更新間隔 (秒)</Text>
                <Input
                  type="number"
                  value={preferences.dashboard.refreshInterval}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    dashboard: { ...prev.dashboard, refreshInterval: parseInt(e.target.value) || 300 }
                  }))}
                  style={{ marginTop: 8 }}
                />
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Space>
                  <Text>自動更新を有効化</Text>
                  <Switch
                    checked={preferences.dashboard.autoRefresh}
                    onChange={(checked) => setPreferences(prev => ({
                      ...prev,
                      dashboard: { ...prev.dashboard, autoRefresh: checked }
                    }))}
                  />
                </Space>
              </Col>
              <Col span={12}>
                <Space>
                  <Text>コンパクトモード</Text>
                  <Switch
                    checked={preferences.dashboard.compactMode}
                    onChange={(checked) => setPreferences(prev => ({
                      ...prev,
                      dashboard: { ...prev.dashboard, compactMode: checked }
                    }))}
                  />
                </Space>
              </Col>
            </Row>

            <Title level={5}>通知設定</Title>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Space direction="vertical">
                  <Space>
                    <Text>予算アラート</Text>
                    <Switch
                      checked={preferences.notifications.budget_alerts}
                      onChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, budget_alerts: checked }
                      }))}
                    />
                  </Space>
                  <Space>
                    <Text>支出アラート</Text>
                    <Switch
                      checked={preferences.notifications.spending_alerts}
                      onChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, spending_alerts: checked }
                      }))}
                    />
                  </Space>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical">
                  <Space>
                    <Text>マイルストーン通知</Text>
                    <Switch
                      checked={preferences.notifications.milestone_alerts}
                      onChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, milestone_alerts: checked }
                      }))}
                    />
                  </Space>
                  <Space>
                    <Text>サウンド通知</Text>
                    <Switch
                      checked={preferences.notifications.sound_enabled}
                      onChange={(checked) => setPreferences(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, sound_enabled: checked }
                      }))}
                    />
                  </Space>
                </Space>
              </Col>
            </Row>
          </Space>
        </TabPane>
      </Tabs>
    </Modal>
  )
}