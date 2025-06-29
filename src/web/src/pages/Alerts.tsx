import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { AlertData } from '../types'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { formatDateJP } from '../utils/dateUtils'

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
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

  const handleClearAllAlerts = () => {
    setShowConfirmModal(true)
  }

  const clearAllAlerts = async () => {
    
    try {
      const response = await api.delete('/alerts')
      
      if (response.success) {
        setAlerts([])
        setCurrentPage(1)
        setTotalPages(1)
        showSuccess(response.message || 'アラート履歴を削除しました')
      } else {
        showError('アラート履歴の削除に失敗しました')
      }
    } catch {
      showError('アラート履歴の削除中にエラーが発生しました')
    }
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'new_low':
        return 'bi-graph-down-arrow'
      case 'sale_start':
        return 'bi-tag'
      case 'threshold_met':
        return 'bi-bell'
      case 'free_game':
        return 'bi-gift'
      case 'game_released':
        return 'bi-rocket'
      default:
        return 'bi-bell'
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
      case 'new_low': return '#dc3545' // danger red
      case 'sale_start': return '#198754' // success green
      case 'threshold_met': return '#fd7e14' // warning orange
      case 'free_game': return '#0d6efd' // primary blue
      case 'game_released': return '#6f42c1' // purple
      default: return '#6c757d' // secondary gray
    }
  }

  const getAlertColorClass = (alertType: string) => {
    switch(alertType) {
      case 'new_low': return 'danger'
      case 'sale_start': return 'success'
      case 'threshold_met': return 'warning'
      case 'free_game': return 'primary'
      case 'game_released': return 'info'
      default: return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return formatDateJP(dateString, 'datetime')
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
        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
          <button className="page-link" onClick={() => setCurrentPage(i)}>
            {i}
          </button>
        </li>
      )
    }

    return (
      <nav aria-label="アラート履歴ページネーション">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              最初
            </button>
          </li>
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              前へ
            </button>
          </li>
          {pages}
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              次へ
            </button>
          </li>
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              最後
            </button>
          </li>
        </ul>
      </nav>
    )
  }

  return (
    <div className="row">
      <div className="col-12">
        <h2><i className="bi bi-bell me-2"></i>アラート履歴</h2>
      </div>
      
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                アラート履歴 ({alerts.length}件)
              </h5>
              <div className="d-flex gap-2">
                <select 
                  className="form-select form-select-sm"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  style={{ width: 'auto' }}
                >
                  <option value="all">すべて</option>
                  <option value="new_low">新最安値</option>
                  <option value="sale_start">セール開始</option>
                  <option value="threshold_met">価格閾値達成</option>
                  <option value="free_game">無料ゲーム</option>
                </select>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={handleClearAllAlerts}
                  disabled={alerts.length === 0}
                >
                  <i className="bi bi-trash"></i> すべて削除
                </button>
              </div>
            </div>
          </div>
          
          <div className="card-body">
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
              </div>
            ) : alerts.length > 0 ? (
              <>
                <div className="list-group">
                  {alerts.map(alert => (
                    <div key={alert.id} className="list-group-item border-start border-4" style={{ borderLeftColor: getAlertColor(alert.alert_type) + ' !important' }}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-2">
                            <i className={`bi ${getAlertIcon(alert.alert_type)} me-2 text-${getAlertColorClass(alert.alert_type)}`}></i>
                            <span className={`badge bg-${getAlertColorClass(alert.alert_type)} me-2`}>
                              {getAlertTypeLabel(alert.alert_type)}
                            </span>
                            <strong>{alert.game_name || alert.game?.name || 'ゲーム名不明'}</strong>
                          </div>
                          <p className="mb-1">{alert.message}</p>
                          {alert.price_data && (
                            <div className="small mb-2">
                              <span className="badge bg-light text-dark me-2">
                                価格: ¥{alert.price_data.current_price?.toLocaleString() || '不明'}
                              </span>
                              {alert.price_data.is_on_sale && (
                                <span className="badge bg-success">
                                  {alert.price_data.discount_percent || 0}% OFF
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-end">
                          <small className="text-muted">
                            {formatDate(alert.created_at)}
                          </small>
                          {(alert.steam_app_id || alert.game?.steam_app_id) && (
                            <div className="mt-1">
                              <a
                                href={`https://store.steampowered.com/app/${alert.steam_app_id || alert.game?.steam_app_id}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline-primary btn-sm"
                              >
                                <i className="bi bi-box-arrow-up-right"></i> Steam
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  {renderPagination()}
                </div>
              </>
            ) : (
              <div className="text-center py-5">
                <i className="bi bi-bell-slash display-1 text-muted d-block mb-3"></i>
                <h5 className="text-muted">アラート履歴がありません</h5>
                <p className="text-muted">
                  {filter === 'all' 
                    ? 'まだアラートが発生していません。ゲームを追加して監視を開始してください。'
                    : '選択したフィルターに該当するアラートがありません。'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        show={showConfirmModal}
        title="アラート履歴を削除"
        message="すべてのアラート履歴を削除してもよろしいですか？\nこの操作は元に戻せません。"
        confirmText="削除"
        onConfirm={clearAllAlerts}
        onCancel={() => setShowConfirmModal(false)}
        variant="danger"
      />
    </div>
  )
}

export default Alerts