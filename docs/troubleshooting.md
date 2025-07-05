# トラブルシューティング

## よくある問題と解決方法

### 🚫 起動・接続エラー

#### Q: アプリケーションが起動しない
**症状**: `npm start` 実行時にエラーが発生

**解決方法**:
1. 依存関係の再インストール:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. TypeScriptのビルド:
```bash
npm run build
```

3. 環境変数の確認:
```bash
# .envファイルが存在し、ITAD_API_KEYが設定されているか確認
cat .env
```

#### Q: ポート3000が使用中エラー
**症状**: `Error: listen EADDRINUSE :::3000`

**解決方法**:
```bash
# 使用中のプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>

# または別のポートを使用
WEB_PORT=3000 npm start
```

### 💾 データベースエラー

#### Q: データベースが作成されない
**症状**: `steam_sentinel.db`ファイルが作成されない

**解決方法**:
1. データディレクトリの確認:
```bash
mkdir -p data
ls -la data/
```

2. 権限の確認:
```bash
chmod 755 data/
```

3. WSL環境の場合、パスの確認:
```bash
pwd
# /mnt/c/...の場合は権限問題の可能性
```

#### Q: データベースロックエラー
**症状**: `database is locked` エラー

**解決方法**:
1. アプリケーションの完全停止:
```bash
pkill -f "node.*steam"
```

2. WALファイルの削除:
```bash
rm -f data/steam_sentinel.db-wal
rm -f data/steam_sentinel.db-shm
```

3. 再起動:
```bash
npm start
```

### 🔑 API・認証エラー

#### Q: ITAD APIキーエラー
**症状**: `Invalid API key` または価格データが取得できない

**解決方法**:
1. APIキーの確認:
```bash
grep ITAD_API_KEY .env
```

2. APIキーの再発行:
   - [IsThereAnyDeal Developer](https://isthereanydeal.com/dev/app/) にアクセス
   - 新しいAPIキーを生成
   - `.env`ファイルを更新

3. APIクォータの確認:
   - APIの使用制限に達していないか確認

#### Q: Discord通知が送信されない
**症状**: アラートが発生してもDiscord通知が来ない

**解決方法**:
1. Webhook URLの確認:
```bash
grep DISCORD_WEBHOOK_URL .env
```

2. 通知テスト:
```bash
curl -X POST http://localhost:3000/api/system/test-discord
```

3. Discord設定の確認:
   - WebhookがアクティブかDiscordで確認
   - チャンネル権限の確認

### 🎮 ゲーム・監視エラー

#### Q: ゲームが見つからない
**症状**: Steam App IDでゲームを検索しても見つからない

**解決方法**:
1. App IDの確認:
   - Steam Store URLから正確なApp IDを取得
   - 例: `https://store.steampowered.com/app/1091500/` → App ID: 1091500

2. 手動でのゲーム追加:
```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{"steam_app_id": 1091500, "name": "Cyberpunk 2077"}'
```

#### Q: 価格が更新されない
**症状**: 監視開始後も価格データが古いまま

**解決方法**:
1. 監視状態の確認:
```bash
curl http://localhost:3000/api/monitoring/status
```

2. 手動での価格チェック:
```bash
curl -X POST http://localhost:3000/api/monitoring/start
```

3. ログの確認:
```bash
tail -f logs/steam-sentinel-$(date +%Y-%m-%d).log
```

### 📊 WebUI・表示エラー

#### Q: WebUIが表示されない
**症状**: ブラウザで `http://localhost:3000` にアクセスしても何も表示されない

**解決方法**:
1. ブラウザキャッシュのクリア:
   - `Ctrl+Shift+R` (強制リロード)
   - ブラウザのキャッシュクリア

2. ブラウザコンソールの確認:
   - `F12` → Console タブでエラーメッセージを確認

3. 静的ファイルの確認:
```bash
ls -la src/web/
npm run build
```

#### Q: ダッシュボードデータの読み込みエラー
**症状**: 「ダッシュボードデータの読み込みに失敗しました」

**解決方法**:
1. APIレスポンスの確認:
```bash
curl http://localhost:3000/api/games
curl http://localhost:3000/api/system/status
```

2. ネットワークタブの確認:
   - ブラウザの開発者ツール → Network でAPI呼び出しを確認

### 💰 予算・支出エラー

#### Q: 予算データが表示されない
**症状**: 予算管理ページでデータが表示されない

**解決方法**:
1. 予算の存在確認:
```bash
curl http://localhost:3000/api/budgets
```

2. デフォルト予算の作成:
```bash
curl -X POST http://localhost:3000/api/budgets \
  -H "Content-Type: application/json" \
  -d '{"name":"月次予算","period_type":"monthly","budget_amount":10000}'
```

## ログファイルの確認

### ログ場所
```
logs/
├── steam-sentinel-YYYY-MM-DD.log  # 一般ログ（英語）
├── error-YYYY-MM-DD.log           # エラーログ（英語）
├── exceptions.log                 # 例外ログ
└── rejections.log                 # Promise拒否ログ
```

**注意**: ログシステムは日本語から英語に変更されました。よりプロフェッショナルなログ出力で問題の特定が簡単になります。

### ログレベル
```bash
# 詳細ログの有効化
LOG_LEVEL=DEBUG npm start

# 標準ログ（推奨）
LOG_LEVEL=INFO npm start

# エラーのみ
LOG_LEVEL=ERROR npm start
```

## パフォーマンス問題

### メモリ使用量が多い
**解決方法**:
1. 古いデータのクリーンアップ:
```bash
curl -X POST http://localhost:3000/api/system/cleanup
```

2. データベースの最適化:
```bash
sqlite3 data/steam_sentinel.db "VACUUM;"
```

### レスポンスが遅い
**解決方法**:
1. データベースサイズの確認:
```bash
ls -lh data/steam_sentinel.db
```

2. 監視間隔の調整:
```bash
# .envファイルで調整
MONITORING_INTERVAL_HOURS=2
```

## データベースメンテナンス

### バックアップ作成
```bash
# データベースのバックアップ
mkdir -p data/backup
cp data/steam_sentinel.db data/backup/steam_sentinel_$(date +%Y%m%d_%H%M%S).db
```

### データベースリセット
```bash
# 注意: 全データが削除されます
rm data/steam_sentinel.db
npm start  # 新しいデータベースが作成される
```

### 破損データベースの修復
```bash
# 整合性チェック
sqlite3 data/steam_sentinel.db "PRAGMA integrity_check;"

# 修復
sqlite3 data/steam_sentinel.db "PRAGMA foreign_key_check;"
```

## サポート

### バグ報告
問題が解決しない場合は以下の情報と共にGitHubのIssuesで報告してください：

1. **環境情報**:
   - OS (Windows/macOS/Linux)
   - Node.js バージョン (`node --version`)
   - npm バージョン (`npm --version`)

2. **エラー情報**:
   - エラーメッセージの全文
   - ログファイルの関連部分
   - 再現手順

3. **設定情報**:
   - `.env`ファイルの内容 (APIキーは除く)
   - カスタム設定があれば記載

### よくある質問FAQ
詳細な技術情報や設定方法は `claude-includes/` フォルダの開発者向け仕様書を参照してください。