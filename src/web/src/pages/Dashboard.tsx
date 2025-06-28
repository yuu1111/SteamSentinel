import React, { useState, useEffect } from 'react'
import { Game, DashboardData, Statistics } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { AddGameModal, EditGameModal } from '../components/GameModals'
import { PriceChartModal } from '../components/PriceChartModal'
import { ImportGamesModal, useExportGames } from '../components/ImportExportModals'
import { MonitoringProgress } from '../components/MonitoringProgress'
import { SpecialGameStatus } from '../components/SpecialGameStatus'
import { useTableSort } from '../hooks/useTableSort'
import { ConfirmationModal } from '../components/ConfirmationModal'

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showChartModal, setShowChartModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [chartGame, setChartGame] = useState<{ steamAppId: number; name: string } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<{id: number, name: string} | null>(null)
  const { showError, showSuccess, showInfo } = useAlert()
  const { exportGames, loading: exportLoading } = useExportGames()
  const { sortedGames, handleSort, getSortIcon } = useTableSort(dashboardData?.games || [])

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Initialize Bootstrap tooltips when dashboard data changes
  useEffect(() => {
    if (dashboardData) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
        const tooltipList = Array.from(tooltipTriggerList).map(tooltipTriggerEl => 
          new (window as any).bootstrap.Tooltip(tooltipTriggerEl)
        )
        
        // Store tooltips for cleanup
        ;(window as any).__tooltips = tooltipList
      }, 100)
      
      return () => {
        clearTimeout(timer)
        // Cleanup existing tooltips
        if ((window as any).__tooltips) {
          (window as any).__tooltips.forEach((tooltip: any) => tooltip.dispose())
        }
      }
    }
    return undefined
  }, [dashboardData])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const response = await api.get<DashboardData>('/games/dashboard')
      
      if (response.success && response.data) {
        setDashboardData(response.data)
      } else {
        showError('ダッシュボードデータの読み込みに失敗しました')
      }
    } catch {
      showError('ダッシュボードデータの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const refreshGameList = async () => {
    await loadDashboardData()
    showSuccess('ゲームリストを更新しました')
  }


  const runSingleGameMonitoring = async (steamAppId: number) => {
    try {
      showInfo('価格情報を取得中...')
      const response = await api.post(`/monitoring/run/${steamAppId}`)
      
      if (response.success) {
        showSuccess('ゲームの価格を更新しました')
        // ローディング画面を表示せずにデータのみ更新
        await refreshDataWithoutLoading()
      } else {
        showError('価格更新に失敗しました: ' + response.error)
      }
    } catch {
      showError('価格更新中にエラーが発生しました')
    }
  }

  const refreshDataWithoutLoading = async () => {
    try {
      const response = await api.get<DashboardData>('/games/dashboard')
      
      if (response.success && response.data) {
        setDashboardData(response.data)
      } else {
        showError('ダッシュボードデータの読み込みに失敗しました')
      }
    } catch {
      showError('ダッシュボードデータの読み込み中にエラーが発生しました')
    }
  }

  const handleDeleteGame = (gameId: number, gameName: string) => {
    setGameToDelete({ id: gameId, name: gameName })
    setShowDeleteModal(true)
  }

  const deleteGame = async () => {
    if (!gameToDelete) {
      return
    }
    
    try {
      const response = await api.delete(`/games/${gameToDelete.id}`)
      
      if (response.success) {
        showSuccess(`${gameToDelete.name} を削除しました`)
        await loadDashboardData()
      } else {
        showError('ゲームの削除に失敗しました: ' + response.error)
      }
    } catch {
      showError('ゲームの削除中にエラーが発生しました')
    }
  }

  const handleEditGame = (game: Game) => {
    setEditingGame(game)
    setShowEditModal(true)
  }

  const handleShowChart = (steamAppId: number, gameName: string) => {
    setChartGame({ steamAppId, name: gameName })
    setShowChartModal(true)
  }

  if (loading) {
    return (
      <div className="text-center py-5 loading-immediate">
        <div className="spinner-border text-primary spinner-border-fast" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">読み込み中...</span>
        </div>
        <p className="mt-3 text-muted">ダッシュボードを読み込み中...</p>
      </div>
    )
  }

  return (
    <>
      <div className="row">
        <div className="col-12">
          <h2><i className="bi bi-house-door me-2"></i>ダッシュボード</h2>
        </div>

        {/* Statistics Cards */}
        {dashboardData?.statistics && (
          <StatisticsCards statistics={dashboardData.statistics} />
        )}

        {/* Monitoring Progress */}
        <MonitoringProgress onMonitoringComplete={loadDashboardData} />

        {/* Special Game Status Alert */}
        {dashboardData?.games && (
          <SpecialGameStatus games={dashboardData.games} />
        )}

        {/* Games Table */}
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                <h5 className="mb-0">
                  <i className="bi bi-collection me-2"></i>監視中のゲーム ({dashboardData?.games?.length || 0}件)
                </h5>
                <div className="d-flex flex-wrap gap-2">
                  <button 
                    className="btn btn-success"
                    onClick={exportGames}
                    disabled={exportLoading}
                  >
                    <i className="bi bi-download"></i>
                    <span className="d-none d-sm-inline ms-1">エクスポート</span>
                  </button>
                  <button 
                    className="btn btn-warning"
                    onClick={() => setShowImportModal(true)}
                  >
                    <i className="bi bi-upload"></i>
                    <span className="d-none d-sm-inline ms-1">インポート</span>
                  </button>
                  <button 
                    className="btn btn-info"
                    onClick={refreshGameList}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                    <span className="d-none d-sm-inline ms-1">更新</span>
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    <i className="bi bi-plus-lg"></i>
                    <span className="d-none d-sm-inline ms-1">ゲームを追加</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body">
              {dashboardData?.games && dashboardData.games.length > 0 ? (
                <GamesTable 
                  games={sortedGames}
                  onEditGame={handleEditGame}
                  onDeleteGame={handleDeleteGame}
                  onShowChart={handleShowChart}
                  onRunSingleMonitoring={runSingleGameMonitoring}
                  onSort={handleSort}
                  getSortIcon={getSortIcon}
                />
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-inbox display-1 d-block mb-3"></i>
                  <p>監視中のゲームがありません</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    <i className="bi bi-plus-lg"></i> 最初のゲームを追加
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddGameModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onGameAdded={refreshDataWithoutLoading}
      />

      <EditGameModal
        show={showEditModal}
        game={editingGame}
        onHide={() => {
          setShowEditModal(false)
          setEditingGame(null)
        }}
        onGameUpdated={refreshDataWithoutLoading}
      />

      <ImportGamesModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImportCompleted={refreshDataWithoutLoading}
      />

      <PriceChartModal
        show={showChartModal}
        steamAppId={chartGame?.steamAppId || null}
        gameName={chartGame?.name || ''}
        onHide={() => {
          setShowChartModal(false)
          setChartGame(null)
        }}
      />

      <ConfirmationModal
        show={showDeleteModal}
        title="ゲームを削除"
        message={`"${gameToDelete?.name}" を削除してもよろしいですか？\n\nこの操作により、価格履歴とアラート履歴も削除されます。`}
        confirmText="削除"
        onConfirm={deleteGame}
        onCancel={() => {
          setShowDeleteModal(false)
          setGameToDelete(null)
        }}
        variant="danger"
      />
    </>
  )
}

interface StatisticsCardsProps {
  statistics: Statistics
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ statistics }) => {
  return (
    <>
      <div className="col-md-3 col-sm-6 mb-3">
        <div className="card stats-card info">
          <div className="card-body text-center">
            <i className="bi bi-collection display-4 mb-2"></i>
            <h3 className="display-4">{statistics.gamesTracked || 0}</h3>
            <p className="mb-0">監視中のゲーム</p>
          </div>
        </div>
      </div>
      <div className="col-md-3 col-sm-6 mb-3">
        <div className="card stats-card success">
          <div className="card-body text-center">
            <i className="bi bi-tag display-4 mb-2"></i>
            <h3 className="display-4">{statistics.gamesOnSale || 0}</h3>
            <p className="mb-0">セール中</p>
          </div>
        </div>
      </div>
      <div className="col-md-3 col-sm-6 mb-3">
        <div className="card stats-card warning">
          <div className="card-body text-center">
            <i className="bi bi-bell display-4 mb-2"></i>
            <h3 className="display-4">{statistics.totalAlerts || 0}</h3>
            <p className="mb-0">総アラート数</p>
          </div>
        </div>
      </div>
      <div className="col-md-3 col-sm-6 mb-3">
        <div className="card stats-card">
          <div className="card-body text-center">
            <i className="bi bi-percent display-4 mb-2"></i>
            <h3 className="display-4">{statistics.averageDiscount || 0}%</h3>
            <p className="mb-0">平均割引率</p>
          </div>
        </div>
      </div>
    </>
  )
}

interface GamesTableProps {
  games: Game[]
  onEditGame: (game: Game) => void
  onDeleteGame: (gameId: number, gameName: string) => void
  onShowChart: (steamAppId: number, gameName: string) => void
  onRunSingleMonitoring: (steamAppId: number) => void
  onSort: (column: any) => void
  getSortIcon: (column: any) => string
}

const GamesTable: React.FC<GamesTableProps> = ({ 
  games, 
  onEditGame, 
  onDeleteGame, 
  onShowChart, 
  onRunSingleMonitoring,
  onSort,
  getSortIcon
}) => {
  const openSteamDB = (steamAppId: number) => {
    const url = `https://steamdb.info/app/${steamAppId}/`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th 
              className="sortable" 
              style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onSort('name')}
            >
              ゲーム名 <i className={getSortIcon('name')}></i>
            </th>
            <th 
              className="sortable d-none d-sm-table-cell" 
              style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onSort('currentPrice')}
            >
              現在価格 <i className={getSortIcon('currentPrice')}></i>
            </th>
            <th 
              className="sortable d-none d-lg-table-cell" 
              style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onSort('originalPrice')}
            >
              元価格 <i className={getSortIcon('originalPrice')}></i>
            </th>
            <th 
              className="sortable d-none d-md-table-cell" 
              style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onSort('discountPercent')}
            >
              割引率 <i className={getSortIcon('discountPercent')}></i>
            </th>
            <th 
              className="sortable d-none d-lg-table-cell" 
              style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onSort('historicalLow')}
            >
              歴代最安値 
              <span className="position-relative d-inline-block">
                <i className="bi bi-info-circle text-warning ms-1 info-icon-hover" data-bs-toggle="tooltip" data-bs-placement="top" title="過去6ヶ月間のデータのみ。詳細は制限事項ページを参照"></i>
              </span>
              <i className={getSortIcon('historicalLow')}></i>
            </th>
            <th 
              className="sortable" 
              style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onSort('isOnSale')}
            >
              <span className="d-none d-sm-inline">セール中</span>
              <span className="d-sm-none">セール</span> 
              <i className={getSortIcon('isOnSale')}></i>
            </th>
            <th 
              className="sortable d-none d-xl-table-cell" 
              style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onSort('lastUpdated')}
            >
              最終更新 <i className={getSortIcon('lastUpdated')}></i>
            </th>
            <th style={{ whiteSpace: 'nowrap' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {games.map(game => {
            const latestPrice = game.latestPrice
            const currentPrice = latestPrice?.current_price || 0
            const originalPrice = latestPrice?.original_price || 0
            const discountPercent = latestPrice?.discount_percent || 0
            const historicalLow = latestPrice?.historical_low || 0
            const isOnSale = latestPrice?.is_on_sale || false
            const lastUpdated = latestPrice ? 
              new Date(latestPrice.recorded_at).toLocaleString('ja-JP') : 
              '未取得'

            return (
              <tr key={game.id}>
                <td>
                  <div className="d-flex align-items-center">
                    <img 
                      src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg`}
                      alt={game.name}
                      className="game-header-img me-3 d-none d-md-block"
                      style={{ width: '60px', height: '28px', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div>
                      <a 
                        href={`https://store.steampowered.com/app/${game.steam_app_id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="steam-link"
                      >
                        <i className="bi bi-box-arrow-up-right me-1"></i>
                        {game.name}
                      </a>
                      <br />
                      <small className="text-muted d-none d-sm-inline">
                        ID: {game.steam_app_id}
                        {latestPrice?.source === 'steam_unreleased' && latestPrice?.release_date && (
                          <span className="ms-2">
                            <i className="bi bi-calendar text-warning me-1"></i>
                            {latestPrice.release_date}
                          </span>
                        )}
                      </small>
                    </div>
                  </div>
                </td>
                <td className="d-none d-sm-table-cell">
                  {latestPrice?.source === 'steam_free' ? (
                    <span className="badge bg-info">無料</span>
                  ) : latestPrice?.source === 'steam_unreleased' ? (
                    <span className="badge bg-warning">未発売</span>
                  ) : latestPrice?.source === 'steam_removed' ? (
                    <span className="badge bg-danger">販売終了</span>
                  ) : currentPrice > 0 ? (
                    isOnSale ? (
                      <>
                        <span className="price sale">¥{currentPrice.toLocaleString()}</span>
                        <br />
                        <small className="price old">¥{originalPrice.toLocaleString()}</small>
                      </>
                    ) : (
                      <span className="price">¥{currentPrice.toLocaleString()}</span>
                    )
                  ) : (
                    <span className="text-muted">価格未取得</span>
                  )}
                </td>
                <td className="d-none d-lg-table-cell">
                  {latestPrice?.source === 'steam_free' ? (
                    <span className="badge bg-info">無料</span>
                  ) : latestPrice?.source === 'steam_unreleased' ? (
                    <span className="badge bg-warning">未発売</span>
                  ) : latestPrice?.source === 'steam_removed' ? (
                    <span className="badge bg-danger">販売終了</span>
                  ) : originalPrice > 0 ? (
                    `¥${originalPrice.toLocaleString()}`
                  ) : (
                    '-'
                  )}
                </td>
                <td className="d-none d-md-table-cell">
                  {discountPercent > 0 ? (
                    <span className="discount-badge">{discountPercent}% OFF</span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="d-none d-lg-table-cell">
                  {historicalLow > 0 ? `¥${historicalLow.toLocaleString()}` : '-'}
                </td>
                <td>
                  {latestPrice?.source === 'steam_free' ? (
                    <span className="badge bg-info">
                      <i className="bi bi-gift"></i> 基本無料
                    </span>
                  ) : latestPrice?.source === 'steam_unreleased' ? (
                    <span className="badge bg-warning">
                      <i className="bi bi-calendar-plus"></i> 未発売
                    </span>
                  ) : latestPrice?.source === 'steam_removed' ? (
                    <span className="badge bg-danger">
                      <i className="bi bi-x-circle"></i> 販売終了
                    </span>
                  ) : isOnSale ? (
                    <span className="badge bg-success">
                      <i className="bi bi-check-circle"></i> セール中
                    </span>
                  ) : (
                    <span className="badge bg-secondary">通常価格</span>
                  )}
                </td>
                <td className="d-none d-xl-table-cell">
                  <small>{lastUpdated}</small>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-btn"
                      onClick={() => onShowChart(game.steam_app_id, game.name)}
                      title="価格推移"
                    >
                      <i className="bi bi-graph-up"></i>
                    </button>
                    <button 
                      className="action-btn d-none d-md-inline-block"
                      onClick={() => openSteamDB(game.steam_app_id)}
                      title="SteamDB"
                    >
                      <i className="bi bi-database"></i>
                    </button>
                    <button 
                      className="action-btn" 
                      onClick={() => onEditGame(game)}
                      title="編集"
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      className="action-btn d-none d-sm-inline-block"
                      onClick={() => onRunSingleMonitoring(game.steam_app_id)}
                      title="手動更新"
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                    </button>
                    <button 
                      className="action-btn danger" 
                      onClick={() => onDeleteGame(game.id, game.name)}
                      title="削除"
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default Dashboard