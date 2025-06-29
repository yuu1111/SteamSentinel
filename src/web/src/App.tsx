import { useState, useEffect } from 'react'
import { ConfigProvider, theme } from 'antd'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import Games from './pages/Games'
import Alerts from './pages/Alerts'
import Monitoring from './pages/Monitoring'
import Test from './pages/Test'
import EpicGames from './pages/EpicGames'
import Limitations from './pages/Limitations'
import Licenses from './pages/Licenses'
import LoadingOverlay from './components/LoadingOverlay'
import AlertContainer from './components/AlertContainer'
import HelpModal from './components/HelpModal'
import { useDarkMode } from './hooks/useDarkMode'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { AlertProvider } from './contexts/AlertContext'
import { ViewType } from './types'
import './styles/dashboard-cards.css'
import './styles/alert-game-cards.css'

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [isDarkMode, toggleDarkMode] = useDarkMode()
  const [showHelpModal, setShowHelpModal] = useState(false)
  // const [dashboardRef, setDashboardRef] = useState<any>(null)

  // ヘルプモーダル表示イベントリスナー
  useEffect(() => {
    const handleShowHelpModal = () => {
      setShowHelpModal(true)
    }
    
    window.addEventListener('showHelpModal', handleShowHelpModal)
    
    return () => {
      window.removeEventListener('showHelpModal', handleShowHelpModal)
    }
  }, [])

  // 制限事項・ライセンス情報ページで一番上に移動
  useEffect(() => {
    if (currentView === 'limitations' || currentView === 'licenses') {
      // React レンダリング完了後にスクロールを実行
      requestAnimationFrame(() => {
        // CSSのscroll-behaviorを一時的に無効化
        const originalScrollBehavior = document.documentElement.style.scrollBehavior
        const originalBodyScrollBehavior = document.body.style.scrollBehavior
        
        document.documentElement.style.scrollBehavior = 'auto'
        document.body.style.scrollBehavior = 'auto'
        
        // 複数の方法で確実にスクロール
        window.scrollTo(0, 0)
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        
        // 元の設定を復元
        setTimeout(() => {
          document.documentElement.style.scrollBehavior = originalScrollBehavior
          document.body.style.scrollBehavior = originalBodyScrollBehavior
        }, 0)
      })
    }
  }, [currentView])

  // キーボードショートカット
  useKeyboardShortcuts({
    onViewChange: setCurrentView,
    onToggleDarkMode: toggleDarkMode,
    onRefresh: () => {
      window.location.reload()
    },
    onShowAddModal: () => {
      // Modal functionality disabled for current implementation
    }
  })

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />
      case 'games':
        return <Games />
      case 'alerts':
        return <Alerts />
      case 'monitoring':
        return <Monitoring />
      case 'test':
        return <Test />
      case 'epic':
        return <EpicGames />
      case 'limitations':
        return <Limitations />
      case 'licenses':
        return <Licenses />
      default:
        return <Dashboard />
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#007bff',
          colorSuccess: '#28a745',
          colorWarning: '#ffc107',
          colorError: '#dc3545',
          colorInfo: '#17a2b8',
          fontSize: 14,
          borderRadius: 6,
        },
      }}
    >
      <AlertProvider>
        <div className={isDarkMode ? 'dark-mode' : ''}>
          <Navigation 
            currentView={currentView} 
            onViewChange={setCurrentView}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
          
          <main className="container-fluid mt-4">
            {renderCurrentView()}
          </main>

          <LoadingOverlay />
          <AlertContainer />
          <HelpModal 
            show={showHelpModal} 
            onHide={() => setShowHelpModal(false)} 
          />

          <footer className="mt-5 py-4 text-center">
            <div className="container">
              <small className="text-muted">
                SteamSentinel v1.0.0 - Steam価格監視システム<br />
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('limitations') }} className="text-decoration-none me-3">
                  <i className="bi bi-exclamation-triangle"></i> 制限事項・注意点
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('licenses') }} className="text-decoration-none me-3">
                  <i className="bi bi-file-text"></i> ライセンス情報
                </a>
                <a href="https://github.com/yuu1111/SteamSentinel" target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                  <i className="bi bi-github"></i> GitHub
                </a>
              </small>
            </div>
          </footer>
        </div>
      </AlertProvider>
    </ConfigProvider>
  )
}

export default App