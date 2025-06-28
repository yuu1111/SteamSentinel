import React from 'react'
import { ViewType } from '../types'

interface NavigationProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  isDarkMode,
  onToggleDarkMode
}) => {
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'ダッシュボード', icon: 'house-door' },
    { id: 'games' as ViewType, label: 'ゲーム管理', icon: 'collection' },
    { id: 'alerts' as ViewType, label: 'アラート履歴', icon: 'bell' },
    { id: 'monitoring' as ViewType, label: '監視状況', icon: 'activity' },
    { id: 'settings' as ViewType, label: '設定・テスト', icon: 'gear' },
  ]

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <a className="navbar-brand d-flex align-items-center" href="#" onClick={(e) => { e.preventDefault(); onViewChange('dashboard') }}>
          <i className="bi bi-shield-check me-2"></i>
          <span className="d-none d-sm-inline">SteamSentinel</span>
        </a>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {navItems.map(item => (
              <li key={item.id} className="nav-item">
                <a
                  className={`nav-link ${currentView === item.id ? 'active' : ''}`}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    onViewChange(item.id)
                  }}
                >
                  <i className={`bi bi-${item.icon} me-1`}></i>
                  <span className="d-lg-inline d-none">{item.label}</span>
                  <span className="d-lg-none">{item.label.split('')[0]}</span>
                  {(item as any).badge && (
                    <span className="badge bg-warning text-dark ms-1">{(item as any).badge}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>

          <div className="d-flex align-items-center">
            <button
              className="btn btn-outline-light btn-sm me-2"
              onClick={onToggleDarkMode}
              title={isDarkMode ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              <i className={`bi bi-${isDarkMode ? 'sun' : 'moon'}`}></i>
            </button>

          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation