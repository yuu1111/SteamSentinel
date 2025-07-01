import { useState, useEffect } from 'react'
import { ConfigProvider, theme, App as AntApp } from 'antd'
import { ExclamationCircleOutlined, FileTextOutlined, GithubOutlined } from '@ant-design/icons'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import Games from './pages/Games'
import Alerts from './pages/Alerts'
import Monitoring from './pages/Monitoring'
import Test from './pages/Test'
import EpicGames from './pages/EpicGames'
import SteamFreeGames from './pages/SteamFreeGames'
import Settings from './pages/Settings'
import Limitations from './pages/Limitations'
import Licenses from './pages/Licenses'
import LoadingOverlay from './components/LoadingOverlay'
// AlertContainer removed - using Ant Design notification system
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
      case 'steam-free':
        return <SteamFreeGames />
      case 'settings':
        return <Settings />
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
          fontSize: 16, // 14→16に増加
          fontSizeLG: 18, // 大きなフォントサイズ
          fontSizeXL: 20, // 特大フォントサイズ
          borderRadius: 6,
          // ダークモード時のコントラスト改善
          colorText: isDarkMode ? '#ffffff' : undefined,
          colorTextSecondary: isDarkMode ? '#d9d9d9' : undefined,
          colorTextTertiary: isDarkMode ? '#bfbfbf' : undefined,
        },
        components: {
          Typography: {
            titleMarginBottom: 16,
            titleMarginTop: 0,
          },
          Table: {
            fontSize: 15, // テーブルフォントサイズ増加
            headerBg: isDarkMode ? '#262626' : '#fafafa',
            headerColor: isDarkMode ? '#ffffff' : undefined,
          },
          Card: {
            fontSize: 15, // カードフォントサイズ増加
            headerFontSize: 17, // カードヘッダー増加
          },
          Button: {
            fontSize: 15, // ボタンフォントサイズ増加
          },
          Menu: {
            fontSize: 16, // メニューフォントサイズ増加
            itemHeight: 48, // メニュー項目の高さ増加
          },
          Statistic: {
            titleFontSize: 16, // 統計タイトル増加
            contentFontSize: 28, // 統計値増加
          },
          Notification: {
            zIndexPopup: 2000, // 高いz-index
            width: 384,
            fontSize: 15,
          },
          Message: {
            zIndexPopup: 2000, // 高いz-index
            fontSize: 15,
          }
        },
      }}
    >
      <AntApp>
        <AlertProvider>
          <div 
            style={{ 
              minHeight: '100vh',
              backgroundColor: isDarkMode ? '#141414' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000'
            }}
          >
            <Navigation 
              currentView={currentView} 
              onViewChange={setCurrentView}
              isDarkMode={isDarkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            
            <main style={{ padding: '24px', maxWidth: '100%', minHeight: 'calc(100vh - 200px)' }}>
              {renderCurrentView()}
            </main>

            <LoadingOverlay />
            <HelpModal 
              show={showHelpModal} 
              onHide={() => setShowHelpModal(false)} 
            />

            <footer style={{ 
              marginTop: '80px', 
              padding: '32px 0', 
              textAlign: 'center',
              backgroundColor: isDarkMode ? '#1f1f1f' : '#f5f5f5',
              borderTop: `1px solid ${isDarkMode ? '#303030' : '#e0e0e0'}`
            }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
                <small style={{ color: isDarkMode ? '#999' : '#666' }}>
                  SteamSentinel v1.0.0 - Steam価格監視システム<br />
                  <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('limitations') }} style={{ textDecoration: 'none', marginRight: '24px', color: isDarkMode ? '#1890ff' : '#1890ff' }}>
                    <ExclamationCircleOutlined style={{ marginRight: '4px' }} /> 制限事項・注意点
                  </a>
                  <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('licenses') }} style={{ textDecoration: 'none', marginRight: '24px', color: isDarkMode ? '#1890ff' : '#1890ff' }}>
                    <FileTextOutlined style={{ marginRight: '4px' }} /> ライセンス情報
                  </a>
                  <a href="https://github.com/yuu1111/SteamSentinel" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: isDarkMode ? '#1890ff' : '#1890ff' }}>
                    <GithubOutlined style={{ marginRight: '4px' }} /> GitHub
                  </a>
                </small>
              </div>
            </footer>
          </div>
        </AlertProvider>
      </AntApp>
    </ConfigProvider>
  )
}

export default App