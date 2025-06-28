import React, { useState, useEffect } from 'react'
import { TabDashboardData } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { TabbedDashboard } from '../components/TabbedDashboard'

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<TabDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { showError } = useAlert()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const dashboardResponse = await api.get<any>('/games/dashboard')
      
      if (dashboardResponse.success && dashboardResponse.data) {
        const tabDashboardData: TabDashboardData = {
          games: dashboardResponse.data.games,
          statistics: dashboardResponse.data.statistics
        }
        setDashboardData(tabDashboardData)
      } else {
        showError('ダッシュボードデータの読み込みに失敗しました')
      }
    } catch {
      showError('ダッシュボードデータの読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
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
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <h1 className="mb-0">
              <i className="bi bi-house-door me-2"></i>
              ダッシュボード
            </h1>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-outline-primary btn-sm">
                <i className="bi bi-gear me-1"></i>カスタマイズ
              </button>
              <button className="btn btn-outline-secondary btn-sm">
                <i className="bi bi-file-earmark me-1"></i>レポート
              </button>
              <button className="btn btn-outline-info btn-sm">
                <i className="bi bi-database me-1"></i>データ管理
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <TabbedDashboard 
            dashboardData={dashboardData}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard