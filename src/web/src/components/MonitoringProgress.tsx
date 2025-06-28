import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { MonitoringProgress as MonitoringProgressType } from '../types'

interface MonitoringProgressProps {
  onMonitoringComplete?: () => void
}

export const MonitoringProgress: React.FC<MonitoringProgressProps> = ({ onMonitoringComplete }) => {
  const [progress, setProgress] = useState<MonitoringProgressType | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    checkAndStartProgressMonitoring()
    
    return () => {
      // クリーンアップ時に監視を停止
      stopProgressMonitoring()
      // チェック状態もクリア
      setIsChecking(false)
    }
  }, [])

  const checkAndStartProgressMonitoring = async () => {
    if (hasChecked) {return} // 既にチェック済みの場合は実行しない
    
    try {
      // API応答が200ms以上かかる場合のみローディング表示
      const checkingTimeout = setTimeout(() => setIsChecking(true), 200)
      
      const response = await api.get('/monitoring/progress')
      clearTimeout(checkingTimeout)
      setHasChecked(true)
      
      if (response.success && response.data.isRunning) {
        startProgressMonitoring()
      } else {
        // 監視が実行中でない場合はチェック状態を解除
        setIsChecking(false)
      }
    } catch {
      setIsChecking(false)
      setHasChecked(true)
    }
  }

  const startProgressMonitoring = () => {
    setIsVisible(true)
    setIsChecking(false)
    
    // 進捗をポーリング
    const interval = setInterval(async () => {
      try {
        const response = await api.get('/monitoring/progress')
        if (response.success) {
          setProgress(response.data)
          
          // 監視が完了したら停止
          if (!response.data.isRunning) {
            stopProgressMonitoring()
            if (onMonitoringComplete) {
              onMonitoringComplete()
            }
          }
        }
      } catch {
        // エラーを静かに処理し、ポーリングを継続
      }
    }, 1000) // 1秒間隔でポーリング

    // intervalをstateに保存してクリーンアップできるようにする
    ;(window as any).__monitoringInterval = interval
  }

  const stopProgressMonitoring = () => {
    if ((window as any).__monitoringInterval) {
      clearInterval((window as any).__monitoringInterval)
      ;(window as any).__monitoringInterval = null
    }
    setIsVisible(false)
    setProgress(null)
    setIsChecking(false)
  }

  // 初期チェック中は軽量なローディング表示（API応答が遅い場合のみ）
  if (isChecking) {
    return (
      <div className="row mb-4">
        <div className="col-12">
          <div className="text-center py-2">
            <div className="spinner-border spinner-border-sm text-info" role="status">
              <span className="visually-hidden">監視状況確認中...</span>
            </div>
            <small className="text-muted ms-2">監視状況を確認中...</small>
          </div>
        </div>
      </div>
    )
  }
  
  // 監視中でない場合は何も表示しない
  if (!isVisible || !progress) {return null}

  const percentage = progress.totalGames > 0 ? 
    Math.round((progress.completedGames / progress.totalGames) * 100) : 0

  const formatTimeRemaining = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) {return '計算中...'}
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    return minutes > 0 ? 
      `約${minutes}分${remainingSeconds}秒` : 
      `約${remainingSeconds}秒`
  }

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card border-info">
          <div className="card-header bg-info text-white">
            <h6 className="mb-0">
              <div className="spinner-grow spinner-grow-sm spinner-grow-fast me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              ゲーム情報を取得中...
            </h6>
          </div>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="text-truncate flex-grow-1 me-3">
                <small className="text-muted">現在処理中:</small><br />
                <span className="current-game-name fw-bold">
                  {progress.currentGame || '待機中...'}
                </span>
              </div>
              <div className="text-end">
                <span className="badge bg-primary">
                  {progress.completedGames}/{progress.totalGames}
                </span>
              </div>
            </div>
            
            <div className="progress mb-2" style={{ height: '8px' }}>
              <div 
                className="progress-bar progress-bar-striped progress-bar-animated bg-info"
                role="progressbar"
                style={{ width: `${percentage}%` }}
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              ></div>
            </div>
            
            <div className="d-flex justify-content-between">
              <small className="text-muted">
                <i className="bi bi-clock me-1"></i>
                残り時間: {formatTimeRemaining(progress.estimatedTimeRemaining)}
              </small>
              <small className="text-muted">
                <i className="bi bi-exclamation-triangle me-1"></i>
                失敗: {progress.failedGames || 0}件
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}