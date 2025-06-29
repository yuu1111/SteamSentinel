import React from 'react';

interface HelpModalProps {
  show: boolean;
  onHide: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ show, onHide }) => {
  if (!show) return null;

  const shortcuts = [
    {
      key: 'Ctrl/Cmd + R',
      description: 'ページリフレッシュ',
      section: '基本操作'
    },
    {
      key: 'Ctrl/Cmd + D',
      description: 'ダークモード切り替え',
      section: '基本操作'
    },
    {
      key: '?',
      description: 'このヘルプを表示',
      section: '基本操作'
    },
    {
      key: 'ESC',
      description: 'モーダルを閉じる',
      section: '基本操作'
    },
    {
      key: 'Ctrl/Cmd + 1',
      description: 'ダッシュボードに移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 2',
      description: 'ゲーム管理に移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 3',
      description: 'アラート履歴に移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 4',
      description: '監視状況に移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 5',
      description: 'Epic Gamesに移動',
      section: 'ナビゲーション'
    },
    {
      key: 'Ctrl/Cmd + 6',
      description: '設定に移動',
      section: 'ナビゲーション'
    }
  ];

  const features = [
    {
      title: 'ゲーム価格監視',
      description: 'Steamゲームの価格を定期的に監視し、セールや最安値更新を通知します。',
      icon: 'bi-graph-down-arrow'
    },
    {
      title: '予算管理',
      description: '月間・年間の購入予算を設定し、支出状況を追跡・分析できます。',
      icon: 'bi-wallet'
    },
    {
      title: 'Discord通知',
      description: '価格変動やセール情報をDiscordに自動通知します。',
      icon: 'bi-chat-square-text'
    },
    {
      title: 'Epic Games無料ゲーム',
      description: 'Epic Games Storeの無料ゲーム情報を取得し、受け取り状況を管理できます。',
      icon: 'bi-gift'
    },
    {
      title: 'データ分析',
      description: 'ROI分析、価格トレンド、購入パターンの分析機能を提供します。',
      icon: 'bi-bar-chart'
    },
    {
      title: 'レポート出力',
      description: 'CSV、JSON、PDF形式での包括的なレポート生成が可能です。',
      icon: 'bi-file-earmark-text'
    }
  ];

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.section]) {
      acc[shortcut.section] = [];
    }
    acc[shortcut.section].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-question-circle me-2"></i>
              SteamSentinel ヘルプ
            </h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>
          <div className="modal-body">
            {/* 機能説明 */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-info-circle me-2"></i>
                主要機能
              </h6>
              <div className="row">
                {features.map((feature, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    <div className="d-flex align-items-start">
                      <i className={`${feature.icon} text-primary me-2 mt-1`}></i>
                      <div>
                        <div className="fw-bold">{feature.title}</div>
                        <small className="text-muted">{feature.description}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* キーボードショートカット */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-keyboard me-2"></i>
                キーボードショートカット
              </h6>
              {Object.entries(groupedShortcuts).map(([section, sectionShortcuts]) => (
                <div key={section} className="mb-3">
                  <h6 className="text-secondary mb-2">{section}</h6>
                  <div className="row">
                    {sectionShortcuts.map((shortcut, index) => (
                      <div key={index} className="col-md-6 mb-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="badge bg-light text-dark">{shortcut.key}</span>
                          <span className="text-muted flex-grow-1 ms-2">{shortcut.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 使い方のヒント */}
            <div className="mb-4">
              <h6 className="text-primary mb-3">
                <i className="bi bi-lightbulb me-2"></i>
                使い方のヒント
              </h6>
              <div className="alert alert-info">
                <ul className="mb-0">
                  <li><strong>ゲーム追加：</strong> Steam StoreのURLまたはApp IDを使用してゲームを追加できます</li>
                  <li><strong>価格閾値：</strong> 特定の価格以下になった時に通知を受け取れます</li>
                  <li><strong>予算設定：</strong> 月間・年間予算を設定して支出をコントロールできます</li>
                  <li><strong>データ分析：</strong> ダッシュボードで詳細な購入分析を確認できます</li>
                  <li><strong>一括操作：</strong> CSV形式でゲームデータのインポート・エクスポートが可能です</li>
                </ul>
              </div>
            </div>

            {/* システム情報 */}
            <div>
              <h6 className="text-primary mb-3">
                <i className="bi bi-gear me-2"></i>
                システム情報
              </h6>
              <div className="row">
                <div className="col-md-6">
                  <small className="text-muted">
                    <strong>バージョン:</strong> SteamSentinel v2.0<br />
                    <strong>データベース:</strong> SQLite v7<br />
                    <strong>フロントエンド:</strong> React + Bootstrap 5
                  </small>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">
                    <strong>APIサポート:</strong> Steam Store, IsThereAnyDeal<br />
                    <strong>通知:</strong> Discord Webhook<br />
                    <strong>レポート:</strong> CSV, JSON, PDF
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onHide}>
              閉じる
            </button>
            <a 
              href="https://github.com/your-repo/steam-sentinel" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <i className="bi bi-github me-1"></i>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;