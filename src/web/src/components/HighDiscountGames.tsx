import React, { useState, useEffect } from 'react'
import { Card, List, Typography, Tag, Button, Space, Spin, Empty, Tooltip, Row, Col, Pagination } from 'antd'
import { FireOutlined, SyncOutlined, ShopOutlined, StarOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { HighDiscountGame, HighDiscountData } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

const { Text, Title } = Typography

interface HighDiscountGamesProps {
  showTitle?: boolean
  maxItems?: number
  type?: 'standard' | 'popular'
}

export const HighDiscountGames: React.FC<HighDiscountGamesProps> = ({
  showTitle = true,
  maxItems,
  type = 'standard'
}) => {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<HighDiscountData | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(10)
  const { showError, showSuccess } = useAlert()

  useEffect(() => {
    loadHighDiscountGames()
  }, [type])

  const loadHighDiscountGames = async () => {
    try {
      setLoading(true)
      const response = await api.get<HighDiscountData>(`/games/highDiscount?type=${type}`)
      
      if (response.success && response.data) {
        setData(response.data)
      } else {
        showError('高割引ゲームの読み込みに失敗しました')
      }
    } catch (error) {
      console.error('Failed to load high discount games:', error)
      showError('高割引ゲームの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const refreshHighDiscountGames = async () => {
    try {
      setRefreshing(true)
      const response = await api.post<HighDiscountGame[]>('/games/highDiscount/detect', { type })
      
      if (response.success && response.data) {
        showSuccess(`${response.data.length}件の高割引ゲームを発見しました`)
        await loadHighDiscountGames() // データを再読み込み
      } else {
        showError('高割引ゲームの検知に失敗しました')
      }
    } catch (error) {
      console.error('Failed to refresh high discount games:', error)
      showError('高割引ゲーム検知中にエラーが発生しました')
    } finally {
      setRefreshing(false)
    }
  }

  const openSteamStore = (steamAppId: number) => {
    window.open(`https://store.steampowered.com/app/${steamAppId}/`, '_blank', 'noopener,noreferrer')
  }

  const formatPrice = (price: number): string => {
    return `¥${price.toLocaleString()}`
  }

  const getDiscountColor = (discount: number): string => {
    if (discount >= 90) return 'red'
    if (discount >= 80) return 'orange'
    if (discount >= 70) return 'gold'
    return 'green'
  }

  // ページネーション用の計算
  const totalGames = data?.games.length || 0
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const displayedGames = maxItems 
    ? data?.games.slice(0, maxItems) || []
    : data?.games.slice(startIndex, endIndex) || []

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
            高割引ゲームを読み込み中...
          </Text>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title={showTitle ? (
        <Space>
          <FireOutlined style={{ color: '#ff4d4f' }} />
          <Title level={5} style={{ margin: 0 }}>
            {type === 'popular' ? '人気高割引ゲーム' : '高割引ゲーム'}
          </Title>
          {data?.statistics.lastCheckTime && (
            <Tooltip title={`最終チェック: ${new Date(data.statistics.lastCheckTime).toLocaleString()}`}>
              <InfoCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          )}
        </Space>
      ) : undefined}
      extra={
        <Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {data?.statistics.lastCheckTime && 
              `最終更新: ${new Date(data.statistics.lastCheckTime).toLocaleString('ja-JP')}`
            }
          </Text>
          <Button
            icon={<SyncOutlined />}
            onClick={refreshHighDiscountGames}
            loading={refreshing}
            size="small"
          >
            更新
          </Button>
        </Space>
      }
    >
      {displayedGames.length === 0 ? (
        <Empty 
          description="高割引ゲームが見つかりませんでした" 
          style={{ padding: '20px 0' }}
        />
      ) : (
        <>
          <List
            dataSource={displayedGames}
            renderItem={(game) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<ShopOutlined />}
                    onClick={() => openSteamStore(game.steam_app_id)}
                    size="small"
                  >
                    Steam Store
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      <Text strong>{game.name}</Text>
                      <Tag color={getDiscountColor(game.discount_percent)}>
                        {game.discount_percent}% OFF
                      </Tag>
                      {game.review_score && game.review_count && (
                        <Tag icon={<StarOutlined />} color="blue">
                          {game.review_score}% ({game.review_count.toLocaleString()}件)
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Row gutter={16}>
                      <Col>
                        <Space>
                          <Text delete style={{ color: '#999' }}>
                            {formatPrice(game.original_price)}
                          </Text>
                          <Text strong style={{ color: '#f5222d', fontSize: '16px' }}>
                            {formatPrice(game.current_price)}
                          </Text>
                        </Space>
                      </Col>
                      <Col>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          節約: {formatPrice(game.original_price - game.current_price)}
                        </Text>
                      </Col>
                    </Row>
                  }
                />
              </List.Item>
            )}
          />
          
          {(!maxItems || maxItems >= totalGames) && totalGames > pageSize && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Pagination
                current={currentPage}
                total={totalGames}
                pageSize={pageSize}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
                showQuickJumper
                showTotal={(total, range) => 
                  `${range[0]}-${range[1]} / ${total}件の高割引ゲーム`
                }
              />
            </div>
          )}
        </>
      )}
    </Card>
  )
}