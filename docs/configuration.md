# 設定ガイド

## 環境変数設定

### 必須設定

`.env`ファイルをプロジェクトルートに作成し、以下を設定してください：

```bash
# IsThereAnyDeal API (必須)
ITAD_API_KEY=your_api_key_here
```

### オプション設定

```bash
# Discord通知 (推奨)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# サーバー設定
WEB_PORT=3000                    # Webサーバーポート (デフォルト: 3000)
WEB_HOST=127.0.0.1              # バインドアドレス (デフォルト: 127.0.0.1)

# 監視設定
MONITORING_INTERVAL_HOURS=1      # 監視間隔 (デフォルト: 1時間)
NOTIFICATION_COOLDOWN_HOURS=6    # 通知クールダウン (デフォルト: 6時間)
DATA_RETENTION_DAYS=365         # データ保持期間 (デフォルト: 365日)

# API設定
API_REQUEST_INTERVAL_SECONDS=3   # APIリクエスト間隔 (デフォルト: 3秒)
API_TIMEOUT_SECONDS=15          # APIタイムアウト (デフォルト: 15秒)
API_CONCURRENT_LIMIT=2          # 並列リクエスト数 (デフォルト: 2)

# ログ設定
LOG_LEVEL=INFO                  # ログレベル (DEBUG/INFO/WARN/ERROR)
LOG_MAX_FILE_SIZE_MB=10         # ログファイル最大サイズ (デフォルト: 10MB)
LOG_MAX_FILES=7                 # ログファイル保持数 (デフォルト: 7)

# データベース
DATABASE_PATH=./data/steam_sentinel.db  # データベースファイルパス
```

## APIキー取得方法

### IsThereAnyDeal API (必須)

1. [IsThereAnyDeal Developer Portal](https://isthereanydeal.com/dev/app/) にアクセス
2. 「Create Application」をクリック
3. アプリケーション情報を入力:
   - **Name**: SteamSentinel (または任意の名前)
   - **Description**: Steam price monitoring tool
   - **Website**: 空白でOK
4. 「Create」をクリックしてAPIキーを取得
5. `.env`ファイルに追加:
```bash
ITAD_API_KEY=your_generated_api_key
```

**制限**: 緩いレート制限あり (通常使用で問題なし)

### Discord Webhook (推奨)

1. Discordで通知を受け取りたいサーバーを選択
2. チャンネル設定 → 連携サービス → ウェブフック → 新しいウェブフック
3. ウェブフック名を設定 (例: SteamSentinel)
4. ウェブフックURLをコピー
5. `.env`ファイルに追加:
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdef...
```

## ITAD設定カスタマイズ

WebUI設定ページまたはAPIで高割引検知の条件を調整できます：

### WebUI設定

1. ブラウザで `http://localhost:3000` にアクセス
2. 「設定」ページを開く
3. 「ITAD設定」セクションで以下を調整:

| 設定項目 | デフォルト値 | 説明 |
|---------|-------------|------|
| 最小割引率 | 20% | この割引率以上のゲームを検知 |
| 最大価格 | 5000円 | この価格以下のゲームを対象 |
| 取得件数制限 | 50 | 一度に取得するゲーム数 |
| 地域設定 | JP | 価格情報の地域 |
| 高割引検知 | 有効 | 高割引ゲーム検知のON/OFF |
| Discord通知 | 有効 | Discord通知のON/OFF |

### API設定

```bash
# 設定一覧取得
curl http://localhost:3000/api/itad-settings

# 設定更新例
curl -X PUT http://localhost:3000/api/itad-settings/min_discount \
  -H "Content-Type: application/json" \
  -d '{"value": "25"}'

# 設定リセット
curl -X POST http://localhost:3000/api/itad-settings/reset
```

## 予算設定

### デフォルト予算

初回起動時に月次予算10,000円が自動作成されます。

### カスタム予算作成

#### WebUI
1. 「拡張ダッシュボード」→「出費分析」タブ
2. 「予算管理」セクション → 「新規予算」
3. 設定項目:
   - **名前**: 予算の名前 (例: "年間ゲーム予算")
   - **期間**: monthly/yearly/custom
   - **金額**: 予算金額 (円)
   - **開始日/終了日**: カスタム期間の場合

#### API
```bash
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "年間ゲーム予算",
    "period_type": "yearly",
    "budget_amount": 120000,
    "start_date": "2025-01-01",
    "end_date": "2025-12-31"
  }'
```

## 監視設定最適化

### 監視間隔調整

```bash
# 高頻度監視 (30分間隔)
MONITORING_INTERVAL_HOURS=0.5

# 標準監視 (1時間間隔) - 推奨
MONITORING_INTERVAL_HOURS=1

# 低頻度監視 (6時間間隔)
MONITORING_INTERVAL_HOURS=6
```

### 通知クールダウン

同じゲームの重複通知を防ぐ設定：

```bash
# 短いクールダウン (1時間)
NOTIFICATION_COOLDOWN_HOURS=1

# 標準クールダウン (6時間) - 推奨  
NOTIFICATION_COOLDOWN_HOURS=6

# 長いクールダウン (24時間)
NOTIFICATION_COOLDOWN_HOURS=24
```

## パフォーマンス調整

### APIリクエスト制限

```bash
# 保守的設定 (安定性重視)
API_REQUEST_INTERVAL_SECONDS=5
API_CONCURRENT_LIMIT=1
API_TIMEOUT_SECONDS=30

# 標準設定 (バランス) - 推奨
API_REQUEST_INTERVAL_SECONDS=3
API_CONCURRENT_LIMIT=2
API_TIMEOUT_SECONDS=15

# 積極的設定 (速度重視)
API_REQUEST_INTERVAL_SECONDS=1
API_CONCURRENT_LIMIT=3
API_TIMEOUT_SECONDS=10
```

### データ保持期間

```bash
# 短期保持 (30日)
DATA_RETENTION_DAYS=30

# 標準保持 (1年) - 推奨
DATA_RETENTION_DAYS=365

# 長期保持 (3年)
DATA_RETENTION_DAYS=1095
```

## ログ設定

### ログレベル

```bash
# デバッグ情報含む (開発用)
LOG_LEVEL=DEBUG

# 一般情報のみ (本番推奨)
LOG_LEVEL=INFO

# 警告以上のみ
LOG_LEVEL=WARN

# エラーのみ
LOG_LEVEL=ERROR
```

### ログファイル管理

```bash
# ログファイルサイズ制限
LOG_MAX_FILE_SIZE_MB=5          # 5MB制限
LOG_MAX_FILE_SIZE_MB=20         # 20MB制限

# ログファイル保持数
LOG_MAX_FILES=3                 # 3ファイルまで保持
LOG_MAX_FILES=14                # 2週間分保持
```

## セキュリティ設定

### ネットワーク制限

```bash
# ローカルホストのみ (安全)
WEB_HOST=127.0.0.1

# 全インターフェース (LAN公開)
WEB_HOST=0.0.0.0
```

### ポート変更

```bash
# 別ポート使用
WEB_PORT=8080
WEB_PORT=3001
```

## トラブルシューティング設定

### WSL環境

```bash
# WSL環境でのパス問題回避
DATABASE_PATH=/mnt/c/path/to/project/data/steam_sentinel.db
```

### メモリ制限環境

```bash
# 制限的設定
API_CONCURRENT_LIMIT=1
LOG_MAX_FILE_SIZE_MB=5
LOG_MAX_FILES=3
DATA_RETENTION_DAYS=30
```

## 設定例

### 家庭用設定 (推奨)
```bash
ITAD_API_KEY=your_api_key
DISCORD_WEBHOOK_URL=your_webhook_url
WEB_PORT=3000
MONITORING_INTERVAL_HOURS=1
NOTIFICATION_COOLDOWN_HOURS=6
LOG_LEVEL=INFO
```

### 開発用設定
```bash
ITAD_API_KEY=your_api_key
WEB_PORT=3001
MONITORING_INTERVAL_HOURS=0.5
LOG_LEVEL=DEBUG
API_REQUEST_INTERVAL_SECONDS=1
```

### 軽量設定 (低スペック環境)
```bash
ITAD_API_KEY=your_api_key
MONITORING_INTERVAL_HOURS=6
API_CONCURRENT_LIMIT=1
DATA_RETENTION_DAYS=30
LOG_MAX_FILE_SIZE_MB=2
LOG_MAX_FILES=3
```

設定変更後は `npm start` でアプリケーションを再起動してください。