import React, { useEffect, useState } from 'react'
import { Modal, Card, Typography, Spin, Alert, Space } from 'antd'
import { LineChartOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'
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
  formattedDate: string
  formattedPrice: string
}

export const PriceChartModal: React.FC<PriceChartModalProps> = ({ 
  show, 
  steamAppId, 
  gameName, 
  onHide 
}) => {
  const [loading, setLoading] = useState(false)
  const [priceHistory, setPriceHistory] = useState<PriceHistoryData[]>([])
  const { showError } = useAlert()

  useEffect(() => {
    if (show && steamAppId) {
      loadPriceHistory()
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
        
        const formattedData = response.data.priceHistory.map((item: any) => {
          const date = new Date(item.recorded_at)
          return {
            date: date.toISOString().split('T')[0],
            current_price: item.current_price,
            formattedDate: date.toLocaleDateString('ja-JP'),
            formattedPrice: `¥${item.current_price.toLocaleString()}`
          }
        })
        setPriceHistory(formattedData)
      } else {
        showError('価格履歴データがありません')
      }
    } catch {
      showError('価格履歴の読み込み中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // カスタムツールチップコンポーネント
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '12px',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, marginBottom: '4px', fontWeight: 'bold' }}>
            {data.formattedDate}
          </p>
          <p style={{ margin: 0, color: '#1890ff' }}>
            価格: {data.formattedPrice}
          </p>
        </div>
      )
    }
    return null
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
          <div style={{ height: '400px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={priceHistory}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="formattedDate"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `¥${value.toLocaleString()}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="current_price" 
                  stroke="#1890ff" 
                  strokeWidth={2}
                  dot={{ fill: '#1890ff', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#1890ff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
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