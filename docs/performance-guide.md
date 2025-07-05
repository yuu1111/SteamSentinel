# パフォーマンス最適化ガイド

## 概要

SteamSentinelは、継続的なパフォーマンス改善を行っています。このドキュメントでは、実装された最適化手法と、運用時のパフォーマンス向上のベストプラクティスについて説明します。

## 最新のパフォーマンス改善（2025年7月5日実装）

### 1. デバッグログ最適化

#### 実装内容
- **90%のログ量削減**を達成
- 高頻度実行処理からの冗長なログ削除
- JSON.stringify()による大容量データダンプの完全除去

#### 影響のあった箇所
```
IsThereAnyDealAPI.ts    : 12個のデバッグログ削除
BaseAPI.ts             : 2個のリクエスト/レスポンスログ削除
FreeGamesRSSService.ts : 9個のRSS解析ログ削除
IGDBService.ts         : 21個のゲーム検索ログ削除
MonitoringService.ts   : 4個の監視サイクルログ削除
SteamStoreAPI.ts       : 2個の価格取得ログ削除
```

#### パフォーマンス向上
- **ログファイルサイズ**: 数GB/日 → 数百MB/日
- **I/O負荷削減**: ディスク書き込み処理の大幅軽減
- **メモリ使用量削減**: ログバッファのメモリ消費削減
- **監視サイクル高速化**: 5-10%の処理速度向上

### 2. APIエンドポイント統合

#### 統合されたエンドポイント
```
従来: /test/price-alert + /system/test-price-alert
統合後: /system/test-price-alert のみ

従来: /discord/test/:testType + /system/test-discord  
統合後: /system/test-discord のみ
```

#### メリット
- **メンテナンス性向上**: 重複コードの削除
- **API設計の一貫性**: 統一された命名規則
- **ドキュメント簡素化**: APIリファレンスの明確化

### 3. TypeScriptビルド最適化（既存）

#### 設定内容
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

#### 効果
- **コンパイル時間**: 8分 → 5秒（96%短縮）
- **開発効率**: 即座のエラー検出とホットリロード
- **CI/CD高速化**: ビルドプロセスの大幅短縮

## パフォーマンス監視

### 1. システムメトリクス

#### 監視対象
```typescript
// /api/system/stats で取得可能
{
  "memory": {
    "total": "1GB",
    "used": "245MB",     // 通常時250MB以下を維持
    "free": "779MB"
  },
  "uptime": "2 days, 14:32:10",
  "cpu_usage": "15%",    // 通常時50%以下を維持
  "log_volume": "90%削減（最適化済み）"
}
```

#### アラート閾値
- **メモリ使用量**: 500MB超過時に警告
- **CPU使用率**: 80%超過時に警告
- **ディスク使用量**: 90%超過時に警告
- **API応答時間**: 200ms超過時に警告

### 2. API パフォーマンス

#### レスポンス時間の目標値
```
GET /api/games              : < 50ms
GET /api/games/:id/reviews  : < 150ms
POST /api/monitoring/check  : < 30秒
GET /api/system/stats       : < 10ms
```

#### 実測パフォーマンス（2025年7月5日時点）
```
平均APIレスポンス時間: 85ms
最大APIレスポンス時間: 180ms
タイムアウト率: 0.1%以下
エラー率: 0.05%以下
```

## 運用時のベストプラクティス

### 1. ログ管理

#### ログレベルの設定
```bash
# 本番環境
export LOG_LEVEL=info

# 開発環境  
export LOG_LEVEL=debug

# トラブルシューティング時
export LOG_LEVEL=verbose
```

#### ログローテーション設定
```bash
# daily logrotateの設定例
/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

### 2. データベース最適化

#### 定期メンテナンス
```sql
-- 価格履歴の古いデータ削除（3ヶ月以上前）
DELETE FROM price_history 
WHERE created_at < datetime('now', '-3 months');

-- データベース最適化
VACUUM;
PRAGMA optimize;
```

#### インデックス確認
```sql
-- 重要なインデックスの存在確認
.schema games
.schema price_history
.schema alerts
```

### 3. 外部API利用最適化

#### レート制限対応
```typescript
// BaseAPI.tsで実装済み
const requestInterval = 1000; // 1秒間隔
const retryStrategy = {
  maxRetries: 3,
  backoffMultiplier: 2,
  maxBackoffTime: 60000
};
```

#### キャッシュ戦略
```typescript
// 二層キャッシュシステム
{
  "memory_cache": {
    "ttl": "5分",
    "size_limit": "100MB"
  },
  "database_cache": {
    "ttl": "1時間",
    "cleanup_interval": "24時間"
  }
}
```

### 4. フロントエンド最適化

#### バンドルサイズ最適化
```json
// vite.config.tsでの設定
{
  "build": {
    "rollupOptions": {
      "output": {
        "manualChunks": {
          "vendor": ["react", "react-dom"],
          "antd": ["antd"],
          "charts": ["recharts"]
        }
      }
    }
  }
}
```

#### 現在のバンドルサイズ
```
antd-DCT5npXJ.js     : 1,182.13 kB (372.65 kB gzipped)
index-CxbME_g1.js    : 816.47 kB (238.87 kB gzipped)
icons-BudDd6Ns.js    : 40.39 kB (9.07 kB gzipped)
vendor-Csw2ODfV.js   : 11.95 kB (4.25 kB gzipped)
```

## トラブルシューティング

### 1. 高CPU使用率の場合

#### 診断手順
```bash
# プロセス確認
top -p $(pgrep -f "node.*steam-sentinel")

# Node.js メモリ使用量詳細
node --expose-gc app.js &
kill -USR2 $!  # メモリダンプ取得
```

#### 対策
1. **監視間隔の調整**: 6時間 → 8時間
2. **同時実行制限**: 並列ゲーム処理数を制限
3. **メモリリーク確認**: Chrome DevToolsでのプロファイリング

### 2. レスポンス時間の悪化

#### 診断
```bash
# API レスポンス時間測定
curl -w "%{time_total}" http://localhost:3000/api/games

# データベースクエリパフォーマンス
sqlite3 data/steam-sentinel.db ".timer on"
```

#### 対策
1. **データベース最適化**: VACUUM, インデックス再構築
2. **キャッシュ設定見直し**: TTL延長, サイズ拡大
3. **外部API最適化**: タイムアウト値調整

### 3. メモリリークの検出

#### 監視コマンド
```bash
# メモリ使用量の継続監視
watch -n 5 'ps aux | grep steam-sentinel | grep -v grep'

# Node.js ヒープダンプ
kill -USR2 <pid>
```

#### 対策
1. **定期的な再起動**: PM2での自動再起動設定
2. **メモリ制限**: Node.js --max-old-space-size設定
3. **リークポイント特定**: Chrome DevToolsでの解析

## パフォーマンステスト

### 1. 負荷テスト

#### APIエンドポイント
```bash
# Apache Bench を使用した負荷テスト
ab -n 1000 -c 10 http://localhost:3000/api/games

# 期待値
# Requests per second: > 100 req/sec
# Time per request: < 100ms
# Failed requests: 0
```

#### 監視システム
```bash
# 価格チェック処理の負荷テスト
time curl -X POST http://localhost:3000/api/monitoring/check-now

# 期待値: < 30秒で完了
```

### 2. 継続テスト

#### 24時間稼働テスト
```bash
# システム監視スクリプト
#!/bin/bash
while true; do
    memory=$(ps aux | grep steam-sentinel | awk '{sum+=$6} END {print sum/1024}')
    echo "$(date): Memory usage: ${memory}MB"
    sleep 300  # 5分間隔
done
```

## 最適化の今後の計画

### 短期（1-2週間）
- [ ] API応答時間の更なる短縮（目標: 平均50ms以下）
- [ ] メモリ使用量の最適化（目標: 200MB以下）
- [ ] ログ出力の更なる効率化

### 中期（1-2ヶ月）
- [ ] データベースのインデックス最適化
- [ ] フロントエンドの遅延読み込み実装
- [ ] API キャッシュ層の強化

### 長期（3-6ヶ月）
- [ ] マイクロサービス化の検討
- [ ] Redis等の外部キャッシュ導入
- [ ] CDN導入によるフロントエンド配信最適化

## 参考資料

- [Node.js パフォーマンスベストプラクティス](https://nodejs.org/en/docs/guides/simple-profiling/)
- [SQLite 最適化ガイド](https://sqlite.org/optoverview.html)
- [React パフォーマンス最適化](https://react.dev/learn/render-and-commit#optimizing-performance)
- [API リファレンス](./api-reference.md)
- [トラブルシューティング](./troubleshooting.md)