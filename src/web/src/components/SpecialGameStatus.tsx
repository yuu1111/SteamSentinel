import React from 'react'
import { Alert, Card, Row, Col, Typography, Space, Collapse } from 'antd'
import { WarningOutlined, DownOutlined, UpOutlined, ExclamationCircleOutlined, GiftOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Game } from '../types'

interface SpecialGameStatusProps {
  games: Game[]
  onShowGameDetail?: (steamAppId: number) => void
}

interface GameCategories {
  failed: Game[]
  freeToPlay: Game[]
  unreleased: Game[]
  removed: Game[]
}

export const SpecialGameStatus: React.FC<SpecialGameStatusProps> = ({ games, onShowGameDetail }) => {

  // ゲームをカテゴリ別に分類
  const gameCategories: GameCategories = {
    failed: [],
    freeToPlay: [],
    unreleased: [],
    removed: []
  }

  games.forEach(game => {
    if (!game.latestPrice) {
      gameCategories.failed.push(game)
    } else {
      switch (game.latestPrice.source) {
        case 'steam_free':
          gameCategories.freeToPlay.push(game)
          break
        case 'steam_unreleased':
          gameCategories.unreleased.push(game)
          break
        case 'steam_removed':
          gameCategories.removed.push(game)
          break
      }
    }
  })

  const totalSpecialGames = gameCategories.failed.length + gameCategories.freeToPlay.length + 
                           gameCategories.unreleased.length + gameCategories.removed.length

  if (totalSpecialGames === 0) {return null}

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'exclamation-octagon': return <ExclamationCircleOutlined style={{ color: '#f5222d' }} />
      case 'gift': return <GiftOutlined style={{ color: '#52c41a' }} />
      case 'clock': return <ClockCircleOutlined style={{ color: '#1890ff' }} />
      case 'x-circle': return <CloseCircleOutlined style={{ color: '#8c8c8c' }} />
      default: return <ExclamationCircleOutlined />
    }
  }

  const CategoryCard: React.FC<{ title: string; games: Game[]; bgColor: string; icon: string }> = ({
    title,
    games,
    icon
  }) => {
    if (games.length === 0) {return null}

    return (
      <Col xs={24} md={12}>
        <Card
          title={
            <Space>
              {getIcon(icon)}
              {title} ({games.length}件)
            </Space>
          }
          size="small"
          type="inner"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {games.map(game => (
              <div key={game.id}>
                <Typography.Text strong>{game.name}</Typography.Text>
                <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  App ID: {game.steam_app_id}
                </Typography.Text>
                {game.latestPrice?.release_date && (
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, color: '#1890ff' }}>
                    リリース予定: {game.latestPrice.release_date}
                  </Typography.Text>
                )}
              </div>
            ))}
          </Space>
        </Card>
      </Col>
    )
  }

  const collapseItems = [
    {
      key: '1',
      label: (
        <Space>
          <WarningOutlined style={{ color: '#fa8c16' }} />
          <Typography.Text strong>
            {totalSpecialGames}ゲームが特別な状況です：
          </Typography.Text>
          <Typography.Text type="secondary">
            価格取得失敗 {gameCategories.failed.length}件、
            基本無料 {gameCategories.freeToPlay.length}件、
            未リリース {gameCategories.unreleased.length}件、
            販売終了 {gameCategories.removed.length}件
          </Typography.Text>
        </Space>
      ),
      children: (
        <Row gutter={[16, 16]}>
          <CategoryCard
            title="価格取得失敗"
            games={gameCategories.failed}
            bgColor="danger"
            icon="exclamation-octagon"
          />
          
          <CategoryCard
            title="基本無料ゲーム"
            games={gameCategories.freeToPlay}
            bgColor="success"
            icon="gift"
          />
          
          <CategoryCard
            title="未リリースゲーム"
            games={gameCategories.unreleased}
            bgColor="info"
            icon="clock"
          />
          
          <CategoryCard
            title="販売終了ゲーム"
            games={gameCategories.removed}
            bgColor="secondary"
            icon="x-circle"
          />
        </Row>
      )
    }
  ]

  return (
    <div style={{ marginBottom: 16 }}>
      <Alert
        type="warning"
        showIcon
        message={
          <Collapse
            items={collapseItems}
            ghost
            expandIcon={({ isActive }) => isActive ? <UpOutlined /> : <DownOutlined />}
          />
        }
      />
    </div>
  )
}