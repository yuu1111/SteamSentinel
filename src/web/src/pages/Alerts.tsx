import React, { useState, useEffect } from 'react'
import { Button, Select, Card, Timeline, Tag, Typography, Row, Col, Space, Spin, Empty, Badge, Avatar, Popconfirm } from 'antd'
import { 
  DeleteOutlined, 
  ClockCircleOutlined, 
  TrophyOutlined,
  TagOutlined,
  BellOutlined,
  GiftOutlined,
  RocketOutlined
} from '@ant-design/icons'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { AlertData } from '../types'
import { formatDateJP } from '../utils/dateUtils'

const { Title, Text } = Typography

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { showError, showSuccess } = useAlert()

  useEffect(() => {
    loadAlerts()
  }, [currentPage, filter])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        filter
      })
      
      const response = await api.get(`/alerts?${params}`)
      
      if (response.success && response.data) {
        setAlerts(response.data.alerts || [])
        setTotalPages(response.data.totalPages || 1)
      } else {
        showError('アラート履歴の取得に失敗しました')
      }
    } catch {
      showError('アラート履歴の読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const clearAllAlerts = async () => {
    try {
      const response = await api.delete('/alerts')
      
      if (response.success) {
        showSuccess('すべてのアラートを削除しました')
        setAlerts([])
      } else {
        showError('アラートの削除に失敗しました')
      }
    } catch {
      showError('アラート削除中にエラーが発生しました')
    }
  }

  const confirmClearAllAlerts = () => {
    clearAllAlerts()
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'new_low':
        return <TrophyOutlined />
      case 'sale_start':
        return <TagOutlined />
      case 'threshold_met':
        return <BellOutlined />
      case 'free_game':
        return <GiftOutlined />
      case 'game_released':
        return <RocketOutlined />
      default:
        return <BellOutlined />
    }
  }

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'new_low':
        return '新最安値'
      case 'sale_start':
        return 'セール開始'
      case 'threshold_met':
        return '価格閾値達成'
      case 'free_game':
        return '無料ゲーム'
      case 'game_released':
        return 'ゲームリリース'
      default:
        return 'アラート'
    }
  }

  const getAlertColor = (alertType: string) => {
    switch(alertType) {
      case 'new_low': return 'red'
      case 'sale_start': return 'green'
      case 'threshold_met': return 'orange'
      case 'free_game': return 'blue'
      case 'game_released': return 'purple'
      default: return 'default'
    }
  }

  const getAlertTagColor = (alertType: string) => {
    switch(alertType) {
      case 'new_low': return 'error'
      case 'sale_start': return 'success'
      case 'threshold_met': return 'warning'
      case 'free_game': return 'processing'
      case 'game_released': return 'purple'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return formatDateJP(dateString, 'datetime')
  }

  const openBackloggd = (gameName: string) => {
    // Backloggd uses URL-friendly game names
    const urlFriendlyName = gameName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    
    const url = `https://backloggd.com/games/${urlFriendlyName}/`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const renderPagination = () => {
    if (totalPages <= 1) {return null}

    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          type={currentPage === i ? 'primary' : 'default'}
          onClick={() => setCurrentPage(i)}
          size="small"
        >
          {i}
        </Button>
      )
    }

    return (
      <Space wrap style={{ justifyContent: 'center', width: '100%' }}>
        <Button 
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          size="small"
        >
          最初
        </Button>
        <Button 
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          size="small"
        >
          前へ
        </Button>
        {pages}
        <Button 
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          size="small"
        >
          次へ
        </Button>
        <Button 
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          size="small"
        >
          最後
        </Button>
      </Space>
    )
  }

  return (
    <Row gutter={[16, 16]} style={{ padding: '0 24px' }}>
      <Col span={24}>
        <Title level={2}>
          <Space>
            <ClockCircleOutlined />
            アラート履歴
          </Space>
        </Title>
      </Col>
      
      <Col span={24}>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                <Badge count={alerts.length} showZero color="#1890ff" style={{ marginLeft: 8 }}>
                  <span>通知履歴</span>
                </Badge>
              </Title>
            </Col>
            <Col>
              <Space>
                <Select
                  size="small"
                  value={filter}
                  onChange={(value) => {
                    setFilter(value)
                    setCurrentPage(1)
                  }}
                  style={{ width: 120 }}
                  options={[
                    { value: 'all', label: 'すべて' },
                    { value: 'new_low', label: '新最安値' },
                    { value: 'sale_start', label: 'セール開始' },
                    { value: 'threshold_met', label: '価格閾値達成' },
                    { value: 'free_game', label: '無料ゲーム' }
                  ]}
                />
                <Popconfirm
                  title="すべてのアラートを削除しますか？"
                  description="この操作は取り消せません。"
                  onConfirm={confirmClearAllAlerts}
                  okText="削除"
                  cancelText="キャンセル"
                  okButtonProps={{ danger: true }}
                >
                  <Button 
                    danger
                    icon={<DeleteOutlined />}
                    disabled={alerts.length === 0}
                  >
                    すべて削除
                  </Button>
                </Popconfirm>
              </Space>
            </Col>
          </Row>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <Text style={{ display: 'block', marginTop: 16 }}>
                読み込み中...
              </Text>
            </div>
          ) : alerts.length > 0 ? (
            <>
              <Timeline mode="left">
                {alerts.map(alert => {
                  const steamAppId = alert.steam_app_id || alert.game?.steam_app_id
                  const gameName = alert.game_name || alert.game?.name || 'ゲーム名不明'
                  
                  return (
                    <Timeline.Item 
                      key={alert.id}
                      color={getAlertColor(alert.alert_type)}
                      dot={
                        <Avatar 
                          size={24}
                          style={{ backgroundColor: getAlertColor(alert.alert_type) }}
                          icon={getAlertIcon(alert.alert_type)}
                        />
                      }
                    >
                      <div style={{ paddingBottom: 8 }}>
                        <Row justify="space-between" align="top">
                          <Col flex="auto">
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <div>
                                <Tag color={getAlertTagColor(alert.alert_type)} style={{ fontSize: 11 }}>
                                  {getAlertTypeLabel(alert.alert_type)}
                                </Tag>
                                <Text strong style={{ fontSize: 14 }}>{gameName}</Text>
                              </div>
                              
                              <Text style={{ fontSize: 13, color: '#666' }}>
                                {alert.message}
                              </Text>
                              
                              {alert.price_data && (
                                <Space size={4} wrap>
                                  <Tag style={{ fontSize: 11, margin: 0 }}>
                                    ¥{alert.price_data.current_price?.toLocaleString() || '不明'}
                                  </Tag>
                                  {alert.price_data.is_on_sale && alert.price_data.discount_percent > 0 && (
                                    <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                                      {alert.price_data.discount_percent}% OFF
                                    </Tag>
                                  )}
                                  {alert.price_data.original_price > 0 && (
                                    <Text type="secondary" delete style={{ fontSize: 11 }}>
                                      ¥{alert.price_data.original_price.toLocaleString()}
                                    </Text>
                                  )}
                                </Space>
                              )}
                              
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {formatDate(alert.created_at)}
                              </Text>
                            </Space>
                          </Col>
                          <Col style={{ marginLeft: 12 }}>
                            {steamAppId && (
                              <Space size={4}>
                                <Button
                                  type="text"
                                  size="small"
                                  href={`https://store.steampowered.com/app/${steamAppId}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: 11, padding: '0 4px', height: 20 }}
                                >
                                  Steam
                                </Button>
                                <Button
                                  type="text"
                                  size="small"
                                  href={`https://steamdb.info/app/${steamAppId}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: 11, padding: '0 4px', height: 20 }}
                                >
                                  SteamDB
                                </Button>
                                <Button
                                  type="text"
                                  size="small"
                                  onClick={() => openBackloggd(gameName)}
                                  style={{ fontSize: 11, padding: '0 4px', height: 20 }}
                                >
                                  Backloggd
                                </Button>
                              </Space>
                            )}
                          </Col>
                        </Row>
                      </div>
                    </Timeline.Item>
                  )
                })}
              </Timeline>
              
              <div style={{ marginTop: 24 }}>
                {renderPagination()}
              </div>
            </>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                filter === 'all' 
                  ? 'まだアラートが発生していません。ゲームを追加して監視を開始してください。'
                  : '選択したフィルターに該当するアラートがありません。'
              }
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}

export default Alerts