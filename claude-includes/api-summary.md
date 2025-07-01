# API概要

**Base**: `http://localhost:3000/api` | **Total**: 80+ endpoints

## 主要群
- `/games` - CRUD, 検索, 一括操作, 価格履歴
- `/monitoring` - start/stop, status, 進捗
- `/alerts` - 履歴, フィルタ, 削除
- `/budgets` - CRUD, 支出記録, 分析
- `/epic-games` - 一覧, 受け取り状況, フィルタ
- `/steam-free-games` - 新規対応, stats, refresh
- `/itad-settings` - 設定管理, カテゴリ別
- `/system` - status, Discord test, build info

## レスポンス形式
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

全エンドポイント認証不要, CORS有効