import React, { useState, useEffect } from 'react'
import { Modal, Card, Typography, Tabs, Row, Col, Input, Select, Switch, Button, Space, Alert } from 'antd'
import { FileTextOutlined, SettingOutlined, EyeOutlined, DownloadOutlined, BarChartOutlined, TableOutlined, WalletOutlined, TrophyOutlined, FileOutlined, LineChartOutlined } from '@ant-design/icons'
import { ReportConfig, ReportSection, ExpenseData, BudgetData } from '../types'
import { useAlert } from '../contexts/AlertContext'

const { Text, Title } = Typography
const { TabPane } = Tabs
const { Option } = Select

interface ReportGeneratorProps {
  show: boolean
  expenseData: ExpenseData | null
  budgets?: BudgetData[]
  onClose: () => void
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  show,
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
      case 'summary': return <FileOutlined />
      case 'charts': return <BarChartOutlined />
      case 'table': return <TableOutlined />
      case 'roi': return <TrophyOutlined />
      case 'budget': return <WalletOutlined />
      case 'trends': return <LineChartOutlined />
      default: return <FileTextOutlined />
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
      
      await new Promise(resolve => setTimeout(resolve, 2000))
      
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
    if (!expenseData) return

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
      recentPurchases: expenseData?.recentPurchases,
      budgets: budgets
    }

    const jsonString = JSON.stringify(jsonData, null, 2)
    downloadFile(jsonString, `${reportConfig.name}.json`, 'application/json')
  }

  const generatePDF = () => {
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
      <Modal
        title="レポート生成"
        open={show}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            閉じる
          </Button>
        ]}
        width={600}
      >
        <Alert
          message="警告"
          description="レポート生成に必要なデータが不足しています。"
          type="warning"
          showIcon
        />
      </Modal>
    )
  }

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          レポート生成
        </Space>
      }
      open={show}
      onCancel={onClose}
      footer={[
        <Space key="footer">
          <Text type="secondary">
            {reportConfig.sections.filter(s => s.isEnabled).length} セクションが選択されています
          </Text>
          <Button onClick={onClose}>
            キャンセル
          </Button>
          <Button 
            type="primary"
            icon={<DownloadOutlined />}
            onClick={generateReport}
            disabled={generating || reportConfig.sections.filter(s => s.isEnabled).length === 0}
            loading={generating}
          >
            レポート生成
          </Button>
        </Space>
      ]}
      width={900}
    >
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as any)}>
        <TabPane
          tab={
            <Space>
              <SettingOutlined />
              設定
            </Space>
          }
          key="config"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text>レポート名</Text>
                <Input
                  value={reportConfig.name}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                  style={{ marginTop: 8 }}
                />
              </Col>
              <Col span={6}>
                <Text>期間</Text>
                <Select
                  value={reportConfig.type}
                  onChange={(value) => setReportConfig(prev => ({ ...prev, type: value as any }))}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <Option value="monthly">月間</Option>
                  <Option value="yearly">年間</Option>
                  <Option value="custom">カスタム</Option>
                  <Option value="summary">総合</Option>
                </Select>
              </Col>
              <Col span={6}>
                <Text>フォーマット</Text>
                <Select
                  value={reportConfig.format}
                  onChange={(value) => setReportConfig(prev => ({ ...prev, format: value as any }))}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <Option value="pdf">PDF</Option>
                  <Option value="csv">CSV</Option>
                  <Option value="json">JSON</Option>
                </Select>
              </Col>
            </Row>

            <Title level={5}>含めるセクション</Title>
            <Row gutter={[16, 16]}>
              {reportConfig.sections.map(section => (
                <Col key={section.id} xs={24} lg={12}>
                  <Card>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space>
                          {getSectionIcon(section.type)}
                          <div>
                            <Text strong>{section.title}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              {getSectionDescription(section.type)}
                            </Text>
                          </div>
                        </Space>
                      </Col>
                      <Col>
                        <Switch
                          checked={section.isEnabled}
                          onChange={() => toggleSection(section.id)}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              ))}
            </Row>
          </Space>
        </TabPane>

        <TabPane
          tab={
            <Space>
              <EyeOutlined />
              プレビュー
            </Space>
          }
          key="preview"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              message="情報"
              description="以下は生成されるレポートのプレビューです。"
              type="info"
              showIcon
            />
            <Card
              style={{ 
                height: '500px', 
                overflow: 'auto',
                backgroundColor: '#fafafa'
              }}
            >
              <pre style={{ 
                fontFamily: 'monospace',
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {previewData}
              </pre>
            </Card>
          </Space>
        </TabPane>
      </Tabs>
    </Modal>
  )
}