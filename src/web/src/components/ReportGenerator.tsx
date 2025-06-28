import React, { useState, useEffect } from 'react'
import { ReportConfig, ReportSection, ExpenseData, BudgetData } from '../types'
import { useAlert } from '../contexts/AlertContext'

interface ReportGeneratorProps {
  expenseData: ExpenseData | null
  budgets?: BudgetData[]
  onClose: () => void
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  expenseData,
  budgets = [],
  onClose
}) => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>(getDefaultReportConfig())
  const [generating, setGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config')
  const { showSuccess, showError } = useAlert()

  function getDefaultReportConfig(): ReportConfig {
    return {
      id: 'default',
      name: '月間支出レポート',
      type: 'monthly',
      format: 'pdf',
      sections: [
        {
          id: 'summary',
          type: 'summary',
          title: 'サマリー',
          isEnabled: true,
          order: 1
        },
        {
          id: 'charts',
          type: 'charts',
          title: 'チャート分析',
          isEnabled: true,
          order: 2
        },
        {
          id: 'roi',
          type: 'roi',
          title: 'ROI分析',
          isEnabled: true,
          order: 3
        },
        {
          id: 'budget',
          type: 'budget',
          title: '予算分析',
          isEnabled: true,
          order: 4
        },
        {
          id: 'table',
          type: 'table',
          title: '詳細データ',
          isEnabled: false,
          order: 5
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  const getSectionIcon = (type: ReportSection['type']) => {
    switch (type) {
      case 'summary': return 'clipboard-data'
      case 'charts': return 'bar-chart-line'
      case 'table': return 'table'
      case 'roi': return 'graph-up-arrow'
      case 'budget': return 'wallet'
      case 'trends': return 'trending-up'
      default: return 'file-text'
    }
  }

  const getSectionDescription = (type: ReportSection['type']) => {
    switch (type) {
      case 'summary': return '総支出額、節約額、購入ゲーム数などの概要'
      case 'charts': return '月間トレンド、カテゴリ分析、割引率分析のグラフ'
      case 'table': return '購入履歴の詳細テーブル'
      case 'roi': return '投資収益率と価値分析'
      case 'budget': return '予算使用状況と達成率'
      case 'trends': return '支出パターンとトレンド分析'
      default: return 'レポートセクション'
    }
  }

  const toggleSection = (sectionId: string) => {
    setReportConfig(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, isEnabled: !section.isEnabled } : section
      )
    }))
  }

  const generatePreview = () => {
    if (!expenseData) {
      setPreviewData('データが不足しています。')
      return
    }

    const enabledSections = reportConfig.sections.filter(s => s.isEnabled)
    let preview = `# ${reportConfig.name}\n\n`
    preview += `生成日時: ${new Date().toLocaleString('ja-JP')}\n`
    preview += `レポート期間: ${reportConfig.type}\n`
    preview += `フォーマット: ${reportConfig.format.toUpperCase()}\n\n`

    enabledSections.forEach(section => {
      preview += `## ${section.title}\n\n`
      
      switch (section.type) {
        case 'summary':
          preview += `- 総支出額: ¥${expenseData.summary.totalExpenses.toLocaleString()}\n`
          preview += `- 総節約額: ¥${expenseData.summary.totalSavings.toLocaleString()}\n`
          preview += `- 購入ゲーム数: ${expenseData.summary.totalGames}本\n`
          preview += `- 平均購入価格: ¥${expenseData.summary.averagePrice.toLocaleString()}\n`
          preview += `- 節約率: ${expenseData.summary.savingsRate.toFixed(1)}%\n\n`
          break
          
        case 'charts':
          preview += `### 月間支出トレンド\n`
          expenseData.monthlyTrends.expenses.forEach(month => {
            preview += `- ${month.month}: ¥${month.amount.toLocaleString()}\n`
          })
          preview += `\n### カテゴリ別支出\n`
          Object.entries(expenseData.categories).forEach(([, cat]) => {
            preview += `- ${cat.label}: ¥${cat.total.toLocaleString()} (${cat.count}件)\n`
          })
          preview += '\n'
          break
          
        case 'roi': {
          const roi = expenseData.summary.totalExpenses > 0 
            ? (expenseData.summary.totalSavings / expenseData.summary.totalExpenses) * 100 
            : 0
          preview += `- ROI: ${roi.toFixed(1)}%\n`
          preview += `- 投資効率: ${(expenseData.summary.totalSavings / Math.max(expenseData.summary.totalGames, 1)).toFixed(0)}円/ゲーム\n\n`
          break
        }
          
        case 'budget':
          if (budgets.length > 0) {
            budgets.forEach(budget => {
              const utilization = (budget.spent / budget.amount) * 100
              preview += `- ${budget.name}: ${utilization.toFixed(1)}% (¥${budget.spent.toLocaleString()} / ¥${budget.amount.toLocaleString()})\n`
            })
          } else {
            preview += '- 予算が設定されていません\n'
          }
          preview += '\n'
          break
          
        case 'table':
          preview += '| ゲーム名 | 購入価格 | 割引率 | 購入日 |\n'
          preview += '|---------|---------|--------|--------|\n'
          expenseData.recentPurchases.slice(0, 10).forEach(purchase => {
            preview += `| ${purchase.game_name} | ¥${purchase.trigger_price.toLocaleString()} | ${purchase.discount_percent}% | ${new Date(purchase.created_at).toLocaleDateString('ja-JP')} |\n`
          })
          preview += '\n'
          break
      }
    })

    setPreviewData(preview)
  }

  const generateReport = async () => {
    try {
      setGenerating(true)
      
      // 実際の実装ではAPIを呼び出してレポートを生成
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate generation time
      
      if (reportConfig.format === 'csv') {
        generateCSV()
      } else if (reportConfig.format === 'json') {
        generateJSON()
      } else {
        generatePDF()
      }
      
      showSuccess(`${reportConfig.format.toUpperCase()}レポートを生成しました`)
    } catch (error) {
      showError('レポートの生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const generateCSV = () => {
    if (!expenseData) {return}

    const csvContent = [
      ['ゲーム名', '購入価格', '割引率', '購入日'],
      ...expenseData.recentPurchases.map(purchase => [
        purchase.game_name,
        purchase.trigger_price.toString(),
        purchase.discount_percent.toString(),
        new Date(purchase.created_at).toLocaleDateString('ja-JP')
      ])
    ]

    const csvString = csvContent.map(row => row.join(',')).join('\n')
    downloadFile(csvString, `${reportConfig.name}.csv`, 'text/csv')
  }

  const generateJSON = () => {
    const jsonData = {
      reportInfo: {
        name: reportConfig.name,
        type: reportConfig.type,
        generatedAt: new Date().toISOString()
      },
      summary: expenseData?.summary,
      monthlyTrends: expenseData?.monthlyTrends,
      categories: expenseData?.categories,
      recentPurchases: expenseData?.recentPurchases,
      budgets: budgets
    }

    const jsonString = JSON.stringify(jsonData, null, 2)
    downloadFile(jsonString, `${reportConfig.name}.json`, 'application/json')
  }

  const generatePDF = () => {
    // PDFの生成は実際にはライブラリ（jsPDF等）を使用
    const pdfContent = `PDF Report: ${reportConfig.name}\n\n${previewData}`
    downloadFile(pdfContent, `${reportConfig.name}.txt`, 'text/plain')
    showSuccess('PDFレポート機能は今後実装予定です。テキストファイルとして出力しました。')
  }

  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (activeTab === 'preview') {
      generatePreview()
    }
  }, [activeTab, reportConfig, expenseData])

  if (!expenseData) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">レポート生成</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                レポート生成に必要なデータが不足しています。
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>閉じる</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-file-earmark-text me-2"></i>レポート生成
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          
          <div className="modal-body">
            {/* Tab Navigation */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'config' ? 'active' : ''}`}
                  onClick={() => setActiveTab('config')}
                >
                  <i className="bi bi-gear me-1"></i>設定
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  <i className="bi bi-eye me-1"></i>プレビュー
                </button>
              </li>
            </ul>

            {/* Config Tab */}
            {activeTab === 'config' && (
              <div>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">レポート名</label>
                    <input
                      type="text"
                      className="form-control"
                      value={reportConfig.name}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">期間</label>
                    <select
                      className="form-select"
                      value={reportConfig.type}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, type: e.target.value as any }))}
                    >
                      <option value="monthly">月間</option>
                      <option value="yearly">年間</option>
                      <option value="custom">カスタム</option>
                      <option value="summary">総合</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">フォーマット</label>
                    <select
                      className="form-select"
                      value={reportConfig.format}
                      onChange={(e) => setReportConfig(prev => ({ ...prev, format: e.target.value as any }))}
                    >
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                </div>

                <h6>含めるセクション</h6>
                <div className="row">
                  {reportConfig.sections.map(section => (
                    <div key={section.id} className="col-lg-6 mb-3">
                      <div className="card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                              <i className={`bi bi-${getSectionIcon(section.type)} me-2`}></i>
                              <div>
                                <strong>{section.title}</strong>
                                <br />
                                <small className="text-muted">{getSectionDescription(section.type)}</small>
                              </div>
                            </div>
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={section.isEnabled}
                                onChange={() => toggleSection(section.id)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div>
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  以下は生成されるレポートのプレビューです。
                </div>
                <div 
                  className="border rounded p-3"
                  style={{ 
                    height: '400px', 
                    overflow: 'auto', 
                    backgroundColor: '#f8f9fa',
                    fontFamily: 'monospace',
                    fontSize: '0.9em',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {previewData}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <div className="me-auto">
              <small className="text-muted">
                {reportConfig.sections.filter(s => s.isEnabled).length} セクションが選択されています
              </small>
            </div>
            <button className="btn btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button 
              className="btn btn-primary" 
              onClick={generateReport}
              disabled={generating || reportConfig.sections.filter(s => s.isEnabled).length === 0}
            >
              {generating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  生成中...
                </>
              ) : (
                <>
                  <i className="bi bi-download me-1"></i>
                  レポート生成
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}