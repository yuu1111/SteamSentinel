import React, { useState, useEffect } from 'react'
import { Game } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { AddGameModal, EditGameModal } from '../components/GameModals'
import { ImportGamesModal, useExportGames } from '../components/ImportExportModals'

const Games: React.FC = () => {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const { showError, showSuccess } = useAlert()
  const { exportGames, loading: exportLoading } = useExportGames()

  useEffect(() => {
    loadAllGames()
  }, [])

  const loadAllGames = async () => {
    try {
      setLoading(true)
      const response = await api.get('/games?enabled=all')
      
      if (response.success && response.data) {
        setGames(response.data)
      } else {
        showError('ゲーム一覧の取得に失敗しました')
      }
    } catch (error) {
      console.error('Failed to load games:', error)
      showError('ゲーム一覧の読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const deleteGame = async (gameId: number, gameName: string) => {
    if (!confirm(`"${gameName}" を削除してもよろしいですか？\n\nこの操作により、価格履歴とアラート履歴も削除されます。`)) {
      return
    }
    
    try {
      const response = await api.delete(`/games/${gameId}`)
      
      if (response.success) {
        showSuccess(`${gameName} を削除しました`)
        await loadAllGames()
      } else {
        showError('ゲームの削除に失敗しました: ' + response.error)
      }
    } catch (error) {
      console.error('Failed to delete game:', error)
      showError('ゲームの削除中にエラーが発生しました')
    }
  }

  const handleEditGame = (game: Game) => {
    setEditingGame(game)
    setShowEditModal(true)
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="row">
        <div className="col-12">
          <h2><i className="bi bi-collection me-2"></i>ゲーム管理</h2>
        </div>
        
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-gear me-2"></i>全ゲーム一覧 ({games.length}件)
                </h5>
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-success"
                    onClick={exportGames}
                    disabled={exportLoading}
                  >
                    <i className="bi bi-download"></i> エクスポート
                  </button>
                  <button 
                    className="btn btn-warning"
                    onClick={() => setShowImportModal(true)}
                  >
                    <i className="bi bi-upload"></i> インポート
                  </button>
                  <button 
                    className="btn btn-info"
                    onClick={loadAllGames}
                  >
                    <i className="bi bi-arrow-clockwise"></i> 更新
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    <i className="bi bi-plus-lg"></i> ゲームを追加
                  </button>
                </div>
              </div>
            </div>
            
            <div className="card-body">
              {games.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th style={{ whiteSpace: 'nowrap' }}>ゲーム名</th>
                        <th style={{ whiteSpace: 'nowrap' }}>監視状態</th>
                        <th style={{ whiteSpace: 'nowrap' }}>アラート条件</th>
                        <th style={{ whiteSpace: 'nowrap' }}>アラート</th>
                        <th style={{ whiteSpace: 'nowrap' }}>購入状況</th>
                        <th style={{ whiteSpace: 'nowrap' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {games.map(game => {
                        // 監視状態
                        const monitoringStatus = game.enabled ? 
                          <span className="badge bg-success">有効</span> : 
                          <span className="badge bg-secondary">無効</span>
                        
                        // アラート条件
                        let alertCondition = '-'
                        if (game.price_threshold_type === 'price' && game.price_threshold) {
                          alertCondition = `¥${game.price_threshold.toLocaleString()}以下`
                        } else if (game.price_threshold_type === 'discount' && game.discount_threshold_percent) {
                          alertCondition = `${game.discount_threshold_percent}%以上割引`
                        } else if (game.price_threshold_type === 'any_sale') {
                          alertCondition = 'セール開始時'
                        }
                        
                        // アラート状態
                        const alertStatus = game.alert_enabled ? 
                          <span className="badge bg-primary">有効</span> : 
                          <span className="badge bg-secondary">無効</span>
                        
                        // 購入状況
                        const purchaseStatus = game.is_purchased ? 
                          <span className="badge bg-info">購入済み</span> : 
                          <span className="badge bg-light text-dark">未購入</span>
                        
                        return (
                          <tr key={game.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <img 
                                  src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg`}
                                  alt={game.name}
                                  className="me-3"
                                  style={{ width: '60px', height: '28px', objectFit: 'cover' }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <div>
                                  <a 
                                    href={`https://store.steampowered.com/app/${game.steam_app_id}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-decoration-none"
                                  >
                                    {game.name}
                                  </a>
                                  <br />
                                  <small className="text-muted">ID: {game.steam_app_id}</small>
                                </div>
                              </div>
                            </td>
                            <td>{monitoringStatus}</td>
                            <td>{alertCondition}</td>
                            <td>{alertStatus}</td>
                            <td>{purchaseStatus}</td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => handleEditGame(game)}
                                  title="編集"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button 
                                  className="btn btn-outline-danger"
                                  onClick={() => deleteGame(game.id, game.name)}
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
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-collection display-1 text-muted d-block mb-3"></i>
                  <h5 className="text-muted">ゲームが登録されていません</h5>
                  <p className="text-muted">最初のゲームを追加して監視を開始してください。</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                  >
                    <i className="bi bi-plus-lg"></i> ゲームを追加
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
        onGameAdded={loadAllGames}
      />

      <EditGameModal
        show={showEditModal}
        game={editingGame}
        onHide={() => {
          setShowEditModal(false)
          setEditingGame(null)
        }}
        onGameUpdated={loadAllGames}
      />

      <ImportGamesModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImportCompleted={loadAllGames}
      />
    </>
  )
}

export default Games