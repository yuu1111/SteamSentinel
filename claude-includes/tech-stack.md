# 技術スタック

## Backend
- **Runtime**: Node.js 18+ + TypeScript 5.3+ (strict mode)
- **Framework**: Express.js + better-sqlite3 + Winston
- **Security**: Helmet.js, rate limiting, WSL対応

## Frontend  
- **SPA**: React 19.1.0 + TypeScript + Vite 7.0.0
- **UI**: Ant Design 5.26.2 (Bootstrap完全除去済み)
- **Charts**: Canvas API (Chart.js除去済み)

## Data & APIs
- **DB**: SQLite (data/steam_sentinel.db, v1 schema)
- **APIs**: IsThereAnyDeal, Steam Store, RSS (xml2js)
- **Notifications**: Discord webhooks

## 無料ゲーム監視
- **RSS Source**: steamcommunity.com/groups/freegamesfinders/rss/
- **Service**: FreeGamesRSSService (Epic+Steam統合)
- **Dependencies**: xml2js (epic-free-games除去済み)

## ファイル構成
- **TS Files**: 77 (27 backend + 32 frontend + 18 others)
- **Components**: 21 React components + 10 pages
- **Bundle**: 1.42MB (gzip: 432KB)