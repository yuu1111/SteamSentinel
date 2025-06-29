# 使用技術スタックとアーキテクチャ

## バックエンド (TypeScript 100%対応)

* **言語/ランタイム**: Node.js 18+, TypeScript 5.3+ (27ファイル完全対応)。
* **フレームワーク**: Express.js。
* **データベース**: `better-sqlite3` (高速SQLite)。
* **スケジューラー**: `node-cron`。
* **ログ管理**: Winston。
* **セキュリティ**: Helmet.js。

## フロントエンド (React SPA + 出費追跡システム 実装完了)

### 現行実装 (React SPA + Enhanced Dashboard) ✅ 実装完了
* **フレームワーク**: React 19.1.0 + TypeScript 5.3+ (32ファイル完全対応)。
* **UI ライブラリ**: 
  - **Ant Design 5.26.2** - 完全移行済み統一UIライブラリ (Cards, Forms, Tables, Notifications, etc.)
  - **Bootstrap完全除去** - 2025年6月にBootstrap依存を完全削除、Ant Design統一アーキテクチャ
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
* **依存関係管理**: npm (package.json による厳密管理)
* **開発環境**: Vite Dev Server + TypeScript コンパイル
* **プロダクション**: React Production Build + Express.js 統合
* **コンポーネント**: 32 TypeScript/TSXファイル (18コンポーネント + 7ページ + 3カスタムフック)
* **パフォーマンス**: 1.42MB最適化ビルド (gzip: 432.78 kB) - Ant Design完全統合含む

### UIアーキテクチャ設計思想
* **Ant Design統一**: 全コンポーネント・ページでAnt Design完全採用
* **通知システム統合**: useAlert/AlertContextをAnt Design notification/message APIに完全移行
* **Bootstrap完全除去**: CDN削除、CSS競合解消、依存関係完全除去
* **デザインシステム統一**: 一貫したAnt DesignベースUI/UX実現

## アーキテクチャパターン

* **React SPA**: コンポーネントベース・クライアントサイドルーティング
* **型安全設計**: TypeScript完全対応・strict モード
* **モジュラー設計**: 再利用可能コンポーネント・カスタムフック
* **データ管理**: 自動マイグレーション・バックアップシステム

## 外部API (実装済み)

* IsThereAnyDeal API v2
* Steam Store API
* Steam CDN (ゲーム画像)
* Discord Webhook (リッチEmbed)