# 使用技術スタックとアーキテクチャ

## バックエンド (TypeScript 100%対応)

* **言語/ランタイム**: Node.js 18+, TypeScript 5.3+ (27ファイル完全対応)。
* **フレームワーク**: Express.js。
* **データベース**: `better-sqlite3` (高速SQLite)。
* **スケジューラー**: `node-cron`。
* **ログ管理**: Winston。
* **セキュリティ**: Helmet.js。

## フロントエンド (React SPA 実装完了)

### 現行実装 (React SPA) ✅ 実装完了
* **フレームワーク**: React 19.1.0 + TypeScript 5.3+ (30ファイル完全対応)。
* **UI ライブラリ**: Ant Design 5.26.2 + Bootstrap 5 (ハイブリッド構成)。
* **ビルドツール**: Vite 7.0.0 (高速ビルド・HMR対応)。
* **状態管理**: React Context API + カスタムフック。
* **ルーティング**: React Router 6+ (クライアントサイドルーティング)。
* **型安全性**: TypeScript 完全対応、strict モード有効。
* **スタイリング**: Bootstrap 5 + カスタムCSS + ダークモード対応。
* **グラフ**: Chart.js (価格推移グラフ、詳細モーダル対応)。

### 技術スタック詳細
* **依存関係管理**: npm (package.json による厳密管理)
* **開発環境**: Vite Dev Server + TypeScript コンパイル
* **プロダクション**: React Production Build + Express.js 統合
* **コンポーネント**: 20+ モジュラーコンポーネント (モーダル、テーブル、フォーム)

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