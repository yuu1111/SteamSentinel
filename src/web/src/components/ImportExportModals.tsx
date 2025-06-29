import React, { useState } from 'react'
import { Modal, Typography, Upload, Radio, Alert, Button, Space } from 'antd'
import { InboxOutlined, UploadOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'
import { ConfirmationModal } from './ConfirmationModal'

const { Text, Title } = Typography
const { Dragger } = Upload

interface ImportGamesModalProps {
  show: boolean
  onHide: () => void
  onImportCompleted: () => void
}

export const ImportGamesModal: React.FC<ImportGamesModalProps> = ({ 
  show, 
  onHide, 
  onImportCompleted 
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'skip' | 'replace'>('merge')
  const [loading, setLoading] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [confirmMessage, setConfirmMessage] = useState('')
  const { showError, showSuccess, showWarning } = useAlert()

  const resetForm = () => {
    setFile(null)
    setImportMode('merge')
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const handleImport = async () => {
    if (!file) {
      showError('ファイルを選択してください')
      return
    }

    try {
      setLoading(true)

      const fileContent = await readFileAsText(file)
      let importData: any

      try {
        importData = JSON.parse(fileContent)
      } catch {
        showError('無効なJSONファイルです')
        return
      }

      if (!importData.games || !Array.isArray(importData.games)) {
        showError('無効なバックアップファイル形式です')
        return
      }

      const message = importMode === 'replace' ? 
        `既存のゲーム・履歴データをすべて削除して、${importData.gameCount}件のゲームをインポートします。よろしいですか？` :
        `${importData.gameCount}件のゲームをインポートします。よろしいですか？`
        
      setConfirmMessage(message)
      setConfirmAction(() => async () => {
        importData.mode = importMode
        const response = await api.post('/games/import', importData)

        if (response.success) {
          showSuccess(response.message || 'インポートが完了しました')
          
          if (response.data && response.data.errors && response.data.errors.length > 0) {
            showWarning(`インポート完了（${response.data.errors.length}件のエラーあり）`)
          }
          
          resetForm()
          onHide()
          onImportCompleted()
        } else {
          showError('インポートに失敗しました: ' + response.error)
        }
      })
      setShowConfirmModal(true)
    } catch {
      showError('ゲームリストのインポート中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const executeImport = async () => {
    if (!confirmAction) return
    
    try {
      setLoading(true)
      await confirmAction()
      resetForm()
      onHide()
      onImportCompleted()
    } catch {
      showError('ゲームリストのインポート中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const uploadProps = {
    accept: '.json',
    multiple: false,
    beforeUpload: (selectedFile: File) => {
      setFile(selectedFile)
      return false
    },
    onRemove: () => {
      setFile(null)
    },
    fileList: file ? [{
      uid: '1',
      name: file.name,
      status: 'done' as const
    }] : []
  }

  return (
    <>
      <Modal
        title="ゲームリストをインポート"
        open={show}
        onCancel={() => {
          resetForm()
          onHide()
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            resetForm()
            onHide()
          }}>
            キャンセル
          </Button>,
          <Button 
            key="import"
            type="primary"
            icon={<UploadOutlined />}
            onClick={handleImport}
            disabled={loading || !file}
            loading={loading}
          >
            インポート
          </Button>
        ]}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={5}>バックアップファイルを選択</Title>
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                ファイルをクリックまたはドラッグしてアップロード
              </p>
              <p className="ant-upload-hint">
                SteamSentinelでエクスポートしたJSONファイルを選択してください
              </p>
            </Dragger>
          </div>

          <div>
            <Title level={5}>インポートモード</Title>
            <Radio.Group value={importMode} onChange={(e) => setImportMode(e.target.value)}>
              <Space direction="vertical">
                <Radio value="merge">
                  <strong>マージ</strong> - 既存のゲームを保持し、新しいゲームを追加・更新
                </Radio>
                <Radio value="skip">
                  <strong>スキップ</strong> - 既存のゲームは変更せず、新しいゲームのみ追加
                </Radio>
                <Radio value="replace">
                  <strong>置換</strong> - 既存のゲームをすべて削除してから追加
                  <br />
                  <Text type="danger" style={{ fontSize: '12px' }}>
                    ※ 価格履歴・アラート履歴も削除されます
                  </Text>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <Alert
            message="注意"
            description="インポート前に現在のゲームリストをエクスポートしてバックアップすることをお勧めします。"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
          />
        </Space>
      </Modal>
      
      <ConfirmationModal
        show={showConfirmModal}
        title="インポートの確認"
        message={confirmMessage}
        confirmText="インポート"
        onConfirm={executeImport}
        onCancel={() => {
          setShowConfirmModal(false)
          setConfirmAction(null)
        }}
        variant="warning"
      />
    </>
  )
}

interface ExportGamesProps {
  onExportCompleted?: () => void
}

export const useExportGames = ({ onExportCompleted }: ExportGamesProps = {}) => {
  const { showError, showSuccess } = useAlert()
  const [loading, setLoading] = useState(false)

  const exportGames = async () => {
    try {
      setLoading(true)
      
      const response = await api.get('/games/export')
      
      if (response) {
        const jsonStr = JSON.stringify(response, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = (response as any).version ? 
          `steamsentinel_backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.json` : 
          'steamsentinel_backup.json'
        
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        showSuccess(`${(response as any).gameCount}件のゲームをエクスポートしました`)
        
        if (onExportCompleted) {
          onExportCompleted()
        }
      }
    } catch {
      showError('ゲームリストのエクスポートに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return { exportGames, loading }
}