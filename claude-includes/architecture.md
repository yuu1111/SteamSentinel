# 使用技術スタックとアーキテクチャ

## バックエンド (TypeScript 100%対応)

* **言語/ランタイム**: Node.js 18+, TypeScript 5.3+ (27ファイル完全対応)。
* **フレームワーク**: Express.js。
* **データベース**: `better-sqlite3` (高速SQLite)。
* **スケジューラー**: `node-cron`。
* **ログ管理**: Winston。
* **セキュリティ**: Helmet.js。

## フロントエンド (SPA化完了)

* **言語/フレームワーク**: HTML/CSS/TypeScript。
* **ルーティング**: SPARouter (TypeScript製、約400行のクライアントサイドルーティング)。
* **ナビゲーション**: NavigationBar (TypeScript製、約280行の統一ナビゲーション)。
* **グラフ**: Chart.js (価格推移グラフ)。
* **UIフレームワーク**: Bootstrap 5 (レスポンシブUI)。

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