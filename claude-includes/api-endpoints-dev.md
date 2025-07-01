# API エンドポイント仕様 (開発者用)

**ベースURL**: `http://localhost:3000/api` | **総数**: 80+ エンドポイント

## 主要API群

### ゲーム管理
- `GET /api/games` - 一覧取得, 検索, ページング
- `POST /api/games` - 新規追加 (Steam App ID必須)
- `PUT /api/games/:id` - 更新 (閾値, アラート設定)
- `DELETE /api/games/:id` - 削除

### 監視・アラート
- `POST /api/monitoring/start|stop` - 監視制御
- `GET /api/monitoring/status` - 進捗状況
- `GET /api/alerts` - アラート履歴 (フィルタ対応)

### 予算管理
- `GET|POST /api/budgets` - 予算CRUD
- `POST /api/budgets/:id/expenses` - 支出記録
- `GET /api/budgets/:id/analytics` - 分析データ

### 無料ゲーム
- `GET /api/epic-games` - Epic無料ゲーム管理
- `GET /api/steam-free-games` - Steam無料ゲーム (新規)
- `PUT /api/{epic-games|steam-free-games}/:id/claim` - 受け取り状況

### システム
- `GET /api/system/status` - システム状態
- `POST /api/system/test-discord` - Discord通知テスト
- `GET /api/system/build-info` - ビルド情報

## レスポンス形式
```typescript
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

**詳細仕様**: `/docs/api-reference.md` 参照