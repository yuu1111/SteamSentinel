# SteamSentinel - Steam価格監視システム 完全仕様書

## プロジェクト開発規約

### 言語
このリポジトリで作業する際は、ユーザーと日本語でコミュニケーションを取ってください。この仕様書.mdファイルは日本語で記述されています。

### Git操作
- git commitやgit pushコマンドを実行する前に、必ずユーザーの明示的な確認を取ってください
- ユーザーの承認なしに、「タスクを完了して」などの指示があっても、変更をコミットやプッシュしないでください
- コミットの準備ができたら、「これらの変更をコミット・プッシュしてもよろしいですか？」と確認してください

### コミットメッセージ形式
適切なプレフィックスを使用したconventional commitフォーマットを使用してください：
- `feat:` 新機能
- `fix:` バグ修正  
- `docs:` ドキュメント更新
- `style:` フォーマット変更
- `refactor:` コードリファクタリング
- `test:` テスト追加
- `chore:` メンテナンスタスク

### コミット組織化
- 複数ファイルが変更された場合、機能や目的に応じて論理的にコミットを分割してください
- 関連のない変更を組み合わせた大きなモノリシックコミットは避けてください
- 関連するファイル変更をグループ化してください（例：ソースコード + テスト、ドキュメント更新、設定変更）
- 機能変更とドキュメント/フォーマット変更は分離してください
- 各コミットは単一の論理的作業単位を表すべきです
- **重要**: 実装作業を常に論理的なコミットに分割し、個別にプッシュしてください：
  - コア機能変更（サービス、ビジネスロジック）
  - 設定とセットアップ変更
  - プラットフォーム固有スクリプト（.ps1、.sh、.batファイル）
  - ドキュメント更新
  - 各コミットは明確で焦点を絞った目的を持ち、完了後すぐにプッシュしてください

### フェーズ実装レポート
- 各フェーズの実装完了時には、必ずreportsフォルダに詳細な実装レポートを作成してください
- レポート名の形式: `phaseX-implementation-report.md`（例: `phase1-implementation-report.md`）
- レポートには以下の内容を必ず含めてください：
  - 実装概要と完成した機能一覧
  - アーキテクチャ詳細とコード構成
  - 技術仕様の実装詳細
  - セキュリティ・パフォーマンス実装
  - 品質保証・テスト戦略
  - 設定管理システムの詳細
  - 成功指標の達成状況
  - 引き継ぎ事項と次フェーズへの準備状況
- レポートは日本語で記述し、技術的詳細を含む包括的な内容とする
- 実装メトリクス（ファイル数、行数、機能カバレッジ等）を含める

**リリース管理**: 
- リリースを作成する際は、必ずCHANGELOG.mdとCHANGELOG-JP.mdを適切なバージョン番号で更新してください
- **未リリースの変更には「## [X.X.X] - YYYY-MM-DD JST」のプレースホルダー形式を使用**し、「Unreleased」は使用しないでください
- X.X.Xを実際のバージョン番号に置き換えるのは、リリース作成時のみです
- リリースプロセス中に変更のタイプ（patch/minor/major）に基づいてバージョン番号を決定してください
- 公式リリースまでCHANGELOGはプレースホルダー形式を使用してください
- リリースコミットと機能コミットにはconventional commitフォーマットを使用してください
- **重要**: CHANGELOGの全ての日付はJST（日本標準時）形式である必要があります
- 日付形式: "YYYY-MM-DD JST"（例: "2025-06-24 JST"）

**リリースプロセスワークフロー**:
1. **全ての開発作業を完了**し、全てのコミットがプッシュされていることを確認
2. **自動リリースコマンドを実行**:
   ```bash
   npm run release          # パッチリリース（1.0.0 → 1.0.1）
   npm run release:minor    # マイナーリリース（1.0.0 → 1.1.0） 
   npm run release:major    # メジャーリリース（1.0.0 → 2.0.0）
   ```
   これにより自動的に：
   - 依存関係をクリーンアップして再ビルド
   - 型チェックとリンティングを実行
   - package.jsonのバージョンを更新
   - リリースコミットとGitタグを作成
3. **CHANGELOGプレースホルダーを実際のバージョンとJST日付に更新**:
   - "## [X.X.X] - YYYY-MM-DD JST" → "## [1.2.0] - 2025-06-25 JST"に置換
   - CHANGELOG.mdとCHANGELOG-JP.mdの両方を更新
4. **新機能が追加された場合はREADMEドキュメントを更新**:
   - 機能リスト、使用例、コマンドリファレンスを更新
   - README.mdとREADME-JP.mdの両方が同期されていることを確認
5. **ドキュメント更新をコミット**:
   ```bash
   git add CHANGELOG.md CHANGELOG-JP.md README.md README-JP.md
   git commit -m "docs: vX.X.Xリリースドキュメントを最終化"
   ```
6. **リリースをリモートにプッシュ**:
   ```bash
   git push origin main      # リリースコミットをプッシュ
   git push origin vX.X.X    # バージョンタグをプッシュ
   ```
7. **GitHub Actionsが自動的にリリース成果物を作成**（tar.gzとzipファイル）


## 📋 プロジェクト概要
**プロジェクト名**: SteamSentinel  
**リポジトリ名**: `SteamSentinel`  
**説明**: セール時の過去最安値更新を検知し、WebサイトとDiscord通知で情報提供するシステム

**プロジェクト名の由来**: Steam（Steam）+ Sentinel（見張り番）= ゲーム価格の忠実な見張り役

---

## 🛠️ エラー処理・復旧戦略

### **データベース関連エラー**
- **破損検知**: 起動時の整合性チェック
- **復旧方法**: 自動バックアップからの復元
- **フォールバック**: 新規データベース作成（履歴は失われる）

### **API障害時の対応**
- **短期障害（1時間未満）**: エラーログ出力、次回サイクルで再試行
- **長期障害（1時間以上）**: 管理画面で障害状況表示、手動確認促す
- **完全障害**: 利用可能なAPIのみで継続、機能制限を明示

### **設定ファイル問題**
- **破損・欠損**: デフォルト値で動作継続
- **不正値**: 設定範囲内に自動補正
- **権限エラー**: エラーメッセージで手動修正を促す

### **プロセス異常終了**
- **ログ記録**: 詳細なエラー情報をファイル出力
- **状態保存**: 処理中データの安全な保存
- **手動再起動**: systemd/pm2等での自動復旧は運用者判断

---

## 🚀 初回セットアップ手順

### **必要な環境変数**
```bash
# 必須項目
ITAD_API_KEY=               # IsThereAnyDeal APIキー

# オプション項目（デフォルト値あり）
DISCORD_WEBHOOK_URL=        # Discord通知用
WEB_PORT=3000              # Webサーバーポート
WEB_HOST=127.0.0.1         # バインドアドレス
MONITORING_INTERVAL_HOURS=1 # 監視間隔
LOG_LEVEL=INFO             # ログレベル
```

### **必要なAPIキー一覧**

#### **🔴 フェーズ1必須**
```bash
# IsThereAnyDeal API
ITAD_API_KEY=your_key_here
```
**取得URL**: https://isthereanydeal.com/dev/app/  
**料金**: 無料  
**登録**: メールアドレス + アプリ名のみ  
**制限**: ヒューリスティック制限（緩い）

#### **🟡 フェーズ2オプション**
```bash
# IGDB API（レビュー統合用）
IGDB_CLIENT_ID=your_client_id_here
IGDB_CLIENT_SECRET=your_client_secret_here
```
**取得URL**: https://dev.twitch.tv/console/apps  
**料金**: 無料  
**登録**: Twitch Developer アカウント必要  
**制限**: 月500万リクエスト

#### **🟢 フェーズ3以降オプション**
```bash
# Steam API（ウィッシュリスト連携用）
STEAM_API_KEY=your_steam_key_here
```
**取得URL**: https://steamcommunity.com/dev/apikey  
**料金**: 無料  
**登録**: Steamアカウント必要  
**制限**: 1日10万リクエスト

```bash
# YouTube API（動画通知用）
YOUTUBE_API_KEY=your_youtube_key_here
```
**取得URL**: https://console.developers.google.com/  
**料金**: 無料枠あり（1日10,000クォータ）  
**登録**: Googleアカウント必要  
**制限**: 検索1回=100クォータ（1日100回まで）

```bash
# Twitch API（配信通知用）
TWITCH_CLIENT_ID=your_client_id_here
TWITCH_CLIENT_SECRET=your_client_secret_here
```
**取得URL**: https://dev.twitch.tv/console/apps  
**料金**: 無料  
**登録**: Twitch Developer アカウント必要  
**制限**: レート制限あり

### **APIキー不要な機能**
以下の機能はAPIキーなしで利用可能：
- Steam Store API（現在価格取得）
- Discord Webhook（URL のみ）
- Epic Games RSS Feed
- OpenCritic API（レビューフォールバック）
- HowLongToBeat 非公式API
- PCGamingWiki API
- ProtonDB 非公式API
```bash
# 1. 依存関係のインストール
npm install

# 2. TypeScript コンパイル
npm run build

# 3. 環境変数設定
cp .env.example .env
# .env ファイルを編集

# 4. データベース初期化
npm run db:init

# 5. プリセットゲーム投入
npm run seed:games

# 6. 開発サーバー起動
npm run dev

# 7. 本番サーバー起動
npm start
```

### **設定ファイルテンプレート**
- `.env.example`: 環境変数のサンプル
- `config.example.json`: 設定ファイルのサンプル
- `preset_games.json`: 人気ゲーム50-100タイトル

---

## 🎨 ユーザビリティ仕様

### **レスポンシブ対応**
- **デスクトップ**: 1920px以上（3カラムレイアウト）
- **タブレット**: 768px-1919px（2カラムレイアウト）
- **モバイル**: 767px以下（1カラム、スタック表示）

### **ダークモード対応**
- **切り替え**: ヘッダーにトグルボタン
- **保存**: localStorage で設定永続化
- **自動検知**: システム設定に追従オプション

### **キーボードショートカット**
- `Ctrl/Cmd + R`: 手動更新
- `Ctrl/Cmd + A`: ゲーム追加モーダル
- `Ctrl/Cmd + S`: 設定画面
- `Ctrl/Cmd + D`: ダークモード切り替え
- `ESC`: モーダル・ドロップダウン閉じる

### **アクセシビリティ**
- **色覚異常対応**: カラーパレット配慮、アイコン併用
- **コントラスト**: WCAG 2.1 AA レベル準拠
- **スクリーンリーダー**: aria-label、role属性適切に設定
- **フォーカス**: タブ移動でキーボード操作可能

---

## ⚙️ 設定値制限・検証

### **監視間隔制限**
```typescript
const MONITORING_INTERVAL = {
  min: 10,      // 10分（API制限考慮）
  max: 1440,    // 24時間
  default: 60   // 1時間
};
```

### **通知制限**
```typescript
const NOTIFICATION_COOLDOWN = {
  min: 60,      // 1時間（スパム防止）
  max: 168,     // 7日間
  default: 6    // 6時間
};
```

### **API接続制限**
```typescript
const API_SETTINGS = {
  concurrent_limit: {
    min: 1,       // 最低1接続
    max: 5,       // 過負荷防止
    default: 2    // 同時2接続
  },
  timeout: {
    min: 5,       // 5秒
    max: 60,      // 1分
    default: 15   // 15秒
  }
};
```

### **データ保持期間**
```typescript
const DATA_RETENTION = {
  price_history: 365,  // 1年間の価格履歴
  alert_history: 90,   // 3ヶ月のアラート履歴
  log_files: 30       // 1ヶ月のログファイル
};
```

---

## 🔧 実装手法詳細

### **Epic Games無料ゲーム通知**

#### **手法1: RSS Feed（推奨）**
```javascript
const epicRSS = 'https://store.epicgames.com/en-US/free-games/rss.xml';
// 毎週木曜日（日本時間金曜早朝）更新
```

#### **手法2: IsThereAnyDeal API（バックアップ）**
```javascript
const itadFreeGames = `https://api.isthereanydeal.com/v01/deals/list/?key=${key}&shop=epic&price_to=0`;
```

**メリット**: 公式データ、安定性高、実装簡単

### **Amazon Prime Gaming連携**

#### **手法1: LootScraper RSS（推奨）**
```javascript
const feeds = {
  amazonGames: "https://feed.phenx.de/lootscraper_amazon_game.xml",
  amazonLoot: "https://feed.phenx.de/lootscraper_amazon_loot.xml"
};
```

#### **手法2: GraphQL API（上級者向け）**
```javascript
const endpoint = "https://gaming.amazon.com/graphql";
// CSRFトークン必要（HTMLから取得）
```

#### **手法3: コミュニティサイト**
- GG.deals Prime Gaming情報
- IndieGameBundles 無料ゲーム情報

**実装難易度**: LootScraper RSS ⭐⭐⭐⭐⭐ / GraphQL API ⭐⭐

### **高割引ゲーム動的検知**

#### **IsThereAnyDeal戦略**
```javascript
const url = `https://api.isthereanydeal.com/v01/deals/list/` +
  `?key=${apiKey}&region=jp&country=JP&cut=80&limit=100&sort=cut:desc`;
```

#### **フィルタリング条件**
- レビュー1000件以上
- 評価80%以上
- 現在価格2000円以下

---

## 🌍 地域対応

### **現バージョン**
- **対象地域**: 日本のみ
- **通貨**: JPY（日本円）
- **価格ソース**: Steam Store API (cc=jp), IsThereAnyDeal API (region=jp)

### **将来対応予定**
- **候補地域**: US（USD）, EU（EUR）, UK（GBP）
- **実装方針**: 設定ファイルで地域選択可能
- **注意事項**: 地域ロックされたゲームの価格は除外

---

## 🧪 テスト要件

### **単体テスト**
- API関数のレスポンス処理
- 価格比較ロジック
- データベース操作

### **統合テスト**
- 全監視フローの動作確認
- Web UIの基本操作
- アラート機能

### **軽量負荷テスト**
- 50ゲーム同時監視
- 連続24時間稼働
- メモリリーク検証

**実装方針**: Jest使用、重すぎない範囲で実装

---

## 🎯 基本仕様

### **監視対象**
- JSON設定ファイルでゲームリスト管理（Steam App ID）
- 有名ゲーム50-100タイトルのプリセットリスト内蔵
  - 最新AAAタイトル（Cyberpunk 2077、Baldur's Gate 3等）
  - 定番名作（GTA V、Witcher 3、Dark Souls等）
  - インディーゲーム人気作
- 動的追加・削除機能

### **データソース**
- **メイン**: IsThereAnyDeal API（地域：日本、通貨：JPY）
- **サブ**: Steam Store API（地域：日本）

### **アラート条件**
- **条件A**: IsThereAnyDealの歴代最安値を下回った時
- **条件B**: セール開始（割引率 > 0%になった時）
- 両条件でアラート発生

### **監視頻度**
- デフォルト：1時間間隔
- 設定変更可能：12時間間隔

### **実行環境**
- ローカル環境（Windows/Mac/Linux）
- Node.js + Express.js
- SQLite（データ永続化）

---

## 🌐 Webサイト機能（フェーズ1）

### **基本表示**
- [x] 価格一覧表示（ゲーム名、現在価格、最安値、割引率）
- [x] 手動更新ボタン
- [x] ゲーム追加/削除UI

### **実装予定機能**
- [x] **アラート履歴表示** - 過去の最安値更新履歴
- [x] **Steamストアページ直リンク** - 各ゲームから購入ページへ
- [x] **ゲーム別アラート設定** - 個別通知ON/OFF
- [x] **価格閾値設定** - 「○○円以下で通知」の個別設定
- [x] **価格推移グラフ** - Chart.jsによる価格履歴可視化
- [x] **セール期間表示** - 現在セールの終了日時
- [x] **ヘルスチェック機能** - API接続状況、最終更新時刻
- [x] **ログ表示機能** - エラーや処理状況の確認
- [x] **設定バックアップ/復元** - ゲームリスト書き出し/読み込み

### **実装済み追加機能**
- [x] **テーブルソート機能** - 全カラム（ゲーム名、価格、割引率等）クリックソート対応
- [x] **ゲームバナー画像表示** - Steam CDNからのゲームヘッダー画像自動表示
- [x] **詳細エラー報告機能** - 失敗ゲームの詳細情報表示とコピー機能
- [x] **ゲームタイプ自動検知** - 基本無料・未リリース・販売終了ゲームの自動識別
- [x] **開発環境最適化** - 開発時のレート制限無効化とデバッグ機能強化
- [x] **エラー処理強化** - 詳細なスタックトレース表示と折りたたみ可能なエラー詳細

---

## 📱 Discord連携（フェーズ2）

### **通知機能**
- [x] Webhook経由でのアラート送信
- [x] Web抜きでも単体動作可能
- [x] リッチEmbed形式（ゲーム名、価格情報、Steamリンク）

---

## 🔄 後回し機能（将来実装）

### **高度な分析機能**
- [ ] **ウィッシュリスト連携** - Steamのウィッシュリストからインポート
- [ ] **セール頻度統計** - 年間セール回数、平均割引率
- [ ] **割引率履歴** - 過去最大割引率の追跡

### **理由**
- 実装複雑度が高い
- データ蓄積期間が必要
- 基本機能で十分な価値提供可能

---

## ⚡ 技術要件

### **API制限・エラー処理**
- **IsThereAnyDeal API**: リクエスト間隔2秒以上、ヒューリスティック制限対応
- **Steam Store API**: リクエスト間隔3秒以上、1日1000リクエスト程度の制限
- **429エラー対応**: 指数バックオフ戦略（初回1秒、最大60秒）
- **API障害時**: 次回監視サイクルまで該当ゲームをスキップ
- **タイムアウト**: API呼び出し15秒でタイムアウト
- **ゲームタイプ検知**: 基本無料（F2P）・未リリース・販売終了ゲームの自動識別
- **詳細エラー報告**: 失敗理由の詳細分析とユーザーへの適切なフィードバック

### **セキュリティ要件**
- **APIキー管理**: 環境変数または暗号化設定ファイルで管理
- **Webアクセス制限**: localhost（127.0.0.1）のみ許可
- **レート制限**: 本番環境で15分間に100リクエスト制限（開発環境では無効化）
- **データベース**: SQLite暗号化オプション検討
- **入力検証**: Steam App ID形式チェック、SQLインジェクション対策
- **XSS対策**: HTMLエスケープ処理

### **パフォーマンス要件**
- **処理時間**: 100ゲーム監視で5分以内（目安、固執しない）
- **メモリ使用量**: 512MB以下を目標
- **データベースサイズ**: 1GB上限、古いデータ自動削除
- **Web応答**: 一覧表示3秒以内

### **ログ・監視**
- **ログレベル**: DEBUG, INFO, WARN, ERROR
- **ログファイル**: 日次ローテーション、最大10MB
- **監視メトリクス**: API成功率、平均レスポンス時間、エラー発生回数
- **ヘルスチェック**: 最終更新時刻、API接続状況、DBアクセス状況

---

## 🗃️ データ構造

### **ゲーム情報テーブル**
```sql
games (
  id INTEGER PRIMARY KEY,
  steam_app_id INTEGER UNIQUE,
  name TEXT,
  enabled BOOLEAN DEFAULT true,
  price_threshold REAL,
  alert_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### **価格履歴テーブル**
```sql
price_history (
  id INTEGER PRIMARY KEY,
  steam_app_id INTEGER,
  current_price REAL,
  original_price REAL,
  discount_percent INTEGER,
  historical_low REAL,
  is_on_sale BOOLEAN,
  source TEXT, -- 'itad', 'steam', 'steam_unreleased', 'steam_free', 'steam_removed'
  recorded_at TIMESTAMP
)
```

### **アラート履歴テーブル**
```sql
alerts (
  id INTEGER PRIMARY KEY,
  steam_app_id INTEGER,
  alert_type TEXT, -- 'new_low' or 'sale_start'
  trigger_price REAL,
  previous_low REAL,
  discount_percent INTEGER,
  notified_discord BOOLEAN DEFAULT false,
  created_at TIMESTAMP
)
```

---

## ⚙️ 設定ファイル形式

## ⚙️ 設定ファイル形式

### **.env**
```bash
# 必須API Keys
ITAD_API_KEY=your_itad_api_key_here

# オプションAPI Keys（フェーズ2以降）
IGDB_CLIENT_ID=your_igdb_client_id_here
IGDB_CLIENT_SECRET=your_igdb_client_secret_here
STEAM_API_KEY=your_steam_api_key_here
YOUTUBE_API_KEY=your_youtube_api_key_here
TWITCH_CLIENT_ID=your_twitch_client_id_here
TWITCH_CLIENT_SECRET=your_twitch_client_secret_here

# Webhook URLs
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Server Configuration
WEB_PORT=3000
WEB_HOST=127.0.0.1

# Monitoring Settings
MONITORING_INTERVAL_HOURS=1
NOTIFICATION_COOLDOWN_HOURS=6
DATA_RETENTION_DAYS=365

# API Settings
API_REQUEST_INTERVAL_SECONDS=2
API_TIMEOUT_SECONDS=15
API_CONCURRENT_LIMIT=2

# Logging
LOG_LEVEL=INFO
LOG_MAX_FILE_SIZE_MB=10
LOG_MAX_FILES=7
```

### **config.json**
```json
{
  "monitoring": {
    "enabled": true,
    "auto_add_popular": false
  },
  "preset_games": {
    "enabled": true
  },
  "features": {
    "discord_enabled": false,
    "high_discount_detection": true,
    "epic_games_notification": true
  },
  "ui": {
    "theme": "light",
    "responsive": true,
    "dark_mode_available": true
  }
}
```

### **preset_games.json**
```json
[
  {"app_id": 1091500, "name": "Cyberpunk 2077"},
  {"app_id": 292030, "name": "The Witcher 3: Wild Hunt"},
  {"app_id": 1086940, "name": "Baldur's Gate 3"},
  // ... 50-100タイトル
]
```

---

## 🚀 開発フェーズ

### **フェーズ1: 基本価格監視**
- 基本監視システム（API連携、データベース）
- Webダッシュボード（一覧、追加/削除）
- アラート履歴・グラフ表示
- ヘルスチェック・ログ機能

### **フェーズ2: 機能拡張版**
- **Discord連携**: Webhook通知、リッチEmbed対応
- **出費追跡ダッシュボード**: 月間/年間出費統計、節約額表示
- **高割引ゲーム動的検知**: IsThereAnyDeal API活用、80%以上割引検知
- **レビュー統合表示**: Steam/Metacritic/Reddit評価統合
- **ゲーム情報ダッシュボード**: HowLongToBeat/PCGamingWiki/ProtonDB統合
- **リリース日管理**: ウィッシュリストゲームの発売日追跡
- **Epic Games無料ゲーム通知**: RSS Feed + IsThereAnyDeal API

### **フェーズ3: 総合ゲーム支援**
- **重複ゲーム検知**: 複数ストア間の重複購入防止
- **バンドル管理**: Humble Bundle等の未取得キー管理
- **積みゲー管理**: 未プレイゲーム追跡、プレイ時間分析
- **Amazon Prime Gaming連携**: LootScraper RSS + GraphQL API
- **ウィッシュリスト連携**: Steam API経由（※Steam APIキー必要・準備できない場合は後回し）

### **フェーズ4: 高度分析・通知**
- **トレンド分析**: 急上昇ゲーム、バイラルゲーム検知
- **YouTube・Twitch連携**: 好きなゲームの新動画/配信通知（※APIキー必要・準備できない場合は後回し）
- **アップデート通知**: 所有ゲームの大型アップデート

### **フェーズ5: プラットフォーム拡張**
- **他ストア価格比較拡張**: GOG, Origin, Uplay等
- **地域対応拡張**: US/EU/UK価格対応
- **モバイルアプリ版**

### **⚠️ APIキー依存機能について**
以下の機能はAPIキーが必要なため、準備できない場合は後回し：
- Steam API（ウィッシュリスト連携）
- YouTube API（動画通知）
- Twitch API（配信通知）

---

## 📦 使用技術スタック

### **バックエンド**
- Node.js
- TypeScript
- Express.js
- SQLite3
- node-cron（スケジューラー）

### **フロントエンド**
- HTML/CSS/TypeScript
- Chart.js（グラフ表示）
- Bootstrap（UI）

### **外部API**
- IsThereAnyDeal API
- Steam Store API
- Discord Webhook

---

## 🎯 成功指標
- 正確な価格監視（90%以上の成功率）
- 5分以内のWeb表示応答時間
- セール開始から1時間以内の検知
- 安定した24時間連続稼働

---

## 📋 Claude Code 実装指示

### **重要な実装ポイント**
1. **段階的機能有効化**: APIキーの有無に応じて機能を自動的に有効/無効化
2. **エラーハンドリング**: API障害時の適切なフォールバック
3. **設定値検証**: 仕様書記載の制限値内での動作保証
4. **レスポンシブUI**: モバイル対応、ダークモード対応

### **APIキー管理**
- フェーズ1実装時: ITAD_API_KEY のみ必須
- その他のAPIキーは全てオプション扱い
- 未設定APIキーの機能は警告表示して無効化
- 実装者に必要時のAPIキー取得を促すメッセージ表示

### **フォールバック実装**
- IGDB API失敗時のOpenCritic自動フォールバック
- 非公式API障害時の適切なエラーメッセージ
- Steam Store API制限時の監視間隔自動調整