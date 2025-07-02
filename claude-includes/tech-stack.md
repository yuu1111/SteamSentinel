# 技術スタック

## Backend
- **Runtime**: Node.js 18+ + TypeScript 5.3+ (strict mode)
- **Framework**: Express.js + better-sqlite3 + Winston (English logs)
- **Security**: Helmet.js, rate limiting, WSL対応
- **Build**: unplugin-info統合, scripts/フォルダ完全削除済み

## Frontend  
- **SPA**: React 19.1.0 + TypeScript + Vite 7.0.0
- **UI**: Ant Design 5.26.2 (Bootstrap完全除去済み)
- **Charts**: Canvas API (Chart.js除去済み)
- **Build Info**: unplugin-info自動生成 (JSビルド情報削除済み)

## Data & APIs
- **DB**: SQLite (data/steam_sentinel.db, v1 schema)
- **APIs**: IsThereAnyDeal, Steam Store, RSS (xml2js)
- **Notifications**: Discord webhooks

## 無料ゲーム監視
- **RSS Source**: steamcommunity.com/groups/freegamesfinders/rss/
- **Service**: FreeGamesRSSService (Epic+Steam統合)
- **Dependencies**: xml2js (epic-free-games除去済み)
- **Verification**: Steam API自動検証システム

## ファイル構成
- **TS Files**: 77 (27 backend + 32 frontend + 18 others)
- **Components**: 21 React components + 10 pages
- **Bundle**: 1.42MB (gzip: 432KB)
- **Scripts**: 完全削除 (unplugin-info統合)
- **Logging**: 英語ログシステム完全移行済み