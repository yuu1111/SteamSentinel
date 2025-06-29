import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Button, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Alert, 
  Form, 
  Select, 
  Input, 
  Checkbox, 
  Table, 
  Tag, 
  Spin,
  Badge,
  notification
} from 'antd'
import { 
  SettingOutlined,
  WifiOutlined,
  TrophyOutlined,
  FireOutlined,
  GiftOutlined,
  PlayCircleOutlined,
  BellOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

const { Title, Text, Paragraph } = Typography

interface SystemInfo {
  nodeVersion: string
  platform: string
  databasePath: string
  environment: string
}

interface ApiKeyStatus {
  steamApiKey: boolean
  discordWebhook: boolean
  itadApiKey: boolean
  igdbClientId: boolean
  igdbClientSecret: boolean
  youtubeApiKey: boolean
  twitchClientId: boolean
  twitchClientSecret: boolean
}

interface DiscordStatus {
  configured: boolean
  message: string
}

const Test: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null)
  const [discordStatus, setDiscordStatus] = useState<DiscordStatus | null>(null)
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testLoading, setTestLoading] = useState<string | null>(null)
  const { showError, showSuccess, showInfo } = useAlert()
  const [form] = Form.useForm()

  useEffect(() => {
    loadSettingsData()
  }, [])

  const loadSettingsData = async () => {
    try {
      setLoading(true)
      
      const [systemResponse, apiResponse, discordResponse, gamesResponse] = await Promise.all([
        api.get('/system/info'),
        api.get('/system/api-status'),
        api.get('/system/discord-status'),
        api.get('/games?enabled=all')
      ])

      if (systemResponse.success) setSystemInfo(systemResponse.data)
      if (apiResponse.success) setApiKeyStatus(apiResponse.data)
      if (discordResponse.success) setDiscordStatus(discordResponse.data)
      if (gamesResponse.success) setGames(gamesResponse.data || [])
    } catch {
      showError('設定データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const testDiscord = async (testType: string) => {
    try {
      setTestLoading(testType)
      showInfo(`Discord ${testType} テストを実行中...`)
      
      const response = await api.post('/system/test-discord', { type: testType })
      
      if (response.success) {
        showSuccess('Discordテストメッセージを送信しました')
      } else {
        showError('Discordテストに失敗しました: ' + response.error)
      }
    } catch {
      showError('Discordテスト中にエラーが発生しました')
    } finally {
      setTestLoading(null)
    }
  }

  const testPriceAlert = async (values: any) => {
    try {
      const response = await api.post('/system/test-price-alert', {
        gameId: values.gameId,
        alertType: values.alertType,
        testPrice: parseFloat(values.testPrice),
        sendDiscord: values.sendDiscord
      })
      
      if (response.success) {
        notification.success({
          message: 'テスト完了',
          description: '価格アラートテストが完了しました'
        })
        form.resetFields()
      } else {
        notification.error({
          message: 'テスト失敗',
          description: `価格アラートテストに失敗しました: ${response.error}`
        })
      }
    } catch {
      notification.error({
        message: 'エラー',
        description: '価格アラートテスト中にエラーが発生しました'
      })
    }
  }

  const runManualMonitoring = async () => {
    try {
      setTestLoading('monitoring')
      
      const response = await api.post('/monitoring/run')
      
      if (response.success) {
        notification.success({
          message: '監視開始',
          description: '手動監視を開始しました'
        })
      } else {
        notification.error({
          message: '監視失敗',
          description: `手動監視に失敗しました: ${response.error}`
        })
      }
    } catch {
      notification.error({
        message: 'エラー',
        description: '手動監視中にエラーが発生しました'
      })
    } finally {
      setTestLoading(null)
    }
  }

  // System information table columns
  const systemColumns = [
    {
      title: '項目',
      dataIndex: 'key',
      key: 'key',
      width: '40%'
    },
    {
      title: '値',
      dataIndex: 'value',
      key: 'value'
    }
  ]

  const systemData = systemInfo ? [
    { key: 'Node.js バージョン', value: systemInfo.nodeVersion },
    { key: 'プラットフォーム', value: systemInfo.platform },
    { key: '環境', value: systemInfo.environment },
    { key: 'データベース', value: systemInfo.databasePath }
  ] : []

  // API status data
  const apiStatusData = apiKeyStatus ? [
    {
      key: 'itad',
      name: 'ITAD API Key',
      description: '必須',
      status: apiKeyStatus.itadApiKey,
      type: 'required'
    },
    {
      key: 'steam',
      name: 'Steam API Key',
      description: '推奨',
      status: apiKeyStatus.steamApiKey,
      type: 'recommended'
    },
    {
      key: 'discord',
      name: 'Discord Webhook',
      description: 'オプション',
      status: apiKeyStatus.discordWebhook,
      type: 'optional'
    },
    {
      key: 'igdb',
      name: 'IGDB API',
      description: 'オプション - レビュー機能',
      status: apiKeyStatus.igdbClientId && apiKeyStatus.igdbClientSecret,
      type: 'optional'
    },
    {
      key: 'youtube',
      name: 'YouTube API Key',
      description: 'オプション',
      status: apiKeyStatus.youtubeApiKey,
      type: 'optional'
    },
    {
      key: 'twitch',
      name: 'Twitch API',
      description: 'オプション',
      status: apiKeyStatus.twitchClientId && apiKeyStatus.twitchClientSecret,
      type: 'optional'
    }
  ] : []

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>設定データを読み込み中...</Text>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <SettingOutlined style={{ marginRight: 8 }} />
        テスト
      </Title>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Discord Integration Section */}
        <Card 
          title={
            <Space>
              <Badge 
                status={discordStatus?.configured ? 'success' : 'warning'} 
                text="Discord連携"
              />
            </Space>
          }
          extra={
            discordStatus?.configured ? (
              <Tag color="success">設定済み</Tag>
            ) : (
              <Tag color="warning">未設定</Tag>
            )
          }
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Title level={4}>設定状況</Title>
              <Alert
                type={discordStatus?.configured ? 'success' : 'warning'}
                message={discordStatus?.message || 'Discord設定を確認中...'}
                icon={discordStatus?.configured ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                style={{ marginBottom: 16 }}
              />
              
              <Title level={5}>Discord Webhook URL設定</Title>
              <Paragraph type="secondary">
                Discord Webhook URLは環境変数 <Text code>DISCORD_WEBHOOK_URL</Text> で設定してください。<br />
                設定方法については、README.mdの「Discord Webhook (オプション)」セクションを参照してください。
              </Paragraph>
            </Col>
            
            <Col xs={24} md={12}>
              <Title level={4}>テスト</Title>
              <Paragraph type="secondary">
                各種Discord通知のテストメッセージを送信できます。
              </Paragraph>
              
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Button
                    type="primary"
                    icon={<WifiOutlined />}
                    loading={testLoading === 'connection'}
                    onClick={() => testDiscord('connection')}
                    block
                    size="large"
                  >
                    接続テスト
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    type="primary"
                    icon={<TrophyOutlined />}
                    loading={testLoading === 'price_alert'}
                    onClick={() => testDiscord('price_alert')}
                    block
                    size="large"
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  >
                    価格アラート
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    type="primary"
                    icon={<FireOutlined />}
                    loading={testLoading === 'high_discount'}
                    onClick={() => testDiscord('high_discount')}
                    block
                    size="large"
                    style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                  >
                    高割引ゲーム
                  </Button>
                </Col>
                <Col span={12}>
                  <Button
                    type="primary"
                    icon={<GiftOutlined />}
                    loading={testLoading === 'epic_free'}
                    onClick={() => testDiscord('epic_free')}
                    block
                    size="large"
                    style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}
                  >
                    Epic無料ゲーム
                  </Button>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* Manual Monitoring Section */}
        <Card 
          title={
            <Space>
              <ThunderboltOutlined />
              手動監視
            </Space>
          }
        >
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} md={16}>
              <Title level={4}>価格監視の実行</Title>
              <Paragraph>
                登録されているすべてのゲームの価格情報を手動で更新します。<br />
                通常は自動で定期実行されますが、即座に最新の価格情報を取得したい場合にご利用ください。
              </Paragraph>
              
              <Alert
                type="info"
                message="手動監視の実行には時間がかかる場合があります。実行中は他の操作をお控えください。"
                showIcon
              />
            </Col>
            
            <Col xs={24} md={8}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                loading={testLoading === 'monitoring'}
                onClick={runManualMonitoring}
                block
                style={{ height: '60px', fontSize: '16px' }}
              >
                手動監視を実行
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Price Alert Test Section */}
        <Card 
          title={
            <Space>
              <BellOutlined />
              価格アラートテスト
            </Space>
          }
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Title level={4}>手動価格アラートテスト</Title>
              <Paragraph type="secondary">
                特定のゲームでアラート条件を満たした場合のシミュレーションを実行できます。
              </Paragraph>
              
              <Form
                form={form}
                layout="vertical"
                onFinish={testPriceAlert}
                size="large"
              >
                <Form.Item
                  label="テストするゲーム"
                  name="gameId"
                  rules={[{ required: true, message: 'ゲームを選択してください' }]}
                >
                  <Select placeholder="ゲームを選択..." showSearch>
                    {games.map(game => (
                      <Select.Option key={game.id} value={game.id}>
                        {game.name} (ID: {game.steam_app_id})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                
                <Form.Item
                  label="アラートタイプ"
                  name="alertType"
                  initialValue="new_low"
                  rules={[{ required: true }]}
                >
                  <Select>
                    <Select.Option value="new_low">新最安値更新</Select.Option>
                    <Select.Option value="sale_start">セール開始</Select.Option>
                    <Select.Option value="threshold_met">価格閾値達成</Select.Option>
                  </Select>
                </Form.Item>
                
                <Form.Item
                  label="テスト価格（円）"
                  name="testPrice"
                  rules={[{ required: true, message: 'テスト価格を入力してください' }]}
                >
                  <Input 
                    type="number"
                    placeholder="例: 2980"
                    min={0}
                    step={1}
                    addonAfter="円"
                  />
                </Form.Item>
                
                <Form.Item name="sendDiscord" valuePropName="checked">
                  <Checkbox>Discord通知も送信する（Discord設定が必要）</Checkbox>
                </Form.Item>
                
                <Form.Item>
                  <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />} size="large">
                    アラートテスト実行
                  </Button>
                </Form.Item>
              </Form>
            </Col>
            
            <Col xs={24} md={12}>
              <Title level={4}>テスト結果</Title>
              <Card 
                style={{ backgroundColor: '#fafafa', textAlign: 'center', minHeight: '200px' }}
                bodyStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Space direction="vertical">
                  <InfoCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <Text type="secondary">テストを実行すると結果がここに表示されます</Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* System Information Section */}
        <Card 
          title={
            <Space>
              <InfoCircleOutlined />
              システム情報
            </Space>
          }
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Title level={4}>環境設定</Title>
              <Table
                columns={systemColumns}
                dataSource={systemData}
                pagination={false}
                size="small"
                bordered
              />
            </Col>
            
            <Col xs={24} lg={12}>
              <Title level={4}>APIキー設定状況</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                {apiStatusData.map(item => (
                  <Card 
                    key={item.key}
                    size="small"
                    style={{ 
                      borderLeft: `4px solid ${
                        item.status 
                          ? '#52c41a' 
                          : item.type === 'required' 
                            ? '#ff4d4f' 
                            : item.type === 'recommended'
                              ? '#fa8c16'
                              : '#d9d9d9'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong>{item.name}</Text>
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            ({item.description})
                          </Text>
                        </div>
                      </div>
                      <Tag 
                        color={
                          item.status 
                            ? 'success' 
                            : item.type === 'required' 
                              ? 'error' 
                              : 'warning'
                        }
                      >
                        {item.status ? '設定済み' : '未設定'}
                      </Tag>
                    </div>
                  </Card>
                ))}
              </Space>
            </Col>
          </Row>
        </Card>
      </Space>
    </div>
  )
}

export default Test