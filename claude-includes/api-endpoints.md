# API エンドポイント仕様

## 概要

SteamSentinel の REST API エンドポイント一覧です。すべてのエンドポイントは `/api` プレフィックスで始まります。

**ベースURL**: `http://localhost:3000/api`

## 認証

現在のバージョンでは認証は不要です。ローカル環境での使用を前提としています。

## レスポンス形式

すべてのAPIレスポンスは以下の形式に従います：

```typescript
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

## ゲーム管理 API

### ゲーム一覧取得
```
GET /api/games
GET /api/games?enabled=all    # 全ゲーム (有効/無効含む)
GET /api/games?enabled=true   # 有効ゲームのみ
GET /api/games?enabled=false  # 無効ゲームのみ
```

**レスポンス:**
```typescript
{
  success: true,
  data: Game[]
}
```

### ダッシュボードデータ取得
```
GET /api/games/dashboard
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    games: Game[],
    statistics: Statistics
  }
}
```

### 出費データ取得
```
GET /api/games/expenses
```

**レスポンス:**
```typescript
{
  success: true,
  data: ExpenseData
}
```

**ExpenseData構造:**
```typescript
interface ExpenseData {
  period: string
  summary: {
    totalExpenses: number
    totalSavings: number
    totalGames: number
    averagePrice: number
    savingsRate: number
  }
  recentPurchases: Array<{
    game_name: string
    steam_app_id: number
    trigger_price: number
    discount_percent: number
    created_at: string
  }>
  monthlyTrends: {
    expenses: Array<{ month: string; amount: number }>
    savings: Array<{ month: string; amount: number }>
  }
  categories: {
    bargain: { count: number; total: number; label: string }
    moderate: { count: number; total: number; label: string }
    small: { count: number; total: number; label: string }
    full_price: { count: number; total: number; label: string }
  }
}
```

### 拡張ダッシュボードデータ取得
```
GET /api/games/dashboard
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    games: Game[],
    statistics: {
      gamesTracked: number,
      gamesOnSale: number,
      totalAlerts: number,
      averageDiscount: number
    }
  }
}
```

### ゲーム詳細取得
```
GET /api/games/:id
```

### ゲーム追加
```
POST /api/games
```

**リクエストボディ:**
```typescript
{
  steam_app_id: number,
  name: string,
  enabled?: boolean,
  alert_enabled?: boolean,
  price_threshold?: number,
  price_threshold_type?: 'price' | 'discount' | 'any_sale',
  discount_threshold_percent?: number
}
```

### ゲーム更新
```
PUT /api/games/:id
```

**リクエストボディ:** (部分更新対応)
```typescript
{
  name?: string,
  enabled?: boolean,
  alert_enabled?: boolean,
  price_threshold?: number,
  price_threshold_type?: 'price' | 'discount' | 'any_sale',
  discount_threshold_percent?: number,
  manual_historical_low?: number,
  is_purchased?: boolean,
  purchase_price?: number,
  purchase_date?: string
}
```

### ゲーム削除
```
DELETE /api/games/:id
```

### 手動価格更新
```
POST /api/games/:steamAppId/update-price
```

### 購入状況管理
```
PUT /api/games/:id/mark-purchased
PUT /api/games/:id/unmark-purchased
GET /api/games/purchased
```

**購入済みマーク設定:**
```typescript
PUT /api/games/:id/mark-purchased
{
  purchase_price: number,
  purchase_date: string,  // YYYY-MM-DD形式
  budget_id?: number      // 使用予算ID (省略可)
}
```

**購入済みマーク解除:**
```typescript
PUT /api/games/:id/unmark-purchased
```

**購入済みゲーム一覧:**
```typescript
GET /api/games/purchased?period=all|month|quarter|year
```

### 手動最安値設定
```
PUT /api/games/:id/manual-historical-low
```

**リクエストボディ:**
```typescript
{
  manual_historical_low: number | null
}
```

### ゲームインポート/エクスポート
```
POST /api/games/import
GET /api/games/export
```

**インポートリクエストボディ:**
```typescript
{
  games: Game[],
  mode: 'merge' | 'skip' | 'replace'
}
```

## 価格履歴 API

### 価格履歴取得
```
GET /api/games/:steamAppId/prices
GET /api/games/:steamAppId/prices?days=30
```

**レスポンス:**
```typescript
{
  success: true,
  data: PriceData[]
}
```

## 高割引ゲーム API

### 高割引ゲーム取得
```
GET /api/games/highDiscount
GET /api/games/highDiscount?type=standard
GET /api/games/highDiscount?type=popular
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    games: HighDiscountGame[],
    lastCheck: string | null,
    statistics: {
      lastCheckTime: string | null,
      checkInterval: number,
      isRunning: boolean
    }
  }
}
```

### 高割引ゲーム手動検知
```
POST /api/games/highDiscount/detect
```

**リクエストボディ:**
```typescript
{
  type?: 'standard' | 'popular'  // デフォルト: 'standard'
}
```

## アラート管理 API

### アラート履歴取得
```
GET /api/alerts
GET /api/alerts?page=1&limit=20&filter=all
GET /api/alerts?filter=new_low|sale_start|threshold_met|free_game
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    alerts: AlertData[],
    totalPages: number,
    totalCount: number,
    currentPage: number
  }
}
```

### アラート統計取得
```
GET /api/alerts/statistics
```

### アラート履歴削除
```
DELETE /api/alerts
```

## 監視システム API

### 監視進捗取得
```
GET /api/monitoring/progress
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    isRunning: boolean,
    currentGame?: string,
    completedGames: number,
    totalGames: number,
    failedGames: number,
    estimatedTimeRemaining?: number
  }
}
```

### 監視実行
```
POST /api/monitoring/run
POST /api/monitoring/run/:steamAppId
```

### 監視停止
```
POST /api/monitoring/stop
```

## システム情報 API

### システム情報取得
```
GET /api/system/info
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    version: string,
    uptime: number,
    platform: string,
    nodeVersion: string,
    memory: {
      used: number,
      total: number
    }
  }
}
```

### ビルド情報取得
```
GET /api/system/build-info
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    buildTime: string | null,    // ビルド時刻 (ISO形式)
    buildDate: string,           // ビルド日時 (日本語表記)
    version: string,             // アプリケーションバージョン
    environment: string          // ビルド環境
  }
}
```

### API キー状態確認
```
GET /api/system/api-status
```

**レスポンス:**
```typescript
{
  success: true,
  data: {
    itad: {
      configured: boolean,
      status: 'working' | 'error' | 'unknown'
    },
    discord: {
      configured: boolean,
      status: 'working' | 'error' | 'unknown'
    }
  }
}
```

### Discord 状態確認
```
GET /api/system/discord-status
```

### Discord テスト送信
```
POST /api/system/test-discord
```

**リクエストボディ:**
```typescript
{
  type: 'simple' | 'rich' | 'error' | 'price_alert',
  customMessage?: string
}
```

### 価格アラートテスト
```
POST /api/system/test-price-alert
```

**リクエストボディ:**
```typescript
{
  steamAppId: number,
  alertType: 'new_low' | 'sale_start' | 'threshold_met' | 'free_game',
  testPrice?: number
}
```

## 予算管理 API

### 予算一覧取得
```
GET /api/budgets
GET /api/budgets/active
GET /api/budgets/summaries
```

**レスポンス:**
```typescript
{
  success: true,
  data: Budget[]
}
```

### 予算作成
```
POST /api/budgets
POST /api/budgets/monthly
POST /api/budgets/yearly
```

**リクエストボディ:**
```typescript
{
  name: string,
  period_type: 'monthly' | 'yearly' | 'custom',
  budget_amount: number,
  start_date?: string,
  end_date?: string,
  category_filter?: string
}
```

### 予算管理
```
GET /api/budgets/:id
PUT /api/budgets/:id
DELETE /api/budgets/:id
```

### 支出記録管理
```
GET /api/budgets/:id/expenses
POST /api/budgets/:id/expenses
DELETE /api/budgets/:id/expenses/:expenseId
```

**支出記録リクエストボディ:**
```typescript
{
  steam_app_id?: number,
  game_name: string,
  amount: number,
  purchase_date: string,
  category?: string
}
```

## Epic Games API

### Epic Games無料ゲーム管理
```
GET /api/epic-games
POST /api/epic-games/refresh
PUT /api/epic-games/:id/claim
GET /api/epic-games/current
GET /api/epic-games/stats
```

**Epic Games レスポンス:**
```typescript
{
  success: true,
  data: EpicFreeGame[]
}

interface EpicFreeGame {
  id: number
  title: string
  description?: string
  epic_url?: string
  image_url?: string
  start_date?: string
  end_date?: string
  is_claimed: boolean
  claimed_date?: string
  discovered_at: string
}
```

### Epic Games受け取り状況更新
```
PUT /api/epic-games/:id/claim
```

**リクエストボディ:**
```typescript
{
  is_claimed: boolean
}
```

## データ構造

### Game エンティティ
```typescript
interface Game {
  id: number
  steam_app_id: number
  name: string
  enabled: boolean
  alert_enabled: boolean
  price_threshold?: number
  price_threshold_type: 'price' | 'discount' | 'any_sale'
  discount_threshold_percent?: number
  manual_historical_low?: number
  is_purchased?: boolean
  purchase_price?: number
  purchase_date?: string
  created_at: string
  updated_at: string
  latestPrice?: PriceData
}
```

### PriceData エンティティ
```typescript
interface PriceData {
  id: number
  steam_app_id: number
  current_price: number
  original_price: number
  discount_percent: number
  is_on_sale: boolean
  historical_low: number
  source: 'itad' | 'steam' | 'steam_free' | 'steam_unreleased' | 'steam_removed'
  release_date?: string
  recorded_at: string
}
```

### AlertData エンティティ
```typescript
interface AlertData {
  id: number
  steam_app_id?: number
  game_id?: number
  alert_type: 'new_low' | 'sale_start' | 'threshold_met' | 'free_game' | 'game_released'
  message?: string
  price_data?: any
  created_at: string
  game?: Game
  game_name?: string
  trigger_price?: number
  previous_low?: number | null
  discount_percent?: number
  notified_discord?: boolean
}
```

## エラーハンドリング

### 共通エラーレスポンス
```typescript
{
  success: false,
  error: "エラーメッセージ"
}
```

### HTTPステータスコード
- `200 OK` - 正常処理
- `400 Bad Request` - リクエストエラー
- `404 Not Found` - リソースが見つからない
- `500 Internal Server Error` - サーバーエラー

## レート制限

現在のバージョンではレート制限は設定されていませんが、外部API（IsThereAnyDeal）のレート制限に従います。

## 注意事項

- Steam App ID は正の整数である必要があります
- 価格は数値型で、日本円（JPY）で管理されます
- 日付は ISO 8601 形式の文字列です
- ゲーム削除時は関連する価格履歴とアラート履歴も削除されます