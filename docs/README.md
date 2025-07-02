# SteamSentinel - Steam価格監視システム

## 🎯 概要

SteamSentinelは、Steamゲームの価格を監視し、セール時の最安値更新や無料配布を検知してWebサイトとDiscordで通知する包括的な価格監視・財務管理システムです。

## ⚡ 主要機能

### 💰 価格監視
- リアルタイム価格追跡・歴史的最安値検知・セール通知
- 価格/割引率閾値アラート・Discord通知・履歴管理
- 未リリースゲーム追跡・自動リリース検知

### 🎮 ゲーム管理  
- CRUD操作・Steam連携・画像表示・タイプ自動検知
- 購入状況追跡・手動最安値設定・統一UI

### 💼 出費追跡・予算管理
- タブ式統合ダッシュボード・Canvas APIチャート・ROI分析
- 月間/年間/カスタム予算設定・リアルタイム監視・アラート
- 支出パターン分析・投資効率指標・統計ダッシュボード

### 🆓 無料ゲーム監視
- Epic Games & Steam無料ゲーム統合検知
- RSS監視 (1時間間隔)・受け取り状況管理・自動ゲーム登録
- Discord通知・統計情報・WebUI専用ページ

## 🛠️ 技術スタック

- **Backend**: Node.js + TypeScript + Express.js + SQLite
- **Frontend**: React 19.1.0 + TypeScript + Ant Design 5.26.2
- **Build**: Vite 7.0.0 + ESLint + TypeScript strict mode + unplugin-info
- **APIs**: IsThereAnyDeal API, Steam Store API, RSS feeds
- **Logging**: Winston (English logs), Steam API verification system

## 🚀 セットアップ

### 必要環境
- Node.js 18+
- Git

### インストール
```bash
git clone <repository-url>
cd SteamSentinel
npm install
```

### 環境設定
`.env`ファイルを作成:
```bash
# 必須
ITAD_API_KEY=your_itad_api_key

# オプション
DISCORD_WEBHOOK_URL=your_discord_webhook
WEB_PORT=3000
```

### APIキー取得
| API | URL | 制限 |
|-----|-----|------|
| IsThereAnyDeal | [isthereanydeal.com/dev](https://isthereanydeal.com/dev/app/) | 緩い制限 |
| Discord Webhook | Discord設定 | なし |

### 起動
```bash
# 開発モード
npm run dev

# 本番ビルド・起動
npm run build
npm start

# ポート3000が使用中の場合
npm run kill:3000
```

Webサイト: http://localhost:3000

## 📊 システム要件

- **RAM**: 512MB以上
- **ストレージ**: 100MB以上 (ゲームデータにより変動)
- **ネットワーク**: インターネット接続必須

## 📝 ライセンス

MIT License - 詳細は[LICENSE](../LICENSE)参照

## 🤝 貢献

バグ報告・機能要求・プルリクエストを歓迎します。

## 📚 ドキュメント

- **[ユーザーガイド](user-guide.md)** - 操作方法・機能説明
- **[設定ガイド](configuration.md)** - 環境変数・ITAD設定・最適化
- **[API リファレンス](api-reference.md)** - REST API仕様・使用例
- **[データベーススキーマ](database-schema.md)** - テーブル構造・関係性
- **[トラブルシューティング](troubleshooting.md)** - よくある問題・解決方法
- **[開発ガイド](development-guide.md)** - 開発環境・コーディング規約・ワークフロー

## 🔧 開発者向け

高度な設定や開発者向け詳細情報は `claude-includes/` フォルダの仕様書を参照してください。

---