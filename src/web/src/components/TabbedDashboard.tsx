import React, { useState, useEffect } from 'react'
import { Tabs, Card, Row, Col, Statistic, Spin, Typography, Tag, Space } from 'antd'
import { HomeOutlined, WalletOutlined, ShoppingCartOutlined, BellOutlined, PercentageOutlined, CalendarOutlined, TrophyOutlined, StarOutlined } from '@ant-design/icons'
import { TabDashboardData, Statistics, ExpenseData, Game } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { ExpenseAnalyticsCharts } from './ExpenseAnalyticsCharts'
import { ROIAnalyzer } from './ROIAnalyzer'
import { BudgetManager } from './BudgetManager'
import { SpendingAlerts } from './SpendingAlerts'
import { SpecialGameStatus } from './SpecialGameStatus'
import { MonitoringProgress } from './MonitoringProgress'
import { formatDateJP } from '../utils/dateUtils'

interface TabbedDashboardProps {
  dashboardData: TabDashboardData | null
  loading: boolean
  onRefresh?: () => void
}

export const TabbedDashboard: React.FC<TabbedDashboardProps> = ({
  dashboardData,
  loading,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses'>('overview')
  const [expenseData, setExpenseData] = useState<ExpenseData | null>(null)
  const [expenseLoading, setExpenseLoading] = useState(false)
  const { showError } = useAlert()

  useEffect(() => {
    if ((activeTab === 'expenses' || activeTab === 'overview') && !expenseData) {
      loadExpenseData()
    }
  }, [activeTab])

  // 初回ロード時に出費データも読み込む（概要タブで購入ゲーム数表示のため）
  useEffect(() => {
    if (!expenseData) {
      loadExpenseData()
    }
  }, [])

  const loadExpenseData = async () => {
    try {
      setExpenseLoading(true)
      const response = await api.get<ExpenseData>('/games/expenses')
      
      if (response.success && response.data) {
        setExpenseData(response.data)
      } else {
        showError('出費データの読み込みに失敗しました')
      }
    } catch {
      showError('出費データの読み込み中にエラーが発生しました')
    } finally {
      setExpenseLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <Typography.Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
          ダッシュボードを読み込み中...
        </Typography.Text>
      </div>
    )
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <HomeOutlined />
          概要
        </span>
      ),
      children: (
        <OverviewDashboard 
          dashboardData={dashboardData}
          expenseData={expenseData}
          onRefresh={onRefresh}
        />
      )
    },
    {
      key: 'expenses',
      label: (
        <span>
          <WalletOutlined />
          出費分析
        </span>
      ),
      children: (
        <ExpensesDashboard 
          expenseData={expenseData}
          loading={expenseLoading}
        />
      )
    }
  ]

  return (
    <Tabs 
      defaultActiveKey="overview"
      items={tabItems}
      onChange={(key) => setActiveTab(key as 'overview' | 'expenses')}
    />
  )
}

// Overview Dashboard Component
interface OverviewDashboardProps {
  dashboardData: TabDashboardData | null
  expenseData: ExpenseData | null
  onRefresh?: () => void
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  dashboardData,
  expenseData,
  onRefresh
}) => {
  // Filter games for special status display
  const specialGames = dashboardData?.games?.filter(game => {
    const latestPrice = game.latestPrice
    const isOnSale = latestPrice?.is_on_sale || false
    const isFreeGame = latestPrice?.source === 'steam_free'
    const isUnreleased = latestPrice?.source === 'steam_unreleased'
    const hasAlert = game.alert_enabled && (
      (game.price_threshold_type === 'any_sale' && isOnSale) ||
      (game.price_threshold_type === 'price' && game.price_threshold && latestPrice?.current_price && latestPrice.current_price <= game.price_threshold) ||
      (game.price_threshold_type === 'discount' && game.discount_threshold_percent && latestPrice?.discount_percent && latestPrice.discount_percent >= game.discount_threshold_percent)
    )
    return isOnSale || isFreeGame || isUnreleased || hasAlert
  }) || []

  return (
    <Row gutter={[16, 16]}>
      {/* Integrated Statistics Cards */}
      <IntegratedStatisticsCards 
        statistics={dashboardData?.statistics}
        expenseData={expenseData}
      />
      
      {/* Special Game Status Alert */}
      {dashboardData?.games && specialGames.length > 0 && (
        <Col span={24}>
          <SpecialGameStatus games={specialGames} />
        </Col>
      )}
      
      {/* Quick Summary Section */}
      <Col span={24}>
        <Card 
          title={
            <span>
              <TrophyOutlined style={{ marginRight: 8 }} />
              クイックサマリー
            </span>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Typography.Title level={5}>監視状況</Typography.Title>
              <Typography.Text type="secondary">
                {dashboardData?.statistics.gamesTracked || 0}ゲーム監視中、
                {dashboardData?.statistics.gamesOnSale || 0}ゲームがセール中
              </Typography.Text>
            </Col>
            <Col xs={24} md={8}>
              <Typography.Title level={5}>出費状況</Typography.Title>
              <Typography.Text type="secondary">
                {expenseData?.summary.totalGames || 0}ゲーム購入済み、
                総額¥{expenseData?.summary.totalExpenses?.toLocaleString() || 0}
              </Typography.Text>
            </Col>
            <Col xs={24} md={8}>
              <Typography.Title level={5}>節約効果</Typography.Title>
              <Typography.Text type="secondary">
                ¥{expenseData?.summary.totalSavings?.toLocaleString() || 0}の節約
                ({expenseData?.summary.savingsRate?.toFixed(1) || 0}%)
              </Typography.Text>
            </Col>
          </Row>
        </Card>
      </Col>
      
      {/* Alert Target Games Section */}
      <Col span={24}>
        <Card 
          title={
            <span>
              <StarOutlined style={{ marginRight: 8 }} />
              セール・条件達成ゲーム
            </span>
          }
        >
          {dashboardData?.games && (
            <AlertTargetGames games={dashboardData.games} />
          )}
        </Card>
      </Col>
      
      {/* Monitoring Progress Section */}
      <Col span={24}>
        <MonitoringProgress onMonitoringComplete={onRefresh ? onRefresh : () => {}} />
      </Col>
      
      {/* Monitoring Details Section */}
      <Col span={24}>
        <Card 
          title={
            <span>
              <BellOutlined style={{ marginRight: 8 }} />
              監視詳細統計
            </span>
          }
        >
          <MonitoringDetails games={dashboardData?.games} />
        </Card>
      </Col>
    </Row>
  )
}


// Expenses Dashboard Component
interface ExpensesDashboardProps {
  expenseData: ExpenseData | null
  loading: boolean
}

const ExpensesDashboard: React.FC<ExpensesDashboardProps> = ({
  expenseData,
  loading
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
        <Typography.Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
          出費データ読み込み中...
        </Typography.Text>
      </div>
    )
  }

  return (
    <Row gutter={[16, 16]}>
      {/* Expense-specific Statistics */}
      <ExpenseStatisticsCards expenseData={expenseData} />
      
      {/* Advanced Analytics Charts */}
      <ExpenseAnalyticsCharts expenseData={expenseData} />
      
      {/* ROI Analysis */}
      <ROIAnalyzer expenseData={expenseData} />
      
      {/* Budget Management */}
      <BudgetManager expenseData={expenseData} />
      
      {/* Spending Alerts */}
      <SpendingAlerts expenseData={expenseData} />
      
      {/* Recent Purchases */}
      {expenseData && (
        <Col span={24}>
          <Card 
            title={
              <span>
                <CalendarOutlined style={{ marginRight: 8 }} />
                最近の購入履歴
              </span>
            }
          >
            {expenseData.recentPurchases.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <th style={{ padding: '8px', textAlign: 'left' }}>ゲーム名</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>購入価格</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>割引率</th>
                      <th style={{ padding: '8px', textAlign: 'left' }}>購入日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseData.recentPurchases.slice(0, 5).map((purchase, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #f9f9f9' }}>
                        <td style={{ padding: '8px' }}>
                          <Typography.Link 
                            href={`https://store.steampowered.com/app/${purchase.steam_app_id}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {purchase.game_name}
                          </Typography.Link>
                        </td>
                        <td style={{ padding: '8px' }}>¥{purchase.trigger_price.toLocaleString()}</td>
                        <td style={{ padding: '8px' }}>
                          <Tag color={purchase.discount_percent > 50 ? 'green' : purchase.discount_percent > 20 ? 'orange' : 'default'}>
                            {purchase.discount_percent}% OFF
                          </Tag>
                        </td>
                        <td style={{ padding: '8px' }}>{formatDateJP(purchase.created_at, 'date')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Typography.Text type="secondary">
                まだ購入履歴がありません。
              </Typography.Text>
            )}
          </Card>
        </Col>
      )}
    </Row>
  )
}

// Integrated Statistics Cards Component
interface IntegratedStatisticsCardsProps {
  statistics?: Statistics
  expenseData?: ExpenseData | null
}

const IntegratedStatisticsCards: React.FC<IntegratedStatisticsCardsProps> = ({
  statistics,
  expenseData
}) => {
  return (
    <>
      {/* Row 1: Core Metrics */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="監視中のゲーム"
            value={statistics?.gamesTracked || 0}
            prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="セール中"
            value={statistics?.gamesOnSale || 0}
            prefix={<Tag style={{ color: '#52c41a' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="購入ゲーム数"
            value={expenseData?.summary.totalGames || 0}
            prefix={<TrophyOutlined style={{ color: '#722ed1' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="総支出額"
            value={expenseData?.summary.totalExpenses || 0}
            prefix="¥"
            precision={0}
            valueStyle={{ color: '#f5222d' }}
          />
        </Card>
      </Col>

      {/* Row 2: Secondary Metrics */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="総アラート数"
            value={statistics?.totalAlerts || 0}
            prefix={<BellOutlined style={{ color: '#fa8c16' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="平均割引率"
            value={statistics?.averageDiscount || 0}
            suffix="%"
            prefix={<PercentageOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="平均購入価格"
            value={expenseData?.summary.averagePrice || 0}
            prefix="¥"
            precision={0}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="節約額"
            value={expenseData?.summary.totalSavings || 0}
            prefix="¥"
            precision={0}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
    </>
  )
}


// Expense-specific Statistics Cards
interface ExpenseStatisticsCardsProps {
  expenseData?: ExpenseData | null
}

const ExpenseStatisticsCards: React.FC<ExpenseStatisticsCardsProps> = ({
  expenseData
}) => {
  return (
    <>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="購入ゲーム数"
            value={expenseData?.summary.totalGames || 0}
            prefix={<ShoppingCartOutlined style={{ color: '#722ed1' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="総支出額"
            value={expenseData?.summary.totalExpenses || 0}
            prefix="¥"
            precision={0}
            valueStyle={{ color: '#f5222d' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="平均購入価格"
            value={expenseData?.summary.averagePrice || 0}
            prefix="¥"
            precision={0}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="節約額"
            value={expenseData?.summary.totalSavings || 0}
            prefix="¥"
            precision={0}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      
      {/* Additional expense-specific metrics */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="節約率"
            value={expenseData?.summary.savingsRate || 0}
            suffix="%"
            precision={1}
            prefix={<PercentageOutlined style={{ color: '#fa8c16' }} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="購入期間（月）"
            value={expenseData?.monthlyTrends?.expenses?.length || 0}
            prefix={<CalendarOutlined style={{ color: '#13c2c2' }} />}
          />
        </Card>
      </Col>
    </>
  )
}

// Alert Target Games Component
interface AlertTargetGamesProps {
  games: Game[]
}

const AlertTargetGames: React.FC<AlertTargetGamesProps> = ({ games }) => {
  const alertTargetGames = games.filter(game => {
    if (!game.alert_enabled) {
      return false
    }
    
    const latestPrice = game.latestPrice
    if (!latestPrice) {
      return false
    }
    
    // Check if game was marked as unreleased and is now released
    if (game.was_unreleased && latestPrice.source !== 'steam_unreleased' && latestPrice.current_price > 0) {
      return true
    }
    
    switch (game.price_threshold_type) {
      case 'any_sale':
        return latestPrice.is_on_sale
      case 'price':
        return game.price_threshold && latestPrice.current_price <= game.price_threshold
      case 'discount':
        return game.discount_threshold_percent && latestPrice.discount_percent >= game.discount_threshold_percent
      default:
        return false
    }
  })

  if (alertTargetGames.length === 0) {
    return (
      <Typography.Text type="secondary">
        現在、設定した条件を満たしているゲームはありません。
      </Typography.Text>
    )
  }

  return (
    <Row gutter={[16, 16]}>
      {alertTargetGames.map(game => {
        const latestPrice = game.latestPrice!
        const discountPercent = latestPrice.discount_percent || 0
        const isHighDiscount = discountPercent >= 70
        const isMediumDiscount = discountPercent >= 50
        const isNewRelease = !!game.was_unreleased && latestPrice.source !== 'steam_unreleased'
        
        return (
          <Col key={game.id} xs={24} sm={12} lg={8}>
            <Card
              hoverable
              cover={
                <div style={{ position: 'relative', height: '120px', overflow: 'hidden' }}>
                  <img 
                    src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg`}
                    alt={game.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.8)' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDYwIiBoZWlnaHQ9IjIxNSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDYwIiBoZWlnaHQ9IjIxNSIgZmlsbD0iIzFiMmQzZSIvPjxwYXRoIGQ9Ik0yMzAgODUuNWMtMTEuMDQ2IDAtMjAgOC45NTQtMjAgMjBzOC45NTQgMjAgMjAgMjAgMjAtOC45NTQgMjAtMjAtOC45NTQtMjAtMjAtMjB6bTAgMzBjLTUuNTIzIDAtMTAtNC40NzctMTAtMTBzNC40NzctMTAgMTAtMTAgMTAgNC40NzcgMTAgMTAtNC40NzcgMTAtMTAgMTB6IiBmaWxsPSIjMzQ0OTVlIi8+PC9zdmc+'
                    }}
                  />
                  
                  {/* 割引バッジ */}
                  {discountPercent > 0 && (
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <Tag color={isHighDiscount ? 'red' : isMediumDiscount ? 'orange' : 'green'} style={{ fontSize: 14 }}>
                        -{discountPercent}%
                      </Tag>
                    </div>
                  )}
                  
                  {/* 新規リリースバッジ */}
                  {isNewRelease && (
                    <div style={{ position: 'absolute', top: 8, left: 8 }}>
                      <Tag color="blue">
                        NEW
                      </Tag>
                    </div>
                  )}
                </div>
              }
              style={{ height: '100%' }}
            >
              <Card.Meta
                title={
                  <Typography.Link 
                    href={`https://store.steampowered.com/app/${game.steam_app_id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 14 }}
                  >
                    {game.name}
                  </Typography.Link>
                }
                description={
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {/* 価格情報 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Typography.Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                          ¥{latestPrice.current_price.toLocaleString()}
                        </Typography.Title>
                        {latestPrice.original_price > 0 && latestPrice.original_price !== latestPrice.current_price && (
                          <Typography.Text delete type="secondary" style={{ fontSize: 12 }}>
                            ¥{latestPrice.original_price.toLocaleString()}
                          </Typography.Text>
                        )}
                      </div>
                      {latestPrice.historical_low && latestPrice.current_price <= latestPrice.historical_low && (
                        <Tag color="red" icon={<StarOutlined />}>
                          歴代最安値
                        </Tag>
                      )}
                    </div>
                    
                    {/* 条件情報 */}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {game.price_threshold_type === 'price' && game.price_threshold && (
                        <>条件: ¥{game.price_threshold.toLocaleString()}以下</>
                      )}
                      {game.price_threshold_type === 'discount' && game.discount_threshold_percent && (
                        <>条件: {game.discount_threshold_percent}%以上割引</>
                      )}
                      {game.price_threshold_type === 'any_sale' && (
                        <>条件: セール開始時</>
                      )}
                    </Typography.Text>
                  </Space>
                }
              />
            </Card>
          </Col>
        )
      })}
    </Row>
  )
}

// Monitoring Details Component
interface MonitoringDetailsProps {
  games?: Game[]
}

const MonitoringDetails: React.FC<MonitoringDetailsProps> = ({ games }) => {
  if (!games || games.length === 0) {
    return (
      <Typography.Text type="secondary">
        監視中のゲームがありません。
      </Typography.Text>
    )
  }

  const enabledGames = games.filter(g => g.enabled)
  const disabledGames = games.filter(g => !g.enabled)
  const alertEnabledGames = games.filter(g => g.alert_enabled)
  const recentlyUpdated = games
    .filter(g => g.latestPrice)
    .sort((a, b) => {
      const dateA = new Date(a.latestPrice!.recorded_at).getTime()
      const dateB = new Date(b.latestPrice!.recorded_at).getTime()
      return dateB - dateA
    })
    .slice(0, 5)

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={12}>
        <Typography.Title level={5}>監視ステータス</Typography.Title>
        <Space direction="vertical">
          <Typography.Text>
            <span style={{ color: '#52c41a', marginRight: 8 }}>✓</span>
            有効: {enabledGames.length}ゲーム
          </Typography.Text>
          <Typography.Text>
            <span style={{ color: '#f5222d', marginRight: 8 }}>✗</span>
            無効: {disabledGames.length}ゲーム
          </Typography.Text>
          <Typography.Text>
            <span style={{ color: '#fa8c16', marginRight: 8 }}>🔔</span>
            アラート有効: {alertEnabledGames.length}ゲーム
          </Typography.Text>
        </Space>
      </Col>
      <Col xs={24} md={12}>
        <Typography.Title level={5}>最近更新されたゲーム</Typography.Title>
        {recentlyUpdated.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {recentlyUpdated.map(game => (
              <Typography.Text key={game.id} type="secondary" style={{ fontSize: 12 }}>
                {game.name} - {formatDateJP(game.latestPrice!.recorded_at, 'datetime')}
              </Typography.Text>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">
            まだ更新されたゲームがありません。
          </Typography.Text>
        )}
      </Col>
    </Row>
  )
}