import React, { useState, useEffect } from 'react'
import { BudgetData, BudgetSummary, ExpenseData, BudgetAlert } from '../types'
import { useAlert } from '../contexts/AlertContext'

interface BudgetManagerProps {
  expenseData: ExpenseData | null
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ expenseData }) => {
  const [budgets, setBudgets] = useState<BudgetData[]>([])
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBudget, setNewBudget] = useState<Partial<BudgetData>>({
    name: '',
    type: 'monthly',
    amount: 0
  })
  const { showSuccess, showError } = useAlert()

  useEffect(() => {
    loadBudgets()
  }, [expenseData])

  const loadBudgets = () => {
    // Mock data - 実際の実装ではAPIから取得
    const mockBudgets: BudgetData[] = [
      {
        id: '1',
        name: '月間ゲーム予算',
        type: 'monthly',
        amount: 10000,
        period: '2024-01',
        spent: expenseData?.summary.totalExpenses || 0,
        remaining: 10000 - (expenseData?.summary.totalExpenses || 0),
        alerts: [
          {
            id: '1',
            budgetId: '1',
            type: 'threshold',
            threshold: 80,
            message: '予算の80%に達しました',
            isActive: true
          }
        ],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]

    setBudgets(mockBudgets)
    calculateBudgetSummary(mockBudgets)
  }

  const calculateBudgetSummary = (budgetList: BudgetData[]) => {
    const summary: BudgetSummary = {
      totalBudgets: budgetList.length,
      activeBudgets: budgetList.filter(b => b.remaining > 0).length,
      totalAllocated: budgetList.reduce((sum, b) => sum + b.amount, 0),
      totalSpent: budgetList.reduce((sum, b) => sum + b.spent, 0),
      totalRemaining: budgetList.reduce((sum, b) => sum + b.remaining, 0),
      overBudgetCount: budgetList.filter(b => b.remaining < 0).length,
      averageUtilization: budgetList.length > 0 
        ? budgetList.reduce((sum, b) => sum + (b.spent / b.amount * 100), 0) / budgetList.length 
        : 0
    }
    setBudgetSummary(summary)
  }

  const createBudget = () => {
    if (!newBudget.name || !newBudget.amount) {
      showError('予算名と金額を入力してください')
      return
    }

    const budget: BudgetData = {
      id: Date.now().toString(),
      name: newBudget.name,
      type: newBudget.type || 'monthly',
      amount: newBudget.amount,
      period: getCurrentPeriod(newBudget.type || 'monthly'),
      spent: 0,
      remaining: newBudget.amount,
      alerts: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setBudgets([...budgets, budget])
    setNewBudget({ name: '', type: 'monthly', amount: 0 })
    setShowCreateModal(false)
    showSuccess('予算を作成しました')
  }

  const getCurrentPeriod = (type: string) => {
    const now = new Date()
    switch (type) {
      case 'monthly':
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      case 'yearly':
        return now.getFullYear().toString()
      default:
        return now.toISOString().split('T')[0]
    }
  }

  const getBudgetProgress = (budget: BudgetData) => {
    const progress = Math.min((budget.spent / budget.amount) * 100, 100)
    return progress
  }

  const getBudgetColor = (budget: BudgetData) => {
    const progress = getBudgetProgress(budget)
    if (progress >= 100) return 'danger'
    if (progress >= 80) return 'warning'
    if (progress >= 60) return 'info'
    return 'success'
  }

  const checkBudgetAlerts = (budget: BudgetData): BudgetAlert[] => {
    const progress = getBudgetProgress(budget)
    return budget.alerts.filter(alert => {
      if (alert.type === 'threshold' && progress >= alert.threshold) {
        return true
      }
      if (alert.type === 'exceeded' && budget.remaining < 0) {
        return true
      }
      return false
    })
  }

  if (!expenseData) {
    return (
      <div className="row">
        <div className="col-12">
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            予算データを読み込み中...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="row">
      <div className="col-12 mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <h4>
            <i className="bi bi-wallet me-2"></i>予算管理
          </h4>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="bi bi-plus-circle me-1"></i>予算を作成
          </button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      {budgetSummary && (
        <>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card stats-card info">
              <div className="card-body text-center">
                <i className="bi bi-pie-chart display-4 mb-2"></i>
                <h3 className="display-4">{budgetSummary.totalBudgets}</h3>
                <p className="mb-0">総予算数</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card stats-card success">
              <div className="card-body text-center">
                <i className="bi bi-currency-yen display-4 mb-2"></i>
                <h3 className="display-4">¥{budgetSummary.totalAllocated.toLocaleString()}</h3>
                <p className="mb-0">総予算額</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card stats-card warning">
              <div className="card-body text-center">
                <i className="bi bi-graph-up display-4 mb-2"></i>
                <h3 className="display-4">{budgetSummary.averageUtilization.toFixed(0)}%</h3>
                <p className="mb-0">平均使用率</p>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6 mb-3">
            <div className="card stats-card danger">
              <div className="card-body text-center">
                <i className="bi bi-exclamation-triangle display-4 mb-2"></i>
                <h3 className="display-4">{budgetSummary.overBudgetCount}</h3>
                <p className="mb-0">予算超過</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Budget List */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-list-ul me-2"></i>予算一覧
            </h5>
          </div>
          <div className="card-body">
            {budgets.length > 0 ? (
              <div className="row">
                {budgets.map(budget => {
                  const progress = getBudgetProgress(budget)
                  const color = getBudgetColor(budget)
                  const alerts = checkBudgetAlerts(budget)
                  
                  return (
                    <div key={budget.id} className="col-lg-6 mb-3">
                      <div className="card h-100">
                        <div className="card-header d-flex justify-content-between align-items-center">
                          <h6 className="mb-0">{budget.name}</h6>
                          <span className={`badge bg-${color}`}>
                            {budget.type === 'monthly' ? '月間' : budget.type === 'yearly' ? '年間' : 'カスタム'}
                          </span>
                        </div>
                        <div className="card-body">
                          <div className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                              <span className="text-muted">使用状況</span>
                              <span className="fw-bold">{progress.toFixed(1)}%</span>
                            </div>
                            <div className="progress">
                              <div 
                                className={`progress-bar bg-${color}`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="row text-center">
                            <div className="col-4">
                              <small className="text-muted">予算額</small>
                              <div className="fw-bold">¥{budget.amount.toLocaleString()}</div>
                            </div>
                            <div className="col-4">
                              <small className="text-muted">使用額</small>
                              <div className="fw-bold">¥{budget.spent.toLocaleString()}</div>
                            </div>
                            <div className="col-4">
                              <small className="text-muted">残額</small>
                              <div className={`fw-bold ${budget.remaining < 0 ? 'text-danger' : 'text-success'}`}>
                                ¥{budget.remaining.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {alerts.length > 0 && (
                            <div className="mt-3">
                              {alerts.map(alert => (
                                <div key={alert.id} className={`alert alert-${color === 'danger' ? 'danger' : 'warning'} alert-sm`}>
                                  <i className="bi bi-exclamation-triangle me-1"></i>
                                  {alert.message}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="bi bi-wallet2 display-1 text-muted mb-3"></i>
                <p className="text-muted">まだ予算が設定されていません。</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  最初の予算を作成する
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">新規予算作成</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">予算名</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newBudget.name || ''}
                    onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                    placeholder="例: 月間ゲーム購入予算"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">予算タイプ</label>
                  <select
                    className="form-select"
                    value={newBudget.type || 'monthly'}
                    onChange={(e) => setNewBudget({ ...newBudget, type: e.target.value as 'monthly' | 'yearly' | 'custom' })}
                  >
                    <option value="monthly">月間予算</option>
                    <option value="yearly">年間予算</option>
                    <option value="custom">カスタム期間</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">予算金額 (円)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newBudget.amount || ''}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: parseInt(e.target.value) || 0 })}
                    placeholder="10000"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  キャンセル
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={createBudget}
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}