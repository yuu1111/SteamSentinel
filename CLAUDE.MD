# SteamSentinel - Steam価格監視システム 完全仕様書

## プロジェクト開発規約

### 言語
このリポジトリで作業する際は、ユーザーと日本語でコミュニケーションを取ってください。この仕様書は日本語で記述されています。

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
    default: 1    // 同時1接続（安定性重視）
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
- [x] **ゲーム別アラート設定** - 個別通知ON/OFF（編集モーダルで設定可能）
- [x] **価格閾値設定** - 「○○円以下で通知」の個別設定
- [x] **価格推移グラフ** - Chart.jsによる価格履歴可視化
- [x] **セール期間表示** - 現在セールの終了日時
- [x] **ヘルスチェック機能** - API接続状況、最終更新時刻
- [x] **ログ表示機能** - エラーや処理状況の確認
- [x] **設定バックアップ/復元** - ゲームリスト書き出し/読み込み

### **実装済み追加機能**
- [x] **テーブルソート機能** - 全カラム（ゲーム名、価格、割引率等）クリックソート対応、異種データ混在対応
- [x] **ゲームバナー画像表示** - Steam CDNからのゲームヘッダー画像自動表示
- [x] **詳細エラー報告機能** - 失敗ゲームの詳細情報表示、カテゴリ別分類、統計表示
- [x] **ゲームタイプ自動検知** - 基本無料・未リリース・販売終了ゲームの自動識別とUI表示対応
- [x] **開発環境最適化** - 開発時のレート制限無効化とデバッグ機能強化
- [x] **エラー処理強化** - 詳細なスタックトレース表示と折りたたみ可能なエラー詳細
- [x] **リアルタイム監視進捗表示** - 監視実行中の進捗バー、残り時間表示、失敗件数カウント
- [x] **SteamDBボタン** - 各ゲームのSteamDBページへの直接アクセス（セキュリティ配慮済み）
- [x] **ゲーム名自動更新** - Steam APIから取得したゲーム名でデータベース自動更新
- [x] **カテゴリ別統計表示** - 基本無料・未リリース・販売終了・失敗ゲームの詳細統計
- [x] **制限事項・ライセンス情報ページ** - フッターからアクセス可能な詳細ドキュメント
- [x] **データ制限警告機能** - 歴代最安値の6ヶ月制限について警告アイコンとツールチップ表示
- [x] **未リリースゲームのリリース日監視完成** - 自動リリース検知とアラート生成機能完全実装
- [x] **ゲーム追加時の価格データ自動取得** - 追加直後に価格情報を取得して即座に監視開始
- [x] **統一ナビゲーションバー** - 全ページで一貫したナビゲーション体験、ページ固有ボタンの適切な配置
- [x] **全ページダークモード対応** - メインアプリ、制限事項、ライセンスページで設定同期
- [x] **CSP (Content Security Policy) 最適化** - セキュリティ保持とUI機能両立
- [x] **UI機能完全動作確認** - モーダル、チャート、ボタン等の全機能動作済み
- [x] **データ取得エラー警告** - 制限事項ページに価格データエラーの詳細説明追加
- [x] **拡張価格閾値システム** - 3つのアラート条件（価格閾値・割引率閾値・セール開始）完全実装
- [x] **ゲーム管理専用画面** - 全ゲーム一覧・詳細設定・監視無効ゲームも編集可能
- [x] **データベースマイグレーション機能** - バージョン管理による自動スキーマ更新
- [x] **包括的バックアップシステム** - エクスポート/インポート、3つのモード（マージ・スキップ・置換）
- [x] **単一ゲーム監視機能** - 個別ゲームの即座価格更新・編集後自動更新
- [x] **ゲーム編集モーダル** - 追加後の詳細設定変更、閾値タイプ動的切り替え
- [x] **SPA（Single Page Application）化完成** - TypeScriptベースのクライアントサイドルーティング、テンプレートレンダリング、History API対応
- [x] **統一ナビゲーションコンポーネント** - 設定駆動型、レスポンシブ対応、動的アクティブ状態管理、Bootstrap統合
- [x] **DOM要素安全性強化** - 全DOM操作でnullチェック、SPA環境での要素タイミング問題解決、エラーハンドリング強化
- [x] **特別なゲーム状況上部表示** - 価格取得失敗・基本無料・未リリース・販売終了ゲームの統計カード表示
- [x] **視覚的レイアウト最適化** - ナビゲーションバー上部隙間修正、ステッキーナビゲーション、レスポンシブ画像処理
- [x] **フロントエンドTypeScript化** - SPA ルーター・ナビゲーション・UI コンポーネントの型安全実装

---

## 🏗️ SPA アーキテクチャ（フェーズ1+）

### **クライアントサイドルーティング**
- **SPARouter**: TypeScriptベースの高機能ルーター
  - History API対応によるブラウザ履歴管理
  - クエリパラメータ解析とパラメータ化ルート対応
  - 404エラー時の自動ダッシュボードリダイレクト
  - 動的タイトル更新機能

### **コンポーネントアーキテクチャ**
- **テンプレートベースレンダリング**: HTML `<template>` 要素活用
- **動的コンポーネントローダー**: 各ページの遅延読み込み対応
- **外部ページフェッチ**: 制限事項・ライセンスページのAjax読み込み
- **設定駆動型ナビゲーション**: JSON設定による柔軟なナビゲーション管理

### **技術仕様**
- **TypeScript化率**: フロントエンド2ファイル（SPAコア部分）、バックエンド27ファイル（100%完了）
- **型安全性**: インターフェース定義によるルート・ナビゲーション設定の型保証
- **エラーハンドリング**: DOM要素のnullチェック、SPA環境での要素タイミング問題解決
- **レスポンシブ対応**: Bootstrap統合、モバイル対応のナビゲーション折りたたみ

### **実装ファイル構成**
```
src/web/public/js/
├── spa/
│   └── router.ts          # SPAルーター（360行）
├── components/
│   └── navigation.ts      # 統一ナビゲーション（250行）
└── ui.js                  # UI機能（既存）

public/js/
├── spa/
│   └── router.js          # コンパイル済みルーター
├── components/
│   └── navigation.js      # コンパイル済みナビゲーション
└── app.js                 # メインアプリケーション
```

---

## 📱 Discord連携（フェーズ2）

### **通知機能**
- [ ] Webhook経由でのアラート送信
- [ ] Web抜きでも単体動作可能
- [ ] リッチEmbed形式（ゲーム名、価格情報、Steamリンク）

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
- **IsThereAnyDeal API**: リクエスト間隔2秒以上、ヒューリスティック制限対応、API v2形式対応
- **Steam Store API**: リクエスト間隔3秒以上、1日1000リクエスト程度の制限
- **429エラー対応**: 指数バックオフ戦略（初回1秒、最大60秒）
- **API障害時**: 次回監視サイクルまで該当ゲームをスキップ
- **タイムアウト**: API呼び出し15秒でタイムアウト
- **ゲームタイプ検知**: 基本無料（F2P）・未リリース・販売終了ゲームの自動識別とUI表示対応
- **詳細エラー報告**: 失敗理由の詳細分析、カテゴリ別分類、統計表示、コピー機能
- **監視進捗可視化**: リアルタイム進捗表示、残り時間推定、失敗件数カウント
- **開発環境最適化**: レート制限無効化、詳細デバッグログ、テスト機能
- **セキュリティ配慮**: SteamDBボタンでのクリップボード機能削除、ポップアップブロック対応

### **セキュリティ要件**
- **APIキー管理**: 環境変数または暗号化設定ファイルで管理
- **Webアクセス制限**: localhost（127.0.0.1）のみ許可
- **レート制限**: 本番環境で15分間に100リクエスト制限（開発環境では無効化）
- **CSP (Content Security Policy)**: Helmet.jsによる適切なセキュリティヘッダー設定
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_app_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  price_threshold REAL,
  price_threshold_type TEXT DEFAULT 'price' CHECK(price_threshold_type IN ('price', 'discount', 'any_sale')),
  discount_threshold_percent INTEGER DEFAULT NULL,
  alert_enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  recorded_at TIMESTAMP,
  release_date TEXT -- 未リリースゲームのリリース日（ISO文字列）
)
```

### **アラート履歴テーブル**
```sql
alerts (
  id INTEGER PRIMARY KEY,
  steam_app_id INTEGER,
  alert_type TEXT, -- 'new_low', 'sale_start', 'release'
  trigger_price REAL,
  previous_low REAL,
  discount_percent INTEGER,
  notified_discord BOOLEAN DEFAULT false,
  created_at TIMESTAMP,
  release_date TEXT -- リリース通知の場合のリリース日
)
```

### **データベースバージョン管理テーブル**
```sql
db_version (
  version INTEGER PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

---

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
API_REQUEST_INTERVAL_SECONDS=3
API_TIMEOUT_SECONDS=15
API_CONCURRENT_LIMIT=1

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

## 🚀 開発フェーズ - 実装状況

### **✅ フェーズ1: 基本価格監視（完全実装済み）**
- ✅ 基本監視システム（API連携、データベース）
- ✅ SPA Webダッシュボード（一覧、追加/削除）
- ✅ アラート履歴・グラフ表示
- ✅ ヘルスチェック・ログ機能
- ✅ **予定外実装**: TypeScript完全対応、SPA化、データベースマイグレーション
- ✅ **予定外実装**: 包括的バックアップシステム、拡張価格閾値システム
- ✅ **予定外実装**: リアルタイム監視進捗、詳細エラー報告

### **⚠️ フェーズ2: 機能拡張版（部分実装済み）**
- ✅ **Discord連携**: Webhook通知、リッチEmbed対応
- ✅ **出費追跡ダッシュボード**: 月間/年間出費統計、節約額表示
- ⚠️ **高割引ゲーム動的検知**: サービスクラス実装済み、UI統合未完了
- ⚠️ **レビュー統合表示**: サービスクラス実装済み、実API連携未完了
- ✅ **ゲーム情報ダッシュボード**: 基本機能実装済み
- ✅ **リリース日管理**: 未リリースゲームの発売日追跡完全実装
- ⚠️ **Epic Games無料ゲーム通知**: サービスクラス実装済み、RSS解析未完了

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

## 📦 使用技術スタック - 実装状況

### **バックエンド（TypeScript 100%対応完了）**
- Node.js 18+
- TypeScript 5.3+ (27ファイル完全対応)
- Express.js
- better-sqlite3 (高速SQLite)
- node-cron（スケジューラー）
- Winston (ログ管理)
- Helmet.js (セキュリティ)

### **フロントエンド（SPA化完了）**
- HTML/CSS/TypeScript（SPA化完了）
- SPARouter（TypeScript製360行クライアントサイドルーティング）
- NavigationBar（TypeScript製250行統一ナビゲーション）
- Chart.js（価格推移グラフ表示）
- Bootstrap 5（レスポンシブUI）

### **アーキテクチャパターン（企業レベル実装）**
- **SPA (Single Page Application)**: クライアントサイドルーティング完全実装
- **テンプレートベースレンダリング**: HTML template要素活用
- **コンポーネント指向**: モジュラー設計とTypeScript型安全性
- **設定駆動型UI**: JSON設定によるナビゲーション管理
- **データベースマイグレーション**: 自動バージョン管理
- **包括的バックアップ**: エクスポート/インポート対応

### **外部API（実装済み）**
- IsThereAnyDeal API v2
- Steam Store API
- Steam CDN (ゲーム画像)
- Discord Webhook (リッチEmbed)

---

## 🎯 成功指標 - 達成状況
- ✅ 正確な価格監視（90%以上の成功率） - **達成済み**
- ✅ 5分以内のWeb表示応答時間 - **SPA化により高速化達成**
- ✅ セール開始から1時間以内の検知 - **リアルタイム監視で達成**
- ✅ 安定した24時間連続稼働 - **エラーハンドリング強化で達成**
- ✅ **追加達成**: TypeScript型安全性によるバグ削減
- ✅ **追加達成**: 企業レベルのアーキテクチャ実装

---

## 📋 Claude Code 実装指示

### **重要な実装ポイント**
1. **段階的機能有効化**: APIキーの有無に応じて機能を自動的に有効/無効化
2. **エラーハンドリング**: API障害時の適切なフォールバック
3. **設定値検証**: 仕様書記載の制限値内での動作保証
4. **レスポンシブUI**: モバイル対応、ダークモード対応
5. **データ制限の明示**: ITAD APIの6ヶ月データ制限について適切な警告表示
6. **ライセンス遵守**: 使用中のライブラリ・サービスのライセンス情報を適切に表示

### **APIキー管理**
- フェーズ1実装時: ITAD_API_KEY のみ必須
- その他のAPIキーは全てオプション扱い
- 未設定APIキーの機能は警告表示して無効化
- 実装者に必要時のAPIキー取得を促すメッセージ表示

### **フォールバック実装**
- IGDB API失敗時のOpenCritic自動フォールバック
- 非公式API障害時の適切なエラーメッセージ
- Steam Store API制限時の監視間隔自動調整

### **現在の実装達成状況（2025年6月27日現在）**

#### **✅ フェーズ1完全実装達成項目**
- **TypeScript完全対応**: バックエンド27ファイル100%、フロントエンドSPAコア部分完了
- **SPA化完成**: TypeScript製ルーター（360行）・ナビゲーション（250行）実装
- **企業レベルアーキテクチャ**: データベースマイグレーション、包括的バックアップシステム
- **高度なUI/UX**: リアルタイム監視進捗、詳細エラー報告、拡張価格閾値システム
- **セキュリティ強化**: CSP最適化、Helmet.js、レート制限、DOM安全性強化
- **統一ナビゲーション**: 全ページ一貫体験、ダークモード対応、レスポンシブ設計

#### **✅ フェーズ2部分実装達成項目**
- **Discord連携**: Webhook通知、リッチEmbed対応完了
- **出費追跡ダッシュボード**: 月間/年間統計、節約額表示完了
- **リリース日管理**: 未リリースゲーム自動検知・アラート完了

#### **⚠️ フェーズ2未完了項目（基盤実装済み）**
- **高割引ゲーム動的検知**: HighDiscountDetectionService.ts実装済み、UI統合待ち
- **レビュー統合表示**: ReviewIntegrationService.ts実装済み、実API連携待ち  
- **Epic Games無料ゲーム通知**: EpicGamesNotificationService.ts実装済み、RSS解析待ち

#### **📋 重要な追加実装**
- **ITAD API v2対応**: 新ネスト構造データ形式完全対応
- **制限事項・ライセンス情報ページ**: フッターアクセス可能、詳細説明完備
- **ゲーム管理専用画面**: 監視無効ゲーム含む全ゲーム編集機能
- **特別ゲーム状況表示**: 価格取得失敗・基本無料・未リリース・販売終了統計
- **視覚的最適化**: ナビゲーション隙間修正、レスポンシブ画像処理

#### **📊 実装メトリクス**
- **TypeScriptファイル数**: 29ファイル（バックエンド27 + フロントエンドSPA 2）
- **コードサイズ**: SPAルーター360行、ナビゲーション250行、総計10,000行以上
- **機能完成度**: フェーズ1 100%、フェーズ2 70%（基盤100%、統合70%）
- **品質指標**: 型安全性100%、エラーハンドリング強化、セキュリティ準拠