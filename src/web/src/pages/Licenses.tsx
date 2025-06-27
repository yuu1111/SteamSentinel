import React from 'react'

const Licenses: React.FC = () => {
  return (
    <div className="container-fluid">
      <div className="row">
      <div className="col-12">
        <h1 className="h2 h1-md"><i className="bi bi-file-text me-2"></i>ライセンス情報</h1>
        <p className="lead">SteamSentinelで使用しているサードパーティライブラリ・サービスのライセンス情報です。</p>
        
        <hr />
        
        {/* Frontend Libraries */}
        <section className="mb-5">
          <h2><i className="bi bi-globe me-2"></i>フロントエンドライブラリ</h2>
          
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>Bootstrap 5.3.0</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> MIT License</p>
                  <p><strong>用途:</strong> UIフレームワーク、レスポンシブデザイン</p>
                  <p><strong>配布元:</strong> <a href="https://getbootstrap.com/" target="_blank" rel="noopener noreferrer">Bootstrap</a></p>
                  <p><strong>CDN:</strong> jsDelivr</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>Bootstrap Icons 1.10.0</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> MIT License</p>
                  <p><strong>用途:</strong> アイコンフォント</p>
                  <p><strong>配布元:</strong> <a href="https://icons.getbootstrap.com/" target="_blank" rel="noopener noreferrer">Bootstrap Icons</a></p>
                  <p><strong>CDN:</strong> jsDelivr</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>Chart.js 4.4.0</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> MIT License</p>
                  <p><strong>用途:</strong> 価格推移グラフの描画</p>
                  <p><strong>配布元:</strong> <a href="https://www.chartjs.org/" target="_blank" rel="noopener noreferrer">Chart.js</a></p>
                  <p><strong>CDN:</strong> jsDelivr</p>
                </div>
              </div>
            </div>

            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>React 18</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> MIT License</p>
                  <p><strong>用途:</strong> UIライブラリ、コンポーネント管理</p>
                  <p><strong>配布元:</strong> <a href="https://reactjs.org/" target="_blank" rel="noopener noreferrer">React</a></p>
                  <p><strong>CDN:</strong> npm</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Backend Libraries */}
        <section className="mb-5">
          <h2><i className="bi bi-server me-2"></i>バックエンドライブラリ (Node.js)</h2>
          
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>Express.js</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> MIT License</p>
                  <p><strong>用途:</strong> Webサーバーフレームワーク</p>
                  <p><strong>配布元:</strong> <a href="https://expressjs.com/" target="_blank" rel="noopener noreferrer">Express</a></p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>better-sqlite3</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> MIT License</p>
                  <p><strong>用途:</strong> SQLiteデータベース操作</p>
                  <p><strong>配布元:</strong> <a href="https://github.com/WiseLibs/better-sqlite3" target="_blank" rel="noopener noreferrer">better-sqlite3</a></p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>node-cron</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> ISC License</p>
                  <p><strong>用途:</strong> スケジュール実行</p>
                  <p><strong>配布元:</strong> <a href="https://github.com/node-cron/node-cron" target="_blank" rel="noopener noreferrer">node-cron</a></p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>axios</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> MIT License</p>
                  <p><strong>用途:</strong> HTTP通信ライブラリ</p>
                  <p><strong>配布元:</strong> <a href="https://axios-http.com/" target="_blank" rel="noopener noreferrer">Axios</a></p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>winston</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> MIT License</p>
                  <p><strong>用途:</strong> ログ管理システム</p>
                  <p><strong>配布元:</strong> <a href="https://github.com/winstonjs/winston" target="_blank" rel="noopener noreferrer">Winston</a></p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>dotenv</h5>
                </div>
                <div className="card-body">
                  <p><strong>ライセンス:</strong> BSD-2-Clause License</p>
                  <p><strong>用途:</strong> 環境変数管理</p>
                  <p><strong>配布元:</strong> <a href="https://github.com/motdotla/dotenv" target="_blank" rel="noopener noreferrer">dotenv</a></p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* External APIs */}
        <section className="mb-5">
          <h2><i className="bi bi-cloud me-2"></i>外部API・サービス</h2>
          
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>IsThereAnyDeal API</h5>
                </div>
                <div className="card-body">
                  <p><strong>利用規約:</strong> <a href="https://isthereanydeal.com/about/" target="_blank" rel="noopener noreferrer">利用規約に準拠</a></p>
                  <p><strong>用途:</strong> ゲーム価格情報・歴代最安値データ取得</p>
                  <p><strong>データ提供元:</strong> <a href="https://isthereanydeal.com/" target="_blank" rel="noopener noreferrer">IsThereAnyDeal</a></p>
                  <p><strong>料金:</strong> 無料（APIキー必要）</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>Steam Store API</h5>
                </div>
                <div className="card-body">
                  <p><strong>利用規約:</strong> <a href="https://steamcommunity.com/dev/apiterms" target="_blank" rel="noopener noreferrer">Steam Web API Terms of Use</a></p>
                  <p><strong>用途:</strong> ゲーム詳細情報・価格情報取得</p>
                  <p><strong>データ提供元:</strong> <a href="https://store.steampowered.com/" target="_blank" rel="noopener noreferrer">Steam Store</a></p>
                  <p><strong>料金:</strong> 無料（制限あり）</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>Steam CDN</h5>
                </div>
                <div className="card-body">
                  <p><strong>利用規約:</strong> Steamの利用規約に準拠</p>
                  <p><strong>用途:</strong> ゲームヘッダー画像の表示</p>
                  <p><strong>データ提供元:</strong> <a href="https://cdn.akamai.steamstatic.com/" target="_blank" rel="noopener noreferrer">Steam CDN</a></p>
                  <p><strong>料金:</strong> 無料</p>
                </div>
              </div>
            </div>
            
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>SteamDB</h5>
                </div>
                <div className="card-body">
                  <p><strong>利用規約:</strong> リンク先サイトの利用規約に準拠</p>
                  <p><strong>用途:</strong> 外部リンク（ゲーム詳細情報参照用）</p>
                  <p><strong>データ提供元:</strong> <a href="https://steamdb.info/" target="_blank" rel="noopener noreferrer">SteamDB</a></p>
                  <p><strong>料金:</strong> 無料</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* CDN Services */}
        <section className="mb-5">
          <h2><i className="bi bi-globe2 me-2"></i>CDNサービス</h2>
          
          <div className="row">
            <div className="col-md-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5>jsDelivr CDN</h5>
                </div>
                <div className="card-body">
                  <p><strong>利用規約:</strong> <a href="https://www.jsdelivr.com/terms" target="_blank" rel="noopener noreferrer">jsDelivr Terms of Service</a></p>
                  <p><strong>用途:</strong> フロントエンドライブラリの配信</p>
                  <p><strong>サービス提供元:</strong> <a href="https://www.jsdelivr.com/" target="_blank" rel="noopener noreferrer">jsDelivr</a></p>
                  <p><strong>料金:</strong> 無料</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* License Notices */}
        <section className="mb-5">
          <h2><i className="bi bi-shield-check me-2"></i>ライセンス表記</h2>
          
          <div className="alert alert-info">
            <h5><i className="bi bi-info-circle me-2"></i>MIT License について</h5>
            <p>多くのライブラリで使用されているMIT Licenseは、以下の条件で自由に利用できます：</p>
            <ul>
              <li>著作権表示と許可表示を保持すること</li>
              <li>ソフトウェアは「現状のまま」提供され、保証はありません</li>
              <li>商用・非商用問わず自由に使用・修正・配布可能</li>
            </ul>
            <p>詳細は各ライブラリのライセンスファイルをご確認ください。</p>
          </div>
          
          <div className="alert alert-warning">
            <h5><i className="bi bi-exclamation-triangle me-2"></i>外部API利用について</h5>
            <p>外部APIサービスについては、各サービス提供者の利用規約に従って使用しています。これらのサービスの利用制限や変更により、SteamSentinelの機能に影響が出る可能性があります。</p>
          </div>
        </section>
        
        {/* Attribution */}
        <section className="mb-5">
          <h2><i className="bi bi-heart me-2"></i>謝辞</h2>
          <p>SteamSentinelの開発にあたり、多くのオープンソースプロジェクトとサービス提供者の皆様にお世話になっております。これらの素晴らしいライブラリ・サービスなしには、本プロジェクトは実現できませんでした。開発者・提供者の皆様に心より感謝いたします。</p>
          
          <div className="mt-4">
            <h5>特別な感謝</h5>
            <ul>
              <li><strong>IsThereAnyDeal</strong> - 包括的なゲーム価格データの提供</li>
              <li><strong>Steam</strong> - ゲーム情報・画像データの提供</li>
              <li><strong>Bootstrap</strong> - 美しく使いやすいUIコンポーネント</li>
              <li><strong>React</strong> - 効率的なUIコンポーネント開発環境</li>
              <li><strong>Node.js</strong> - 安定したサーバーサイドJavaScript環境</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
    </div>
  )
}

export default Licenses