import React, { useState } from 'react'
import { DataBackup } from '../types'
import { useAlert } from '../contexts/AlertContext'

interface DataManagerProps {
  onClose: () => void
}

export const DataManager: React.FC<DataManagerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'import' | 'export'>('backup')
  const [backups, setBackups] = useState<DataBackup[]>(getExistingBackups())
  const [selectedBackup, setSelectedBackup] = useState<DataBackup | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { showSuccess, showError, showWarning } = useAlert()

  function getExistingBackups(): DataBackup[] {
    // 実際の実装では localStorage や API から取得
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

      // データの復元
      Object.entries(backup.data).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value)
        }
      })

      showSuccess(`${backup.name}を復元しました。ページを更新してください。`)
      
      // ページを更新して変更を反映
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
    if (!file) {return}

    setImporting(true)
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        
        // バックアップファイルの検証
        if (!importedData.id || !importedData.data || !importedData.type) {
          throw new Error('無効なバックアップファイル形式です')
        }

        // チェックサムの再生成（ファイルが古い場合）
        if (!importedData.checksum) {
          importedData.checksum = generateChecksum(importedData.data)
        }

        // 新しいIDを生成（重複を避けるため）
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
    if (window.confirm('本当にすべてのデータを削除しますか？この操作は取り消せません。')) {
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
  }

  const generateChecksum = (data: any): string => {
    // 簡易チェックサム（実際の実装ではより堅牢な方法を使用）
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit整数に変換
    }
    return Math.abs(hash).toString(16)
  }

  const verifyChecksum = (backup: DataBackup): boolean => {
    if (!backup.checksum) {return true} // 古いバックアップ用
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

  const getBackupTypeIcon = (type: DataBackup['type']): string => {
    switch (type) {
      case 'full': return 'hdd-stack'
      case 'settings': return 'gear'
      case 'expense_data': return 'bar-chart'
      case 'budgets': return 'wallet'
      default: return 'file-earmark'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {return '0 B'}
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-hdd me-2"></i>データ管理
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          
          <div className="modal-body">
            {/* Tab Navigation */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'backup' ? 'active' : ''}`}
                  onClick={() => setActiveTab('backup')}
                >
                  <i className="bi bi-cloud-arrow-up me-1"></i>バックアップ
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'restore' ? 'active' : ''}`}
                  onClick={() => setActiveTab('restore')}
                >
                  <i className="bi bi-cloud-arrow-down me-1"></i>復元
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'import' ? 'active' : ''}`}
                  onClick={() => setActiveTab('import')}
                >
                  <i className="bi bi-upload me-1"></i>インポート
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'export' ? 'active' : ''}`}
                  onClick={() => setActiveTab('export')}
                >
                  <i className="bi bi-download me-1"></i>エクスポート
                </button>
              </li>
            </ul>

            {/* Backup Tab */}
            {activeTab === 'backup' && (
              <div>
                <h6>新しいバックアップを作成</h6>
                <div className="row mb-4">
                  <div className="col-lg-3 col-md-6 mb-3">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-hdd-stack display-4 text-primary mb-3"></i>
                        <h6>完全バックアップ</h6>
                        <p className="text-muted small mb-3">すべての設定とデータ</p>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => createBackup('full')}
                        >
                          作成
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 mb-3">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-gear display-4 text-info mb-3"></i>
                        <h6>設定のみ</h6>
                        <p className="text-muted small mb-3">ユーザー設定と環境設定</p>
                        <button 
                          className="btn btn-info btn-sm"
                          onClick={() => createBackup('settings')}
                        >
                          作成
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 mb-3">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-bar-chart display-4 text-success mb-3"></i>
                        <h6>出費データ</h6>
                        <p className="text-muted small mb-3">購入履歴と分析データ</p>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => createBackup('expense_data')}
                        >
                          作成
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-3 col-md-6 mb-3">
                    <div className="card h-100">
                      <div className="card-body text-center">
                        <i className="bi bi-wallet display-4 text-warning mb-3"></i>
                        <h6>予算データ</h6>
                        <p className="text-muted small mb-3">予算設定とアラート</p>
                        <button 
                          className="btn btn-warning btn-sm"
                          onClick={() => createBackup('budgets')}
                        >
                          作成
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <h6>既存のバックアップ ({backups.length})</h6>
                {backups.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>名前</th>
                          <th>タイプ</th>
                          <th>サイズ</th>
                          <th>作成日時</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map(backup => (
                          <tr key={backup.id}>
                            <td>
                              <i className={`bi bi-${getBackupTypeIcon(backup.type)} me-2`}></i>
                              {backup.name}
                            </td>
                            <td>
                              <span className="badge bg-secondary">
                                {getBackupTypeName(backup.type)}
                              </span>
                            </td>
                            <td>{formatFileSize(backup.size)}</td>
                            <td>{new Date(backup.created_at).toLocaleString('ja-JP')}</td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className="btn btn-outline-primary"
                                  onClick={() => exportBackup(backup)}
                                  disabled={exporting}
                                >
                                  <i className="bi bi-download"></i>
                                </button>
                                <button 
                                  className="btn btn-outline-danger"
                                  onClick={() => deleteBackup(backup.id)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-inbox display-1 text-muted mb-3"></i>
                    <p className="text-muted">まだバックアップがありません。</p>
                  </div>
                )}
              </div>
            )}

            {/* Restore Tab */}
            {activeTab === 'restore' && (
              <div>
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  復元を実行すると、現在の設定が上書きされます。重要なデータは事前にバックアップしてください。
                </div>
                
                {backups.length > 0 ? (
                  <div className="row">
                    {backups.map(backup => (
                      <div key={backup.id} className="col-lg-6 mb-3">
                        <div 
                          className={`card h-100 ${selectedBackup?.id === backup.id ? 'border-primary' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedBackup(backup)}
                        >
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="card-title mb-0">
                                <i className={`bi bi-${getBackupTypeIcon(backup.type)} me-2`}></i>
                                {backup.name}
                              </h6>
                              {!verifyChecksum(backup) && (
                                <span className="badge bg-danger">破損</span>
                              )}
                            </div>
                            <p className="text-muted small mb-2">
                              {getBackupTypeName(backup.type)} • {formatFileSize(backup.size)}
                            </p>
                            <p className="text-muted small mb-0">
                              {new Date(backup.created_at).toLocaleString('ja-JP')}
                            </p>
                            {selectedBackup?.id === backup.id && (
                              <div className="mt-3">
                                <button 
                                  className="btn btn-primary btn-sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    restoreBackup(backup)
                                  }}
                                  disabled={!verifyChecksum(backup)}
                                >
                                  <i className="bi bi-arrow-clockwise me-1"></i>復元
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-inbox display-1 text-muted mb-3"></i>
                    <p className="text-muted">復元可能なバックアップがありません。</p>
                  </div>
                )}
              </div>
            )}

            {/* Import Tab */}
            {activeTab === 'import' && (
              <div>
                <h6>バックアップファイルをインポート</h6>
                <div className="mb-4">
                  <input
                    type="file"
                    className="form-control"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {importBackup(file)}
                    }}
                    disabled={importing}
                  />
                  <div className="form-text">
                    SteamSentinelのバックアップファイル（.json）を選択してください。
                  </div>
                </div>

                {importing && (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary me-2" />
                    インポート中...
                  </div>
                )}
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <div>
                <h6>データエクスポート</h6>
                <div className="row mb-4">
                  <div className="col-lg-6">
                    <div className="card">
                      <div className="card-body text-center">
                        <i className="bi bi-hdd-stack display-4 text-primary mb-3"></i>
                        <h6>全データエクスポート</h6>
                        <p className="text-muted">
                          すべての設定、データ、バックアップをまとめてエクスポートします。
                        </p>
                        <button 
                          className="btn btn-primary"
                          onClick={exportAllData}
                          disabled={exporting}
                        >
                          {exporting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              エクスポート中...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-download me-1"></i>
                              エクスポート
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="card border-danger">
                      <div className="card-body text-center">
                        <i className="bi bi-trash display-4 text-danger mb-3"></i>
                        <h6>全データ削除</h6>
                        <p className="text-muted">
                          すべてのローカルデータを削除します。この操作は取り消せません。
                        </p>
                        <button 
                          className="btn btn-danger"
                          onClick={clearAllData}
                        >
                          <i className="bi bi-trash me-1"></i>
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  エクスポートされたファイルは他のデバイスでのインポートや、データ移行に使用できます。
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}