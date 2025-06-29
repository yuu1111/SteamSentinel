import React from 'react'
import { Col, Card, Typography, Progress, Row, Alert, Statistic, Space } from 'antd'
import { CalculatorOutlined, StarOutlined, DashboardOutlined, TrophyOutlined } from '@ant-design/icons'
import { ExpenseData } from '../types'

const { Title, Text } = Typography

interface ROIAnalyzerProps {
  expenseData: ExpenseData | null
}

export const ROIAnalyzer: React.FC<ROIAnalyzerProps> = ({ expenseData }) => {
  if (!expenseData) {
    return (
      <Col span={24}>
        <Alert
          message="ROI分析"
          description="ROI分析データを読み込み中..."
          type="info"
          showIcon
        />
      </Col>
    )
  }

  // ROI計算ロジック
  const calculateROI = () => {
    const totalSpent = expenseData.summary.totalExpenses
    const totalSaved = expenseData.summary.totalSavings
    const gamesOwned = expenseData.summary.totalGames
    
    // 平均ゲーム価格（定価）推定
    const averageFullPrice = totalSpent + totalSaved
    const averageSpentPerGame = totalSpent / gamesOwned
    const averageSavingsPerGame = totalSaved / gamesOwned
    
    // ROI計算 (節約額/支出額 * 100)
    const roi = totalSpent > 0 ? (totalSaved / totalSpent) * 100 : 0
    
    // 価値分析
    const valueScore = calculateValueScore()
    
    return {
      totalSpent,
      totalSaved,
      gamesOwned,
      averageFullPrice: averageFullPrice / gamesOwned,
      averageSpentPerGame,
      averageSavingsPerGame,
      roi,
      valueScore
    }
  }

  const calculateValueScore = () => {
    const purchases = expenseData.recentPurchases
    if (!purchases.length) return 0
    
    // 各購入の価値スコアを計算
    const valueScores = purchases.map(purchase => {
      const discountWeight = purchase.discount_percent / 100 * 0.4
      const priceWeight = purchase.trigger_price < 2000 ? 0.3 : purchase.trigger_price < 5000 ? 0.2 : 0.1
      const timingWeight = 0.3 // 新しい購入ほど高スコア
      
      return (discountWeight + priceWeight + timingWeight) * 100
    })
    
    return valueScores.reduce((sum, score) => sum + score, 0) / valueScores.length
  }

  const getROIStatus = (roi: number) => {
    if (roi >= 50) return { status: 'success', color: '#52c41a' }
    if (roi >= 25) return { status: 'normal', color: '#faad14' }
    return { status: 'exception', color: '#f5222d' }
  }

  const getValueScoreStatus = (score: number) => {
    if (score >= 70) return { color: '#52c41a', text: '優秀な購入判断' }
    if (score >= 50) return { color: '#faad14', text: '良好な購入判断' }
    return { color: '#f5222d', text: '改善の余地あり' }
  }

  const analysis = calculateROI()
  const roiStatus = getROIStatus(analysis.roi)
  const valueScoreStatus = getValueScoreStatus(analysis.valueScore)

  return (
    <>
      <Col span={24}>
        <Title level={4}>
          <TrophyOutlined /> ROI・価値分析
        </Title>
      </Col>
      
      {/* ROI概要カード */}
      <Col xs={24} lg={8}>
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} align="center">
            <CalculatorOutlined style={{ fontSize: '24px' }} />
            <Title level={5}>ROI分析</Title>
            <Statistic
              title="投資収益率"
              value={analysis.roi}
              precision={1}
              suffix="%"
              valueStyle={{ color: roiStatus.color, fontSize: '32px' }}
            />
            <Row gutter={16} style={{ width: '100%' }}>
              <Col span={12}>
                <Statistic
                  title="支出額"
                  value={analysis.totalSpent}
                  prefix="¥"
                  precision={0}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="節約額"
                  value={analysis.totalSaved}
                  prefix="¥"
                  precision={0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Space>
        </Card>
      </Col>

      {/* 価値スコア */}
      <Col xs={24} lg={8}>
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} align="center">
            <StarOutlined style={{ fontSize: '24px' }} />
            <Title level={5}>購入価値スコア</Title>
            <Statistic
              title="総合評価"
              value={analysis.valueScore}
              precision={0}
              valueStyle={{ color: valueScoreStatus.color, fontSize: '32px' }}
            />
            <Progress
              percent={Math.min(analysis.valueScore, 100)}
              strokeColor={valueScoreStatus.color}
              showInfo={false}
            />
            <Text type="secondary">{valueScoreStatus.text}</Text>
          </Space>
        </Card>
      </Col>

      {/* 効率性指標 */}
      <Col xs={24} lg={8}>
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <DashboardOutlined style={{ fontSize: '24px' }} />
              <Title level={5}>購入効率</Title>
            </Space>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text type="secondary">平均購入価格</Text>
                  <Text strong>¥{Math.round(analysis.averageSpentPerGame).toLocaleString()}</Text>
                </Space>
              </Col>
              <Col span={24}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text type="secondary">平均節約額</Text>
                  <Text strong style={{ color: '#52c41a' }}>¥{Math.round(analysis.averageSavingsPerGame).toLocaleString()}</Text>
                </Space>
              </Col>
              <Col span={24}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text type="secondary">平均定価</Text>
                  <Text strong>¥{Math.round(analysis.averageFullPrice).toLocaleString()}</Text>
                </Space>
              </Col>
              <Col span={24}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text type="secondary">購入効率</Text>
                  <Text strong>{(analysis.averageSavingsPerGame / analysis.averageSpentPerGame * 100).toFixed(1)}%</Text>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>
      </Col>

      {/* 詳細分析 */}
      <Col span={24}>
        <Card title="詳細ROI分析">
          <Row gutter={24}>
            <Col xs={24} md={12}>
              <Title level={5}>購入パターン分析</Title>
              {expenseData.recentPurchases.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">高割引購入率 (50%+)</Text>
                      <Text strong>
                        {((expenseData.recentPurchases.filter(p => p.discount_percent >= 50).length / expenseData.recentPurchases.length) * 100).toFixed(0)}%
                      </Text>
                    </Space>
                    <Progress
                      percent={(expenseData.recentPurchases.filter(p => p.discount_percent >= 50).length / expenseData.recentPurchases.length * 100)}
                      strokeColor="#52c41a"
                      showInfo={false}
                    />
                  </div>
                  <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">中割引購入率 (20-49%)</Text>
                      <Text strong>
                        {((expenseData.recentPurchases.filter(p => p.discount_percent >= 20 && p.discount_percent < 50).length / expenseData.recentPurchases.length) * 100).toFixed(0)}%
                      </Text>
                    </Space>
                    <Progress
                      percent={(expenseData.recentPurchases.filter(p => p.discount_percent >= 20 && p.discount_percent < 50).length / expenseData.recentPurchases.length * 100)}
                      strokeColor="#faad14"
                      showInfo={false}
                    />
                  </div>
                  <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text type="secondary">低割引購入率 (0-19%)</Text>
                      <Text strong>
                        {((expenseData.recentPurchases.filter(p => p.discount_percent < 20).length / expenseData.recentPurchases.length) * 100).toFixed(0)}%
                      </Text>
                    </Space>
                    <Progress
                      percent={(expenseData.recentPurchases.filter(p => p.discount_percent < 20).length / expenseData.recentPurchases.length * 100)}
                      strokeColor="#f5222d"
                      showInfo={false}
                    />
                  </div>
                </Space>
              ) : (
                <Text type="secondary">データがありません</Text>
              )}
            </Col>
            
            <Col xs={24} md={12}>
              <Title level={5}>投資回収予測</Title>
              {analysis.roi > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert
                    message="優良投資"
                    description={`現在の節約率${analysis.roi.toFixed(1)}%で、支出額の${analysis.roi.toFixed(1)}%相当の価値を既に回収済み`}
                    type="success"
                    showIcon
                  />
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text type="secondary">次の¥10,000投資時の予想節約額</Text>
                    <Text strong style={{ color: '#52c41a' }}>
                      ¥{Math.round(10000 * (analysis.roi / 100)).toLocaleString()}
                    </Text>
                  </Space>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text type="secondary">月間平均節約ペース</Text>
                    <Text strong>
                      ¥{Math.round(analysis.totalSaved / Math.max(expenseData.monthlyTrends.expenses.length, 1)).toLocaleString()}/月
                    </Text>
                  </Space>
                </Space>
              ) : (
                <Alert
                  message="投資回収データが不足しています。より多くの購入データが必要です。"
                  type="warning"
                  showIcon
                />
              )}
            </Col>
          </Row>
        </Card>
      </Col>
    </>
  )
}