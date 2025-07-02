# 核心機能

## 💰 価格監視
- 自動価格追跡 (1h間隔), セール検知, 最安値更新通知
- 閾値アラート (価格/割引率), Discord webhook, 履歴管理
- 未リリースゲーム追跡, 自動リリース検知

## 🎮 ゲーム管理
- CRUD操作, Steam連携, 購入状況追跡
- 手動最安値設定, 閾値タイプ設定 (price/discount/any_sale)

## 💼 予算管理・出費追跡
- 月間/年間/カスタム予算設定, リアルタイム監視
- ROI分析, 支出パターン分析, Canvas APIチャート
- 予算アラート (80%/100%), 統計ダッシュボード

## 🆓 無料ゲーム監視
- Epic & Steam無料ゲーム統合検知 (RSS: Free Games Finders)
- **Steam API検証システム**: 無料状態自動確認, ゲームタイプ判定
- 受け取り状況管理, Steam受け取り時の自動ゲーム登録
- 1時間間隔監視, Discord通知

## 🔧 システム機能
- TypeScript + React SPA, Ant Design UI
- SQLite DB, 80+ API, Discord通知, 自動スケジューラー
- **英語ログシステム**: Winstonベース, プロフェッショナルログ出力
- **ビルド最適化**: unplugin-info統合, scriptsフォルダ削除済み