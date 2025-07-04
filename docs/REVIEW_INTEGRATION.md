# レビュー統合システム - SteamSentinel

SteamSentinelのレビュー統合システムは、複数のレビューソース（Steam、IGDB、OpenCritic）からゲームのレビュー情報を収集し、統合スコアを提供する機能です。

## 概要

### 対応レビューソース
- **Steam**: Steam Store API経由でユーザーレビュー情報
- **IGDB**: IGDB API経由でIGDB独自レーティング（Steam ID → external_games連携）
- **OpenCritic**: OpenCritic API直接呼び出し

### 主要機能
- マルチソースレビュー統合
- 重み付け平均による統合スコア計算
- 2層キャッシュシステム（メモリ・データベース）
- バッチ処理対応
- 自動データクリーンアップ

## アーキテクチャ

### コンポーネント構成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GameDetail    │    │    Games Page   │    │  Dashboard etc  │
│     (UI)        │    │      (UI)       │    │      (UI)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └─────────────┬──────────┴────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │  ReviewIntegrationService │
         └─────────────┬─────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───▼────┐    ┌────────▼────────┐    ┌───▼────────────┐
│ Steam  │    │    IGDB API     │    │ OpenCritic API │
│  API   │    │ (Steam ID→IGDB) │    │   (Direct)     │
└────────┘    └─────────────────┘    └────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │     ReviewModel          │
         │   (Database Cache)       │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │      SQLite Database     │
         │    (Persistent Cache)    │
         └───────────────────────────┘
```

### データフロー

1. **リクエスト受信**: UI → ReviewIntegrationService
2. **キャッシュ確認**: メモリキャッシュ → データベースキャッシュ
3. **API呼び出し**: Steam/IGDB/OpenCritic APIs
4. **統合処理**: 重み付け平均計算
5. **キャッシュ保存**: データベース → メモリ
6. **レスポンス**: 統合レビューデータ

## API仕様

### ReviewIntegrationService

#### `getGameReviews(steamAppId: number, gameName: string): Promise<GameReviews | null>`

単一ゲームのレビュー情報を取得

**Parameters:**
- `steamAppId`: Steam App ID
- `gameName`: ゲーム名

**Returns:**
```typescript
interface GameReviews {
  steamAppId: number;
  gameName: string;
  reviews: ReviewScore[];
  aggregateScore: number; // 0-100の統合スコア
  lastUpdated: Date;
}
```

#### `getMultipleGameReviews(games: Array<{steamAppId: number; name: string}>): Promise<Map<number, GameReviews | null>>`

複数ゲームのレビュー情報を一括取得

### ReviewScore Interface

```typescript
interface ReviewScore {
  source: 'steam' | 'metacritic' | 'opencritic';
  score: number;
  maxScore: number;
  reviewCount?: number;
  description?: string;
  url?: string;
}
```

## データベース設計

### game_reviews テーブル

```sql
CREATE TABLE game_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_app_id INTEGER NOT NULL,
  game_name TEXT NOT NULL,
  steam_score INTEGER,
  steam_review_count INTEGER,
  steam_description TEXT,
  metacritic_score INTEGER,
  metacritic_description TEXT,
  metacritic_url TEXT,
  opencritic_score INTEGER,
  opencritic_review_count INTEGER,
  opencritic_tier TEXT,
  opencritic_description TEXT,
  opencritic_url TEXT,
  aggregate_score INTEGER,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(steam_app_id)
);
```

### review_scores テーブル

```sql
CREATE TABLE review_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  steam_app_id INTEGER NOT NULL,
  source TEXT CHECK(source IN ('steam', 'metacritic', 'opencritic')),
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 100,
  review_count INTEGER,
  description TEXT,
  url TEXT,
  tier TEXT,
  percent_recommended REAL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(steam_app_id, source)
);
```

## キャッシュシステム

### 2層キャッシュ構成

1. **メモリキャッシュ**
   - 保持期間: 5分
   - 用途: 高速アクセス
   - 容量: 制限なし（メモリ依存）

2. **データベースキャッシュ**
   - 保持期間: 24時間
   - 用途: 永続化・共有
   - 容量: ディスク容量依存

### キャッシュ戦略

- **Read-Through**: キャッシュミス時に自動的にAPIから取得
- **Write-Behind**: API取得後にバックグラウンドでデータベース保存
- **TTL管理**: 自動的な期限切れ管理
- **LRU削除**: 古いデータの自動削除

## 統合スコア計算

### 重み付け方式

```typescript
// ソース別重み
const weights = {
  steam: reviewCount > 1000 ? 2 : 1.5,  // Steam（多数レビュー時は高重み）
  metacritic: 1.8,                      // Metacritic（プロレビュー重視）
  opencritic: 1.5                       // OpenCritic（中程度重み）
};

// 統合スコア = Σ(正規化スコア × 重み) / Σ(重み)
aggregateScore = totalWeightedScore / totalWeight;
```

### スコア正規化

全てのレビューソースを100点満点に正規化:
```typescript
normalizedScore = (score / maxScore) * 100
```

## 設定・環境変数

### IGDB API設定

```env
# Twitch OAuth2 credentials (IGDB API用)
IGDB_CLIENT_ID=your_client_id
IGDB_CLIENT_SECRET=your_client_secret
```

### 設定確認

```typescript
// 機能有効性確認
const featureStatus = getFeatureStatus();
console.log(featureStatus.reviews.enabled); // true/false
```

## エラーハンドリング

### API失敗時の処理

1. **個別失敗**: 他のソースは続行、利用可能データで統合スコア計算
2. **全体失敗**: キャッシュデータを返却、なければnull
3. **ネットワーク障害**: タイムアウト・リトライなし

### ログ出力

```typescript
// 成功ログ
logger.info(`Saved reviews to database for ${gameName} (${steamAppId})`);

// 警告ログ
logger.warn(`Failed to save reviews to database for ${gameName}`);

// エラーログ
logger.error(`Failed to get reviews for ${gameName}:`, error);
```

## パフォーマンス

### 最適化ポイント

- **バッチ処理**: 複数ゲーム同時取得
- **並列API呼び出し**: Promise.allSettled使用
- **効率的キャッシュ**: データベース一括クエリ
- **メモリ管理**: 定期的キャッシュクリア

### 制限事項

- **API制限**: 各サービスのレート制限に準拠（IGDB: 4req/s）
- **データ精度**: サンプルデータ非使用（正確性重視）
- **言語対応**: 日本語ゲーム名の検索制限
- **ゲーム名マッチング**: 曖昧検索による誤マッチの可能性
- **OpenCritic API**: 一部ゲームで400エラー発生
- **評価基準差**: Steam（ユーザー）vs IGDB/OpenCritic（プロ）の評価観点違い

## メンテナンス

### 自動クリーンアップ

```typescript
// 30日以上古いレビューデータを削除
ReviewModel.cleanupOldReviews(30);
```

### 統計情報取得

```typescript
const stats = reviewIntegrationService.getStatistics();
// {
//   memoryCachedGames: number,
//   databaseStats: {
//     totalGamesWithReviews: number,
//     averageAggregateScore: number,
//     ...
//   }
// }
```

## 使用例

### GameDetailページでの表示

```typescript
// レビューデータ取得
const reviews = await ReviewIntegrationService.getGameReviews(steamAppId, gameName);

// UI表示
if (reviews) {
  // 統合スコア表示
  console.log(`統合スコア: ${reviews.aggregateScore}/100`);
  
  // 個別ソース表示
  reviews.reviews.forEach(review => {
    console.log(`${review.source}: ${review.score}/${review.maxScore}`);
  });
}
```

### 複数ゲーム一括処理

```typescript
const games = [
  { steamAppId: 1091500, name: "Cyberpunk 2077" },
  { steamAppId: 292030, name: "The Witcher 3" }
];

const reviewMap = await reviewIntegrationService.getMultipleGameReviews(games);
```

## トラブルシューティング

### よくある問題

1. **IGDB認証失敗**: Twitch OAuth2設定確認
2. **OpenCritic接続失敗**: ネットワーク・ファイアウォール確認
3. **キャッシュ破損**: データベースファイル権限確認
4. **メモリリーク**: 定期的キャッシュクリア実行

### デバッグ方法

```typescript
// 詳細ログ有効化
logger.level = 'debug';

// 統計情報確認
const stats = reviewIntegrationService.getStatistics();
console.log(JSON.stringify(stats, null, 2));
```

## 今後の拡張計画

- **新レビューソース**: GameRankings, IGN等の追加
- **ユーザーレビュー**: Steam以外のユーザーレビュー統合
- **感情分析**: レビューテキストの感情分析
- **レコメンデーション**: レビューベースの推薦システム