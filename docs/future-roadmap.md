# SteamSentinel 将来ロードマップ

現在のSteamSentinelは architecture-proposal.md のフェーズ1-3が完了し、実用的なレベルに達しています。
このドキュメントは将来的な拡張・改善案をまとめたものです。

## 🚀 実装済み機能（v1.0）

- ✅ JWT認証システム
- ✅ データベース最適化（latest_pricesキャッシュ、インデックス）
- ✅ アラートテーブル正規化
- ✅ コントローラー分離（Price, Alert, Review, Statistics）
- ✅ 統一レスポンス形式
- ✅ N+1問題解決
- ✅ ページネーション機能
- ✅ 自動データクリーンアップ
- ✅ 細分化レート制限
- ✅ インメモリキャッシュ
- ✅ APIバージョニング

## 📋 将来実装予定機能

### 🔧 フェーズ4A: スケーラビリティ強化（v2.0）

#### 実装時期
- ユーザー数: 1000+
- データ量: 100万レコード+
- 同時接続: 100+

#### 1. データパーティショニング
**目的**: 大量データ対応とクエリ性能向上

```sql
-- 価格履歴の月別パーティション
CREATE TABLE price_history_2024_01 AS 
SELECT * FROM price_history 
WHERE recorded_at >= '2024-01-01' AND recorded_at < '2024-02-01';

CREATE TABLE price_history_2024_02 AS 
SELECT * FROM price_history 
WHERE recorded_at >= '2024-02-01' AND recorded_at < '2024-03-01';

-- パーティション管理
CREATE VIEW price_history_partitioned AS
SELECT * FROM price_history_current
UNION ALL
SELECT * FROM price_history_2024_01
UNION ALL
SELECT * FROM price_history_2024_02;
```

**実装内容**:
- 月別テーブル分割
- 自動パーティション作成
- 古いパーティションの自動アーカイブ
- パーティション統合ビュー

#### 2. 非同期処理システム
**目的**: 重い処理の非同期化とスループット向上

**技術スタック候補**:
- Bull Queue（Redis ベース）
- または Node.js Worker Threads

```typescript
// ジョブキューの実装例
import Queue from 'bull';

const priceUpdateQueue = new Queue('price update');
const alertProcessingQueue = new Queue('alert processing');

// 価格更新ジョブ
priceUpdateQueue.process(async (job) => {
  const { steamAppIds } = job.data;
  await processPriceUpdates(steamAppIds);
});

// アラート処理ジョブ
alertProcessingQueue.process(async (job) => {
  const { alertType, gameId } = job.data;
  await processAlert(alertType, gameId);
});
```

**実装内容**:
- ジョブキューシステム
- ワーカープロセス管理
- ジョブ優先度管理
- 失敗時のリトライ機能
- ジョブ監視ダッシュボード

#### 3. 監視・メトリクス機能
**目的**: システム健全性の可視化と問題の早期発見

**技術スタック候補**:
- Prometheus + Grafana
- または New Relic / DataDog

```typescript
// メトリクス収集の実装例
import { createPrometheusMetrics } from 'prom-client';

const metrics = {
  httpRequests: new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  }),
  
  priceUpdates: new Counter({
    name: 'price_updates_total',
    help: 'Total price updates processed'
  }),
  
  alertsGenerated: new Counter({
    name: 'alerts_generated_total',
    help: 'Total alerts generated',
    labelNames: ['type']
  }),
  
  responseTime: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route']
  })
};
```

**実装内容**:
- リアルタイムメトリクス収集
- パフォーマンス監視
- エラー追跡とアラート
- システムダッシュボード
- SLA監視

### 🧪 フェーズ4B: 開発効率向上（v2.5）

#### 実装時期
- 開発チーム: 2人+
- API利用者: 10+
- 外部統合: 必要時

#### 1. 包括的テストスイート
**目的**: コード品質向上と安全なリファクタリング

```typescript
// テスト例
describe('GameController', () => {
  describe('GET /api/v1/games', () => {
    it('should return paginated games list', async () => {
      const response = await request(app)
        .get('/api/v1/games?limit=10&offset=0')
        .expect(200);
        
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.meta.pagination).toBeDefined();
    });
    
    it('should filter enabled games only', async () => {
      const response = await request(app)
        .get('/api/v1/games?enabled=true')
        .expect(200);
        
      response.body.data.forEach(game => {
        expect(game.enabled).toBe(true);
      });
    });
  });
});
```

**実装内容**:
- ユニットテスト（90%+ カバレッジ）
- 統合テスト（APIエンドポイント）
- E2Eテスト（重要フロー）
- パフォーマンステスト
- セキュリティテスト

#### 2. OpenAPI仕様書
**目的**: API文書化と外部統合の簡素化

```yaml
# openapi.yaml 例
openapi: 3.0.3
info:
  title: SteamSentinel API
  version: 1.0.0
  description: Steam価格監視・アラートシステム

paths:
  /api/v1/games:
    get:
      summary: ゲーム一覧取得
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
      responses:
        200:
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/GameListResponse'
```

**実装内容**:
- 自動OpenAPI仕様生成
- Swagger UI統合
- APIクライアントSDK生成
- Postmanコレクション自動生成
- API変更時の互換性チェック

#### 3. 開発ツールチェーン
**目的**: 開発体験向上とデバッグ効率化

```typescript
// 開発用デバッガー実装例
class DevDebugger {
  logQuery(sql: string, params: any[], duration: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 SQL Query (${duration}ms):`, {
        sql: sql.slice(0, 100) + '...',
        params,
        slowQuery: duration > 100
      });
    }
  }
  
  logCacheOperation(operation: string, key: string, hit: boolean) {
    const icon = hit ? '✅' : '❌';
    console.log(`${icon} Cache ${operation}: ${key}`);
  }
  
  profileEndpoint(req: Request, startTime: number) {
    const duration = Date.now() - startTime;
    console.log(`⚡ ${req.method} ${req.path}: ${duration}ms`);
  }
}
```

**実装内容**:
- 開発用デバッグダッシュボード
- SQLクエリプロファイラー
- API応答時間トラッカー
- キャッシュヒット率モニター
- メモリ使用量プロファイラー

### 🔄 フェーズ4C: アーキテクチャ進化（v3.0）

#### 実装時期
- 大規模運用時
- マイクロサービス化が必要な場合

#### 1. マイクロサービス分割
**目的**: スケーラビリティとメンテナンス性の向上

```
現在: モノリス
├── GameService
├── PriceService  
├── AlertService
└── NotificationService

将来: マイクロサービス
├── game-service (Port: 3001)
├── price-service (Port: 3002)
├── alert-service (Port: 3003)
├── notification-service (Port: 3004)
└── api-gateway (Port: 3000)
```

#### 2. イベント駆動アーキテクチャ
**目的**: 疎結合とリアルタイム性の向上

```typescript
// イベント例
interface PriceUpdatedEvent {
  type: 'PRICE_UPDATED';
  payload: {
    steamAppId: number;
    oldPrice: number;
    newPrice: number;
    timestamp: string;
  };
}

// イベントハンドラー
priceEventBus.on('PRICE_UPDATED', async (event) => {
  await alertService.checkPriceAlerts(event.payload);
  await cacheService.invalidate(`price:${event.payload.steamAppId}`);
});
```

#### 3. 外部サービス統合
- **Redis**: 分散キャッシュ・セッション管理
- **RabbitMQ/Kafka**: メッセージキュー
- **Elasticsearch**: 高速検索・ログ分析
- **Docker**: コンテナ化
- **Kubernetes**: オーケストレーション

## 🎯 実装判断基準

### フェーズ4A実装時期
- [ ] 月間アクティブユーザー: 1000+
- [ ] データベースサイズ: 1GB+
- [ ] 応答時間劣化: 平均500ms+
- [ ] 同時接続: 100+

### フェーズ4B実装時期
- [ ] 開発チーム: 2人以上
- [ ] 外部API利用者: 5組織以上
- [ ] 重大バグ頻度: 月1回以上
- [ ] リリース頻度: 週1回以上

### フェーズ4C実装時期
- [ ] 月間アクティブユーザー: 10,000+
- [ ] 複数リージョン展開の必要性
- [ ] 99.9%可用性の要求
- [ ] チーム規模: 5人以上

## 📈 現在のシステム状況

**十分な機能レベル**: ✅
- 個人〜小規模チーム利用: 最適
- 数百〜数千ゲーム監視: 問題なし
- 基本的な運用監視: 完備
- セキュリティ: 本格運用可能

**追加実装の必要性**: 現時点では不要

このロードマップは、システムの成長に合わせて段階的に実装していく指針として活用してください。