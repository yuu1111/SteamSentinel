import React, { useState } from 'react'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

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

      // ファイルを読み込む
      const fileContent = await readFileAsText(file)
      let importData: any

      try {
        importData = JSON.parse(fileContent)
      } catch (e) {
        showError('無効なJSONファイルです')
        return
      }

      // バリデーション
      if (!importData.games || !Array.isArray(importData.games)) {
        showError('無効なバックアップファイル形式です')
        return
      }

      // 確認ダイアログ
      const confirmMessage = importMode === 'replace' ? 
        `既存のゲーム・履歴データをすべて削除して、${importData.gameCount}件のゲームをインポートします。よろしいですか？` :
        `${importData.gameCount}件のゲームをインポートします。よろしいですか？`
        
      if (!confirm(confirmMessage)) {
        return
      }

      // インポート実行
      importData.mode = importMode
      const response = await api.post('/games/import', importData)

      if (response.success) {
        showSuccess(response.message || 'インポートが完了しました')
        
        // エラーがある場合は警告表示
        if (response.data && response.data.errors && response.data.errors.length > 0) {
          console.warn('Import errors:', response.data.errors)
          showWarning(`インポート完了（${response.data.errors.length}件のエラーあり）`)
        }
        
        resetForm()
        onHide()
        onImportCompleted()
      } else {
        showError('インポートに失敗しました: ' + response.error)
      }
    } catch (error) {
      console.error('Failed to import games:', error)
      showError('ゲームリストのインポート中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setFile(selectedFile || null)
  }

  if (!show) return null

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">ゲームリストをインポート</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label htmlFor="importFile" className="form-label">バックアップファイルを選択</label>
              <input
                type="file"
                className="form-control"
                id="importFile"
                accept=".json"
                onChange={handleFileChange}
                required
              />
              <div className="form-text">
                SteamSentinelでエクスポートしたJSONファイルを選択してください
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">インポートモード</label>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="importMode"
                  id="importModeMerge"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={(e) => setImportMode(e.target.value as any)}
                />
                <label className="form-check-label" htmlFor="importModeMerge">
                  <strong>マージ</strong> - 既存のゲームを保持し、新しいゲームを追加・更新
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="importMode"
                  id="importModeSkip"
                  value="skip"
                  checked={importMode === 'skip'}
                  onChange={(e) => setImportMode(e.target.value as any)}
                />
                <label className="form-check-label" htmlFor="importModeSkip">
                  <strong>スキップ</strong> - 既存のゲームは変更せず、新しいゲームのみ追加
                </label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="importMode"
                  id="importModeReplace"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value as any)}
                />
                <label className="form-check-label" htmlFor="importModeReplace">
                  <strong>置換</strong> - 既存のゲームをすべて削除してから追加
                  <div className="text-danger small">※ 価格履歴・アラート履歴も削除されます</div>
                </label>
              </div>
            </div>

            <div className="alert alert-info">
              <i className="bi bi-info-circle"></i>
              インポート前に現在のゲームリストをエクスポートしてバックアップすることをお勧めします。
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onHide}>
              キャンセル
            </button>
            <button 
              type="button" 
              className="btn btn-warning" 
              onClick={handleImport}
              disabled={loading || !file}
            >
              <i className="bi bi-upload"></i> 
              {loading ? 'インポート中...' : 'インポート'}
            </button>
          </div>
        </div>
      </div>
    </div>
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
        // JSONデータをBlob化
        const jsonStr = JSON.stringify(response, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        
        // ダウンロードリンクを作成
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = (response as any).version ? 
          `steamsentinel_backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.json` : 
          'steamsentinel_backup.json'
        
        // ダウンロードを実行
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        showSuccess(`${(response as any).gameCount}件のゲームをエクスポートしました`)
        
        if (onExportCompleted) {
          onExportCompleted()
        }
      }
    } catch (error) {
      console.error('Failed to export games:', error)
      showError('ゲームリストのエクスポートに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return { exportGames, loading }
}