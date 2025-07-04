import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Row, Col, Typography, Spin, Space, Tag, Button, Image, Divider, Rate, Avatar, List } from 'antd'
import { ArrowLeftOutlined, LinkOutlined, ShoppingCartOutlined, StarOutlined, DatabaseOutlined, BookOutlined, TrophyOutlined, AppstoreOutlined, CloudOutlined, FireOutlined, ThunderboltOutlined, InfoCircleOutlined, TeamOutlined, AppstoreAddOutlined, CalendarOutlined, DesktopOutlined, PictureOutlined } from '@ant-design/icons'
import { Game, ReviewScore, GameReviews } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

const { Title, Text } = Typography

interface GameDetailProps {
  steamAppId?: number
  onBack: () => void
}

const GameDetail: React.FC<GameDetailProps> = ({ steamAppId: propSteamAppId, onBack }) => {
  const { appId } = useParams<{ appId: string }>()
  const steamAppId = propSteamAppId || (appId ? parseInt(appId, 10) : 0)
  const [game, setGame] = useState<Game | null>(null)
  const [gameReviews, setGameReviews] = useState<GameReviews | null>(null)
  const [gameDetails, setGameDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState(false)
  const { showError } = useAlert()

  useEffect(() => {
    loadGameData()
    loadReviewData()
    loadGameDetails()
  }, [steamAppId])

  const loadGameData = async () => {
    try {
      setLoading(true)
      
      // Steam App ID経由でゲーム情報を取得
      const response = await api.get(`/games/steam/${steamAppId}`)
      
      if (response.success && response.data && response.data.game) {
        setGame(response.data.game)
      } else {
        showError('ゲーム情報の取得に失敗しました')
      }
    } catch (error) {
      console.error('ゲーム情報取得エラー:', error)
      showError('ゲーム情報の読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const loadReviewData = async () => {
    try {
      setReviewsLoading(true)
      
      // API経由でレビューデータを取得
      const response = await api.get(`/games/${steamAppId}/reviews`)
      
      if (response.success && response.data) {
        setGameReviews(response.data)
      } else {
        console.warn('レビューデータが見つかりませんでした')
      }
    } catch (error) {
      console.error('レビューデータの読み込みエラー:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const loadGameDetails = async () => {
    try {
      setDetailsLoading(true)
      
      // ゲーム詳細情報を取得
      const response = await api.get(`/games/${steamAppId}/details`)
      
      if (response.success && response.data) {
        setGameDetails(response.data)
      } else {
        console.warn('ゲーム詳細情報が見つかりませんでした')
      }
    } catch (error) {
      console.error('ゲーム詳細情報の読み込みエラー:', error)
    } finally {
      setDetailsLoading(false)
    }
  }

  const getReviewSourceIcon = (source: string) => {
    switch (source) {
      case 'steam':
        return (
          <Avatar 
            size={24} 
            style={{ backgroundColor: '#1b2838', color: '#66c0f4' }}
            icon={<CloudOutlined />}
          />
        )
      case 'metacritic':
        return (
          <Avatar 
            size={24} 
            style={{ backgroundColor: '#ff6d00', color: '#fff' }}
            icon={<TrophyOutlined />}
          />
        )
      case 'igdb':
        return (
          <Avatar 
            size={24} 
            style={{ backgroundColor: '#9146ff', color: '#fff' }}
            icon={<ThunderboltOutlined />}
          />
        )
      default:
        return <StarOutlined />
    }
  }

  const getReviewSourceName = (source: string) => {
    switch (source) {
      case 'steam':
        return 'Steam'
      case 'metacritic':
        return 'Metacritic'
      case 'igdb':
        return 'IGDB'
      default:
        return source
    }
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return '#52c41a'
    if (percentage >= 80) return '#13c2c2'
    if (percentage >= 70) return '#1890ff'
    if (percentage >= 60) return '#faad14'
    if (percentage >= 50) return '#fa8c16'
    return '#f5222d'
  }

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
        <Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
          読み込み中...
        </Text>
      </div>
    )
  }

  if (!game) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Text type="secondary">ゲーム情報が見つかりません</Text>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
            style={{ marginBottom: 16 }}
          >
            戻る
          </Button>
        </Col>

        {/* ゲーム基本情報 */}
        <Col span={24}>
          <Card>
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <Image
                  src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg`}
                  alt={game.name}
                  style={{ width: '100%', borderRadius: 8 }}
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RUG8A+b6YuViNvBSRS7G7HIN6AlIMHE="
                />
              </Col>
              <Col xs={24} md={16}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Title level={2} style={{ marginBottom: 8 }}>
                      {game.name}
                    </Title>
                    <Text type="secondary">Steam App ID: {game.steam_app_id}</Text>
                  </div>

                  <Space wrap>
                    <Tag color={game.enabled ? 'green' : 'default'}>
                      {game.enabled ? '監視中' : '監視停止'}
                    </Tag>
                    <Tag color={game.alert_enabled ? 'blue' : 'default'}>
                      {game.alert_enabled ? 'アラート有効' : 'アラート無効'}
                    </Tag>
                    <Tag color={game.is_purchased ? 'cyan' : 'default'}>
                      {game.is_purchased ? '購入済み' : '未購入'}
                    </Tag>
                  </Space>

                  {game.latestPrice && (
                    <div>
                      <Text strong style={{ fontSize: '24px', color: game.latestPrice.is_on_sale ? '#52c41a' : undefined }}>
                        ¥{game.latestPrice.current_price.toLocaleString()}
                      </Text>
                      {game.latestPrice.is_on_sale && game.latestPrice.original_price > game.latestPrice.current_price && (
                        <div>
                          <Text delete type="secondary" style={{ fontSize: '16px' }}>
                            ¥{game.latestPrice.original_price.toLocaleString()}
                          </Text>
                          <Tag color="red" style={{ marginLeft: 8 }}>
                            -{game.latestPrice.discount_percent}%
                          </Tag>
                        </div>
                      )}
                    </div>
                  )}

                  <Space wrap>
                    <Button 
                      type="primary" 
                      icon={<ShoppingCartOutlined />}
                      onClick={() => openExternalLink(`https://store.steampowered.com/app/${game.steam_app_id}/`)}
                    >
                      Steam ストア
                    </Button>
                    <Button 
                      icon={<TrophyOutlined />}
                      onClick={() => openExternalLink(`https://www.metacritic.com/search/game/${encodeURIComponent(game.name)}/`)}
                    >
                      Metacritic
                    </Button>
                    <Button 
                      icon={<AppstoreOutlined />}
                      onClick={() => openExternalLink(`https://www.igdb.com/search?type=1&q=${encodeURIComponent(game.name)}`)}
                    >
                      IGDB
                    </Button>
                    <Button 
                      icon={<DatabaseOutlined />}
                      onClick={() => openExternalLink(`https://steamdb.info/app/${game.steam_app_id}/`)}
                    >
                      SteamDB
                    </Button>
                    <Button 
                      icon={<BookOutlined />}
                      onClick={() => openExternalLink(`https://backloggd.com/games/${game.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')}/`)}
                    >
                      Backloggd
                    </Button>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* レビュー統合情報 */}
        <Col span={24}>
          <Card 
            title={
              <Space>
                <StarOutlined />
                レビュー情報
              </Space>
            }
            loading={reviewsLoading}
          >
            {gameReviews && gameReviews.reviews && gameReviews.reviews.length > 0 ? (
              <div>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col span={24}>
                    <div style={{ textAlign: 'center' }}>
                      <Title level={3} style={{ marginBottom: 8 }}>
                        統合スコア
                      </Title>
                      <div style={{ 
                        fontSize: '48px', 
                        fontWeight: 'bold',
                        color: getScoreColor(gameReviews.aggregateScore, 100)
                      }}>
                        {gameReviews.aggregateScore}
                      </div>
                      <Rate 
                        disabled 
                        value={gameReviews.aggregateScore / 20} 
                        style={{ fontSize: '24px' }}
                      />
                    </div>
                  </Col>
                </Row>

                <Divider>レビューソース別</Divider>

                <List
                  dataSource={gameReviews.reviews}
                  renderItem={(review: ReviewScore) => (
                    <List.Item>
                      <Card 
                        size="small" 
                        style={{ width: '100%' }}
                        styles={{ body: { padding: '16px' } }}
                      >
                        <Row gutter={[16, 16]} align="middle">
                          <Col flex="auto">
                            <Space>
                              {getReviewSourceIcon(review.source)}
                              <div>
                                <Text strong>{getReviewSourceName(review.source)}</Text>
                                {review.description && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                      {review.description}
                                    </Text>
                                  </div>
                                )}
                              </div>
                            </Space>
                          </Col>
                          <Col>
                            <Space direction="vertical" align="end">
                              <Text 
                                strong 
                                style={{ 
                                  fontSize: '20px',
                                  color: getScoreColor(review.score, review.maxScore)
                                }}
                              >
                                {review.score}/{review.maxScore}
                              </Text>
                              {review.reviewCount && (
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {review.reviewCount.toLocaleString()}件のレビュー
                                </Text>
                              )}
                            </Space>
                          </Col>
                          <Col>
                            {review.url && (
                              <Button 
                                size="small" 
                                icon={<LinkOutlined />}
                                onClick={() => openExternalLink(review.url!)}
                              >
                                詳細
                              </Button>
                            )}
                          </Col>
                        </Row>
                      </Card>
                    </List.Item>
                  )}
                />

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    最終更新: {new Date(gameReviews.lastUpdated).toLocaleString('ja-JP')}
                  </Text>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <StarOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
                <div>
                  <Text type="secondary">
                    {gameReviews ? 
                      'このゲームのレビュー情報は見つかりませんでした' : 
                      'レビュー情報を読み込んでいます...'
                    }
                  </Text>
                  {gameReviews && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        最終更新: {new Date(gameReviews.lastUpdated).toLocaleString('ja-JP')}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* ゲーム詳細情報 */}
        {gameDetails && (
          <>
            {/* 基本情報・説明 */}
            {(gameDetails.steam?.short_description || gameDetails.igdb?.summary) && (
              <Col span={24}>
                <Card 
                  title={
                    <Space>
                      <InfoCircleOutlined />
                      ゲーム説明
                    </Space>
                  }
                  loading={detailsLoading}
                >
                  {gameDetails.steam?.short_description && (
                    <div style={{ marginBottom: 16 }}>
                      <Text strong>概要:</Text>
                      <div 
                        style={{ marginTop: 8 }}
                        dangerouslySetInnerHTML={{ __html: gameDetails.steam.short_description }}
                      />
                    </div>
                  )}
                  {gameDetails.igdb?.summary && (
                    <div>
                      <Text strong>IGDB説明:</Text>
                      <div style={{ marginTop: 8 }}>
                        <Text>{gameDetails.igdb.summary}</Text>
                      </div>
                    </div>
                  )}
                </Card>
              </Col>
            )}

            {/* 開発者・発行者情報 */}
            {(gameDetails.steam?.developers || gameDetails.steam?.publishers) && (
              <Col span={24}>
                <Card 
                  title={
                    <Space>
                      <TeamOutlined />
                      開発・発行情報
                    </Space>
                  }
                  loading={detailsLoading}
                >
                  <Row gutter={[16, 16]}>
                    {gameDetails.steam?.developers && (
                      <Col xs={24} md={12}>
                        <Space direction="vertical">
                          <Text strong>開発者:</Text>
                          <Space wrap>
                            {gameDetails.steam.developers.map((dev: string, index: number) => (
                              <Tag key={index} color="blue">{dev}</Tag>
                            ))}
                          </Space>
                        </Space>
                      </Col>
                    )}
                    {gameDetails.steam?.publishers && (
                      <Col xs={24} md={12}>
                        <Space direction="vertical">
                          <Text strong>発行者:</Text>
                          <Space wrap>
                            {gameDetails.steam.publishers.map((pub: string, index: number) => (
                              <Tag key={index} color="green">{pub}</Tag>
                            ))}
                          </Space>
                        </Space>
                      </Col>
                    )}
                  </Row>
                </Card>
              </Col>
            )}

            {/* ジャンル・カテゴリ */}
            {(gameDetails.steam?.genres || gameDetails.steam?.categories) && (
              <Col span={24}>
                <Card 
                  title={
                    <Space>
                      <AppstoreAddOutlined />
                      ジャンル・カテゴリ
                    </Space>
                  }
                  loading={detailsLoading}
                >
                  <Row gutter={[16, 16]}>
                    {gameDetails.steam?.genres && (
                      <Col xs={24} md={12}>
                        <Space direction="vertical">
                          <Text strong>ジャンル:</Text>
                          <Space wrap>
                            {gameDetails.steam.genres.map((genre: any, index: number) => (
                              <Tag key={index} color="purple">{genre.description}</Tag>
                            ))}
                          </Space>
                        </Space>
                      </Col>
                    )}
                    {gameDetails.steam?.categories && (
                      <Col xs={24} md={12}>
                        <Space direction="vertical">
                          <Text strong>カテゴリ:</Text>
                          <Space wrap>
                            {gameDetails.steam.categories.slice(0, expandedCategories ? gameDetails.steam.categories.length : 8).map((cat: any, index: number) => (
                              <Tag key={index} color="orange">{cat.description}</Tag>
                            ))}
                            {gameDetails.steam.categories.length > 8 && (
                              <Tag 
                                style={{ cursor: 'pointer', borderStyle: 'dashed' }}
                                onClick={() => setExpandedCategories(!expandedCategories)}
                              >
                                {expandedCategories ? '閉じる' : `+${gameDetails.steam.categories.length - 8}個`}
                              </Tag>
                            )}
                          </Space>
                        </Space>
                      </Col>
                    )}
                  </Row>
                </Card>
              </Col>
            )}

            {/* プラットフォーム・リリース情報 */}
            <Col span={24}>
              <Card 
                title={
                  <Space>
                    <DesktopOutlined />
                    プラットフォーム・リリース情報
                  </Space>
                }
                loading={detailsLoading}
              >
                <Row gutter={[16, 16]}>
                  {gameDetails.steam?.platforms && (
                    <Col xs={24} md={12}>
                      <Space direction="vertical">
                        <Text strong>対応プラットフォーム:</Text>
                        <Space wrap>
                          {gameDetails.steam.platforms.windows && <Tag color="blue">Windows</Tag>}
                          {gameDetails.steam.platforms.mac && <Tag color="gray">Mac</Tag>}
                          {gameDetails.steam.platforms.linux && <Tag color="orange">Linux</Tag>}
                        </Space>
                      </Space>
                    </Col>
                  )}
                  {gameDetails.steam?.release_date && (
                    <Col xs={24} md={12}>
                      <Space direction="vertical">
                        <Text strong>リリース日:</Text>
                        <Space>
                          <CalendarOutlined />
                          <Text>{gameDetails.steam.release_date.date || '未定'}</Text>
                          {gameDetails.steam.release_date.coming_soon && (
                            <Tag color="red">近日発売</Tag>
                          )}
                        </Space>
                      </Space>
                    </Col>
                  )}
                </Row>
              </Card>
            </Col>

            {/* IGDB追加情報 */}
            {(gameDetails.igdb?.themes || gameDetails.igdb?.game_modes) && (
              <Col span={24}>
                <Card 
                  title={
                    <Space>
                      <AppstoreOutlined />
                      ゲーム詳細 (IGDB)
                    </Space>
                  }
                  loading={detailsLoading}
                >
                  <Row gutter={[16, 16]}>
                    {gameDetails.igdb?.themes && (
                      <Col xs={24} md={12}>
                        <Space direction="vertical">
                          <Text strong>テーマ:</Text>
                          <Space wrap>
                            {gameDetails.igdb.themes.map((theme: any, index: number) => (
                              <Tag key={index} color="cyan">{theme.name}</Tag>
                            ))}
                          </Space>
                        </Space>
                      </Col>
                    )}
                    {gameDetails.igdb?.game_modes && (
                      <Col xs={24} md={12}>
                        <Space direction="vertical">
                          <Text strong>ゲームモード:</Text>
                          <Space wrap>
                            {gameDetails.igdb.game_modes.map((mode: any, index: number) => (
                              <Tag key={index} color="magenta">{mode.name}</Tag>
                            ))}
                          </Space>
                        </Space>
                      </Col>
                    )}
                  </Row>
                </Card>
              </Col>
            )}

            {/* スクリーンショット */}
            <Col span={24}>
              <Card 
                title={
                  <Space>
                    <PictureOutlined />
                    スクリーンショット
                  </Space>
                }
                loading={detailsLoading}
              >
                <Row gutter={[16, 16]}>
                  {/* 常にSteamの標準スクリーンショットを表示（確実に動作） */}
                  {[0, 1, 2, 3].map((index) => (
                    <Col key={`steam-${index}`} xs={12} md={8} lg={6}>
                      <Image
                        src={`https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/ss_${index}_0.1920x1080.jpg`}
                        alt={`Screenshot ${index + 1}`}
                        style={{ width: '100%', borderRadius: 8 }}
                        placeholder={
                          <div style={{ 
                            height: 120, 
                            background: '#f0f0f0', 
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999'
                          }}>
                            <PictureOutlined />
                          </div>
                        }
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                      />
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </>
        )}

        {/* アラート設定情報 */}
        <Col span={24}>
          <Card title="アラート設定">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Space direction="vertical">
                  <Text strong>アラート条件</Text>
                  <div>
                    {game.price_threshold_type === 'price' && game.price_threshold ? (
                      <Text>¥{game.price_threshold.toLocaleString()}以下</Text>
                    ) : game.price_threshold_type === 'discount' && game.discount_threshold_percent ? (
                      <Text>{game.discount_threshold_percent}%以上割引</Text>
                    ) : game.price_threshold_type === 'any_sale' ? (
                      <Text>セール開始時</Text>
                    ) : (
                      <Text type="secondary">設定なし</Text>
                    )}
                  </div>
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical">
                  <Text strong>通知方法</Text>
                  <div>
                    {game.alert_enabled ? (
                      <Text>システム通知</Text>
                    ) : (
                      <Text type="secondary">無効</Text>
                    )}
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default GameDetail