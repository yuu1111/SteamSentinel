import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Typography, Avatar, Tag, Tooltip, Row, Col, Card, Spin } from 'antd'
import { AppstoreOutlined, PlusOutlined, SyncOutlined, DownloadOutlined, UploadOutlined, EditOutlined, DeleteOutlined, BarChartOutlined, DatabaseOutlined, BookOutlined, SettingOutlined, HddOutlined, PieChartOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { Game } from '../types'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { AddGameModal, EditGameModal } from '../components/GameModals'
import { ImportGamesModal, useExportGames } from '../components/ImportExportModals'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { PriceChartModal } from '../components/PriceChartModal'
import { DataManager } from '../components/DataManager'
import { DashboardCustomizer } from '../components/DashboardCustomizer'
import { ReportGenerator } from '../components/ReportGenerator'

const Games: React.FC = () => {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [gameToDelete, setGameToDelete] = useState<{id: number, name: string} | null>(null)
  const [showPriceChart, setShowPriceChart] = useState(false)
  const [chartGameId, setChartGameId] = useState<number | null>(null)
  const [chartGameName, setChartGameName] = useState('')
  const [updatingGameId, setUpdatingGameId] = useState<number | null>(null)
  const [showDataManager, setShowDataManager] = useState(false)
  const [showDashboardCustomizer, setShowDashboardCustomizer] = useState(false)
  const [showReportGenerator, setShowReportGenerator] = useState(false)
  const { showError, showSuccess } = useAlert()
  const { exportGames, loading: exportLoading } = useExportGames()

  useEffect(() => {
    loadAllGames()
  }, [])

  const loadAllGames = async (preserveScroll = false) => {
    const scrollPosition = preserveScroll ? window.scrollY : 0
    
    try {
      setLoading(true)
      const response = await api.get('/games?enabled=all')
      
      if (response.success && response.data) {
        setGames(response.data)
      } else {
        showError('ゲーム一覧の取得に失敗しました')
      }
    } catch {
      showError('ゲーム一覧の読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
      
      // スクロール位置を復元
      if (preserveScroll && scrollPosition > 0) {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition)
        })
      }
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
        await loadAllGames(true)
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

  const openSteamDB = (steamAppId: number) => {
    const url = `https://steamdb.info/app/${steamAppId}/`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const openBackloggd = (gameName: string) => {
    // Backloggd uses URL-friendly game names
    const urlFriendlyName = gameName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    
    const url = `https://backloggd.com/games/${urlFriendlyName}/`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleShowChart = (steamAppId: number, gameName: string) => {
    setChartGameId(steamAppId)
    setChartGameName(gameName)
    setShowPriceChart(true)
  }

  const runSingleMonitoring = async (steamAppId: number) => {
    setUpdatingGameId(steamAppId)
    try {
      const response = await api.post(`/monitoring/run/${steamAppId}`, {})
      
      if (response.success) {
        showSuccess('価格情報を更新しました')
        await loadAllGames(true)
      } else {
        showError('価格更新に失敗しました: ' + (response.error || '不明なエラー'))
      }
    } catch (error: any) {
      console.error('価格更新エラー:', error)
      showError(`価格更新中にエラーが発生しました: ${error.message || '不明なエラー'}`)
    } finally {
      setUpdatingGameId(null)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
        <Typography.Text style={{ display: 'block', marginTop: 16, color: '#666' }}>
          読み込み中...
        </Typography.Text>
      </div>
    )
  }

  const columns: ColumnsType<Game> = [
    {
      title: 'ゲーム名',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, record: Game) => (
        <Space>
          <Avatar 
            src={`https://cdn.akamai.steamstatic.com/steam/apps/${record.steam_app_id}/header.jpg`}
            size={40}
            shape="square"
          />
          <div>
            <Typography.Link 
              href={`https://store.steampowered.com/app/${record.steam_app_id}/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {name}
            </Typography.Link>
            <br />
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              ID: {record.steam_app_id}
            </Typography.Text>
          </div>
        </Space>
      )
    },
    {
      title: '監視状態',
      dataIndex: 'enabled',
      key: 'enabled',
      sorter: (a, b) => Number(b.enabled) - Number(a.enabled),
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>
          {enabled ? '有効' : '無効'}
        </Tag>
      )
    },
    {
      title: 'アラート条件',
      dataIndex: 'price_threshold_type',
      key: 'alertCondition',
      render: (_, record: Game) => {
        if (record.price_threshold_type === 'price' && record.price_threshold) {
          return `¥${record.price_threshold.toLocaleString()}以下`
        } else if (record.price_threshold_type === 'discount' && record.discount_threshold_percent) {
          return `${record.discount_threshold_percent}%以上割引`
        } else if (record.price_threshold_type === 'any_sale') {
          return 'セール開始時'
        }
        return '-'
      }
    },
    {
      title: 'アラート',
      dataIndex: 'alert_enabled',
      key: 'alertEnabled',
      sorter: (a, b) => Number(b.alert_enabled) - Number(a.alert_enabled),
      render: (alertEnabled: boolean) => (
        <Tag color={alertEnabled ? 'blue' : 'default'}>
          {alertEnabled ? '有効' : '無効'}
        </Tag>
      )
    },
    {
      title: '購入状況',
      dataIndex: 'is_purchased',
      key: 'purchased',
      sorter: (a, b) => Number(b.is_purchased) - Number(a.is_purchased),
      render: (isPurchased: boolean) => (
        <Tag color={isPurchased ? 'cyan' : 'default'}>
          {isPurchased ? '購入済み' : '未購入'}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 300, // 幅を拡大
      render: (_, record: Game) => (
        <Space size="small" wrap>
          <Tooltip title="価格推移">
            <Button
              size="middle"
              icon={<BarChartOutlined />}
              onClick={() => handleShowChart(record.steam_app_id, record.name)}
            />
          </Tooltip>
          <Tooltip title="SteamDB">
            <Button
              size="middle"
              icon={<DatabaseOutlined />}
              onClick={() => openSteamDB(record.steam_app_id)}
            />
          </Tooltip>
          <Tooltip title="Backloggd">
            <Button
              size="middle"
              icon={<BookOutlined />}
              onClick={() => openBackloggd(record.name)}
            />
          </Tooltip>
          <Tooltip title="編集">
            <Button
              size="middle"
              icon={<EditOutlined />}
              onClick={() => handleEditGame(record)}
            />
          </Tooltip>
          <Tooltip title="手動更新">
            <Button
              size="middle"
              icon={<SyncOutlined spin={updatingGameId === record.steam_app_id} />}
              onClick={() => runSingleMonitoring(record.steam_app_id)}
              loading={updatingGameId === record.steam_app_id}
              disabled={updatingGameId !== null && updatingGameId !== record.steam_app_id}
            />
          </Tooltip>
          <Tooltip title="削除">
            <Button
              size="middle"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteGame(record.id, record.name)}
            />
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '0 24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Typography.Title level={2}>
            <AppstoreOutlined style={{ marginRight: 8 }} />
            ゲーム管理
          </Typography.Title>
        </Col>
        
        <Col span={24}>
          <Card
            title={
              <span>
                <AppstoreOutlined style={{ marginRight: 8 }} />
                全ゲーム一覧 ({games.length}件)
              </span>
            }
            extra={
              <Space wrap>
                <Button 
                  icon={<HddOutlined />}
                  onClick={() => setShowDataManager(true)}
                  size="middle"
                >
                  データ管理
                </Button>
                <Button 
                  icon={<SettingOutlined />}
                  onClick={() => setShowDashboardCustomizer(true)}
                  size="middle"
                >
                  ダッシュボード設定
                </Button>
                <Button 
                  icon={<PieChartOutlined />}
                  onClick={() => setShowReportGenerator(true)}
                  size="middle"
                >
                  レポート生成
                </Button>
                <Button 
                  type="default"
                  icon={<DownloadOutlined />}
                  onClick={exportGames}
                  loading={exportLoading}
                  size="middle"
                >
                  エクスポート
                </Button>
                <Button 
                  icon={<UploadOutlined />}
                  onClick={() => setShowImportModal(true)}
                  size="middle"
                >
                  インポート
                </Button>
                <Button 
                  icon={<SyncOutlined />}
                  onClick={() => loadAllGames(true)}
                  size="middle"
                >
                  更新
                </Button>
                <Button 
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowAddModal(true)}
                  size="middle"
                >
                  ゲームを追加
                </Button>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={games}
              rowKey="id"
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: 1200 }}
              locale={{
                emptyText: (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <AppstoreOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: 16 }} />
                    <Typography.Title level={5} type="secondary">
                      ゲームが登録されていません
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      最初のゲームを追加して監視を開始してください。
                    </Typography.Text>
                    <br />
                    <Button 
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ marginTop: 16 }}
                      onClick={() => setShowAddModal(true)}
                    >
                      ゲームを追加
                    </Button>
                  </div>
                )
              }}
            />
          </Card>
        </Col>
      </Row>

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
        onGameUpdated={() => {
          loadAllGames(true)
        }}
      />

      <ImportGamesModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImportCompleted={loadAllGames}
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

      <PriceChartModal
        show={showPriceChart}
        steamAppId={chartGameId}
        gameName={chartGameName}
        onHide={() => {
          setShowPriceChart(false)
          setChartGameId(null)
          setChartGameName('')
        }}
      />

      <DataManager
        show={showDataManager}
        onClose={() => setShowDataManager(false)}
      />

      <DashboardCustomizer
        show={showDashboardCustomizer}
        onClose={() => setShowDashboardCustomizer(false)}
      />

      <ReportGenerator
        show={showReportGenerator}
        expenseData={null}
        onClose={() => setShowReportGenerator(false)}
      />
    </div>
  )
}

export default Games