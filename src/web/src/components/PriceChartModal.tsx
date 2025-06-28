import React, { useEffect, useRef, useState } from 'react'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

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
    if (!steamAppId) {return}

    try {
      setLoading(true)
      const response = await api.get(`/games/${steamAppId}/price-history`)
      
      if (response.success && response.data && response.data.priceHistory) {
        if (response.data.priceHistory.length === 0) {
          setPriceHistory([])
          return
        }
        
        // priceHistoryにdate形式でAPIから取得した価格履歴を変換
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
    if (!chartRef.current || !(window as any).Chart) {return}

    // 既存のチャートを破棄
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    if (!ctx) {return}

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
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.1)',
            tension: 0.1,
            fill: false,
            pointBackgroundColor: 'rgb(54, 162, 235)',
            pointBorderColor: 'rgb(54, 162, 235)',
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

  if (!show) {return null}

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">価格推移グラフ - {gameName}</h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">読み込み中...</span>
                </div>
                <div className="mt-2">価格履歴を読み込み中...</div>
              </div>
            ) : priceHistory.length > 0 ? (
              <div style={{ position: 'relative', height: '400px', width: '100%' }}>
                <canvas ref={chartRef}></canvas>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="bi bi-graph-up display-1 text-muted"></i>
                <div className="mt-2 text-muted">価格履歴データがありません</div>
              </div>
            )}
            
            {priceHistory.length > 0 && (
              <div className="mt-3">
                <small className="text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  過去{priceHistory.length}回分の価格データを表示しています（セール価格含む）
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}