# データ構造

## TypeScript型定義システム

### 基本データ型
- **Game**: ゲーム情報とアラート設定
- **PriceData**: 価格履歴と割引情報
- **Statistics**: 監視統計と出費指標
- **ExpenseData**: 出費分析データ
- **TabDashboardData**: 統合ダッシュボードデータ

### 出費追跡・予算管理型
- **BudgetData**: 予算情報（月間/年間/カスタム）
- **BudgetCategory**: カテゴリ別予算配分
- **BudgetAlert**: 予算アラート設定
- **SpendingAlert**: 支出パターン異常検知
- **BudgetSummary**: 予算統計サマリー

### ダッシュボードカスタマイゼーション型
- **DashboardWidget**: ウィジェット設定
- **DashboardLayout**: レイアウト構成
- **DashboardTheme**: テーマ定義
- **UserPreferences**: ユーザー設定

### レポート・データ管理型
- **ReportConfig**: レポート設定
- **ReportSection**: レポートセクション
- **DataBackup**: バックアップデータ

### 無料ゲーム統合型
- **EpicFreeGame**: Epic Games無料ゲーム情報
- **SteamFreeGame**: Steam無料ゲーム情報（新規追加）
- **FreeGameStatus**: ゲーム受け取り状況（Epic & Steam共通）
- **FreeGameStats**: 無料ゲーム統計情報（Epic & Steam分離）

## データベース構造

## ゲーム情報テーブル (`games`)

| カラム名                 | 型            | 制約                                    | 説明                                     |
| :----------------------- | :------------ | :-------------------------------------- | :--------------------------------------- |
| `id`                     | INTEGER       | PRIMARY KEY AUTOINCREMENT               |                                          |
| `steam_app_id`           | INTEGER       | UNIQUE NOT NULL                         | SteamのアプリケーションID                |
| `name`                   | TEXT          | NOT NULL                                | ゲーム名                                 |
| `enabled`                | BOOLEAN       | DEFAULT 1                               | 監視有効/無効                            |
| `price_threshold`        | REAL          |                                         | 価格閾値 (例: 1000.00)                   |
| `price_threshold_type`   | TEXT          | DEFAULT 'price' CHECK(...)              | 閾値タイプ ('price', 'discount', 'any_sale') |
| `discount_threshold_percent` | INTEGER   | DEFAULT NULL                            | 割引率閾値 (%)                           |
| `alert_enabled`          | BOOLEAN       | DEFAULT 1                               | アラート通知有効/無効                    |
| `manual_historical_low`  | REAL          | DEFAULT NULL                            | **手動設定最安値** (ユーザー指定値)      |
| `is_purchased`           | BOOLEAN       | DEFAULT 0                               | **購入済みフラグ**                       |
| `purchase_price`         | REAL          | DEFAULT NULL                            | **購入価格**                             |
| `purchase_date`          | TEXT          | DEFAULT NULL                            | **購入日** (ISO 8601形式)                |
| `was_unreleased`         | BOOLEAN       | DEFAULT 0                               | **未リリース状態フラグ** (リリース追跡用) |
| `last_known_release_date`| TEXT          | DEFAULT NULL                            | **最後の既知リリース日** (ISO 8601形式)   |
| `created_at`             | DATETIME      | DEFAULT CURRENT_TIMESTAMP               | 作成日時                                 |
| `updated_at`             | DATETIME      | DEFAULT CURRENT_TIMESTAMP               | 更新日時                                 |

## 価格履歴テーブル (`price_history`)

| カラム名             | 型            | 制約                | 説明                                 |
| :------------------- | :------------ | :------------------ | :----------------------------------- |
| `id`                 | INTEGER       | PRIMARY KEY         |                                      |
| `steam_app_id`       | INTEGER       |                     | SteamアプリケーションID              |
| `current_price`      | REAL          |                     | 現在価格                             |
| `original_price`     | REAL          |                     | 元の価格                             |
| `discount_percent`   | INTEGER       |                     | 割引率 (%)                           |
| `historical_low`     | REAL          |                     | 歴代最安値                           |
| `is_on_sale`         | BOOLEAN       |                     | セール中か否か                       |
| `source`             | TEXT          |                     | 価格情報のソース ('itad', 'steam'など) |
| `recorded_at`        | TIMESTAMP     |                     | 記録日時                             |
| `release_date`       | TEXT          |                     | 未リリースゲームのリリース日 (ISO文字列) |

## アラート履歴テーブル (`alerts`)

| カラム名             | 型            | 制約                       | 説明                                 |
| :------------------- | :------------ | :------------------------- | :----------------------------------- |
| `id`                 | INTEGER       | PRIMARY KEY                |                                      |
| `steam_app_id`       | INTEGER       |                            | SteamアプリケーションID              |
| `game_id`            | INTEGER       |                            | **ゲームテーブルへの外部キー**       |
| `alert_type`         | TEXT          |                            | アラートタイプ ('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released') |
| `message`            | TEXT          |                            | **アラートメッセージ**               |
| `trigger_price`      | REAL          |                            | アラートがトリガーされた価格         |
| `previous_low`       | REAL          |                            | 以前の最安値                         |
| `discount_percent`   | INTEGER       |                            | 割引率 (%)                           |
| `price_data`         | JSON          |                            | **価格情報の詳細データ** (JSON形式)  |
| `game_name`          | TEXT          |                            | **ゲーム名** (検索・表示用)          |
| `notified_discord`   | BOOLEAN       | DEFAULT false              | Discordに通知されたか否か            |
| `created_at`         | TIMESTAMP     |                            | 作成日時                             |
| `release_date`       | TEXT          |                            | リリース通知の場合のリリース日       |

## 予算管理テーブル (`budgets`)

| カラム名         | 型      | 制約                     | 説明                                    |
| :-------------- | :------ | :----------------------- | :-------------------------------------- |
| `id`            | INTEGER | PRIMARY KEY AUTOINCREMENT |                                         |
| `name`          | TEXT    | NOT NULL                 | 予算名                                  |
| `period_type`   | TEXT    | CHECK(period_type IN ('monthly', 'yearly', 'custom')) | 期間タイプ |
| `budget_amount` | REAL    | NOT NULL                 | 予算金額                                |
| `start_date`    | DATE    |                          | 開始日                                  |
| `end_date`      | DATE    |                          | 終了日                                  |
| `category_filter` | TEXT  |                          | カテゴリフィルター                      |
| `is_active`     | BOOLEAN | DEFAULT 1                | アクティブフラグ                        |
| `created_at`    | DATETIME | DEFAULT CURRENT_TIMESTAMP | 作成日時                               |
| `updated_at`    | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新日時                               |

## 支出記録テーブル (`budget_expenses`)

| カラム名         | 型      | 制約                     | 説明                                    |
| :-------------- | :------ | :----------------------- | :-------------------------------------- |
| `id`            | INTEGER | PRIMARY KEY AUTOINCREMENT |                                         |
| `budget_id`     | INTEGER | NOT NULL, FOREIGN KEY    | 予算ID (budgets.id参照)                 |
| `steam_app_id`  | INTEGER |                          | Steam App ID (オプション)               |
| `game_name`     | TEXT    |                          | ゲーム名                                |
| `amount`        | REAL    | NOT NULL                 | 支出金額                                |
| `purchase_date` | DATE    | NOT NULL                 | 購入日                                  |
| `category`      | TEXT    |                          | カテゴリ                                |
| `created_at`    | DATETIME | DEFAULT CURRENT_TIMESTAMP | 記録作成日時                           |

## Epic Games無料ゲームテーブル (`epic_free_games`)

| カラム名         | 型      | 制約                     | 説明                                    |
| :-------------- | :------ | :----------------------- | :-------------------------------------- |
| `id`            | INTEGER | PRIMARY KEY AUTOINCREMENT |                                         |
| `title`         | TEXT    | NOT NULL                 | ゲームタイトル                          |
| `description`   | TEXT    |                          | ゲーム説明                              |
| `epic_url`      | TEXT    |                          | Epic Store URL                          |
| `image_url`     | TEXT    |                          | ゲーム画像URL                           |
| `start_date`    | TEXT    |                          | 配布開始日 (ISO 8601形式)               |
| `end_date`      | TEXT    |                          | 配布終了日 (ISO 8601形式)               |
| `is_claimed`    | BOOLEAN | DEFAULT 0                | 受け取り済みフラグ                      |
| `claimed_date`  | TEXT    |                          | 受け取り日 (ISO 8601形式)               |
| `discovered_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 発見日時                               |

## Steam無料ゲームテーブル (`steam_free_games`) **新規追加**

| カラム名         | 型      | 制約                     | 説明                                    |
| :-------------- | :------ | :----------------------- | :-------------------------------------- |
| `id`            | INTEGER | PRIMARY KEY AUTOINCREMENT |                                         |
| `app_id`        | INTEGER | NOT NULL UNIQUE          | Steam App ID                            |
| `title`         | TEXT    | NOT NULL                 | ゲームタイトル                          |
| `description`   | TEXT    |                          | ゲーム説明                              |
| `steam_url`     | TEXT    | NOT NULL                 | Steam Store URL                         |
| `is_claimed`    | BOOLEAN | DEFAULT 0                | 受け取り済みフラグ                      |
| `claimed_date`  | TEXT    |                          | 受け取り日 (ISO 8601形式)               |
| `discovered_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 発見日時                               |
| `updated_at`    | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新日時                               |

## システム設定テーブル (`system_settings`)

| カラム名     | 型      | 制約                     | 説明                                    |
| :---------- | :------ | :----------------------- | :-------------------------------------- |
| `key`       | TEXT    | PRIMARY KEY              | 設定キー                                |
| `value`     | TEXT    |                          | 設定値 (JSON形式)                       |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新日時                               |

## データベースバージョン管理テーブル (`db_version`)

| カラム名     | 型      | 制約                | 説明                     |
| :----------- | :------ | :------------------ | :----------------------- |
| `version`    | INTEGER | PRIMARY KEY         | データベーススキーマのバージョン (現在: v7) |
| `applied_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 適用日時                 |