import React, { useState } from 'react'
import { Modal, Card, Typography, Tabs, Row, Col, Button, Table, Space, Alert, Upload, Spin, Tag, Popconfirm } from 'antd'
import { CloudUploadOutlined, CloudDownloadOutlined, UploadOutlined, DownloadOutlined, HddOutlined, SettingOutlined, BarChartOutlined, WalletOutlined, DeleteOutlined, InboxOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { DataBackup } from '../types'
import { useAlert } from '../contexts/AlertContext'

const { Text, Title } = Typography
const { TabPane } = Tabs

interface DataManagerProps {
  show: boolean
  onClose: () => void
}

export const DataManager: React.FC<DataManagerProps> = ({ show, onClose }) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'import' | 'export'>('backup')
  const [backups, setBackups] = useState<DataBackup[]>(getExistingBackups())
  const [selectedBackup, setSelectedBackup] = useState<DataBackup | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { showSuccess, showError, showWarning } = useAlert()

  function getExistingBackups(): DataBackup[] {
    const stored = localStorage.getItem('steamsentinel_backups')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return []
      }
    }
    return []
  }

  const createBackup = (type: DataBackup['type']) => {
    try {
      let data: Record<string, any> = {}
      let name = ''
      
      switch (type) {
        case 'full':
          data = {
            layouts: localStorage.getItem('dashboard_layout'),
            preferences: localStorage.getItem('user_preferences'),
            budgets: localStorage.getItem('budgets'),
            settings: localStorage.getItem('app_settings')
          }
          name = `完全バックアップ_${new Date().toISOString().split('T')[0]}`
          break
          
        case 'settings':
          data = {
            preferences: localStorage.getItem('user_preferences'),
            settings: localStorage.getItem('app_settings')
          }
          name = `設定バックアップ_${new Date().toISOString().split('T')[0]}`
          break
          
        case 'expense_data':
          data = {
            budgets: localStorage.getItem('budgets'),
            expenses: localStorage.getItem('expense_data')
          }
          name = `出費データバックアップ_${new Date().toISOString().split('T')[0]}`
          break
          
        case 'budgets':
          data = {
            budgets: localStorage.getItem('budgets')
          }
          name = `予算バックアップ_${new Date().toISOString().split('T')[0]}`
          break
      }

      const backup: DataBackup = {
        id: Date.now().toString(),
        name,
        type,
        data,
        size: JSON.stringify(data).length,
        created_at: new Date().toISOString(),
        checksum: generateChecksum(data)
      }

      const newBackups = [...backups, backup]
      setBackups(newBackups)
      localStorage.setItem('steamsentinel_backups', JSON.stringify(newBackups))
      
      showSuccess(`${getBackupTypeName(type)}を作成しました`)
    } catch (error) {
      showError('バックアップの作成に失敗しました')
    }
  }

  const restoreBackup = async (backup: DataBackup) => {
    try {
      if (!verifyChecksum(backup)) {
        showError('バックアップファイルが破損している可能性があります')
        return
      }

      Object.entries(backup.data).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value)
        }
      })

      showSuccess(`${backup.name}を復元しました。ページを更新してください。`)
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      showError('バックアップの復元に失敗しました')
    }
  }

  const deleteBackup = (backupId: string) => {
    const newBackups = backups.filter(b => b.id !== backupId)
    setBackups(newBackups)
    localStorage.setItem('steamsentinel_backups', JSON.stringify(newBackups))
    setSelectedBackup(null)
    showSuccess('バックアップを削除しました')
  }

  const exportBackup = (backup: DataBackup) => {
    try {
      setExporting(true)
      const exportData = {
        ...backup,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${backup.name}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showSuccess('バックアップをエクスポートしました')
    } catch (error) {
      showError('エクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  const importBackup = (file: File) => {
    if (!file) return

    setImporting(true)
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        
        if (!importedData.id || !importedData.data || !importedData.type) {
          throw new Error('無効なバックアップファイル形式です')
        }

        if (!importedData.checksum) {
          importedData.checksum = generateChecksum(importedData.data)
        }

        importedData.id = Date.now().toString()
        importedData.name = `${importedData.name}_インポート`

        const newBackups = [...backups, importedData]
        setBackups(newBackups)
        localStorage.setItem('steamsentinel_backups', JSON.stringify(newBackups))
        
        showSuccess('バックアップをインポートしました')
      } catch (error) {
        showError('インポートに失敗しました。ファイル形式を確認してください。')
      } finally {
        setImporting(false)
      }
    }
    
    reader.onerror = () => {
      showError('ファイルの読み込みに失敗しました')
      setImporting(false)
    }
    
    reader.readAsText(file)
  }

  const exportAllData = () => {
    try {
      setExporting(true)
      const allData = {
        layouts: localStorage.getItem('dashboard_layout'),
        preferences: localStorage.getItem('user_preferences'),
        budgets: localStorage.getItem('budgets'),
        settings: localStorage.getItem('app_settings'),
        backups: JSON.stringify(backups),
        exportInfo: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          type: 'full_export'
        }
      }

      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `steamsentinel-full-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showSuccess('全データをエクスポートしました')
    } catch (error) {
      showError('エクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  const clearAllData = () => {
    localStorage.removeItem('dashboard_layout')
    localStorage.removeItem('user_preferences')
    localStorage.removeItem('budgets')
    localStorage.removeItem('app_settings')
    localStorage.removeItem('steamsentinel_backups')
    
    showWarning('すべてのデータを削除しました。ページを更新してください。')
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  }

  const generateChecksum = (data: any): string => {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  const verifyChecksum = (backup: DataBackup): boolean => {
    if (!backup.checksum) return true
    return generateChecksum(backup.data) === backup.checksum
  }

  const getBackupTypeName = (type: DataBackup['type']): string => {
    switch (type) {
      case 'full': return '完全バックアップ'
      case 'settings': return '設定バックアップ'
      case 'expense_data': return '出費データバックアップ'
      case 'budgets': return '予算バックアップ'
      default: return 'バックアップ'
    }
  }

  const getBackupTypeIcon = (type: DataBackup['type']) => {
    switch (type) {
      case 'full': return <HddOutlined />
      case 'settings': return <SettingOutlined />
      case 'expense_data': return <BarChartOutlined />
      case 'budgets': return <WalletOutlined />
      default: return <HddOutlined />
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const backupColumns = [
    {
      title: '名前',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DataBackup) => (
        <Space>
          {getBackupTypeIcon(record.type)}
          {text}
        </Space>
      )
    },
    {
      title: 'タイプ',
      dataIndex: 'type',
      key: 'type',
      render: (type: DataBackup['type']) => (
        <Tag color="blue">{getBackupTypeName(type)}</Tag>
      )
    },
    {
      title: 'サイズ',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size)
    },
    {
      title: '作成日時',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString('ja-JP')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: DataBackup) => (
        <Space>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => exportBackup(record)}
            loading={exporting}
          />
          <Popconfirm
            title="このバックアップを削除しますか？"
            onConfirm={() => deleteBackup(record.id)}
            okText="削除"
            cancelText="キャンセル"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <Modal
      title={
        <Space>
          <HddOutlined />
          データ管理
        </Space>
      }
      open={show}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          閉じる
        </Button>
      ]}
      width={1200}
    >
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as any)}>
        <TabPane
          tab={
            <Space>
              <CloudUploadOutlined />
              バックアップ
            </Space>
          }
          key="backup"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>新しいバックアップを作成</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <HddOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                    <Title level={5}>完全バックアップ</Title>
                    <Text type="secondary">すべての設定とデータ</Text>
                    <Button type="primary" onClick={() => createBackup('full')}>
                      作成
                    </Button>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <SettingOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                    <Title level={5}>設定のみ</Title>
                    <Text type="secondary">ユーザー設定と環境設定</Text>
                    <Button type="primary" onClick={() => createBackup('settings')}>
                      作成
                    </Button>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <BarChartOutlined style={{ fontSize: '48px', color: '#faad14' }} />
                    <Title level={5}>出費データ</Title>
                    <Text type="secondary">購入履歴と分析データ</Text>
                    <Button type="primary" onClick={() => createBackup('expense_data')}>
                      作成
                    </Button>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <WalletOutlined style={{ fontSize: '48px', color: '#f5222d' }} />
                    <Title level={5}>予算データ</Title>
                    <Text type="secondary">予算設定とアラート</Text>
                    <Button type="primary" onClick={() => createBackup('budgets')}>
                      作成
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>
            
            <Title level={5}>既存のバックアップ ({backups.length})</Title>
            {backups.length > 0 ? (
              <Table
                dataSource={backups}
                columns={backupColumns}
                rowKey="id"
                pagination={{ pageSize: 5 }}
              />
            ) : (
              <Card>
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <InboxOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
                  <Text type="secondary">まだバックアップがありません。</Text>
                </Space>
              </Card>
            )}
          </Space>
        </TabPane>
        
        <TabPane
          tab={
            <Space>
              <CloudDownloadOutlined />
              復元
            </Space>
          }
          key="restore"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="警告"
              description="復元を実行すると、現在の設定が上書きされます。重要なデータは事前にバックアップしてください。"
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
            />
            
            {backups.length > 0 ? (
              <Row gutter={[16, 16]}>
                {backups.map(backup => (
                  <Col key={backup.id} xs={24} lg={12}>
                    <Card
                      hoverable
                      className={selectedBackup?.id === backup.id ? 'ant-card-bordered' : ''}
                      style={{
                        borderColor: selectedBackup?.id === backup.id ? '#1890ff' : undefined,
                        borderWidth: selectedBackup?.id === backup.id ? 2 : undefined
                      }}
                      onClick={() => setSelectedBackup(backup)}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                          <Space>
                            {getBackupTypeIcon(backup.type)}
                            <Text strong>{backup.name}</Text>
                          </Space>
                          {!verifyChecksum(backup) && (
                            <Tag color="red">破損</Tag>
                          )}
                        </Space>
                        <Text type="secondary">
                          {getBackupTypeName(backup.type)} • {formatFileSize(backup.size)}
                        </Text>
                        <Text type="secondary">
                          {new Date(backup.created_at).toLocaleString('ja-JP')}
                        </Text>
                        {selectedBackup?.id === backup.id && (
                          <Button
                            type="primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              restoreBackup(backup)
                            }}
                            disabled={!verifyChecksum(backup)}
                          >
                            復元
                          </Button>
                        )}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <Card>
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <InboxOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
                  <Text type="secondary">復元可能なバックアップがありません。</Text>
                </Space>
              </Card>
            )}
          </Space>
        </TabPane>
        
        <TabPane
          tab={
            <Space>
              <UploadOutlined />
              インポート
            </Space>
          }
          key="import"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>バックアップファイルをインポート</Title>
            <Upload.Dragger
              accept=".json"
              beforeUpload={(file) => {
                importBackup(file)
                return false
              }}
              disabled={importing}
              showUploadList={false}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                ファイルをクリックまたはドラッグしてアップロード
              </p>
              <p className="ant-upload-hint">
                SteamSentinelのバックアップファイル（.json）を選択してください。
              </p>
            </Upload.Dragger>
            
            {importing && (
              <Card>
                <Space>
                  <Spin />
                  <Text>インポート中...</Text>
                </Space>
              </Card>
            )}
          </Space>
        </TabPane>
        
        <TabPane
          tab={
            <Space>
              <DownloadOutlined />
              エクスポート
            </Space>
          }
          key="export"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={5}>データエクスポート</Title>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card>
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <HddOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                    <Title level={5}>全データエクスポート</Title>
                    <Text type="secondary" style={{ textAlign: 'center' }}>
                      すべての設定、データ、バックアップをまとめてエクスポートします。
                    </Text>
                    <Button
                      type="primary"
                      onClick={exportAllData}
                      loading={exporting}
                      icon={<DownloadOutlined />}
                    >
                      エクスポート
                    </Button>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card style={{ borderColor: '#ff4d4f' }}>
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    <DeleteOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />
                    <Title level={5}>全データ削除</Title>
                    <Text type="secondary" style={{ textAlign: 'center' }}>
                      すべてのローカルデータを削除します。この操作は取り消せません。
                    </Text>
                    <Popconfirm
                      title="全データ削除"
                      description="本当にすべてのデータを削除しますか？この操作は取り消せません。"
                      onConfirm={clearAllData}
                      okText="削除"
                      cancelText="キャンセル"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        削除
                      </Button>
                    </Popconfirm>
                  </Space>
                </Card>
              </Col>
            </Row>
            
            <Alert
              message="情報"
              description="エクスポートされたファイルは他のデバイスでのインポートや、データ移行に使用できます。"
              type="info"
              showIcon
            />
          </Space>
        </TabPane>
      </Tabs>
    </Modal>
  )
}