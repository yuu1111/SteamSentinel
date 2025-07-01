# データ構造

## 主要テーブル
```sql
-- ゲーム情報
games: id, steam_app_id, name, enabled, price_threshold, 
       price_threshold_type, alert_enabled, all_time_low,
       is_purchased, purchase_price, purchase_date

-- 価格履歴  
price_history: steam_app_id, current_price, discount_percent,
               historical_low, is_on_sale, source, recorded_at

-- アラート
alerts: steam_app_id, alert_type, trigger_price, message,
        notified_discord (types: new_low, sale_start, threshold_met, free_game)

-- 予算管理
budgets: name, period_type, budget_amount, start_date, end_date
budget_expenses: budget_id, amount, game_name, purchase_date

-- 無料ゲーム
epic_free_games: title, start_date, end_date, is_claimed
steam_free_games: app_id, title, steam_url, is_claimed

-- システム
system_settings: key, value (last_fetch_time等)
itad_settings: name, value, category (min_discount, max_price等)
```

## TypeScript型
- Game, PriceData, BudgetData, EpicFreeGame, SteamFreeGame
- 外部キー制約有効, インデックス最適化済み