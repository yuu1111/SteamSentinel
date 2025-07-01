# 使用技術スタックとアーキテクチャ

## バックエンド

* **言語/ランタイム**: Node.js 18+, TypeScript 5.3+ (27ファイル完全対応)。
* **フレームワーク**: Express.js。
* **データベース**: `better-sqlite3` (高速SQLite)。
* **スケジューラー**: `node-cron`。
* **ログ管理**: Winston。
* **セキュリティ**: Helmet.js。

## フロントエンド

### 現行実装 (React SPA + Enhanced Dashboard) ✅ 実装完了
* **フレームワーク**: React 19.1.0 + TypeScript 5.3+
* **UI ライブラリ**: 
  - **Ant Design 5.26.2** - 完全移行済み統一UIライブラリ (Cards, Forms, Tables, Notifications, etc.)
* **ビルドツール**: Vite 7.0.0 (高速ビルド・HMR対応)。
* **状態管理**: React Context API + カスタムフック。
* **ルーティング**: SPA内タブ切り替え・モーダルナビゲーション。
* **型安全性**: TypeScript 完全対応、strict モード有効（15個の新規型定義）。
* **スタイリング**: 
  - **Ant Design Design System** - 統一UIスタイリング・通知システム・ナビゲーション
  - **カスタムCSS** - 個別カスタマイズ + ダークモード対応 + レスポンシブ最適化
* **可視化**: Chart.js (価格推移) + Canvas API (高度分析チャート)。

### 拡張コンポーネントシステム
* **Enhanced Dashboard**: タブ式統合ダッシュボード
* **Advanced Analytics**: Canvas APIベース高性能チャート
* **Budget Management**: 予算管理・監視システム
* **ROI Analysis**: 投資収益率・価値分析
* **Customization System**: レイアウト・テーマ・設定管理
* **Report Generator**: 多形式レポート生成
* **Data Management**: バックアップ・復元・移行

### 技術スタック詳細
* **依存関係管理**: npm
* **開発環境**: Vite Dev Server + TypeScript コンパイル
* **プロダクション**: React Production Build + Express.js 統合
* **コンポーネント**: 32 TypeScript/TSXファイル (18コンポーネント + 7ページ + 3カスタムフック)
* **パフォーマンス**: 1.42MB最適化ビルド (gzip: 432.78 kB) - Ant Design完全統合含む

### UIアーキテクチャ設計思想
* **Ant Design統一**: 全コンポーネント・ページでAnt Design完全採用
* **通知システム統合**: useAlert/AlertContextをAnt Design notification/message APIに完全移行
* **デザインシステム統一**: 一貫したAnt DesignベースUI/UX実現

## アーキテクチャパターン

* **React SPA**: コンポーネントベース・クライアントサイドルーティング
* **型安全設計**: TypeScript完全対応・strict モード
* **モジュラー設計**: 再利用可能コンポーネント・カスタムフック
* **データ管理**: 自動マイグレーション・バックアップシステム

## 外部API・データソース (実装済み)

* **価格監視**: IsThereAnyDeal API v2
* **価格監視**: Steam Store API  
* **画像取得**: Steam CDN (ゲーム画像)
* **通知システム**: Discord Webhook (リッチEmbed)
* **無料ゲーム検知**: Free Games Finders RSS フィード (steamcommunity.com/groups/freegamesfinders/rss/)

## 無料ゲーム監視アーキテクチャ

### 統合RSSサービス
* **FreeGamesRSSService**: RSS監視・パース・通知の中央管理
* **監視頻度**: 1時間間隔自動チェック
* **データフロー**: RSS → パース → データベース → Discord通知

### データベース設計
* **epic_free_games**: Epic Games無料ゲーム管理
* **steam_free_games**: Steam無料ゲーム管理（新規追加）
* **受け取り状況追跡**: is_claimed, claimed_date フィールド
* **自動ゲーム登録**: Steam無料ゲーム受け取り時のgamesテーブル自動追加

### サービス統合
* **EpicGamesNotificationService**: Epic特化機能（統計・管理）
* **SteamFreeGamesModel**: Steam無料ゲーム CRUD操作
* **Discord統合**: プラットフォーム別通知フォーマット