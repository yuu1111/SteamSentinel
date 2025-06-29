import React, { useState, useEffect } from 'react'
import { Row, Col, Typography, Space, Button, Spin } from 'antd'
import { HomeOutlined, SettingOutlined, FileTextOutlined, DatabaseOutlined } from '@ant-design/icons'
import { TabDashboardData } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { TabbedDashboard } from '../components/TabbedDashboard'

const { Title } = Typography

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
              <Button icon={<SettingOutlined />} size="middle">
                カスタマイズ
              </Button>
              <Button icon={<FileTextOutlined />} size="middle">
                レポート
              </Button>
              <Button icon={<DatabaseOutlined />} size="middle" type="primary">
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
          />
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard