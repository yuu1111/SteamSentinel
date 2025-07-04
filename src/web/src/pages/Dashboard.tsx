import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Typography, Space, Button, Spin } from 'antd'
import { HomeOutlined, SettingOutlined, FileTextOutlined, DatabaseOutlined } from '@ant-design/icons'
import { TabDashboardData } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { TabbedDashboard } from '../components/TabbedDashboard'
import { DashboardCustomizer } from '../components/DashboardCustomizer'
import { ReportGenerator } from '../components/ReportGenerator'
import { DataManager } from '../components/DataManager'

const { Title } = Typography

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<TabDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDashboardCustomizer, setShowDashboardCustomizer] = useState(false)
  const [showReportGenerator, setShowReportGenerator] = useState(false)
  const [showDataManager, setShowDataManager] = useState(false)
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

  const handleShowGameDetail = (steamAppId: number) => {
    console.log('handleShowGameDetail called with steamAppId:', steamAppId)
    navigate(`/games/${steamAppId}`)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#666' }}>ダッシュボードを読み込み中...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 24px' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={24}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <Title level={2} style={{ margin: 0 }}>
              <HomeOutlined style={{ marginRight: 8 }} />
              ダッシュボード
            </Title>
            <Space wrap>
              <Button 
                icon={<SettingOutlined />} 
                size="middle"
                onClick={() => setShowDashboardCustomizer(true)}
              >
                カスタマイズ
              </Button>
              <Button 
                icon={<FileTextOutlined />} 
                size="middle"
                onClick={() => setShowReportGenerator(true)}
              >
                レポート
              </Button>
              <Button 
                icon={<DatabaseOutlined />} 
                size="middle"
                onClick={() => setShowDataManager(true)}
              >
                データ管理
              </Button>
            </Space>
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <TabbedDashboard 
            dashboardData={dashboardData}
            loading={loading}
            onRefresh={loadDashboardData}
            onShowGameDetail={handleShowGameDetail}
          />
        </Col>
      </Row>

      {/* Modals */}
      <DashboardCustomizer
        show={showDashboardCustomizer}
        currentLayout={(() => {
          try {
            const saved = localStorage.getItem('dashboard_layout')
            return saved ? JSON.parse(saved) : undefined
          } catch {
            return undefined
          }
        })()}
        onLayoutChange={(layout) => {
          localStorage.setItem('dashboard_layout', JSON.stringify(layout))
          window.dispatchEvent(new CustomEvent('dashboardLayoutChanged', { detail: layout }))
        }}
        onClose={() => setShowDashboardCustomizer(false)}
      />

      <ReportGenerator
        show={showReportGenerator}
        expenseData={null}
        onClose={() => setShowReportGenerator(false)}
      />

      <DataManager
        show={showDataManager}
        onClose={() => setShowDataManager(false)}
      />

    </div>
  )
}

export default Dashboard