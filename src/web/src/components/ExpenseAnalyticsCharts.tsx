import React, { useEffect, useRef } from 'react'
import { ExpenseData } from '../types'

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

    if (!data.monthlyTrends.expenses.length) {
      ctx.fillStyle = '#6c757d'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('支出データがありません', width / 2, height / 2)
      return
    }

    // Data preparation
    const expenses = data.monthlyTrends.expenses
    const maxExpense = Math.max(...expenses.map(e => e.amount))
    const minExpense = Math.min(...expenses.map(e => e.amount))
    const range = maxExpense - minExpense || 1

    // Draw axes
    ctx.strokeStyle = '#dee2e6'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw trend line
    ctx.strokeStyle = '#007bff'
    ctx.lineWidth = 3
    ctx.beginPath()

    expenses.forEach((expense, index) => {
      const x = padding + (index / (expenses.length - 1)) * (width - padding * 2)
      const y = height - padding - ((expense.amount - minExpense) / range) * (height - padding * 2)
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Draw data points
    ctx.fillStyle = '#007bff'
    expenses.forEach((expense, index) => {
      const x = padding + (index / (expenses.length - 1)) * (width - padding * 2)
      const y = height - padding - ((expense.amount - minExpense) / range) * (height - padding * 2)
      
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw labels
    ctx.fillStyle = '#495057'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    
    expenses.forEach((expense, index) => {
      const x = padding + (index / (expenses.length - 1)) * (width - padding * 2)
      const month = expense.month.substring(5) // Get MM from YYYY-MM
      ctx.fillText(month + '月', x, height - padding + 20)
    })

    // Y-axis labels
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const value = minExpense + (range * i / 4)
      const y = height - padding - (i / 4) * (height - padding * 2)
      ctx.fillText(`¥${Math.round(value).toLocaleString()}`, padding - 10, y + 4)
    }

    // Title
    ctx.fillStyle = '#212529'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('月間支出トレンド', width / 2, 30)
  }

  const drawCategoryPieChart = (canvas: HTMLCanvasElement, data: ExpenseData) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Canvas setup
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 3

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    const categories = data.categories
    const total = Object.values(categories).reduce((sum, cat) => sum + cat.total, 0)

    if (total === 0) {
      ctx.fillStyle = '#6c757d'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('カテゴリデータがありません', centerX, centerY)
      return
    }

    const colors = ['#007bff', '#28a745', '#ffc107', '#dc3545']
    const categoryEntries = Object.entries(categories)
    
    let currentAngle = -Math.PI / 2

    categoryEntries.forEach(([, category], index) => {
      const percentage = category.total / total
      const sliceAngle = percentage * Math.PI * 2
      
      // Draw pie slice
      ctx.fillStyle = colors[index % colors.length]
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fill()

      // Draw slice border
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2
      const labelX = centerX + Math.cos(labelAngle) * (radius + 40)
      const labelY = centerY + Math.sin(labelAngle) * (radius + 40)
      
      ctx.fillStyle = '#212529'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(category.label, labelX, labelY)
      ctx.fillText(`¥${category.total.toLocaleString()}`, labelX, labelY + 15)
      ctx.fillText(`(${(percentage * 100).toFixed(1)}%)`, labelX, labelY + 30)

      currentAngle += sliceAngle
    })

    // Title
    ctx.fillStyle = '#212529'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('カテゴリ別支出分析', centerX, 30)
  }

  const drawDiscountScatterChart = (canvas: HTMLCanvasElement, data: ExpenseData) => {
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

    if (!data.recentPurchases.length) {
      ctx.fillStyle = '#6c757d'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('購入データがありません', width / 2, height / 2)
      return
    }

    // Data preparation
    const purchases = data.recentPurchases
    const maxPrice = Math.max(...purchases.map(p => p.trigger_price))
    const maxDiscount = Math.max(...purchases.map(p => p.discount_percent))

    // Draw axes
    ctx.strokeStyle = '#dee2e6'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw grid lines
    ctx.strokeStyle = '#f8f9fa'
    ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) {
      // Vertical grid lines
      const x = padding + (i / 4) * (width - padding * 2)
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()

      // Horizontal grid lines
      const y = padding + (i / 4) * (height - padding * 2)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw data points
    purchases.forEach(purchase => {
      const x = padding + (purchase.trigger_price / maxPrice) * (width - padding * 2)
      const y = height - padding - (purchase.discount_percent / maxDiscount) * (height - padding * 2)
      
      // Color based on discount level
      if (purchase.discount_percent >= 70) {
        ctx.fillStyle = '#28a745' // Green for high discount
      } else if (purchase.discount_percent >= 30) {
        ctx.fillStyle = '#ffc107' // Yellow for medium discount
      } else {
        ctx.fillStyle = '#dc3545' // Red for low discount
      }

      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()

      // Border
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // X-axis labels
    ctx.fillStyle = '#495057'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    for (let i = 0; i <= 4; i++) {
      const value = (maxPrice * i / 4)
      const x = padding + (i / 4) * (width - padding * 2)
      ctx.fillText(`¥${Math.round(value).toLocaleString()}`, x, height - padding + 20)
    }

    // Y-axis labels
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const value = (maxDiscount * i / 4)
      const y = height - padding - (i / 4) * (height - padding * 2)
      ctx.fillText(`${Math.round(value)}%`, padding - 10, y + 4)
    }

    // Axis labels
    ctx.fillStyle = '#212529'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('購入価格', width / 2, height - 10)
    
    ctx.save()
    ctx.translate(20, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('割引率', 0, 0)
    ctx.restore()

    // Title
    ctx.font = 'bold 16px sans-serif'
    ctx.fillText('価格 vs 割引率分析', width / 2, 30)

    // Legend
    const legendY = height - 120
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    
    ctx.fillStyle = '#28a745'
    ctx.beginPath()
    ctx.arc(width - 150, legendY, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#212529'
    ctx.fillText('大幅割引 (70%+)', width - 140, legendY + 4)

    ctx.fillStyle = '#ffc107'
    ctx.beginPath()
    ctx.arc(width - 150, legendY + 20, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#212529'
    ctx.fillText('中割引 (30-69%)', width - 140, legendY + 24)

    ctx.fillStyle = '#dc3545'
    ctx.beginPath()
    ctx.arc(width - 150, legendY + 40, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#212529'
    ctx.fillText('低割引 (0-29%)', width - 140, legendY + 44)
  }

  if (!expenseData) {
    return (
      <div className="row">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            出費データを読み込み中...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="row">
      <div className="col-12 mb-4">
        <h4>
          <i className="bi bi-bar-chart-line me-2"></i>高度な出費分析
        </h4>
      </div>
      
      {/* Monthly Trend Chart */}
      <div className="col-lg-6 mb-4">
        <div className="card">
          <div className="card-body">
            <canvas
              ref={monthlyTrendRef}
              style={{ width: '100%', height: '300px' }}
            />
          </div>
        </div>
      </div>

      {/* Category Pie Chart */}
      <div className="col-lg-6 mb-4">
        <div className="card">
          <div className="card-body">
            <canvas
              ref={categoryPieRef}
              style={{ width: '100%', height: '300px' }}
            />
          </div>
        </div>
      </div>

      {/* Discount vs Price Scatter Chart */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-body">
            <canvas
              ref={discountScatterRef}
              style={{ width: '100%', height: '400px' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}