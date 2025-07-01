# SteamSentinel

**Steam価格監視システム** - セール時の過去最安値更新を検知し、高機能WebアプリケーションとDiscord通知で情報提供するシステム

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18%2B-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.3%2B-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 プロジェクト概要

SteamSentinelは、Steam（Steam）+ Sentinel（見張り番）の名前の通り、ゲーム価格の忠実な見張り役として動作します。監視対象のゲームが過去最安値を更新したり、セールが開始された際に自動的にアラートを発生させます。

**TypeScript完全対応**と**SPA（Single Page Application）**アーキテクチャにより、企業レベルのWebアプリケーションとして設計されています。

### 🌟 主な機能

#### 🎯 **フェーズ1: 基本価格監視（完成）**
- ✅ **価格監視**: 設定したゲームの価格を定期的にチェック  
- ✅ **アラート機能**: 歴代最安値更新またはセール開始時に通知
- ✅ **SPA Webダッシュボード**: TypeScript製のシングルページアプリケーション
- ✅ **価格推移グラフ**: Chart.jsによる美しい価格履歴の可視化
- ✅ **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応
- ✅ **ダークモード**: 目に優しいダークテーマ
- ✅ **リアルタイム更新**: 手動更新と自動監視
- ✅ **プリセットゲーム**: 人気ゲーム100タイトル内蔵
- ✅ **拡張価格閾値**: 価格・割引率・セール開始の3つのアラート条件
- ✅ **ゲーム管理画面**: 監視無効ゲーム含む全ゲーム管理・編集機能
- ✅ **データベースマイグレーション**: 自動バージョン管理とスキーマ更新
- ✅ **包括的バックアップ**: エクスポート/インポート、3つのモード対応

#### 🚀 **フェーズ2: 機能拡張版（部分実装）**
- ✅ **Discord連携**: Webhook通知、リッチEmbed対応
- ✅ **出費追跡ダッシュボード**: 月間/年間出費統計、節約額表示
- ⚠️ **高割引ゲーム動的検知**: 80%以上割引検知（基盤実装済み）
- ⚠️ **レビュー統合表示**: Steam/Metacritic/Reddit評価統合（基盤実装済み）
- ✅ **リリース日管理**: 未リリースゲームの発売日追跡
- ⚠️ **Epic Games無料ゲーム通知**: RSS Feed対応（基盤実装済み）

#### 🔧 **技術的特徴**
- ✅ **TypeScript完全対応**: フロントエンド・バックエンド共に型安全
- ✅ **SPAアーキテクチャ**: クライアントサイドルーティング、統一ナビゲーション
- ✅ **企業レベルセキュリティ**: CSP、Helmet.js、レート制限
- ✅ **リアルタイム監視進捗**: 進捗バー、残り時間表示、失敗件数カウント
- ✅ **詳細エラー報告**: 失敗理由詳細分析、カテゴリ別分類、統計表示

## 🚀 セットアップ手順

### 1. 必要な環境

- **Node.js**: 18.0.0以上
- **npm**: Node.jsに同梱
- **OS**: Windows, macOS, Linux

### 2. プロジェクトのクローン

```bash
git clone https://github.com/your-username/steam-sentinel.git
cd steam-sentinel
```

### 3. 依存関係のインストール

```bash
npm install
```

### 4. 環境変数の設定

```bash
# .env.exampleをコピーして.envファイルを作成
cp .env.example .env

# .envファイルを編集してAPIキーを設定
nano .env
```

#### 必須設定

```bash
# IsThereAnyDeal API (必須)
ITAD_API_KEY=your_itad_api_key_here
```

#### オプション設定

```bash
# Discord通知 (オプション)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# サーバー設定
WEB_PORT=3000
WEB_HOST=127.0.0.1

# 監視設定
MONITORING_INTERVAL_HOURS=1
```

### 5. データベースの初期化

```bash
npm run db:init
```

### 6. プリセットゲームの投入

```bash
npm run seed:games
```

### 7. アプリケーションの起動

```bash
# 開発モード
npm run dev

# 本番モード
npm run build
npm start
```

### 8. Webダッシュボードにアクセス

ブラウザで http://localhost:3000 にアクセス

## 🔑 APIキーの取得

### IsThereAnyDeal API (必須)

1. https://isthereanydeal.com/dev/app/ にアクセス
2. メールアドレスとアプリ名を入力して登録
3. 発行されたAPIキーを`.env`ファイルに設定

```bash
ITAD_API_KEY=your_generated_key_here
```

### Discord Webhook (オプション)

1. Discordサーバーの設定 → 連携サービス → ウェブフック
2. 新しいウェブフックを作成
3. WebhookのURLを`.env`ファイルに設定

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdef...
```

## 📱 使用方法

### 基本操作

1. **ゲーム追加**: ダッシュボードの「ゲーム追加」ボタンをクリック
2. **価格確認**: ゲーム一覧で現在価格・セール情報・歴代最安値を確認
3. **グラフ表示**: ゲーム名をクリックして価格推移グラフを表示
4. **手動更新**: 「手動更新」ボタンで即座に価格をチェック

### キーボードショートカット

- `Ctrl+R` / `Cmd+R`: 手動更新
- `Ctrl+A` / `Cmd+A`: ゲーム追加モーダルを開く
- `Ctrl+D` / `Cmd+D`: ダークモード切り替え
- `ESC`: モーダルを閉じる

### ゲーム追加方法

1. SteamストアページのURLからApp IDを取得
   - 例: `https://store.steampowered.com/app/730/` → App ID: `730`
2. ダッシュボードで「ゲーム追加」をクリック
3. App IDとゲーム名を入力
4. 必要に応じて価格閾値を設定
5. 「追加」ボタンをクリック

## ⚙️ 設定項目

### 監視間隔

```bash
# 環境変数で設定（時間単位）
MONITORING_INTERVAL_HOURS=1  # 1時間ごと（デフォルト）
```

### 通知クールダウン

```bash
# 同じアラートの連続送信を防ぐ（時間単位）
NOTIFICATION_COOLDOWN_HOURS=6  # 6時間（デフォルト）
```

### データ保持期間

```bash
# 価格履歴の保持期間（日数）
DATA_RETENTION_DAYS=365  # 1年間（デフォルト）
```

## 🛠️ 開発・カスタマイズ

### プロジェクト構造

```
steam-sentinel/
├── src/
│   ├── api/           # 外部API統合
│   ├── config/        # 設定管理
│   ├── controllers/   # API コントローラー
│   ├── db/           # データベース管理
│   ├── middleware/   # Express ミドルウェア
│   ├── models/       # データモデル
│   ├── routes/       # APIルート
│   ├── services/     # ビジネスロジック
│   ├── types/        # TypeScript型定義
│   └── utils/        # ユーティリティ
├── public/           # 静的ファイル
│   ├── css/         # スタイルシート
│   ├── js/          # JavaScript
│   └── index.html   # メインHTML
├── scripts/         # セットアップスクリプト
├── data/           # データベースファイル
└── logs/           # ログファイル
```

### 使用技術

#### バックエンド（TypeScript 100%対応）
- **Node.js**: JavaScript ランタイム
- **TypeScript**: 型安全性（27ファイル完全対応）
- **Express.js**: Webフレームワーク
- **better-sqlite3**: 高速データベース
- **node-cron**: スケジューラー
- **Winston**: ログ管理
- **Helmet.js**: セキュリティ強化

#### フロントエンド
- **TypeScript SPA**: 360行のクライアントサイドルーター実装
- **統一ナビゲーション**: 250行の動的ナビゲーション実装
- **Chart.js**: 価格推移グラフ描画
- **History API**: ブラウザ履歴管理

#### 外部API
- **IsThereAnyDeal API**: 価格情報取得（v2対応）
- **Steam Store API**: Steam価格情報
- **Discord Webhook**: リッチEmbed通知送信
- **Steam CDN**: ゲームバナー画像取得

### 開発用コマンド

```bash
# 開発サーバー起動
npm run dev

# TypeScriptコンパイル
npm run build

# リンティング
npm run lint

# 型チェック
npm run typecheck

# データベース初期化
npm run db:init

# プリセットゲーム投入
npm run seed:games
```

## 🔒 セキュリティ

- **レート制限**: API呼び出し頻度を制限（開発環境では無効化）
- **入力検証**: SQLインジェクション・XSS対策
- **CSP (Content Security Policy)**: 適切なセキュリティヘッダー設定
- **Helmet.js**: 包括的なセキュリティ保護
- **TypeScript型安全性**: コンパイル時型チェックによるバグ防止

## 📊 技術仕様

### パフォーマンス

- **対象ゲーム数**: 100ゲーム推奨（上限なし）
- **監視間隔**: 10分〜24時間（設定可能）
- **メモリ使用量**: 約256MB（100ゲーム監視時）
- **API制限**: ITAD 2秒間隔、Steam 3秒間隔
- **監視進捗**: リアルタイム進捗表示、残り時間推定

### データベース

- **better-sqlite3**: 高速ファイルベースDB（移植性重視）
- **価格履歴**: 最大1年間保持
- **マイグレーション**: 自動バージョン管理とスキーマ更新
- **包括的バックアップ**: エクスポート/インポート、3つのモード対応
- **自動クリーンアップ**: 古いデータの定期削除

## 🐛 トラブルシューティング

### よくある問題

#### APIキーエラー
```
ITAD_API_KEY is not configured
```
→ `.env`ファイルにITAD APIキーが設定されているか確認

#### ポート使用エラー
```
Port 3000 is already in use
```
→ `.env`ファイルで`WEB_PORT`を変更するか、他のアプリケーションを停止

#### データベースエラー
```
Database integrity check failed
```
→ `npm run db:init`でデータベースを再初期化

### ログ確認

```bash
# ログファイルの確認
tail -f logs/steam-sentinel-$(date +%Y-%m-%d).log

# エラーログの確認
tail -f logs/error-$(date +%Y-%m-%d).log
```

### サポート

問題が解決しない場合は、以下の情報を含めてIssueを作成してください：

- OS情報
- Node.jsバージョン
- エラーメッセージ
- ログファイル（機密情報は除く）

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🤝 貢献

プルリクエストやIssueの報告を歓迎します。大きな変更を行う前に、まずIssueで議論することをお勧めします。

### 開発への参加手順

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 🙏 謝辞

- [IsThereAnyDeal](https://isthereanydeal.com/) - 価格データAPI提供
- [Steam](https://store.steampowered.com/) - ゲーム情報
- [Chart.js](https://www.chartjs.org/) - グラフライブラリ

---

**SteamSentinel** - あなたのゲーム購入をよりスマートに 🎮