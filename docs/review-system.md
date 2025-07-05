# レビューシステム統合ガイド

## 概要

SteamSentinelは、複数のプラットフォームからゲームレビュー情報を取得・統合し、包括的な評価データを提供するシステムを実装しています。このドキュメントでは、レビューシステムの仕組みと活用方法について説明します。

## データソース

### 1. Steam Reviews API

#### 取得データ
- **ポジティブレビュー数**: ゲームを推奨するレビューの総数
- **ネガティブレビュー数**: ゲームを推奨しないレビューの総数
- **推奨率**: ポジティブレビューの割合（%）
- **評価テキスト**: 日本語での評価表現（例：「非常に好評」「やや好評」）

#### API仕様
```
Steam Store API
Rate Limit: 1秒間隔
Cache: 1時間
Format: JSON
```

### 2. IGDB (Internet Game Database)

#### 取得データ
- **ユーザー評価**: 0-100スケールの評価
- **評価数**: レビューを行ったユーザー数

#### 認証
```
OAuth 2.0 (Twitch)
Client ID: 環境変数で設定
Access Token: 自動更新
Rate Limit: 4リクエスト/秒
```

### 3. Metacritic (Steam API経由)

#### 取得データ
- **Metacritic スコア**: Steam APIから取得されるプロ評価
- **レビュアー数**: 評価に参加したレビュアー数
- **公式URL**: Metacriticページへのリンク

#### API制限
```
Steam Store API経由で取得
Rate Limit: Steam APIに準拠
Cache: 1時間
Response: JSON
```

## 統合レビューAPI

### エンドポイント
```http
GET /api/games/:appId/reviews
```

### レスポンス例
```json
{
  "success": true,
  "data": {
    "steam_app_id": 1091500,
    "game_name": "Cyberpunk 2077",
    "steam": {
      "positive": 425000,
      "negative": 150000,
      "percentage": 74,
      "text": "やや好評"
    },
    "igdb": {
      "rating": 75,
      "count": 890
    },
    "metacritic": {
      "score": 86,
      "url": "https://www.metacritic.com/game/cyberpunk-2077"
    },
    "integrated_score": {
      "score": 76.8,
      "sources": ["steam", "igdb", "metacritic"],
      "confidence": "high"
    },
    "last_updated": "2025-07-05T08:00:00Z"
  }
}
```

## 統合スコア計算

### アルゴリズム

統合スコアは、各ソースの評価を重み付けして算出されます：

```typescript
const calculateIntegratedScore = (reviews: ReviewData) => {
  const weights = {
    steam: 1.5,      // ユーザー数が多いため高い重み
    igdb: 1.8,       // 専門的な評価として高い重み
    metacritic: 2.0  // プロレビューとして最高重み
  };

  let totalScore = 0;
  let totalWeight = 0;
  const sources = [];

  // Steam評価の正規化（0-100スケールに変換）
  if (reviews.steam?.percentage) {
    const steamWeight = reviews.steam.reviewCount > 1000 ? 2.0 : 1.5;
    totalScore += reviews.steam.percentage * steamWeight;
    totalWeight += steamWeight;
    sources.push('steam');
  }

  // IGDB評価（既に0-100スケール）
  if (reviews.igdb?.rating) {
    totalScore += reviews.igdb.rating * weights.igdb;
    totalWeight += weights.igdb;
    sources.push('igdb');
  }

  // Metacritic評価（既に0-100スケール）
  if (reviews.metacritic?.score) {
    totalScore += reviews.metacritic.score * weights.metacritic;
    totalWeight += weights.metacritic;
    sources.push('metacritic');
  }

  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  return {
    score: Math.round(finalScore * 10) / 10,
    sources,
    confidence: getConfidenceLevel(sources.length)
  };
};

const getConfidenceLevel = (sourceCount: number): string => {
  if (sourceCount >= 3) return 'high';
  if (sourceCount === 2) return 'medium';
  return 'low';
};
```

### 信頼度レベル

- **High（高）**: 3つ以上のソースからデータを取得
- **Medium（中）**: 2つのソースからデータを取得
- **Low（低）**: 1つのソースのみからデータを取得

## キャッシュ戦略

### 二層キャッシュシステム

```typescript
// メモリキャッシュ（高速アクセス）
const memoryCache = {
  ttl: 5 * 60 * 1000,        // 5分
  maxSize: 100,              // 最大100ゲーム
  strategy: 'LRU'            // 最近最少使用での削除
};

// データベースキャッシュ（永続化）
const dbCache = {
  ttl: 60 * 60 * 1000,       // 1時間
  table: 'review_cache',
  cleanup_interval: 24 * 60 * 60 * 1000  // 24時間毎
};
```

### キャッシュ戦略の詳細

#### メモリキャッシュ
```typescript
class ReviewCache {
  private cache = new Map<string, CachedReview>();
  
  get(steamAppId: number): CachedReview | null {
    const key = `reviews_${steamAppId}`;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return cached;
    }
    
    this.cache.delete(key);
    return null;
  }
  
  set(steamAppId: number, data: ReviewData): void {
    const key = `reviews_${steamAppId}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // LRU実装：サイズ制限
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}
```

#### データベースキャッシュ
```sql
-- review_cache テーブル構造
CREATE TABLE review_cache (
  steam_app_id INTEGER PRIMARY KEY,
  steam_data TEXT,
  igdb_data TEXT,
  metacritic_data TEXT,
  integrated_score REAL,
  confidence TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_review_cache_updated_at ON review_cache(updated_at);
```

## 使用例

### フロントエンドでの活用

#### React コンポーネント
```typescript
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

interface GameReviewProps {
  steamAppId: number;
}

export const GameReview: React.FC<GameReviewProps> = ({ steamAppId }) => {
  const [reviews, setReviews] = useState<GameReviews | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await api.get<GameReviews>(`/games/${steamAppId}/reviews`);
        if (response.success) {
          setReviews(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [steamAppId]);

  if (loading) return <div>レビューを読み込み中...</div>;
  if (!reviews) return <div>レビューデータがありません</div>;

  return (
    <div className="game-reviews">
      <h3>ゲームレビュー</h3>
      
      {/* 統合スコア */}
      <div className="integrated-score">
        <span className="score">{reviews.integrated_score.score}</span>
        <span className="confidence">信頼度: {reviews.integrated_score.confidence}</span>
      </div>

      {/* Steam レビュー */}
      {reviews.steam && (
        <div className="steam-review">
          <h4>Steam ユーザーレビュー</h4>
          <p>{reviews.steam.text} ({reviews.steam.percentage}%)</p>
          <p>総レビュー数: {reviews.steam.positive + reviews.steam.negative}</p>
        </div>
      )}

      {/* IGDB レビュー */}
      {reviews.igdb && (
        <div className="igdb-review">
          <h4>IGDB 評価</h4>
          <p>評価: {reviews.igdb.rating}/100</p>
          <p>レビュー数: {reviews.igdb.count}</p>
        </div>
      )}

      {/* Metacritic レビュー */}
      {reviews.metacritic && (
        <div className="metacritic-review">
          <h4>Metacritic 評価</h4>
          <p>批評家スコア: {reviews.metacritic.score}/100</p>
          <a href={reviews.metacritic.url} target="_blank" rel="noopener noreferrer">
            Metacriticで詳細を見る
          </a>
        </div>
      )}
    </div>
  );
};
```

#### バッチ処理での活用
```typescript
// 複数ゲームのレビューを一括取得
const fetchMultipleReviews = async (gameIds: number[]) => {
  const response = await api.post<BatchReviewResponse>('/games/reviews/batch', {
    gameIds
  });
  
  return response.data?.reviews || [];
};

// 使用例
const gameIds = [1091500, 730, 570];
const reviews = await fetchMultipleReviews(gameIds);
reviews.forEach(review => {
  console.log(`${review.game_name}: ${review.integrated_score.score}`);
});
```

## パフォーマンス最適化

### 1. 非同期処理
```typescript
const fetchReviewsParallel = async (steamAppId: number) => {
  const [steamReviews, igdbReviews] = await Promise.allSettled([
    SteamReviewsAPI.fetch(steamAppId),
    IGDBService.getReviews(steamAppId)
  ]);

  return {
    steam: steamReviews.status === 'fulfilled' ? steamReviews.value : null,
    igdb: igdbReviews.status === 'fulfilled' ? igdbReviews.value : null,
    metacritic: steamReviews.status === 'fulfilled' ? steamReviews.value?.metacritic : null
  };
};
```

### 2. レート制限対応
```typescript
class RateLimitedAPI {
  private lastRequest = 0;
  private minInterval = 1000; // 1秒間隔

  async makeRequest<T>(url: string): Promise<T> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
    return axios.get<T>(url);
  }
}
```

### 3. エラーハンドリングとリトライ
```typescript
const fetchWithRetry = async <T>(
  fetcher: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetcher();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Failed after ${maxRetries} attempts:`, error);
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  return null;
};
```

## トラブルシューティング

### 1. レビューデータが取得できない場合

#### 症状
- API レスポンスが空
- 一部のソースのデータが欠落

#### 原因と対策
```typescript
// デバッグ用のログ追加
const debugReviewFetch = async (steamAppId: number) => {
  console.log(`Fetching reviews for Steam App ID: ${steamAppId}`);
  
  try {
    const steamData = await SteamReviewsAPI.fetch(steamAppId);
    console.log('Steam data:', steamData ? 'Success' : 'Failed');
  } catch (error) {
    console.error('Steam API error:', error.message);
  }
  
  // 他のソースも同様にチェック
};
```

#### チェックリスト
- [ ] Steam App ID が正しいか確認
- [ ] 外部API の接続状況を確認
- [ ] レート制限に引っかかっていないか確認
- [ ] キャッシュの有効期限をチェック

### 2. 統合スコアの計算エラー

#### 症状
- NaN や undefined が返される
- 不正確なスコア値

#### 対策
```typescript
const safeCalculateScore = (reviews: ReviewData) => {
  const scores = [];
  
  if (reviews.steam?.percentage && !isNaN(reviews.steam.percentage)) {
    scores.push(reviews.steam.percentage);
  }
  
  if (reviews.igdb?.rating && !isNaN(reviews.igdb.rating)) {
    scores.push(reviews.igdb.rating);
  }
  
  if (reviews.metacritic?.score && !isNaN(reviews.metacritic.score)) {
    scores.push(reviews.metacritic.score);
  }
  
  if (scores.length === 0) {
    return { score: 0, confidence: 'none', sources: [] };
  }
  
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return {
    score: Math.round(averageScore * 10) / 10,
    confidence: getConfidenceLevel(scores.length),
    sources: Object.keys(reviews).filter(key => reviews[key])
  };
};
```

### 3. キャッシュの問題

#### 症状
- 古いデータが表示される
- メモリ使用量の増加

#### 対策
```bash
# キャッシュクリア API
curl -X DELETE http://localhost:3000/api/system/cache/reviews

# データベースのキャッシュテーブル確認
sqlite3 data/steam-sentinel.db "SELECT COUNT(*) FROM review_cache;"

# 古いキャッシュデータの削除
sqlite3 data/steam-sentinel.db "DELETE FROM review_cache WHERE updated_at < datetime('now', '-24 hours');"
```

## API レファレンス

### 主要エンドポイント

#### 単一ゲームレビュー取得
```http
GET /api/games/:appId/reviews
Response: GameReviews
Cache: 1時間
```

#### バッチレビュー取得
```http
POST /api/games/reviews/batch
Body: { gameIds: number[] }
Response: BatchReviewResponse
Limit: 50ゲームまで
```

#### キャッシュ管理
```http
DELETE /api/system/cache/reviews/:appId  # 単一削除
DELETE /api/system/cache/reviews         # 全削除
GET /api/system/cache/reviews/stats      # キャッシュ統計
```

## 今後の拡張予定

### 短期（1-2週間）
- [ ] レビューデータの更新頻度の最適化
- [ ] より詳細なエラーハンドリング
- [ ] レビュー品質スコアの実装

### 中期（1-2ヶ月）
- [ ] 追加レビューソースの統合（GameSpot、IGN等）
- [ ] ユーザーによるレビュー重み調整機能
- [ ] レビュー傾向の分析機能
- [ ] OpenCriticの再実装検討（認証対応）

### 長期（3-6ヶ月）
- [ ] 機械学習による評価予測
- [ ] 自然言語処理によるレビュー感情分析
- [ ] パーソナライズされたレビュー推奨

## 関連ドキュメント

- [API リファレンス](./api-reference.md)
- [パフォーマンス最適化ガイド](./performance-guide.md)
- [React Router ナビゲーション](./router-navigation.md)
- [技術仕様（Claude向け）](../claude-includes/tech-stack.yml)