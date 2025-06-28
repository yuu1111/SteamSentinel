# データ構造

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
| `alert_type`         | TEXT          |                            | アラートタイプ ('new_low', 'sale_start', 'threshold_met', 'free_game') |
| `message`            | TEXT          |                            | **アラートメッセージ**               |
| `trigger_price`      | REAL          |                            | アラートがトリガーされた価格         |
| `previous_low`       | REAL          |                            | 以前の最安値                         |
| `discount_percent`   | INTEGER       |                            | 割引率 (%)                           |
| `price_data`         | JSON          |                            | **価格情報の詳細データ** (JSON形式)  |
| `game_name`          | TEXT          |                            | **ゲーム名** (検索・表示用)          |
| `notified_discord`   | BOOLEAN       | DEFAULT false              | Discordに通知されたか否か            |
| `created_at`         | TIMESTAMP     |                            | 作成日時                             |
| `release_date`       | TEXT          |                            | リリース通知の場合のリリース日       |

## データベースバージョン管理テーブル (`db_version`)

| カラム名     | 型      | 制約                | 説明                     |
| :----------- | :------ | :------------------ | :----------------------- |
| `version`    | INTEGER | PRIMARY KEY         | データベーススキーマのバージョン |
| `applied_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 適用日時                 |