# API リファレンス

**ベースURL**: `http://localhost:3000/api`

## 認証

現在認証は不要です。すべてのエンドポイントは直接アクセス可能です。

## レスポンス形式

すべてのAPIレスポンスは以下の形式です：

```json
{
  "success": true,
  "data": {}, 
  "message": "操作が完了しました"
}
```

エラー時：
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
GET /api/games?search=ゲーム名&page=1&limit=50
```

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
      "alert_enabled": true,
      "current_price": 3980,
      "is_on_sale": false,
      "discount_percent": 0
    }
  ]
}
```

### ゲーム追加
```http
POST /api/games
Content-Type: application/json

{
  "steam_app_id": 1091500,
  "name": "Cyberpunk 2077",
  "price_threshold": 2000,
  "price_threshold_type": "price"
}
```

### ゲーム更新
```http
PUT /api/games/:id
Content-Type: application/json

{
  "price_threshold": 1500,
  "alert_enabled": true
}
```

### ゲーム削除
```http
DELETE /api/games/:id
```

## 価格・監視 API

### 価格履歴取得
```http
GET /api/games/:id/price-history
GET /api/games/:id/price-history?days=30
```

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "current_price": 3980,
      "original_price": 7980,
      "discount_percent": 50,
      "historical_low": 2980,
      "is_on_sale": true,
      "recorded_at": "2025-07-01T10:00:00Z"
    }
  ]
}
```

### 監視制御
```http
POST /api/monitoring/start
POST /api/monitoring/stop
GET /api/monitoring/status
```

### アラート管理
```http
GET /api/alerts
GET /api/alerts?type=new_low&page=1
DELETE /api/alerts/:id
```

## 予算管理 API

### 予算CRUD
```http
GET /api/budgets
POST /api/budgets
PUT /api/budgets/:id
DELETE /api/budgets/:id
```

**予算作成例:**
```json
{
  "name": "月次ゲーム予算",
  "period_type": "monthly",
  "budget_amount": 10000,
  "start_date": "2025-07-01",
  "end_date": "2025-07-31"
}
```

### 支出記録
```http
POST /api/budgets/:id/expenses
Content-Type: application/json

{
  "steam_app_id": 1091500,
  "game_name": "Cyberpunk 2077",
  "amount": 1980,
  "purchase_date": "2025-07-01",
  "category": "RPG"
}
```

### 予算分析
```http
GET /api/budgets/:id/analytics
GET /api/budgets/summary
```

## 無料ゲーム API

### Epic Games無料ゲーム
```http
GET /api/epic-games
GET /api/epic-games?filter=unclaimed
PUT /api/epic-games/:id/claim
PUT /api/epic-games/:id/unclaim
GET /api/epic-games/current
```

### Steam無料ゲーム
```http
GET /api/steam-free-games
GET /api/steam-free-games?filter=all
PUT /api/steam-free-games/:id/claim
GET /api/steam-free-games/stats
POST /api/steam-free-games/refresh
```

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "app_id": 550,
      "title": "Left 4 Dead 2",
      "steam_url": "https://store.steampowered.com/app/550/",
      "is_claimed": false,
      "discovered_at": "2025-07-01T10:00:00Z"
    }
  ]
}
```

## ITAD設定 API

### 設定管理
```http
GET /api/itad-settings
PUT /api/itad-settings/:name
POST /api/itad-settings/reset
```

**設定更新例:**
```json
{
  "min_discount": 25,
  "max_price": 3000,
  "enabled": true
}
```

## システム API

### システム状態
```http
GET /api/system/status
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "monitoring_active": true,
    "total_games": 127,
    "last_check": "2025-07-01T10:00:00Z",
    "uptime": "2 days, 14:32:10",
    "memory_usage": "245MB"
  }
}
```

### Discord通知テスト
```http
POST /api/system/test-discord
Content-Type: application/json

{
  "message": "テストメッセージ"
}
```

### ビルド情報
```http
GET /api/system/build-info
```

## データエクスポート

### ゲームデータエクスポート
```http
GET /api/export/games?format=csv
GET /api/export/games?format=json
```

### 予算データエクスポート
```http
GET /api/export/budgets?format=csv&year=2025
```

## エラーコード

| ステータス | 説明 |
|-----------|------|
| 200 | 成功 |
| 400 | リクエストエラー (パラメータ不正等) |
| 404 | リソースが見つからない |
| 500 | サーバーエラー |

## 使用例

### JavaScript/Node.js
```javascript
// ゲーム一覧取得
const response = await fetch('http://localhost:3000/api/games');
const data = await response.json();

// ゲーム追加
const newGame = await fetch('http://localhost:3000/api/games', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    steam_app_id: 1091500,
    name: 'Cyberpunk 2077',
    price_threshold: 2000
  })
});
```

### Python
```python
import requests

# ゲーム一覧取得
response = requests.get('http://localhost:3000/api/games')
games = response.json()

# 予算作成
budget_data = {
    "name": "月次予算",
    "period_type": "monthly", 
    "budget_amount": 10000
}
response = requests.post('http://localhost:3000/api/budgets', json=budget_data)
```

### cURL
```bash
# システム状態確認
curl http://localhost:3000/api/system/status

# ゲーム追加
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"steam_app_id": 1091500, "name": "Cyberpunk 2077"}'
```