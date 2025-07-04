import React, { useState, useEffect } from 'react'
import { Button, Select, Card, Timeline, Tag, Typography, Row, Col, Space, Spin, Empty, Badge, Avatar, Popconfirm, theme } from 'antd'
import { 
  DeleteOutlined, 
  ClockCircleOutlined, 
  TrophyOutlined,
  TagOutlined,
  BellOutlined,
  GiftOutlined,
  RocketOutlined,
  FireOutlined,
  StarOutlined,
  DollarOutlined
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
  const { token } = theme.useToken()

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
        return <FireOutlined />
      case 'threshold_met':
        return <StarOutlined />
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
      case 'new_low': return token.colorError
      case 'sale_start': return token.colorSuccess
      case 'threshold_met': return token.colorWarning
      case 'free_game': return token.colorPrimary
      case 'game_released': return token.colorInfo
      default: return token.colorTextSecondary
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

  const getAlertGradient = (alertType: string) => {
    switch(alertType) {
      case 'new_low': return `linear-gradient(135deg, ${token.colorError}15, ${token.colorError}05)`
      case 'sale_start': return `linear-gradient(135deg, ${token.colorSuccess}15, ${token.colorSuccess}05)`
      case 'threshold_met': return `linear-gradient(135deg, ${token.colorWarning}15, ${token.colorWarning}05)`
      case 'free_game': return `linear-gradient(135deg, ${token.colorPrimary}15, ${token.colorPrimary}05)`
      case 'game_released': return `linear-gradient(135deg, ${token.colorInfo}15, ${token.colorInfo}05)`
      default: return `linear-gradient(135deg, ${token.colorFillSecondary}, ${token.colorFillTertiary})`
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
          size="middle"
          style={{
            fontWeight: 600,
            height: 36,
            minWidth: 36,
            borderRadius: token.borderRadius,
            boxShadow: currentPage === i ? `0 2px 4px ${token.colorPrimary}30` : 'none'
          }}
        >
          {i}
        </Button>
      )
    }

    return (
      <Space wrap size="middle" style={{ justifyContent: 'center', width: '100%' }}>
        <Button 
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          size="middle"
          style={{
            fontWeight: 500,
            height: 36,
            borderRadius: token.borderRadius
          }}
        >
          最初
        </Button>
        <Button 
          onClick={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
          size="middle"
          style={{
            fontWeight: 500,
            height: 36,
            borderRadius: token.borderRadius
          }}
        >
          前へ
        </Button>
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '0 12px',
          alignItems: 'center'
        }}>
          {pages}
        </div>
        <Button 
          onClick={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          size="middle"
          style={{
            fontWeight: 500,
            height: 36,
            borderRadius: token.borderRadius
          }}
        >
          次へ
        </Button>
        <Button 
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          size="middle"
          style={{
            fontWeight: 500,
            height: 36,
            borderRadius: token.borderRadius
          }}
        >
          最後
        </Button>
      </Space>
    )
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <div style={{ 
            background: `linear-gradient(135deg, ${token.colorPrimary}15, ${token.colorPrimary}05)`,
            borderRadius: token.borderRadiusLG,
            padding: '24px 28px',
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: `0 2px 8px ${token.colorFillSecondary}`,
          }}>
            <Title level={2} style={{ margin: 0, color: token.colorText }}>
              <Space>
                <ClockCircleOutlined style={{ color: token.colorPrimary }} />
                アラート履歴
              </Space>
            </Title>
            <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
              ゲーム価格の変動や重要なイベントの履歴を確認できます
            </Text>
          </div>
        </Col>
        
        <Col span={24}>
          <Card 
            style={{ 
              borderRadius: token.borderRadiusLG,
              boxShadow: `0 4px 16px ${token.colorFillSecondary}`,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
              <Col>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Title level={4} style={{ margin: 0, color: token.colorText }}>
                    通知履歴
                  </Title>
                  <Badge 
                    count={alerts.length} 
                    showZero 
                    color={token.colorPrimary} 
                    style={{ 
                      boxShadow: `0 2px 4px ${token.colorPrimary}20`
                    }}
                  />
                  <div style={{
                    width: 4,
                    height: 20,
                    background: `linear-gradient(to bottom, ${token.colorPrimary}, ${token.colorPrimary}60)`,
                    borderRadius: 2
                  }}></div>
                </div>
              </Col>
              <Col>
                <Space size="middle">
                  <Select
                    size="middle"
                    value={filter}
                    onChange={(value) => {
                      setFilter(value)
                      setCurrentPage(1)
                    }}
                    style={{ 
                      width: 140,
                      fontWeight: 500
                    }}
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
                      style={{ 
                        fontWeight: 500,
                        height: 36,
                        boxShadow: alerts.length > 0 ? `0 2px 4px ${token.colorError}20` : 'none'
                      }}
                    >
                      すべて削除
                    </Button>
                  </Popconfirm>
                </Space>
              </Col>
            </Row>
          
          {loading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 0',
              background: `linear-gradient(135deg, ${token.colorFillSecondary}, ${token.colorFillTertiary})`,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorBorderSecondary}`
            }}>
              <Spin size="large" />
              <Text style={{ display: 'block', marginTop: 16, color: token.colorTextSecondary }}>
                読み込み中...
              </Text>
            </div>
          ) : alerts.length > 0 ? (
            <>
              <div style={{ marginBottom: 24 }}>
                {alerts.map(alert => {
                  const steamAppId = alert.steam_app_id || alert.game?.steam_app_id
                  const gameName = alert.game_name || alert.game?.name || 'ゲーム名不明'
                  
                  return (
                    <div 
                      key={alert.id}
                      style={{
                        background: `linear-gradient(135deg, ${token.colorBgContainer}, ${token.colorFillQuaternary})`,
                        borderRadius: token.borderRadiusLG,
                        padding: '14px 18px',
                        marginBottom: 12,
                        border: `1px solid ${token.colorBorder}`,
                        boxShadow: `0 1px 4px ${token.colorFillSecondary}40`,
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = `0 4px 12px ${token.colorFillSecondary}60`
                        e.currentTarget.style.borderColor = token.colorPrimary
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = `0 1px 4px ${token.colorFillSecondary}40`
                        e.currentTarget.style.borderColor = token.colorBorder
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        background: `linear-gradient(to bottom, ${getAlertColor(alert.alert_type)}, ${getAlertColor(alert.alert_type)}60)`,
                        borderRadius: '0 2px 2px 0'
                      }}></div>
                      
                      <Row justify="space-between" align="middle">
                        <Col flex="auto">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: `linear-gradient(135deg, ${getAlertColor(alert.alert_type)}, ${getAlertColor(alert.alert_type)}80)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: token.colorBgContainer,
                              fontSize: 14,
                              fontWeight: 600,
                              boxShadow: `0 2px 6px ${getAlertColor(alert.alert_type)}30`,
                              flexShrink: 0
                            }}>
                              {getAlertIcon(alert.alert_type)}
                            </div>
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Tag 
                                  color={getAlertTagColor(alert.alert_type)} 
                                  style={{ 
                                    fontSize: 11, 
                                    fontWeight: 600,
                                    borderRadius: 4,
                                    margin: 0,
                                    padding: '2px 6px',
                                    lineHeight: 1.2
                                  }}
                                >
                                  {getAlertTypeLabel(alert.alert_type)}
                                </Tag>
                                <Text strong style={{ fontSize: 14, color: token.colorText, lineHeight: 1.2 }}>
                                  {gameName}
                                </Text>
                              </div>
                              
                              <Text style={{ 
                                fontSize: 13, 
                                color: token.colorTextSecondary,
                                display: 'block',
                                marginBottom: 6,
                                lineHeight: 1.3
                              }}>
                                {alert.message}
                              </Text>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {alert.price_data && (
                                  <Space size={6} wrap>
                                    <Tag 
                                      icon={<DollarOutlined />}
                                      style={{ 
                                        fontSize: 11, 
                                        fontWeight: 600,
                                        borderRadius: 4,
                                        margin: 0,
                                        background: `${token.colorSuccess}15`,
                                        borderColor: `${token.colorSuccess}40`,
                                        color: token.colorSuccess
                                      }}
                                    >
                                      ¥{alert.price_data.current_price?.toLocaleString() || '不明'}
                                    </Tag>
                                    {alert.price_data.is_on_sale && alert.price_data.discount_percent > 0 && (
                                      <Tag 
                                        color="success" 
                                        style={{ 
                                          fontSize: 11, 
                                          fontWeight: 600,
                                          borderRadius: 4,
                                          margin: 0,
                                          padding: '2px 6px'
                                        }}
                                      >
                                        {alert.price_data.discount_percent}% OFF
                                      </Tag>
                                    )}
                                    {alert.price_data.original_price > 0 && (
                                      <Text 
                                        type="secondary" 
                                        delete 
                                        style={{ 
                                          fontSize: 11,
                                          fontWeight: 500
                                        }}
                                      >
                                        ¥{alert.price_data.original_price.toLocaleString()}
                                      </Text>
                                    )}
                                  </Space>
                                )}
                                
                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
                                  {formatDate(alert.created_at)}
                                </Text>
                              </div>
                            </div>
                          </div>
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
                                style={{ 
                                  fontSize: 11, 
                                  padding: '3px 6px', 
                                  height: 24,
                                  fontWeight: 500,
                                  color: token.colorPrimary,
                                  borderRadius: 4
                                }}
                              >
                                Steam
                              </Button>
                              <Button
                                type="text"
                                size="small"
                                href={`https://steamdb.info/app/${steamAppId}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ 
                                  fontSize: 11, 
                                  padding: '3px 6px', 
                                  height: 24,
                                  fontWeight: 500,
                                  color: token.colorPrimary,
                                  borderRadius: 4
                                }}
                              >
                                SteamDB
                              </Button>
                              <Button
                                type="text"
                                size="small"
                                onClick={() => openBackloggd(gameName)}
                                style={{ 
                                  fontSize: 11, 
                                  padding: '3px 6px', 
                                  height: 24,
                                  fontWeight: 500,
                                  color: token.colorPrimary,
                                  borderRadius: 4
                                }}
                              >
                                Backloggd
                              </Button>
                            </Space>
                          )}
                        </Col>
                      </Row>
                    </div>
                  )
                })}
              </div>
              
              <div style={{ 
                marginTop: 32,
                padding: '20px 0',
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: `linear-gradient(135deg, ${token.colorFillTertiary}, ${token.colorFillSecondary})`,
                borderRadius: token.borderRadiusLG,
                display: 'flex',
                justifyContent: 'center'
              }}>
                {renderPagination()}
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '60px 40px',
              background: `linear-gradient(135deg, ${token.colorFillSecondary}, ${token.colorFillTertiary})`,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ marginTop: 16 }}>
                    <Text style={{ 
                      fontSize: 16, 
                      color: token.colorTextSecondary,
                      display: 'block',
                      marginBottom: 8
                    }}>
                      {filter === 'all' 
                        ? 'まだアラートが発生していません' 
                        : '選択したフィルターに該当するアラートがありません'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      {filter === 'all' 
                        ? 'ゲームを追加して監視を開始してください' 
                        : '他のフィルターを試してみてください'}
                    </Text>
                  </div>
                }
              />
            </div>
          )}
        </Card>
      </Col>
    </Row>
    </div>
  )
}

export default Alerts