# データ構造 (開発者用)

## TypeScript型定義
- **Game**: ゲーム情報・アラート設定・購入追跡
- **PriceData**: 価格履歴・割引情報・統計
- **BudgetData**: 予算管理・支出記録・分析
- **EpicFreeGame/SteamFreeGame**: 無料ゲーム管理

## 主要テーブル

### games (メインテーブル)
```sql
-- 主要カラム
steam_app_id, name, enabled, alert_enabled
price_threshold, price_threshold_type, discount_threshold_percent
all_time_low, manual_historical_low
is_purchased, purchase_price, purchase_date
was_unreleased, last_known_release_date
```

### price_history
```sql
steam_app_id, current_price, original_price, discount_percent
historical_low, is_on_sale, source, recorded_at, release_date
```

### alerts  
```sql
steam_app_id, game_id, alert_type, message, trigger_price
previous_low, discount_percent, price_data, notified_discord
```

### budgets & budget_expenses
```sql
-- budgets: name, period_type, budget_amount, start_date, end_date
-- budget_expenses: budget_id, steam_app_id, amount, purchase_date
```

### 無料ゲーム管理
```sql
-- epic_free_games: title, epic_url, start_date, end_date, is_claimed
-- steam_free_games: app_id, title, steam_url, is_claimed (新規)
```

### システム管理
```sql
-- system_settings: key, value (JSON/文字列)
-- itad_settings: name, value, category, description (新規)
-- db_version: version (現在v1)
```

## インデックス・制約
- 外部キー制約有効
- 主要検索カラムにインデックス
- UNIQUE制約適用
- トリガーによるupdated_at自動更新

詳細スキーマ: `/docs/` 参照