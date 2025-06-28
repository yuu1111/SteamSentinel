import React, { useState } from 'react'
import { DashboardLayout, DashboardWidget, DashboardTheme, UserPreferences } from '../types'
import { useAlert } from '../contexts/AlertContext'

interface DashboardCustomizerProps {
  currentLayout?: DashboardLayout
  onLayoutChange: (layout: DashboardLayout) => void
  onClose: () => void
}

export const DashboardCustomizer: React.FC<DashboardCustomizerProps> = ({
  currentLayout,
  onLayoutChange,
  onClose
}) => {
  const [layout, setLayout] = useState<DashboardLayout>(
    currentLayout || getDefaultLayout()
  )
  const [activeTab, setActiveTab] = useState<'layout' | 'widgets' | 'theme' | 'preferences'>('layout')
  // const [selectedWidget, setSelectedWidget] = useState<DashboardWidget | null>(null)
  const [themes] = useState<DashboardTheme[]>(getAvailableThemes())
  const [preferences, setPreferences] = useState<UserPreferences>(getDefaultPreferences())
  const { showSuccess, showError } = useAlert()

  function getDefaultLayout(): DashboardLayout {
    return {
      id: 'default',
      name: 'デフォルトレイアウト',
      description: 'SteamSentinelの標準ダッシュボードレイアウト',
      widgets: [
        {
          id: 'statistics',
          type: 'statistics',
          title: '統計カード',
          size: 'large',
          position: { x: 0, y: 0, w: 12, h: 2 },
          isVisible: true
        },
        {
          id: 'charts',
          type: 'charts',
          title: '分析チャート',
          size: 'large',
          position: { x: 0, y: 2, w: 12, h: 4 },
          isVisible: true
        },
        {
          id: 'roi',
          type: 'roi',
          title: 'ROI分析',
          size: 'large',
          position: { x: 0, y: 6, w: 12, h: 3 },
          isVisible: true
        },
        {
          id: 'budget',
          type: 'budget',
          title: '予算管理',
          size: 'large',
          position: { x: 0, y: 9, w: 12, h: 4 },
          isVisible: true
        },
        {
          id: 'alerts',
          type: 'alerts',
          title: '支出アラート',
          size: 'large',
          position: { x: 0, y: 13, w: 12, h: 3 },
          isVisible: true
        },
        {
          id: 'purchases',
          type: 'purchases',
          title: '購入履歴',
          size: 'medium',
          position: { x: 0, y: 16, w: 12, h: 2 },
          isVisible: true
        }
      ],
      theme: 'auto',
      colorScheme: 'blue',
      isDefault: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  function getAvailableThemes(): DashboardTheme[] {
    return [
      {
        id: 'blue',
        name: 'ブルー',
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          warning: '#ffc107',
          danger: '#dc3545',
          info: '#17a2b8',
          background: '#ffffff',
          surface: '#f8f9fa',
          text: '#212529'
        }
      },
      {
        id: 'green',
        name: 'グリーン',
        colors: {
          primary: '#28a745',
          secondary: '#6c757d',
          success: '#20c997',
          warning: '#ffc107',
          danger: '#dc3545',
          info: '#17a2b8',
          background: '#ffffff',
          surface: '#f8f9fa',
          text: '#212529'
        }
      },
      {
        id: 'dark',
        name: 'ダーク',
        colors: {
          primary: '#6f42c1',
          secondary: '#6c757d',
          success: '#28a745',
          warning: '#ffc107',
          danger: '#dc3545',
          info: '#17a2b8',
          background: '#212529',
          surface: '#343a40',
          text: '#ffffff'
        }
      }
    ]
  }

  function getDefaultPreferences(): UserPreferences {
    return {
      id: 'default',
      userId: 'user1',
      dashboard: {
        defaultView: 'overview',
        autoRefresh: false,
        refreshInterval: 300,
        compactMode: false
      },
      notifications: {
        budget_alerts: true,
        spending_alerts: true,
        milestone_alerts: true,
        email_notifications: false,
        sound_enabled: true
      },
      display: {
        theme: 'auto',
        language: 'ja',
        currency: 'JPY',
        dateFormat: 'YYYY/MM/DD',
        numberFormat: 'ja-JP'
      },
      privacy: {
        analytics_enabled: true,
        crash_reporting: true,
        usage_statistics: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  const getWidgetTypeIcon = (type: DashboardWidget['type']) => {
    switch (type) {
      case 'statistics': return 'grid-3x3'
      case 'charts': return 'bar-chart-line'
      case 'roi': return 'graph-up-arrow'
      case 'budget': return 'wallet'
      case 'alerts': return 'bell'
      case 'purchases': return 'bag-check'
      case 'trends': return 'trending-up'
      default: return 'square'
    }
  }

  const getWidgetTypeName = (type: DashboardWidget['type']) => {
    switch (type) {
      case 'statistics': return '統計カード'
      case 'charts': return '分析チャート'
      case 'roi': return 'ROI分析'
      case 'budget': return '予算管理'
      case 'alerts': return '支出アラート'
      case 'purchases': return '購入履歴'
      case 'trends': return 'トレンド分析'
      default: return 'ウィジェット'
    }
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, isVisible: !widget.isVisible } : widget
      )
    }))
  }

  const updateWidgetSize = (widgetId: string, size: DashboardWidget['size']) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, size } : widget
      )
    }))
  }

  const saveLayout = () => {
    try {
      const updatedLayout = {
        ...layout,
        updated_at: new Date().toISOString()
      }
      onLayoutChange(updatedLayout)
      
      // Save to localStorage
      localStorage.setItem('dashboard_layout', JSON.stringify(updatedLayout))
      localStorage.setItem('user_preferences', JSON.stringify(preferences))
      
      showSuccess('ダッシュボード設定を保存しました')
      onClose()
    } catch (error) {
      showError('設定の保存に失敗しました')
    }
  }

  const resetToDefault = () => {
    setLayout(getDefaultLayout())
    setPreferences(getDefaultPreferences())
    showSuccess('デフォルト設定にリセットしました')
  }

  const exportSettings = () => {
    const settings = {
      layout,
      preferences,
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `steamsentinel-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    showSuccess('設定をエクスポートしました')
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-gear me-2"></i>ダッシュボード カスタマイズ
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          
          <div className="modal-body">
            {/* Tab Navigation */}
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'layout' ? 'active' : ''}`}
                  onClick={() => setActiveTab('layout')}
                >
                  <i className="bi bi-layout-text-window me-1"></i>レイアウト
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'widgets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('widgets')}
                >
                  <i className="bi bi-grid-3x3 me-1"></i>ウィジェット
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'theme' ? 'active' : ''}`}
                  onClick={() => setActiveTab('theme')}
                >
                  <i className="bi bi-palette me-1"></i>テーマ
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'preferences' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preferences')}
                >
                  <i className="bi bi-sliders me-1"></i>設定
                </button>
              </li>
            </ul>

            {/* Layout Tab */}
            {activeTab === 'layout' && (
              <div>
                <h6>レイアウト情報</h6>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">レイアウト名</label>
                    <input
                      type="text"
                      className="form-control"
                      value={layout.name}
                      onChange={(e) => setLayout(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">説明</label>
                    <input
                      type="text"
                      className="form-control"
                      value={layout.description || ''}
                      onChange={(e) => setLayout(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                
                <h6>レイアウトプレビュー</h6>
                <div className="border rounded p-3" style={{ minHeight: '400px', backgroundColor: '#f8f9fa' }}>
                  <div className="row">
                    {layout.widgets
                      .filter(widget => widget.isVisible)
                      .sort((a, b) => a.position.y - b.position.y)
                      .map(widget => (
                        <div key={widget.id} className="col-12 mb-2">
                          <div 
                            className="card"
                            style={{ 
                              height: `${widget.size === 'small' ? '60px' : widget.size === 'medium' ? '120px' : '180px'}`,
                              cursor: 'pointer'
                            }}
                            // onClick={() => setSelectedWidget(widget)}
                          >
                            <div className="card-body d-flex align-items-center justify-content-center">
                              <div className="text-center">
                                <i className={`bi bi-${getWidgetTypeIcon(widget.type)} display-6 text-primary mb-2`}></i>
                                <p className="mb-0">{widget.title}</p>
                                <small className="text-muted">{getWidgetTypeName(widget.type)}</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Widgets Tab */}
            {activeTab === 'widgets' && (
              <div>
                <h6>ウィジェット設定</h6>
                <div className="row">
                  {layout.widgets.map(widget => (
                    <div key={widget.id} className="col-lg-6 mb-3">
                      <div className="card">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center">
                              <i className={`bi bi-${getWidgetTypeIcon(widget.type)} me-2`}></i>
                              <strong>{widget.title}</strong>
                            </div>
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                checked={widget.isVisible}
                                onChange={() => toggleWidgetVisibility(widget.id)}
                              />
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <label className="form-label">サイズ</label>
                            <select
                              className="form-select form-select-sm"
                              value={widget.size}
                              onChange={(e) => updateWidgetSize(widget.id, e.target.value as DashboardWidget['size'])}
                            >
                              <option value="small">小</option>
                              <option value="medium">中</option>
                              <option value="large">大</option>
                              <option value="full">全幅</option>
                            </select>
                          </div>
                          
                          <small className="text-muted">{getWidgetTypeName(widget.type)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div>
                <h6>カラーテーマ</h6>
                <div className="row mb-4">
                  {themes.map(theme => (
                    <div key={theme.id} className="col-lg-4 mb-3">
                      <div 
                        className={`card h-100 ${layout.colorScheme === theme.id ? 'border-primary' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setLayout(prev => ({ ...prev, colorScheme: theme.id }))}
                      >
                        <div className="card-body">
                          <h6 className="card-title">{theme.name}</h6>
                          <div className="d-flex mb-2">
                            {Object.entries(theme.colors).slice(0, 6).map(([key, color]) => (
                              <div
                                key={key}
                                className="me-1"
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: color,
                                  borderRadius: '3px',
                                  border: '1px solid #dee2e6'
                                }}
                                title={key}
                              />
                            ))}
                          </div>
                          {layout.colorScheme === theme.id && (
                            <div className="text-primary">
                              <i className="bi bi-check-circle me-1"></i>選択中
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <h6>テーマモード</h6>
                <div className="btn-group w-100" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="theme"
                    id="theme-light"
                    checked={layout.theme === 'light'}
                    onChange={() => setLayout(prev => ({ ...prev, theme: 'light' }))}
                  />
                  <label className="btn btn-outline-primary" htmlFor="theme-light">
                    <i className="bi bi-sun me-1"></i>ライト
                  </label>
                  
                  <input
                    type="radio"
                    className="btn-check"
                    name="theme"
                    id="theme-dark"
                    checked={layout.theme === 'dark'}
                    onChange={() => setLayout(prev => ({ ...prev, theme: 'dark' }))}
                  />
                  <label className="btn btn-outline-primary" htmlFor="theme-dark">
                    <i className="bi bi-moon me-1"></i>ダーク
                  </label>
                  
                  <input
                    type="radio"
                    className="btn-check"
                    name="theme"
                    id="theme-auto"
                    checked={layout.theme === 'auto'}
                    onChange={() => setLayout(prev => ({ ...prev, theme: 'auto' }))}
                  />
                  <label className="btn btn-outline-primary" htmlFor="theme-auto">
                    <i className="bi bi-circle-half me-1"></i>自動
                  </label>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div>
                <h6>ダッシュボード設定</h6>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label">デフォルトビュー</label>
                    <select
                      className="form-select"
                      value={preferences.dashboard.defaultView}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        dashboard: { ...prev.dashboard, defaultView: e.target.value as any }
                      }))}
                    >
                      <option value="overview">概要</option>
                      <option value="monitoring">監視統計</option>
                      <option value="expenses">出費分析</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">自動更新間隔 (秒)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={preferences.dashboard.refreshInterval}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        dashboard: { ...prev.dashboard, refreshInterval: parseInt(e.target.value) || 300 }
                      }))}
                    />
                  </div>
                </div>
                
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.dashboard.autoRefresh}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          dashboard: { ...prev.dashboard, autoRefresh: e.target.checked }
                        }))}
                      />
                      <label className="form-check-label">自動更新を有効化</label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.dashboard.compactMode}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          dashboard: { ...prev.dashboard, compactMode: e.target.checked }
                        }))}
                      />
                      <label className="form-check-label">コンパクトモード</label>
                    </div>
                  </div>
                </div>

                <h6>通知設定</h6>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="form-check form-switch mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.notifications.budget_alerts}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, budget_alerts: e.target.checked }
                        }))}
                      />
                      <label className="form-check-label">予算アラート</label>
                    </div>
                    <div className="form-check form-switch mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.notifications.spending_alerts}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, spending_alerts: e.target.checked }
                        }))}
                      />
                      <label className="form-check-label">支出アラート</label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="form-check form-switch mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.notifications.milestone_alerts}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, milestone_alerts: e.target.checked }
                        }))}
                      />
                      <label className="form-check-label">マイルストーン通知</label>
                    </div>
                    <div className="form-check form-switch mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={preferences.notifications.sound_enabled}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, sound_enabled: e.target.checked }
                        }))}
                      />
                      <label className="form-check-label">サウンド通知</label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <div className="me-auto">
              <button className="btn btn-outline-secondary me-2" onClick={exportSettings}>
                <i className="bi bi-download me-1"></i>エクスポート
              </button>
              <button className="btn btn-outline-warning" onClick={resetToDefault}>
                <i className="bi bi-arrow-clockwise me-1"></i>リセット
              </button>
            </div>
            <button className="btn btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button className="btn btn-primary" onClick={saveLayout}>
              <i className="bi bi-check me-1"></i>保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}