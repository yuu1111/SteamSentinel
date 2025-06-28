import React from 'react'

const Limitations: React.FC = () => {
  return (
    <div className="container-fluid">
      <div className="row">
      <div className="col-12">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center mb-4">
          <i className="bi bi-exclamation-triangle-fill text-warning me-md-3 mb-2 mb-md-0" style={{ fontSize: '2rem' }}></i>
          <div>
            <h1 className="mb-1 h2 h1-md">制限事項・注意点</h1>
            <p className="text-muted mb-0">SteamSentinelの使用に関する重要な情報</p>
          </div>
        </div>
      </div>

      {/* 歴代最安値に関する制限 */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card border-warning">
            <div className="card-header bg-warning text-dark">
              <h3 className="card-title mb-0">
                <i className="bi bi-graph-down me-2"></i>
                歴代最安値データの制限
              </h3>
            </div>
            <div className="card-body">
              <div className="alert alert-warning mb-3">
                <i className="bi bi-info-circle me-2"></i>
                <strong>重要:</strong> SteamSentinelで表示される「歴代最安値」は、完全な履歴ではありません。
              </div>
              
              <h5>データ保持期間の制限</h5>
              <ul className="list-group list-group-flush mb-4">
                <li className="list-group-item">
                  <i className="bi bi-calendar-week text-primary me-2"></i>
                  <strong>約6ヶ月間</strong>のデータのみ利用可能
                </li>
                <li className="list-group-item">
                  <i className="bi bi-clock-history text-info me-2"></i>
                  現在確認できる最古データ: <strong>2024年12月頃</strong>
                </li>
                <li className="list-group-item">
                  <i className="bi bi-arrow-clockwise text-success me-2"></i>
                  データは定期的に更新され、古いデータは削除される
                </li>
              </ul>

              <h5>データソースについて</h5>
              <div className="row">
                <div className="col-md-6">
                  <div className="card border h-100">
                    <div className="card-body">
                      <h6 className="card-title">
                        <i className="bi bi-database me-2"></i>
                        IsThereAnyDeal (ITAD)
                      </h6>
                      <ul className="mb-0">
                        <li>メインの価格データソース</li>
                        <li>2024年末にAPI v2に移行</li>
                        <li>古いデータが新形式に移行されていない</li>
                        <li>約6ヶ月間のデータのみ提供</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border h-100">
                    <div className="card-body">
                      <h6 className="card-title">
                        <i className="bi bi-steam me-2"></i>
                        Steam Store API
                      </h6>
                      <ul className="mb-0">
                        <li>現在価格の取得に使用</li>
                        <li>リアルタイムの価格情報</li>
                        <li>歴史データは提供されない</li>
                        <li>ゲームタイプ判別に使用</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="alert alert-info mt-4">
                <h6><i className="bi bi-lightbulb me-2"></i>実用的な解釈</h6>
                <p className="mb-0">
                  「歴代最安値」は <strong>「過去6ヶ月間の最安値」</strong> として理解してください。
                  より古いセール（例：2024年以前）の価格は反映されていない可能性があります。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API制限 */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card border-info">
            <div className="card-header bg-info text-white">
              <h3 className="card-title mb-0">
                <i className="bi bi-cloud me-2"></i>
                API制限
              </h3>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h5>監視間隔の制限</h5>
                  <ul>
                    <li><strong>最短10分間隔</strong>（API制限のため）</li>
                    <li>デフォルト: 1時間間隔</li>
                    <li>大量のゲーム監視時は間隔を長めに設定推奨</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <h5>同時接続制限</h5>
                  <ul>
                    <li>API負荷軽減のため <strong>1接続ずつ処理</strong></li>
                    <li>100ゲーム監視で約5分程度</li>
                    <li>処理中は他の操作を控えることを推奨</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ゲームタイプ制限 */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card border-secondary">
            <div className="card-header bg-secondary text-white">
              <h3 className="card-title mb-0">
                <i className="bi bi-controller me-2"></i>
                対応ゲームの制限
              </h3>
            </div>
            <div className="card-body">
              <h5>監視が困難なゲーム</h5>
              <div className="row">
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <i className="bi bi-x-circle text-danger" style={{ fontSize: '2rem' }}></i>
                    <h6 className="mt-2">販売終了ゲーム</h6>
                    <small className="text-muted">購入不可能</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <i className="bi bi-geo text-warning" style={{ fontSize: '2rem' }}></i>
                    <h6 className="mt-2">地域制限ゲーム</h6>
                    <small className="text-muted">日本で販売されていない</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <i className="bi bi-puzzle text-info" style={{ fontSize: '2rem' }}></i>
                    <h6 className="mt-2">特殊ゲームタイプ</h6>
                    <small className="text-muted">DLCやソフトウェアなど</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 精度に関する注意 */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card border-primary">
            <div className="card-header bg-primary text-white">
              <h3 className="card-title mb-0">
                <i className="bi bi-target me-2"></i>
                精度に関する注意
              </h3>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h5>価格データの精度</h5>
                  <ul>
                    <li>為替レートの変動により誤差が生じる場合</li>
                    <li>地域別価格の違い</li>
                    <li>バンドル価格と単品価格の混在</li>
                    <li>セール終了直後の価格反映遅延</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <h5>通知の遅延</h5>
                  <ul>
                    <li>最短10分〜最大監視間隔の遅延</li>
                    <li>API障害時の通知停止</li>
                    <li>手動更新による即座の確認を推奨</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* データ取得エラー */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card border-danger">
            <div className="card-header bg-danger text-white">
              <h3 className="card-title mb-0">
                <i className="bi bi-exclamation-octagon me-2"></i>
                データ取得エラーについて
              </h3>
            </div>
            <div className="card-body">
              <div className="alert alert-danger mb-3">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>重要:</strong> 一部のゲームでは正確な価格データが取得できない場合があります。
              </div>
              
              <h5>エラーが発生しやすいゲーム</h5>
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="card border h-100">
                    <div className="card-body">
                      <h6 className="card-title">
                        <i className="bi bi-puzzle me-2 text-warning"></i>
                        特殊なゲームタイプ
                      </h6>
                      <ul className="mb-0">
                        <li>DLC・アドオン類</li>
                        <li>ソフトウェア・ツール類</li>
                        <li>古いゲーム（データベース未登録）</li>
                        <li>地域限定販売ゲーム</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card border h-100">
                    <div className="card-body">
                      <h6 className="card-title">
                        <i className="bi bi-server me-2 text-warning"></i>
                        API側の問題
                      </h6>
                      <ul className="mb-0">
                        <li>Steam App IDの誤認識</li>
                        <li>価格データベースの不整合</li>
                        <li>APIサーバーの一時的障害</li>
                        <li>レート制限による取得失敗</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <h5>間違ったデータの例</h5>
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <i className="bi bi-currency-yen text-danger" style={{ fontSize: '2rem' }}></i>
                    <h6 className="mt-2">価格の誤表示</h6>
                    <small className="text-muted">¥0や異常に高い価格</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <i className="bi bi-graph-down text-danger" style={{ fontSize: '2rem' }}></i>
                    <h6 className="mt-2">最安値の誤認</h6>
                    <small className="text-muted">実際より高い・低い価格</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center p-3 border rounded">
                    <i className="bi bi-patch-question text-danger" style={{ fontSize: '2rem' }}></i>
                    <h6 className="mt-2">ゲーム名の不一致</h6>
                    <small className="text-muted">別ゲームのデータを取得</small>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning">
                <h6><i className="bi bi-shield-exclamation me-2"></i>対処法</h6>
                <ul className="mb-0">
                  <li><strong>購入前には必ずSteamストアで価格を確認</strong>してください</li>
                  <li>異常な価格が表示された場合は手動更新を試してください</li>
                  <li>データ取得失敗が続く場合は、そのゲームの監視を一時停止することを推奨</li>
                  <li>複数の価格比較サイト（SteamDB、IsThereAnyDeal等）で確認することを強く推奨</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 推奨事項 */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card border-success">
            <div className="card-header bg-success text-white">
              <h3 className="card-title mb-0">
                <i className="bi bi-check-circle me-2"></i>
                推奨使用方法
              </h3>
            </div>
            <div className="card-body">
              <div className="alert alert-success">
                <h5><i className="bi bi-hand-thumbs-up me-2"></i>効果的な使用方法</h5>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <h6>監視設定</h6>
                  <ul>
                    <li>✅ <strong>監視ゲーム数を50-100タイトル以下</strong>に抑える</li>
                    <li>✅ <strong>監視間隔は1-2時間</strong>に設定</li>
                    <li>✅ 不要なゲームは定期的に削除</li>
                    <li>✅ 価格閾値を適切に設定</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <h6>価格判断</h6>
                  <ul>
                    <li>✅ <strong>購入前に必ずSteamで確認</strong></li>
                    <li>✅ 歴代最安値は参考程度に活用</li>
                    <li>✅ 複数のセール比較サイトを併用</li>
                    <li>✅ セール期間の終了日時を確認</li>
                    <li>✅ <strong>異常な価格は疑って再確認</strong></li>
                    <li>✅ データ取得失敗ゲームは監視を一時停止</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 最終更新日 */}
      <div className="row">
        <div className="col-12">
          <div className="text-center text-muted">
            <small>
              <i className="bi bi-calendar3 me-1"></i>
              最終更新: 2025年6月27日
            </small>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

export default Limitations