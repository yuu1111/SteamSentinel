import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useAlert } from '../contexts/AlertContext'

interface SystemInfo {
  nodeVersion: string
  platform: string
  databasePath: string
  environment: string
}

interface ApiKeyStatus {
  steamApiKey: boolean
  discordWebhook: boolean
  itadApiKey: boolean
  igdbClientId: boolean
  igdbClientSecret: boolean
  youtubeApiKey: boolean
  twitchClientId: boolean
  twitchClientSecret: boolean
}

interface DiscordStatus {
  configured: boolean
  message: string
}

const Settings: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null)
  const [discordStatus, setDiscordStatus] = useState<DiscordStatus | null>(null)
  const [games, setGames] = useState<any[]>([])
  const [selectedGame, setSelectedGame] = useState('')
  const [testAlertType, setTestAlertType] = useState('new_low')
  const [testPrice, setTestPrice] = useState('')
  const [sendDiscord, setSendDiscord] = useState(false)
  const [loading, setLoading] = useState(true)
  const { showError, showSuccess, showInfo } = useAlert()

  useEffect(() => {
    loadSettingsData()
  }, [])

  const loadSettingsData = async () => {
    try {
      setLoading(true)
      
      // システム情報取得
      const systemResponse = await api.get('/system/info')
      if (systemResponse.success) {
        setSystemInfo(systemResponse.data)
      }

      // APIキー状況取得
      const apiResponse = await api.get('/system/api-status')
      if (apiResponse.success) {
        setApiKeyStatus(apiResponse.data)
      }

      // Discord状況取得
      const discordResponse = await api.get('/system/discord-status')
      if (discordResponse.success) {
        setDiscordStatus(discordResponse.data)
      }

      // ゲーム一覧取得（テスト用）
      const gamesResponse = await api.get('/games?enabled=all')
      if (gamesResponse.success) {
        setGames(gamesResponse.data || [])
      }
    } catch (error) {
      console.error('Failed to load settings data:', error)
      showError('設定データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const testDiscord = async (testType: string) => {
    try {
      showInfo(`Discord ${testType} テストを実行中...`)
      
      const response = await api.post('/system/test-discord', { type: testType })
      
      if (response.success) {
        showSuccess('Discordテストメッセージを送信しました')
      } else {
        showError('Discordテストに失敗しました: ' + response.error)
      }
    } catch (error) {
      console.error('Discord test failed:', error)
      showError('Discordテスト中にエラーが発生しました')
    }
  }

  const testPriceAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedGame || !testPrice) {
      showError('ゲームとテスト価格を選択してください')
      return
    }

    try {
      showInfo('価格アラートテストを実行中...')
      
      const response = await api.post('/system/test-price-alert', {
        gameId: selectedGame,
        alertType: testAlertType,
        testPrice: parseFloat(testPrice),
        sendDiscord
      })
      
      if (response.success) {
        showSuccess('価格アラートテストが完了しました')
      } else {
        showError('価格アラートテストに失敗しました: ' + response.error)
      }
    } catch (error) {
      console.error('Price alert test failed:', error)
      showError('価格アラートテスト中にエラーが発生しました')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="row">
      <div className="col-12">
        <h2><i className="bi bi-gear me-2"></i>設定・テスト</h2>
      </div>
      
      {/* Discord Settings Section */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0"><i className="bi bi-discord me-2"></i>Discord連携</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>設定状況</h6>
                {discordStatus ? (
                  <div className={`alert ${discordStatus.configured ? 'alert-success' : 'alert-warning'} mb-3`}>
                    <i className={`bi ${discordStatus.configured ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                    {discordStatus.message}
                  </div>
                ) : (
                  <div className="alert alert-secondary mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    Discord設定を確認中...
                  </div>
                )}
                
                <h6>Discord Webhook URL設定</h6>
                <p className="text-muted small">
                  Discord Webhook URLは環境変数 <code>DISCORD_WEBHOOK_URL</code> で設定してください。<br />
                  設定方法については、README.mdの「Discord Webhook (オプション)」セクションを参照してください。
                </p>
              </div>
              
              <div className="col-md-6">
                <h6>テスト機能</h6>
                <p className="text-muted small">各種Discord通知のテストメッセージを送信できます。</p>
                
                <div className="d-grid gap-2 mb-3">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => testDiscord('connection')}
                  >
                    <i className="bi bi-check-circle"></i> 接続テスト
                  </button>
                  <button 
                    className="btn btn-outline-success"
                    onClick={() => testDiscord('price_alert')}
                  >
                    <i className="bi bi-graph-down-arrow"></i> 価格アラートテスト
                  </button>
                  <button 
                    className="btn btn-outline-warning"
                    onClick={() => testDiscord('high_discount')}
                  >
                    <i className="bi bi-fire"></i> 高割引ゲームテスト
                  </button>
                  <button 
                    className="btn btn-outline-info"
                    onClick={() => testDiscord('epic_free')}
                  >
                    <i className="bi bi-gift"></i> Epic無料ゲームテスト
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Manual Monitoring Section */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0"><i className="bi bi-activity me-2"></i>手動監視</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-8">
                <h6>価格監視の実行</h6>
                <p className="text-muted">
                  登録されているすべてのゲームの価格情報を手動で更新します。<br />
                  通常は自動で定期実行されますが、即座に最新の価格情報を取得したい場合にご利用ください。
                </p>
                
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  <small>
                    手動監視の実行には時間がかかる場合があります。実行中は他の操作をお控えください。
                  </small>
                </div>
              </div>
              
              <div className="col-md-4">
                <h6>実行</h6>
                <div className="d-grid">
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={async () => {
                      try {
                        showInfo('手動監視を開始しています...')
                        
                        const response = await api.post('/monitoring/run')
                        
                        if (response.success) {
                          showSuccess('手動監視を開始しました')
                        } else {
                          showError('手動監視に失敗しました: ' + response.error)
                        }
                      } catch (error) {
                        console.error('Manual monitoring failed:', error)
                        showError('手動監視中にエラーが発生しました')
                      }
                    }}
                  >
                    <i className="bi bi-play-circle me-2"></i>
                    手動監視を実行
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Price Alert Test Section */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0"><i className="bi bi-bell me-2"></i>価格アラートテスト</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>手動価格アラートテスト</h6>
                <p className="text-muted small">
                  特定のゲームでアラート条件を満たした場合のシミュレーションを実行できます。
                </p>
                
                <form onSubmit={testPriceAlert}>
                  <div className="mb-3">
                    <label htmlFor="testGameSelect" className="form-label">テストするゲーム</label>
                    <select 
                      className="form-select" 
                      id="testGameSelect" 
                      value={selectedGame}
                      onChange={(e) => setSelectedGame(e.target.value)}
                      required
                    >
                      <option value="">ゲームを選択...</option>
                      {games.map(game => (
                        <option key={game.id} value={game.id}>
                          {game.name} (ID: {game.steam_app_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="testAlertType" className="form-label">アラートタイプ</label>
                    <select 
                      className="form-select" 
                      id="testAlertType"
                      value={testAlertType}
                      onChange={(e) => setTestAlertType(e.target.value)}
                      required
                    >
                      <option value="new_low">新最安値更新</option>
                      <option value="sale_start">セール開始</option>
                      <option value="threshold_met">価格閾値達成</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="testCurrentPrice" className="form-label">テスト価格（円）</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="testCurrentPrice"
                      placeholder="例: 2980"
                      min="0"
                      step="1"
                      value={testPrice}
                      onChange={(e) => setTestPrice(e.target.value)}
                      required
                    />
                    <div className="form-text">このテスト価格でアラートをシミュレーションします</div>
                  </div>
                  
                  <div className="form-check mb-3">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="testSendDiscord"
                      checked={sendDiscord}
                      onChange={(e) => setSendDiscord(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="testSendDiscord">
                      Discord通知も送信する（Discord設定が必要）
                    </label>
                  </div>
                  
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-play-circle"></i> アラートテスト実行
                  </button>
                </form>
              </div>
              
              <div className="col-md-6">
                <h6>テスト結果</h6>
                <div className="border rounded p-3 bg-light">
                  <div className="text-muted text-center">
                    <i className="bi bi-info-circle"></i><br />
                    テストを実行すると結果がここに表示されます
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* System Information Section */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0"><i className="bi bi-info-circle me-2"></i>システム情報</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6>環境設定</h6>
                {systemInfo ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Node.js バージョン</strong></td>
                          <td>{systemInfo.nodeVersion}</td>
                        </tr>
                        <tr>
                          <td><strong>プラットフォーム</strong></td>
                          <td>{systemInfo.platform}</td>
                        </tr>
                        <tr>
                          <td><strong>環境</strong></td>
                          <td>{systemInfo.environment}</td>
                        </tr>
                        <tr>
                          <td><strong>データベース</strong></td>
                          <td>{systemInfo.databasePath}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-muted">システム情報を取得中...</div>
                )}
              </div>
              
              <div className="col-md-6">
                <h6>APIキー設定状況</h6>
                {apiKeyStatus ? (
                  <div className="list-group">
                    <div className={`list-group-item d-flex justify-content-between align-items-center ${apiKeyStatus.itadApiKey ? 'list-group-item-success' : 'list-group-item-danger'}`}>
                      <span>
                        ITAD API Key
                        <small className="d-block text-muted">(必須)</small>
                      </span>
                      <span className={`badge ${apiKeyStatus.itadApiKey ? 'bg-success' : 'bg-danger'}`}>
                        {apiKeyStatus.itadApiKey ? '設定済み' : '未設定'}
                      </span>
                    </div>
                    <div className={`list-group-item d-flex justify-content-between align-items-center ${apiKeyStatus.steamApiKey ? 'list-group-item-success' : 'list-group-item-warning'}`}>
                      <span>
                        Steam API Key
                        <small className="d-block text-muted">(推奨)</small>
                      </span>
                      <span className={`badge ${apiKeyStatus.steamApiKey ? 'bg-success' : 'bg-warning'}`}>
                        {apiKeyStatus.steamApiKey ? '設定済み' : '未設定'}
                      </span>
                    </div>
                    <div className={`list-group-item d-flex justify-content-between align-items-center ${apiKeyStatus.discordWebhook ? 'list-group-item-success' : 'list-group-item-warning'}`}>
                      <span>
                        Discord Webhook
                        <small className="d-block text-muted">(オプション)</small>
                      </span>
                      <span className={`badge ${apiKeyStatus.discordWebhook ? 'bg-success' : 'bg-warning'}`}>
                        {apiKeyStatus.discordWebhook ? '設定済み' : '未設定'}
                      </span>
                    </div>
                    <div className={`list-group-item d-flex justify-content-between align-items-center ${apiKeyStatus.igdbClientId && apiKeyStatus.igdbClientSecret ? 'list-group-item-success' : 'list-group-item-secondary'}`}>
                      <span>
                        IGDB API
                        <small className="d-block text-muted">(オプション - レビュー機能)</small>
                      </span>
                      <span className={`badge ${apiKeyStatus.igdbClientId && apiKeyStatus.igdbClientSecret ? 'bg-success' : 'bg-secondary'}`}>
                        {apiKeyStatus.igdbClientId && apiKeyStatus.igdbClientSecret ? '設定済み' : '未設定'}
                      </span>
                    </div>
                    <div className={`list-group-item d-flex justify-content-between align-items-center ${apiKeyStatus.youtubeApiKey ? 'list-group-item-success' : 'list-group-item-secondary'}`}>
                      <span>
                        YouTube API Key
                        <small className="d-block text-muted">(オプション)</small>
                      </span>
                      <span className={`badge ${apiKeyStatus.youtubeApiKey ? 'bg-success' : 'bg-secondary'}`}>
                        {apiKeyStatus.youtubeApiKey ? '設定済み' : '未設定'}
                      </span>
                    </div>
                    <div className={`list-group-item d-flex justify-content-between align-items-center ${apiKeyStatus.twitchClientId && apiKeyStatus.twitchClientSecret ? 'list-group-item-success' : 'list-group-item-secondary'}`}>
                      <span>
                        Twitch API
                        <small className="d-block text-muted">(オプション)</small>
                      </span>
                      <span className={`badge ${apiKeyStatus.twitchClientId && apiKeyStatus.twitchClientSecret ? 'bg-success' : 'bg-secondary'}`}>
                        {apiKeyStatus.twitchClientId && apiKeyStatus.twitchClientSecret ? '設定済み' : '未設定'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted">API設定を確認中...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings