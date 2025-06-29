import React, { useState, useEffect } from 'react'
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
}

export const TabbedDashboard: React.FC<TabbedDashboardProps> = ({
  dashboardData,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses'>('overview')
  const [expenseData, setExpenseData] = useState<ExpenseData | null>(null)
  const [expenseLoading, setExpenseLoading] = useState(false)
  const { showError } = useAlert()

  useEffect(() => {
    if (activeTab === 'expenses' && !expenseData) {
      loadExpenseData()
    }
  }, [activeTab])

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

  const getTabClass = (tab: string) => {
    return `nav-link ${activeTab === tab ? 'active' : ''}`
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
        <p className="mt-3 text-muted">ダッシュボードを読み込み中...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4" id="dashboardTabs" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={getTabClass('overview')}
            onClick={() => setActiveTab('overview')}
            type="button"
            role="tab"
          >
            <i className="bi bi-grid-3x3 me-2"></i>概要
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={getTabClass('expenses')}
            onClick={() => setActiveTab('expenses')}
            type="button"
            role="tab"
          >
            <i className="bi bi-wallet2 me-2"></i>出費分析
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <OverviewDashboard 
            dashboardData={dashboardData}
            expenseData={expenseData}
          />
        )}


        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <ExpensesDashboard 
            expenseData={expenseData}
            loading={expenseLoading}
          />
        )}
      </div>
    </div>
  )
}

// Overview Dashboard Component
interface OverviewDashboardProps {
  dashboardData: TabDashboardData | null
  expenseData: ExpenseData | null
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  dashboardData,
  expenseData
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
    <div className="row">
      {/* Integrated Statistics Cards */}
      <IntegratedStatisticsCards 
        statistics={dashboardData?.statistics}
        expenseData={expenseData}
      />
      
      {/* Special Game Status Alert */}
      {dashboardData?.games && specialGames.length > 0 && (
        <div className="col-12 mb-4">
          <SpecialGameStatus games={specialGames} />
        </div>
      )}
      
      {/* Quick Summary Section */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-speedometer2 me-2"></i>クイックサマリー
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <h6>監視状況</h6>
                <p className="text-muted mb-0">
                  {dashboardData?.statistics.gamesTracked || 0}ゲーム監視中、
                  {dashboardData?.statistics.gamesOnSale || 0}ゲームがセール中
                </p>
              </div>
              <div className="col-md-4">
                <h6>出費状況</h6>
                <p className="text-muted mb-0">
                  {expenseData?.summary.totalGames || 0}ゲーム購入済み、
                  総額¥{expenseData?.summary.totalExpenses?.toLocaleString() || 0}
                </p>
              </div>
              <div className="col-md-4">
                <h6>節約効果</h6>
                <p className="text-muted mb-0">
                  ¥{expenseData?.summary.totalSavings?.toLocaleString() || 0}の節約
                  ({expenseData?.summary.savingsRate?.toFixed(1) || 0}%)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Alert Target Games Section */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-check-circle-fill me-2"></i>セール・条件達成ゲーム
            </h5>
          </div>
          <div className="card-body">
            {dashboardData?.games && (
              <AlertTargetGames games={dashboardData.games} />
            )}
          </div>
        </div>
      </div>
      
      {/* Monitoring Progress Section */}
      <div className="col-12 mb-4">
        <MonitoringProgress onMonitoringComplete={() => window.location.reload()} />
      </div>
      
      {/* Monitoring Details Section */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-activity me-2"></i>監視詳細統計
            </h5>
          </div>
          <div className="card-body">
            <MonitoringDetails games={dashboardData?.games} />
          </div>
        </div>
      </div>
    </div>
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
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">出費データ読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="row">
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
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>最近の購入履歴
              </h5>
            </div>
            <div className="card-body">
              {expenseData.recentPurchases.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>ゲーム名</th>
                        <th>購入価格</th>
                        <th>割引率</th>
                        <th>購入日</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseData.recentPurchases.slice(0, 5).map((purchase, index) => (
                        <tr key={index}>
                          <td>
                            <a 
                              href={`https://store.steampowered.com/app/${purchase.steam_app_id}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-decoration-none"
                            >
                              {purchase.game_name}
                            </a>
                          </td>
                          <td>¥{purchase.trigger_price.toLocaleString()}</td>
                          <td>
                            <span className={`badge ${purchase.discount_percent > 50 ? 'bg-success' : purchase.discount_percent > 20 ? 'bg-warning' : 'bg-secondary'}`}>
                              {purchase.discount_percent}% OFF
                            </span>
                          </td>
                          <td>{formatDateJP(purchase.created_at, 'date')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">まだ購入履歴がありません。</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
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
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card info">
          <div className="card-body text-center">
            <i className="bi bi-collection display-4 mb-2"></i>
            <h3 className="display-4">{statistics?.gamesTracked || 0}</h3>
            <p className="mb-0">監視中のゲーム</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card success">
          <div className="card-body text-center">
            <i className="bi bi-tag display-4 mb-2"></i>
            <h3 className="display-4">{statistics?.gamesOnSale || 0}</h3>
            <p className="mb-0">セール中</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card primary">
          <div className="card-body text-center">
            <i className="bi bi-cart-check display-4 mb-2"></i>
            <h3 className="display-4">{expenseData?.summary.totalGames || 0}</h3>
            <p className="mb-0">購入ゲーム数</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card danger">
          <div className="card-body text-center">
            <i className="bi bi-wallet2 display-4 mb-2"></i>
            <h3 className="display-4">¥{(expenseData?.summary.totalExpenses || 0).toLocaleString()}</h3>
            <p className="mb-0">総支出額</p>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Metrics */}
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card warning">
          <div className="card-body text-center">
            <i className="bi bi-bell display-4 mb-2"></i>
            <h3 className="display-4">{statistics?.totalAlerts || 0}</h3>
            <p className="mb-0">総アラート数</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card">
          <div className="card-body text-center">
            <i className="bi bi-percent display-4 mb-2"></i>
            <h3 className="display-4">{statistics?.averageDiscount || 0}%</h3>
            <p className="mb-0">平均割引率</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card info">
          <div className="card-body text-center">
            <i className="bi bi-currency-yen display-4 mb-2"></i>
            <h3 className="display-4">¥{(expenseData?.summary.averagePrice || 0).toLocaleString()}</h3>
            <p className="mb-0">平均購入価格</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card success">
          <div className="card-body text-center">
            <i className="bi bi-piggy-bank display-4 mb-2"></i>
            <h3 className="display-4">¥{(expenseData?.summary.totalSavings || 0).toLocaleString()}</h3>
            <p className="mb-0">節約額</p>
          </div>
        </div>
      </div>
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
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card primary">
          <div className="card-body text-center">
            <i className="bi bi-cart-check display-4 mb-2"></i>
            <h3 className="h4" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{expenseData?.summary.totalGames || 0}</h3>
            <p className="mb-0">購入ゲーム数</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card danger">
          <div className="card-body text-center">
            <i className="bi bi-wallet2 display-4 mb-2"></i>
            <h3 className="h4" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>¥{(expenseData?.summary.totalExpenses || 0).toLocaleString()}</h3>
            <p className="mb-0">総支出額</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card info">
          <div className="card-body text-center">
            <i className="bi bi-currency-yen display-4 mb-2"></i>
            <h3 className="h4" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>¥{(expenseData?.summary.averagePrice || 0).toLocaleString()}</h3>
            <p className="mb-0">平均購入価格</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card success">
          <div className="card-body text-center">
            <i className="bi bi-piggy-bank display-4 mb-2"></i>
            <h3 className="h4" style={{ fontSize: 'clamp(1rem, 2vw, 1.5rem)', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>¥{(expenseData?.summary.totalSavings || 0).toLocaleString()}</h3>
            <p className="mb-0">節約額</p>
          </div>
        </div>
      </div>
      
      {/* Additional expense-specific metrics */}
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card warning">
          <div className="card-body text-center">
            <i className="bi bi-percent display-4 mb-2"></i>
            <h3 className="display-4">{(expenseData?.summary.savingsRate || 0).toFixed(1)}%</h3>
            <p className="mb-0">節約率</p>
          </div>
        </div>
      </div>
      <div className="col-lg-3 col-md-6 mb-3">
        <div className="card stats-card">
          <div className="card-body text-center">
            <i className="bi bi-calendar-month display-4 mb-2"></i>
            <h3 className="display-4">{expenseData?.monthlyTrends?.expenses?.length || 0}</h3>
            <p className="mb-0">購入期間（月）</p>
          </div>
        </div>
      </div>
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
    return <p className="text-muted">現在、設定した条件を満たしているゲームはありません。</p>
  }

  return (
    <div className="row">
      {alertTargetGames.map(game => {
        const latestPrice = game.latestPrice!
        return (
          <div key={game.id} className="col-md-6 col-lg-4 mb-3">
            <div className="card h-100 border-warning">
              <div className="card-body">
                <h6 className="card-title">
                  <a 
                    href={`https://store.steampowered.com/app/${game.steam_app_id}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-decoration-none"
                  >
                    {game.name}
                  </a>
                </h6>
                <p className="card-text">
                  <span className="badge bg-success me-2">
                    <i className="bi bi-check-circle-fill"></i> 条件達成
                  </span>
                  {!!game.was_unreleased && latestPrice.source !== 'steam_unreleased' && (
                    <span className="badge bg-info me-2">
                      <i className="bi bi-stars"></i> 新規リリース
                    </span>
                  )}
                  {latestPrice.is_on_sale && latestPrice.discount_percent && latestPrice.discount_percent > 0 && (
                    <span className="badge bg-success me-2">
                      {latestPrice.discount_percent}% OFF
                    </span>
                  )}
                </p>
                <p className="card-text">
                  <small className="text-muted">
                    現在: ¥{latestPrice.current_price.toLocaleString()}
                    {latestPrice.original_price > 0 && latestPrice.original_price !== latestPrice.current_price && (
                      <> (元価格: ¥{latestPrice.original_price.toLocaleString()})</>
                    )}
                    <br />
                    {game.price_threshold_type === 'price' && game.price_threshold && (
                      <>条件: ¥{game.price_threshold.toLocaleString()}以下</>
                    )}
                    {game.price_threshold_type === 'discount' && game.discount_threshold_percent && (
                      <>条件: {game.discount_threshold_percent}%以上割引</>
                    )}
                    {game.price_threshold_type === 'any_sale' && (
                      <>条件: セール開始時</>
                    )}
                  </small>
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Monitoring Details Component
interface MonitoringDetailsProps {
  games?: Game[]
}

const MonitoringDetails: React.FC<MonitoringDetailsProps> = ({ games }) => {
  if (!games || games.length === 0) {
    return <p className="text-muted">監視中のゲームがありません。</p>
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
    <div className="row">
      <div className="col-md-6">
        <h6>監視ステータス</h6>
        <ul className="list-unstyled">
          <li>
            <i className="bi bi-check-circle text-success me-2"></i>
            有効: {enabledGames.length}ゲーム
          </li>
          <li>
            <i className="bi bi-x-circle text-danger me-2"></i>
            無効: {disabledGames.length}ゲーム
          </li>
          <li>
            <i className="bi bi-bell text-warning me-2"></i>
            アラート有効: {alertEnabledGames.length}ゲーム
          </li>
        </ul>
      </div>
      <div className="col-md-6">
        <h6>最近更新されたゲーム</h6>
        {recentlyUpdated.length > 0 ? (
          <ul className="list-unstyled">
            {recentlyUpdated.map(game => (
              <li key={game.id} className="mb-1">
                <small>
                  {game.name} - {formatDateJP(game.latestPrice!.recorded_at, 'datetime')}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">まだ更新されたゲームがありません。</p>
        )}
      </div>
    </div>
  )
}