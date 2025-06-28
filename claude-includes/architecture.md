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

### レガシー実装 (廃止済み)
* ~~**言語/フレームワーク**: HTML/CSS/TypeScript SPA~~
* ~~**ルーティング**: SPARouter (TypeScript製)~~
* ~~**ナビゲーション**: NavigationBar (TypeScript製)~~

### 技術スタック詳細
* **依存関係管理**: npm (package.json による厳密管理)
* **開発環境**: Vite Dev Server + TypeScript コンパイル
* **プロダクション**: React Production Build + Express.js 統合
* **コンポーネント**: 20+ モジュラーコンポーネント (モーダル、テーブル、フォーム)

## アーキテクチャパターン (企業レベル実装)

* **SPA (Single Page Application)**: クライアントサイドルーティングを完全に実装。
* **テンプレートベースレンダリング**: HTML `<template>` 要素を活用。
* **コンポーネント指向**: モジュラー設計とTypeScript型安全性。
* **設定駆動型UI**: JSON設定による柔軟なナビゲーション管理。
* **データベースマイグレーション**: 自動バージョン管理機能。
* **包括的バックアップ**: エクスポート/インポート機能 (マージ・スキップ・置換モード)。

## 外部API (実装済み)

* IsThereAnyDeal API v2
* Steam Store API
* Steam CDN (ゲーム画像)
* Discord Webhook (リッチEmbed)