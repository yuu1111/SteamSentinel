import React, { useState, useEffect } from 'react'
import { Card, Progress, Typography, Space, Row, Col, Spin } from 'antd'
import { ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { api } from '../utils/api'
import { MonitoringProgress as MonitoringProgressType } from '../types'

const { Text } = Typography

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
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }} align="center">
            <Spin size="small" />
            <Text type="secondary" style={{ fontSize: 12 }}>監視状況を確認中...</Text>
          </Space>
        </Col>
      </Row>
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
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col span={24}>
        <Card
          title={
            <Space align="center">
              <Spin size="small" />
              <Text>ゲーム情報を取得中...</Text>
            </Space>
          }
          styles={{ 
            header: { 
              backgroundColor: '#1890ff', 
              color: 'white' 
            } 
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Row justify="space-between" align="middle">
              <Col flex="auto">
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>現在処理中:</Text>
                  <br />
                  <Text strong style={{ fontSize: 14 }}>
                    {progress.currentGame || '待機中...'}
                  </Text>
                </div>
              </Col>
              <Col>
                <Text strong style={{ 
                  background: '#1890ff', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  fontSize: 12
                }}>
                  {progress.completedGames}/{progress.totalGames}
                </Text>
              </Col>
            </Row>
            
            <Progress 
              percent={percentage} 
              strokeColor="#1890ff"
              trailColor="#f0f0f0"
              size="small"
              showInfo={false}
            />
            
            <Row justify="space-between">
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  残り時間: {formatTimeRemaining(progress.estimatedTimeRemaining)}
                </Text>
              </Col>
              <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                  失敗: {progress.failedGames || 0}件
                </Text>
              </Col>
            </Row>
          </Space>
        </Card>
      </Col>
    </Row>
  )
}