import React, { useState, useEffect } from 'react'
import { TabDashboardData, DashboardLayout } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { TabbedDashboard } from '../components/TabbedDashboard'
import { DashboardCustomizer } from '../components/DashboardCustomizer'
import { ReportGenerator } from '../components/ReportGenerator'
import { DataManager } from '../components/DataManager'

const EnhancedDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<TabDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout | null>(null)
  const [showCustomizer, setShowCustomizer] = useState(false)
  const [showReportGenerator, setShowReportGenerator] = useState(false)
  const [showDataManager, setShowDataManager] = useState(false)
  const { showError } = useAlert()

  useEffect(() => {
    loadDashboardData()
    loadDashboardLayout()
  }, [])

  const loadDashboardLayout = () => {
    try {
      const savedLayout = localStorage.getItem('dashboard_layout')
      if (savedLayout) {
        setDashboardLayout(JSON.parse(savedLayout))
      }
    } catch (error) {
      // Layout loading failed, use default
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const response = await api.get<TabDashboardData>('/games/dashboard')
      
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

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1><i className="bi bi-graph-up-arrow me-2"></i>拡張ダッシュボード</h1>
            
            {/* Control Buttons */}
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-primary-subtle text-primary">
                <i className="bi bi-star-fill me-1"></i>Enhanced Mode
              </span>
              
              <div className="btn-group" role="group">
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowCustomizer(true)}
                  title="ダッシュボードをカスタマイズ"
                >
                  <i className="bi bi-gear"></i>
                </button>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowReportGenerator(true)}
                  title="レポートを生成"
                >
                  <i className="bi bi-file-earmark-text"></i>
                </button>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowDataManager(true)}
                  title="データ管理"
                >
                  <i className="bi bi-hdd"></i>
                </button>
              </div>
              
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={loadDashboardData}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>更新
              </button>
            </div>
          </div>
          
          {/* Enhanced Dashboard Content */}
          <TabbedDashboard 
            dashboardData={dashboardData}
            loading={loading}
          />
          
          {/* Footer Info */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card bg-light">
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-md-4">
                      <h6 className="text-primary">
                        <i className="bi bi-grid-3x3 me-2"></i>概要タブ
                      </h6>
                      <p className="small text-muted mb-0">
                        監視統計と出費分析を統合表示
                      </p>
                    </div>
                    <div className="col-md-4">
                      <h6 className="text-success">
                        <i className="bi bi-activity me-2"></i>監視統計タブ
                      </h6>
                      <p className="small text-muted mb-0">
                        価格監視に特化した詳細分析
                      </p>
                    </div>
                    <div className="col-md-4">
                      <h6 className="text-warning">
                        <i className="bi bi-wallet2 me-2"></i>出費分析タブ
                      </h6>
                      <p className="small text-muted mb-0">
                        購入履歴と支出パターン分析
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showCustomizer && (
        <DashboardCustomizer
          currentLayout={dashboardLayout || undefined}
          onLayoutChange={(layout) => {
            setDashboardLayout(layout)
            loadDashboardLayout()
          }}
          onClose={() => setShowCustomizer(false)}
        />
      )}
      
      {showReportGenerator && (
        <ReportGenerator
          expenseData={dashboardData?.expenseData || null}
          onClose={() => setShowReportGenerator(false)}
        />
      )}
      
      {showDataManager && (
        <DataManager
          onClose={() => setShowDataManager(false)}
        />
      )}
    </div>
  )
}

export default EnhancedDashboard