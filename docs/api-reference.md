# API リファレンス

**ベースURL**: `http://localhost:3000/api`

## 概要

SteamSentinel APIは、RESTful設計に基づいた統一的なインターフェースを提供します。2025年7月5日の大規模リファクタリングにより、エンドポイントが整理・統合され、約**80個のエンドポイント**で安定動作します。

**レビューシステム**: Steamユーザーレビュー + IGDB評価 + Metacriticスコア（Steam API経由）の3ソース統合

## 認証

現在認証は不要です。すべてのエンドポイントは直接アクセス可能です。
※将来的にJWT認証の実装を検討中

## レスポンス形式

### 成功時
```json
{
  "success": true,
  "data": {}, 
  "message": "操作が完了しました"
}
```

### エラー時
```json
{
  "success": false,
  "error": "エラーメッセージ",
  "details": {}
}
```

## ゲーム管理 API

### ゲーム一覧取得
```http
GET /api/games
GET /api/games?enabled=all
GET /api/games?enabled=true
```

**クエリパラメータ:**
- `enabled` - `all` | `true` | `false` (デフォルト: true)
- `search` - ゲーム名検索
- `sort` - ソート順

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "steam_app_id": 1091500,
      "name": "Cyberpunk 2077",
      "enabled": true,
      "price_threshold": 2000,
      "price_threshold_type": "price",
      "discount_threshold_percent": null,
      "alert_enabled": true,
      "created_at": "2025-07-01T10:00:00Z",
      "updated_at": "2025-07-05T08:30:00Z"
    }
  ]
}
```

### ゲーム詳細取得
```http
GET /api/games/:id
GET /api/games/by-steam-id/:steamAppId
```

### ゲーム追加
```http
POST /api/games
Content-Type: application/json

{
  "steam_app_id": 1091500,
  "name": "Cyberpunk 2077",
  "price_threshold": 2000,
  "price_threshold_type": "price",
  "enabled": true,
  "alert_enabled": true
}
```

### ゲーム更新
```http
PUT /api/games/:id
Content-Type: application/json

{
  "price_threshold": 1500,
  "alert_enabled": true,
  "manual_historical_low": 1200
}
```

### ゲーム削除
```http
DELETE /api/games/:id
```

### Steam ID一括インポート
```http
POST /api/games/import
Content-Type: application/json

{
  "steam_app_ids": [1091500, 730, 570]
}
```

## ゲーム情報・レビュー API

### ゲームレビュー取得（統合）
```http
GET /api/games/:appId/reviews
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "steam_app_id": 1091500,
    "game_name": "Cyberpunk 2077",
    "steam": {
      "positive": 425000,
      "negative": 150000,
      "percentage": 74,
      "text": "やや好評"
    },
    "igdb": {
      "rating": 75,
      "count": 890
    },
    "metacritic": {
      "score": 86,
      "url": "https://www.metacritic.com/game/cyberpunk-2077"
    },
    "integrated_score": {
      "score": 76.8,
      "sources": ["steam", "igdb", "metacritic"],
      "confidence": "high"
    },
    "last_updated": "2025-07-05T08:00:00Z"
  }
}
```

### ゲーム情報取得
```http
GET /api/games/:appId/info
```

### ゲーム詳細取得
```http
GET /api/games/:appId/details
```

### バッチレビュー取得
```http
POST /api/games/reviews/batch
Content-Type: application/json

{
  "gameIds": [1091500, 730, 570]
}
```

### 価格履歴取得
```http
GET /api/games/:appId/price-history
GET /api/games/:appId/price-history?days=30
```

## 監視・アラート API

### 監視ステータス
```http
GET /api/monitoring/status
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "is_monitoring": true,
    "next_check": "2025-07-05T12:00:00Z",
    "last_check": "2025-07-05T06:00:00Z",
    "total_games_monitored": 127,
    "check_frequency": "6時間毎"
  }
}
```

### 手動価格チェック
```http
POST /api/monitoring/check-now
```

### アラート一覧
```http
GET /api/alerts
GET /api/alerts?unread=true
```

### アラート既読
```http
PUT /api/alerts/:id/mark-read
```

## 予算管理 API

### 予算サマリー取得
```http
GET /api/budgets/summaries
```

**レスポンス例:**
```json
[
  {
    "id": 1,
    "name": "月次ゲーム予算",
    "period_type": "monthly",
    "budget_amount": 10000,
    "spent_amount": 5980,
    "remaining_amount": 4020,
    "is_active": true,
    "start_date": "2025-07-01",
    "end_date": "2025-07-31"
  }
]
```

### 予算作成
```http
POST /api/budgets
Content-Type: application/json

{
  "name": "夏セール予算",
  "period_type": "custom",
  "budget_amount": 20000,
  "start_date": "2025-07-01",
  "end_date": "2025-07-14"
}
```

### 支出記録
```http
POST /api/games/:id/mark-purchased
Content-Type: application/json

{
  "price": 1980,
  "budgetId": 1
}
```

### 購入解除
```http
PUT /api/games/:id/unmark-purchased
```

## 無料ゲーム API

### 無料ゲーム一覧（統合）
```http
GET /api/free-games
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "epic": [
      {
        "id": 1,
        "title": "Death Stranding",
        "description": "小島秀夫監督の最新作...",
        "epic_url": "https://store.epicgames.com/...",
        "start_date": "2025-07-01",
        "end_date": "2025-07-08",
        "is_claimed": false
      }
    ],
    "steam": [
      {
        "id": 1,
        "app_id": 550,
        "title": "Left 4 Dead 2",
        "steam_url": "https://store.steampowered.com/app/550/",
        "discovered_at": "2025-07-01T10:00:00Z",
        "is_expired": false,
        "is_claimed": false
      }
    ]
  }
}
```

### Epic Gamesのみ
```http
GET /api/epic-games
```

### Steam無料ゲームのみ
```http
GET /api/steam-free-games
```

### 無料ゲーム取得済みマーク
```http
PUT /api/epic-games/:id/claim
PUT /api/steam-free-games/:id/claim
```

## システム管理 API

### システム情報
```http
GET /api/system/info
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "node_version": "20.11.0",
    "platform": "linux",
    "uptime": "2 days, 14:32:10",
    "memory": {
      "total": "1GB",
      "used": "245MB",
      "free": "779MB"
    }
  }
}
```

### システム統計
```http
GET /api/system/stats
```

### ビルド情報
```http
GET /api/system/build-info
```

### Discord通知テスト
```http
POST /api/system/test-discord
Content-Type: application/json

{
  "type": "connection" | "price_alert" | "high_discount" | "epic_free"
}
```

### 価格アラートテスト
```http
POST /api/system/test-price-alert
Content-Type: application/json

{
  "gameId": 1,
  "alertType": "new_low" | "sale_start" | "threshold_met",
  "testPrice": 1980,
  "sendDiscord": true
}
```

## Discord API

### Discord設定取得
```http
GET /api/discord/config
```

### Discord接続状態
```http
GET /api/discord/status
```

## エラーコード

| ステータス | 説明 |
|-----------|------|
| 200 | 成功 |
| 400 | リクエストエラー (パラメータ不正等) |
| 404 | リソースが見つからない |
| 409 | 競合が発生 |
| 500 | サーバーエラー |
| 503 | 外部API利用不可 |

## 使用例

### JavaScript/TypeScript (api.ts使用)
```typescript
import { api } from './utils/api';

// ゲーム一覧取得
const games = await api.get<Game[]>('/games');

// ゲーム追加
const newGame = await api.post<Game>('/games', {
  steam_app_id: 1091500,
  name: 'Cyberpunk 2077',
  price_threshold: 2000,
  price_threshold_type: 'price'
});

// レビュー取得
const reviews = await api.get<GameReviews>(`/games/${steamAppId}/reviews`);
```

### Python
```python
import requests

BASE_URL = 'http://localhost:3000/api'

# ゲーム一覧取得
response = requests.get(f'{BASE_URL}/games')
games = response.json()

# 予算作成
budget_data = {
    "name": "月次予算",
    "period_type": "monthly", 
    "budget_amount": 10000,
    "start_date": "2025-07-01",
    "end_date": "2025-07-31"
}
response = requests.post(f'{BASE_URL}/budgets', json=budget_data)
```

### cURL
```bash
# システム状態確認
curl http://localhost:3000/api/system/info

# ゲーム追加
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"steam_app_id": 1091500, "name": "Cyberpunk 2077", "price_threshold": 2000}'

# Discord通知テスト
curl -X POST http://localhost:3000/api/system/test-discord \
  -H "Content-Type: application/json" \
  -d '{"type": "connection"}'
```

## パフォーマンス最適化

2025年7月5日のアップデートにより、以下の最適化が実施されました：

- **デバッグログ90%削減**: API通信の高速化
- **エンドポイント統合**: 重複ルートの削除によるメンテナンス性向上
- **レスポンス時間**: 平均100ms以下を維持

## 変更履歴

### v1.2.0 (2025-07-05)
- APIエンドポイントの統合・整理
- レビューAPI統合機能追加（Steam + IGDB + Metacritic）
- OpenCritic API削除（認証要件のため）
- システム管理APIの拡充
- パフォーマンス最適化（ログ90%削減）

### v1.1.0 (2025-07-04)
- レビューシステムAPI追加
- ゲーム詳細APIの実装
- Discord APIの拡充

### v1.0.0 (2025-07-01)
- 初回リリース