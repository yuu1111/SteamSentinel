import React, { useEffect, useRef } from 'react'
import { Col, Card, Typography } from 'antd'
import { ExpenseData } from '../types'

const { Title } = Typography

interface ExpenseAnalyticsChartsProps {
  expenseData: ExpenseData | null
}

export const ExpenseAnalyticsCharts: React.FC<ExpenseAnalyticsChartsProps> = ({
  expenseData
}) => {
  const monthlyTrendRef = useRef<HTMLCanvasElement>(null)
  const categoryPieRef = useRef<HTMLCanvasElement>(null)
  const discountScatterRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (expenseData && monthlyTrendRef.current) {
      drawMonthlyTrendChart(monthlyTrendRef.current, expenseData)
    }
  }, [expenseData])

  useEffect(() => {
    if (expenseData && categoryPieRef.current) {
      drawCategoryPieChart(categoryPieRef.current, expenseData)
    }
  }, [expenseData])

  useEffect(() => {
    if (expenseData && discountScatterRef.current) {
      drawDiscountScatterChart(discountScatterRef.current, expenseData)
    }
  }, [expenseData])

  const drawMonthlyTrendChart = (canvas: HTMLCanvasElement, data: ExpenseData) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas setup
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const padding = 60

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    if (!data.monthlyTrends?.expenses.length) {
      ctx.fillStyle = '#6c757d'
      ctx.font = '14px Inter, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('月間データが不足しています', width / 2, height / 2)
      return
    }

    const expenses = data.monthlyTrends.expenses
    const maxExpense = Math.max(...expenses.map(e => e.amount))
    
    // Draw axes
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw grid
    ctx.strokeStyle = '#f0f0f0'
    for (let i = 1; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * i / 5
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw data line
    ctx.strokeStyle = '#1890ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    expenses.forEach((expense, index) => {
      const x = padding + (width - 2 * padding) * index / (expenses.length - 1)
      const y = height - padding - (height - 2 * padding) * expense.amount / maxExpense
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw data points
    ctx.fillStyle = '#1890ff'
    expenses.forEach((expense, index) => {
      const x = padding + (width - 2 * padding) * index / (expenses.length - 1)
      const y = height - padding - (height - 2 * padding) * expense.amount / maxExpense
      
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Labels
    ctx.fillStyle = '#333'
    ctx.font = '12px Inter, system-ui'
    ctx.textAlign = 'center'
    expenses.forEach((expense, index) => {
      const x = padding + (width - 2 * padding) * index / (expenses.length - 1)
      ctx.fillText(expense.month, x, height - padding + 20)
    })
  }

  const drawCategoryPieChart = (canvas: HTMLCanvasElement, data: ExpenseData) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2 - 40

    ctx.clearRect(0, 0, width, height)

    if (!data.recentPurchases?.length) {
      ctx.fillStyle = '#6c757d'
      ctx.font = '14px Inter, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('カテゴリデータがありません', centerX, centerY)
      return
    }

    // カテゴリ別データを購入履歴から生成
    const categoryMap = new Map<string, number>()
    data.recentPurchases.forEach(purchase => {
      const price = purchase.trigger_price || 0
      categoryMap.set('ゲーム', (categoryMap.get('ゲーム') || 0) + price)
    })
    
    const categories = Array.from(categoryMap.entries()).map(([category, amount]) => ({ category, amount }))
    const total = categories.reduce((sum: number, cat: { category: string; amount: number }) => sum + cat.amount, 0)
    
    const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']
    
    let currentAngle = -Math.PI / 2

    categories.forEach((category: { category: string; amount: number }, index: number) => {
      const angle = (category.amount / total) * 2 * Math.PI
      
      ctx.fillStyle = colors[index % colors.length]
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + angle)
      ctx.fill()

      // Label
      const labelAngle = currentAngle + angle / 2
      const labelX = centerX + Math.cos(labelAngle) * (radius + 20)
      const labelY = centerY + Math.sin(labelAngle) * (radius + 20)
      
      ctx.fillStyle = '#333'
      ctx.font = '12px Inter, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(category.category, labelX, labelY)
      
      currentAngle += angle
    })
  }

  const drawDiscountScatterChart = (canvas: HTMLCanvasElement, data: ExpenseData) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const padding = 60

    ctx.clearRect(0, 0, width, height)

    if (!data.recentPurchases?.length) {
      ctx.fillStyle = '#6c757d'
      ctx.font = '14px Inter, system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('購入データがありません', width / 2, height / 2)
      return
    }

    const purchases = data.recentPurchases
    const maxPrice = Math.max(...purchases.map(p => p.trigger_price))
    const maxDiscount = Math.max(...purchases.map(p => p.discount_percent || 0))

    // Draw axes
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw data points
    purchases.forEach((purchase) => {
      const x = padding + (width - 2 * padding) * purchase.trigger_price / maxPrice
      const y = height - padding - (height - 2 * padding) * (purchase.discount_percent || 0) / maxDiscount
      
      const discountPercent = purchase.discount_percent || 0
      ctx.fillStyle = discountPercent > 50 ? '#52c41a' : discountPercent > 25 ? '#faad14' : '#1890ff'
      
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Labels
    ctx.fillStyle = '#333'
    ctx.font = '12px Inter, system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('価格 (円)', width / 2, height - 20)
    
    ctx.save()
    ctx.translate(20, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('割引率 (%)', 0, 0)
    ctx.restore()
  }

  return (
    <>
      <Col span={24}>
        <Card>
          <Title level={4}>月間支出トレンド</Title>
          <canvas 
            ref={monthlyTrendRef}
            style={{ width: '100%', height: '300px' }}
          />
        </Card>
      </Col>
      
      <Col xs={24} lg={12}>
        <Card>
          <Title level={4}>カテゴリ別内訳</Title>
          <canvas 
            ref={categoryPieRef}
            style={{ width: '100%', height: '300px' }}
          />
        </Card>
      </Col>
      
      <Col xs={24} lg={12}>
        <Card>
          <Title level={4}>価格vs割引率分析</Title>
          <canvas 
            ref={discountScatterRef}
            style={{ width: '100%', height: '300px' }}
          />
        </Card>
      </Col>
    </>
  )
}