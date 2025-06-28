import React, { useState, useEffect } from 'react'
import { TabDashboardData, Statistics, ExpenseData } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { ExpenseAnalyticsCharts } from './ExpenseAnalyticsCharts'
import { ROIAnalyzer } from './ROIAnalyzer'
import { BudgetManager } from './BudgetManager'
import { SpendingAlerts } from './SpendingAlerts'

interface TabbedDashboardProps {
  dashboardData: TabDashboardData | null
  loading: boolean
}

export const TabbedDashboard: React.FC<TabbedDashboardProps> = ({
  dashboardData,
  loading
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'monitoring' | 'expenses'>('overview')
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
            className={getTabClass('monitoring')}
            onClick={() => setActiveTab('monitoring')}
            type="button"
            role="tab"
          >
            <i className="bi bi-activity me-2"></i>監視統計
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

        {/* Monitoring Tab */}
        {activeTab === 'monitoring' && (
          <MonitoringDashboard 
            dashboardData={dashboardData}
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
  return (
    <div className="row">
      {/* Integrated Statistics Cards */}
      <IntegratedStatisticsCards 
        statistics={dashboardData?.statistics}
        expenseData={expenseData}
      />
      
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
    </div>
  )
}

// Monitoring Dashboard Component
interface MonitoringDashboardProps {
  dashboardData: TabDashboardData | null
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  dashboardData
}) => {
  return (
    <div className="row">
      {/* Monitoring-specific Statistics */}
      <MonitoringStatisticsCards statistics={dashboardData?.statistics} />
      
      {/* Monitoring specific content will be added here */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-activity me-2"></i>監視詳細統計
            </h5>
          </div>
          <div className="card-body">
            <p className="text-muted">監視特化の詳細ダッシュボードは今後実装予定です。</p>
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
                          <td>{new Date(purchase.created_at).toLocaleDateString('ja-JP')}</td>
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

// Monitoring-specific Statistics Cards
interface MonitoringStatisticsCardsProps {
  statistics?: Statistics
}

const MonitoringStatisticsCards: React.FC<MonitoringStatisticsCardsProps> = ({
  statistics
}) => {
  return (
    <>
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