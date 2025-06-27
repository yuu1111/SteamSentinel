# セットアップ要件

## 必要な環境変数

`.env` ファイルに以下の環境変数を設定してください。

```bash
# 必須項目
ITAD_API_KEY=                     # IsThereAnyDeal APIキー

# オプション項目（デフォルト値あり）
DISCORD_WEBHOOK_URL=              # Discord通知用
WEB_PORT=3000                     # Webサーバーポート
WEB_HOST=127.0.0.1                # バインドアドレス
MONITORING_INTERVAL_HOURS=1       # 監視間隔
LOG_LEVEL=INFO                    # ログレベル
```

## 必要なAPIキー一覧と取得方法

| API名                 | 環境変数                    | 取得URL                               | 料金 | 登録要件             | 制限                                    | フェーズ |
| :-------------------- | :-------------------------- | :------------------------------------ | :--- | :------------------- | :-------------------------------------- | :------- |
| IsThereAnyDeal API    | `ITAD_API_KEY`              | [https://isthereanydeal.com/dev/app/](https://isthereanydeal.com/dev/app/) | 無料 | メールアドレス+アプリ名 | ヒューリスティック制限 (緩い)         | フェーズ1 |
| IGDB API              | `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET` | [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps) | 無料 | Twitch Developerアカウント | 月500万リクエスト                       | フェーズ2 |
| Steam API             | `STEAM_API_KEY`             | [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) | 無料 | Steamアカウント      | 1日10万リクエスト                       | フェーズ3 |
| YouTube API           | `YOUTUBE_API_KEY`           | [https://console.developers.google.com/](https://console.developers.google.com/) | 無料枠 | Googleアカウント     | 1日10,000クォータ (検索1回=100クォータ) | フェーズ3 |
| Twitch API            | `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` | [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps) | 無料 | Twitch Developerアカウント | レート制限あり                          | フェーズ3 |

* **APIキー不要な機能**: Steam Store API (現在価格取得), Discord Webhook (URLのみ), Epic Games RSS Feed, OpenCritic API, HowLongToBeat 非公式API, PCGamingWiki API, ProtonDB 非公式API。

## セットアップコマンド

### 現行レガシーSPA版

```bash
# 1. 依存関係のインストール
npm install

# 2. TypeScript コンパイル
npm run build

# 3. 環境変数設定
cp .env.example .env
# .env ファイルを編集してAPIキーなどを設定

# 4. データベース初期化
npm run db:init

# 5. プリセットゲーム投入 (任意)
npm run seed:games

# 6. 開発サーバー起動
npm run dev

# 7. 本番サーバー起動
npm start
```

### 次世代React+Next.js版 (計画中)

```bash
# 1. Next.jsプロジェクト作成
npx create-next-app@latest steam-sentinel-ui --typescript --tailwind --app

# 2. Ant Design & 依存関係のインストール
cd steam-sentinel-ui
npm install antd @ant-design/nextjs-registry @ant-design/icons
npm install zustand axios chart.js react-chartjs-2

# 3. Next.js設定
# next.config.js でAnt Design最適化設定

# 4. 開発サーバー起動
npm run dev

# 5. 本番ビルド
npm run build && npm start
```

## 設定ファイルテンプレート

* `.env.example`: 環境変数のサンプル。
* `config.example.json`: 設定ファイルのサンプル。
* `preset_games.json`: 人気ゲーム50-100タイトルのプリセットリスト。

## 設定値制限・検証

| 項目             | 最小値 | 最大値 | デフォルト | 備考                      |
| :--------------- | :----- | :----- | :--------- | :------------------------ |
| 監視間隔 (分)    | 10     | 1440   | 60         | API制限考慮、24時間まで   |
| 通知クールダウン (時間) | 1      | 168    | 6          | スパム防止、7日間まで     |
| API同時接続数    | 1      | 5      | 1          | 過負荷防止、安定性重視    |
| APIタイムアウト (秒) | 5      | 60     | 15         |                           |
| 価格履歴保持期間 (日) | -      | -      | 365        | 1年間                     |
| アラート履歴保持期間 (日) | -      | -      | 90         | 3ヶ月間                   |
| ログファイル保持期間 (日) | -      | -      | 30         | 1ヶ月間                   |

## 実装手法詳細

### Epic Games無料ゲーム通知

* **推奨**: RSS Feed (`https://store.epicgames.com/en-US/free-games/rss.xml` - 毎週木曜日更新)。
* **バックアップ**: IsThereAnyDeal API (`https://api.isthereanydeal.com/v01/deals/list/?key=${key}&shop=epic&price_to=0`)。
* **メリット**: 公式データ、安定性が高く、実装が容易。

### Amazon Prime Gaming連携

* **推奨**: LootScraper RSS (`https://feed.phenx.de/lootscraper_amazon_game.xml`, `https://feed.phenx.de/lootscraper_amazon_loot.xml`)。
* **上級者向け**: GraphQL API (`https://gaming.amazon.com/graphql` - CSRFトークンが必要)。
* **コミュニティサイト**: GG.deals Prime Gaming情報、IndieGameBundles 無料ゲーム情報。

### 高割引ゲーム動的検知

* **IsThereAnyDeal戦略**: API (`https://api.isthereanydeal.com/v01/deals/list/?key=${apiKey}&region=jp&country=JP&cut=80&limit=100&sort=cut:desc`) を使用。
* **フィルタリング条件**: レビュー1000件以上、評価80%以上、現在価格2000円以下。