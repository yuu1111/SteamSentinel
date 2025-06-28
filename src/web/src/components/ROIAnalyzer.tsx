import React from 'react'
import { ExpenseData } from '../types'

interface ROIAnalyzerProps {
  expenseData: ExpenseData | null
}

export const ROIAnalyzer: React.FC<ROIAnalyzerProps> = ({ expenseData }) => {
  if (!expenseData) {
    return (
      <div className="row">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            ROI分析データを読み込み中...
          </div>
        </div>
      </div>
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

  const getROIColor = (roi: number) => {
    if (roi >= 50) return 'success'
    if (roi >= 25) return 'warning'
    return 'danger'
  }

  const getValueScoreColor = (score: number) => {
    if (score >= 70) return 'success'
    if (score >= 50) return 'warning'
    return 'danger'
  }

  const analysis = calculateROI()

  return (
    <div className="row">
      <div className="col-12 mb-4">
        <h4>
          <i className="bi bi-graph-up-arrow me-2"></i>ROI・価値分析
        </h4>
      </div>
      
      {/* ROI概要カード */}
      <div className="col-lg-4 mb-4">
        <div className="card h-100">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="bi bi-calculator me-2"></i>ROI分析
            </h6>
          </div>
          <div className="card-body">
            <div className="text-center mb-3">
              <h2 className={`text-${getROIColor(analysis.roi)}`}>
                {analysis.roi.toFixed(1)}%
              </h2>
              <p className="text-muted mb-0">投資収益率</p>
            </div>
            <div className="row text-center">
              <div className="col-6">
                <small className="text-muted">支出額</small>
                <div className="fw-bold">¥{analysis.totalSpent.toLocaleString()}</div>
              </div>
              <div className="col-6">
                <small className="text-muted">節約額</small>
                <div className="fw-bold text-success">¥{analysis.totalSaved.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 価値スコア */}
      <div className="col-lg-4 mb-4">
        <div className="card h-100">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="bi bi-star me-2"></i>購入価値スコア
            </h6>
          </div>
          <div className="card-body">
            <div className="text-center mb-3">
              <h2 className={`text-${getValueScoreColor(analysis.valueScore)}`}>
                {analysis.valueScore.toFixed(0)}
              </h2>
              <p className="text-muted mb-0">総合評価</p>
            </div>
            <div className="progress mb-2">
              <div 
                className={`progress-bar bg-${getValueScoreColor(analysis.valueScore)}`}
                style={{ width: `${Math.min(analysis.valueScore, 100)}%` }}
              />
            </div>
            <small className="text-muted">
              {analysis.valueScore >= 70 ? '優秀な購入判断' : 
               analysis.valueScore >= 50 ? '良好な購入判断' : '改善の余地あり'}
            </small>
          </div>
        </div>
      </div>

      {/* 効率性指標 */}
      <div className="col-lg-4 mb-4">
        <div className="card h-100">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="bi bi-speedometer2 me-2"></i>購入効率
            </h6>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <small className="text-muted">平均購入価格</small>
                <strong>¥{Math.round(analysis.averageSpentPerGame).toLocaleString()}</strong>
              </div>
            </div>
            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <small className="text-muted">平均節約額</small>
                <strong className="text-success">¥{Math.round(analysis.averageSavingsPerGame).toLocaleString()}</strong>
              </div>
            </div>
            <div className="mb-3">
              <div className="d-flex justify-content-between">
                <small className="text-muted">平均定価</small>
                <strong>¥{Math.round(analysis.averageFullPrice).toLocaleString()}</strong>
              </div>
            </div>
            <div>
              <div className="d-flex justify-content-between">
                <small className="text-muted">購入効率</small>
                <strong>{(analysis.averageSavingsPerGame / analysis.averageSpentPerGame * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 詳細分析 */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">
              <i className="bi bi-clipboard-data me-2"></i>詳細ROI分析
            </h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>購入パターン分析</h6>
                {expenseData.recentPurchases.length > 0 ? (
                  <div>
                    <div className="mb-2">
                      <small className="text-muted">高割引購入率 (50%+)</small>
                      <div className="d-flex align-items-center">
                        <div className="progress flex-grow-1 me-2">
                          <div 
                            className="progress-bar bg-success" 
                            style={{ 
                              width: `${(expenseData.recentPurchases.filter(p => p.discount_percent >= 50).length / expenseData.recentPurchases.length * 100)}%` 
                            }}
                          />
                        </div>
                        <small className="fw-bold">
                          {((expenseData.recentPurchases.filter(p => p.discount_percent >= 50).length / expenseData.recentPurchases.length) * 100).toFixed(0)}%
                        </small>
                      </div>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">中割引購入率 (20-49%)</small>
                      <div className="d-flex align-items-center">
                        <div className="progress flex-grow-1 me-2">
                          <div 
                            className="progress-bar bg-warning" 
                            style={{ 
                              width: `${(expenseData.recentPurchases.filter(p => p.discount_percent >= 20 && p.discount_percent < 50).length / expenseData.recentPurchases.length * 100)}%` 
                            }}
                          />
                        </div>
                        <small className="fw-bold">
                          {((expenseData.recentPurchases.filter(p => p.discount_percent >= 20 && p.discount_percent < 50).length / expenseData.recentPurchases.length) * 100).toFixed(0)}%
                        </small>
                      </div>
                    </div>
                    <div>
                      <small className="text-muted">低割引購入率 (0-19%)</small>
                      <div className="d-flex align-items-center">
                        <div className="progress flex-grow-1 me-2">
                          <div 
                            className="progress-bar bg-danger" 
                            style={{ 
                              width: `${(expenseData.recentPurchases.filter(p => p.discount_percent < 20).length / expenseData.recentPurchases.length * 100)}%` 
                            }}
                          />
                        </div>
                        <small className="fw-bold">
                          {((expenseData.recentPurchases.filter(p => p.discount_percent < 20).length / expenseData.recentPurchases.length) * 100).toFixed(0)}%
                        </small>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted">データがありません</p>
                )}
              </div>
              
              <div className="col-md-6">
                <h6>投資回収予測</h6>
                {analysis.roi > 0 ? (
                  <div>
                    <div className="alert alert-success">
                      <small>
                        <strong>優良投資:</strong> 現在の節約率{analysis.roi.toFixed(1)}%で、
                        支出額の{analysis.roi.toFixed(1)}%相当の価値を既に回収済み
                      </small>
                    </div>
                    <div className="mb-2">
                      <small className="text-muted">次の¥10,000投資時の予想節約額</small>
                      <div className="fw-bold text-success">
                        ¥{Math.round(10000 * (analysis.roi / 100)).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <small className="text-muted">月間平均節約ペース</small>
                      <div className="fw-bold">
                        ¥{Math.round(analysis.totalSaved / Math.max(expenseData.monthlyTrends.expenses.length, 1)).toLocaleString()}/月
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-warning">
                    <small>投資回収データが不足しています。より多くの購入データが必要です。</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}