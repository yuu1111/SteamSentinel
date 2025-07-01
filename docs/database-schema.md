# データベーススキーマ

SteamSentinelは軽量なSQLiteデータベースを使用し、以下のテーブル構造で構成されています。

## 主要テーブル

### games - ゲーム情報
```sql
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_app_id INTEGER UNIQUE NOT NULL,     -- Steam App ID
  name TEXT NOT NULL,                       -- ゲーム名
  enabled BOOLEAN DEFAULT 1,                -- 監視有効/無効
  price_threshold REAL,                     -- 価格閾値
  price_threshold_type TEXT DEFAULT 'price', -- 閾値タイプ
  discount_threshold_percent INTEGER,       -- 割引率閾値
  alert_enabled BOOLEAN DEFAULT 1,          -- アラート有効/無効
  all_time_low REAL DEFAULT 0,             -- 歴代最安値
  manual_historical_low REAL,              -- 手動設定最安値
  is_purchased BOOLEAN DEFAULT 0,          -- 購入済みフラグ
  purchase_price REAL,                     -- 購入価格
  purchase_date DATETIME,                  -- 購入日
  was_unreleased BOOLEAN DEFAULT 0,        -- 未リリース状態
  last_known_release_date TEXT,            -- 最終既知リリース日
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### price_history - 価格履歴
```sql
CREATE TABLE price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_app_id INTEGER NOT NULL,           -- ゲームのSteam App ID
  current_price REAL NOT NULL,             -- 現在価格
  original_price REAL NOT NULL,            -- 元価格
  discount_percent INTEGER NOT NULL,       -- 割引率
  historical_low REAL NOT NULL,            -- 歴代最安値
  is_on_sale BOOLEAN NOT NULL,            -- セール中フラグ
  source TEXT NOT NULL,                    -- データソース
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  release_date TEXT,                       -- リリース日
  FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id)
);
```

### alerts - アラート履歴
```sql
CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_app_id INTEGER NOT NULL,
  game_id INTEGER,                         -- gamesテーブルへの参照
  alert_type TEXT NOT NULL,                -- アラートタイプ
  message TEXT,                            -- アラートメッセージ
  trigger_price REAL,                      -- トリガー価格
  previous_low REAL,                       -- 以前の最安値
  discount_percent INTEGER,                -- 割引率
  price_data TEXT,                         -- 価格データ(JSON)
  game_name TEXT,                          -- ゲーム名
  notified_discord BOOLEAN DEFAULT 0,     -- Discord通知済み
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  release_date TEXT,
  FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);
```

**アラートタイプ:**
- `new_low`: 新最安値
- `sale_start`: セール開始
- `threshold_met`: 閾値到達
- `free_game`: 無料ゲーム
- `game_released`: ゲームリリース

## 予算管理テーブル

### budgets - 予算設定
```sql
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                      -- 予算名
  period_type TEXT NOT NULL,               -- 期間タイプ
  budget_amount REAL NOT NULL,             -- 予算金額
  start_date DATE,                         -- 開始日
  end_date DATE,                           -- 終了日
  category_filter TEXT,                    -- カテゴリフィルター
  is_active BOOLEAN DEFAULT 1,            -- アクティブフラグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**期間タイプ:**
- `monthly`: 月間予算
- `yearly`: 年間予算  
- `custom`: カスタム期間

### budget_expenses - 支出記録
```sql
CREATE TABLE budget_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL,             -- 予算ID
  steam_app_id INTEGER,                   -- Steam App ID
  game_name TEXT,                         -- ゲーム名
  amount REAL NOT NULL,                   -- 支出金額
  purchase_date DATE NOT NULL,            -- 購入日
  category TEXT,                          -- カテゴリ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);
```

## 無料ゲーム管理

### epic_free_games - Epic Games無料ゲーム
```sql
CREATE TABLE epic_free_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,                     -- ゲームタイトル
  description TEXT,                        -- 説明
  epic_url TEXT,                          -- Epic Store URL
  image_url TEXT,                         -- 画像URL
  start_date DATE,                        -- 配布開始日
  end_date DATE,                          -- 配布終了日
  is_claimed BOOLEAN DEFAULT 0,          -- 受け取り済み
  claimed_date DATETIME,                  -- 受け取り日
  discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(title, start_date)
);
```

### steam_free_games - Steam無料ゲーム
```sql
CREATE TABLE steam_free_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id INTEGER NOT NULL UNIQUE,         -- Steam App ID
  title TEXT NOT NULL,                    -- ゲームタイトル
  description TEXT,                       -- 説明
  steam_url TEXT NOT NULL,               -- Steam Store URL
  is_claimed BOOLEAN DEFAULT 0,          -- 受け取り済み
  claimed_date DATETIME,                 -- 受け取り日
  discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## システム管理テーブル

### system_settings - システム設定
```sql
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,                   -- 設定キー
  value TEXT NOT NULL,                    -- 設定値
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**主要設定:**
- `last_fetch_time`: 最終取得時刻

### itad_settings - ITAD設定
```sql
CREATE TABLE itad_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,              -- 設定名
  value TEXT NOT NULL,                    -- 設定値
  description TEXT,                       -- 説明
  category TEXT DEFAULT 'filter',        -- カテゴリ
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**設定カテゴリ:**
- `filter`: フィルター設定
- `general`: 一般設定
- `notification`: 通知設定

### db_version - バージョン管理
```sql
CREATE TABLE db_version (
  version INTEGER PRIMARY KEY,            -- スキーマバージョン
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## インデックス

パフォーマンス向上のため、以下のインデックスが作成されています：

```sql
-- 価格履歴検索用
CREATE INDEX idx_price_history_app_id ON price_history(steam_app_id);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);

-- アラート検索用
CREATE INDEX idx_alerts_app_id ON alerts(steam_app_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_alerts_game_id ON alerts(game_id);

-- 予算管理用
CREATE INDEX idx_budgets_period ON budgets(period_type, start_date, end_date);
CREATE INDEX idx_budget_expenses_budget_id ON budget_expenses(budget_id);
CREATE INDEX idx_budget_expenses_date ON budget_expenses(purchase_date);

-- 無料ゲーム用
CREATE INDEX idx_epic_games_dates ON epic_free_games(start_date, end_date);
CREATE INDEX idx_epic_games_claimed ON epic_free_games(is_claimed);
CREATE INDEX idx_steam_free_games_app_id ON steam_free_games(app_id);
CREATE INDEX idx_steam_free_games_claimed ON steam_free_games(is_claimed);
```

## データベースアクセス

### 接続設定
- **ファイルパス**: `data/steam_sentinel.db`
- **WALモード**: WSL環境では無効、DELETE モードを使用
- **外部キー制約**: 有効

### バックアップ
データベースファイルを直接コピーしてバックアップ可能：
```bash
cp data/steam_sentinel.db data/backup/steam_sentinel_$(date +%Y%m%d).db
```

### 初期データ
起動時に以下が自動作成されます：
- デフォルト月次予算 (10,000円)
- ITAD設定の初期値
- プリセットゲーム (preset_games.json から127ゲーム)

詳細な型定義やクエリ例は開発者向け仕様書を参照してください。