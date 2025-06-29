import React, { useEffect, useRef, useState } from 'react'
import { Modal, Card, Typography, Spin, Alert, Space } from 'antd'
import { LineChartOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

const { Text } = Typography

interface PriceChartModalProps {
  show: boolean
  steamAppId: number | null
  gameName: string
  onHide: () => void
}

interface PriceHistoryData {
  date: string
  current_price: number
}

export const PriceChartModal: React.FC<PriceChartModalProps> = ({ 
  show, 
  steamAppId, 
  gameName, 
  onHide 
}) => {
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstanceRef = useRef<any>(null)
  const [loading, setLoading] = useState(false)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData[]>([])
  const { showError } = useAlert()

  useEffect(() => {
    if (show && steamAppId) {
      loadPriceHistory()
    }
    
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
        chartInstanceRef.current = null
      }
    }
  }, [show, steamAppId])

  const loadPriceHistory = async () => {
    if (!steamAppId) return

    try {
      setLoading(true)
      const response = await api.get(`/games/${steamAppId}/price-history`)
      
      if (response.success && response.data && response.data.priceHistory) {
        if (response.data.priceHistory.length === 0) {
          setPriceHistory([])
          return
        }
        
        const formattedData = response.data.priceHistory.map((item: any) => ({
          date: new Date(item.recorded_at).toISOString().split('T')[0],
          current_price: item.current_price
        }))
        setPriceHistory(formattedData)
        setTimeout(() => createChart(formattedData), 100)
      } else {
        showError('価格履歴データがありません')
      }
    } catch {
      showError('価格履歴の読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const createChart = (data: PriceHistoryData[]) => {
    if (!chartRef.current || !(window as any).Chart) return

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    const labels = data.map(item => new Date(item.date).toLocaleDateString('ja-JP'))
    const currentPrices = data.map(item => item.current_price)

    chartInstanceRef.current = new ((window as any).Chart)(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '価格',
            data: currentPrices,
            borderColor: '#1890ff',
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            tension: 0.1,
            fill: false,
            pointBackgroundColor: '#1890ff',
            pointBorderColor: '#1890ff',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `${gameName} - 価格推移`
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value: any) {
                return '¥' + value.toLocaleString()
              }
            },
            title: {
              display: true,
              text: '価格 (円)'
            }
          },
          x: {
            title: {
              display: true,
              text: '日付'
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        elements: {
          point: {
            radius: 3,
            hoverRadius: 6
          }
        }
      }
    })
  }

  return (
    <Modal
      title={
        <Space>
          <LineChartOutlined />
          価格推移グラフ - {gameName}
        </Space>
      }
      open={show}
      onCancel={onHide}
      footer={null}
      width={900}
    >
      {loading ? (
        <Card style={{ textAlign: 'center', padding: '60px 0' }}>
          <Space direction="vertical">
            <Spin size="large" />
            <Text>価格履歴を読み込み中...</Text>
          </Space>
        </Card>
      ) : priceHistory.length > 0 ? (
        <>
          <div style={{ position: 'relative', height: '400px', width: '100%' }}>
            <canvas ref={chartRef}></canvas>
          </div>
          <Alert
            message={
              <Space>
                <InfoCircleOutlined />
                過去{priceHistory.length}回分の価格データを表示しています（セール価格含む）
              </Space>
            }
            type="info"
            style={{ marginTop: 16 }}
          />
        </>
      ) : (
        <Card style={{ textAlign: 'center', padding: '60px 0' }}>
          <Space direction="vertical">
            <LineChartOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
            <Text type="secondary">価格履歴データがありません</Text>
          </Space>
        </Card>
      )}
    </Modal>
  )
}