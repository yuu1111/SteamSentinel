import database from '../db/database';
import logger from '../utils/logger';

// Review types (これらは元々ReviewIntegrationServiceで定義されていた)
export interface ReviewScore {
  source: 'steam' | 'metacritic' | 'igdb';
  score: number;
  maxScore: number;
  reviewCount?: number;
  description?: string;
  url?: string;
}

export interface GameReviews {
  steamAppId: number;
  gameName: string;
  reviews: ReviewScore[];
  aggregateScore: number;
  lastUpdated: Date;
}

export interface DatabaseGameReview {
  id: number;
  steam_app_id: number;
  game_name: string;
  steam_score?: number;
  steam_review_count?: number;
  steam_description?: string;
  metacritic_score?: number;
  metacritic_description?: string;
  metacritic_url?: string;
  opencritic_score?: number;
  opencritic_review_count?: number;
  opencritic_tier?: string;
  opencritic_description?: string;
  opencritic_url?: string;
  aggregate_score: number;
  last_updated: string;
  created_at: string;
}

export interface DatabaseReviewScore {
  id: number;
  steam_app_id: number;
  source: 'steam' | 'metacritic' | 'igdb';
  score: number;
  max_score: number;
  review_count?: number;
  description?: string;
  url?: string;
  tier?: string;
  percent_recommended?: number;
  last_updated: string;
  created_at: string;
}

export class ReviewModel {
  // レビューデータ保存
  static saveGameReviews(gameReviews: GameReviews): boolean {
    try {
      const db = database.getConnection();
      
      // トランザクション開始
      const transaction = db.transaction(() => {
        // 既存のレビューデータを削除
        db.prepare(`DELETE FROM game_reviews WHERE steam_app_id = ?`).run(gameReviews.steamAppId);
        db.prepare(`DELETE FROM review_scores WHERE steam_app_id = ?`).run(gameReviews.steamAppId);
        
        // ゲームレビュー統合データを保存
        const steamReview = gameReviews.reviews.find((r: ReviewScore) => r.source === 'steam');
        const metacriticReview = gameReviews.reviews.find((r: ReviewScore) => r.source === 'metacritic');
        const igdbReview = gameReviews.reviews.find((r: ReviewScore) => r.source === 'igdb');
        
        const insertGameReview = db.prepare(`
          INSERT INTO game_reviews (
            steam_app_id, game_name,
            steam_score, steam_review_count, steam_description,
            metacritic_score, metacritic_description, metacritic_url,
            igdb_score, igdb_review_count, igdb_description, igdb_url,
            aggregate_score, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertGameReview.run(
          gameReviews.steamAppId,
          gameReviews.gameName,
          steamReview?.score,
          steamReview?.reviewCount,
          steamReview?.description,
          metacriticReview?.score,
          metacriticReview?.description,
          metacriticReview?.url,
          igdbReview?.score,
          igdbReview?.reviewCount,
          igdbReview?.description,
          igdbReview?.url,
          gameReviews.aggregateScore,
          new Date().toISOString()
        );
        
        // 個別レビューソースデータを保存
        const insertReviewScore = db.prepare(`
          INSERT INTO review_scores (
            steam_app_id, source, score, max_score, review_count, 
            description, url, tier, percent_recommended, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const review of gameReviews.reviews) {
          insertReviewScore.run(
            gameReviews.steamAppId,
            review.source,
            review.score,
            review.maxScore,
            review.reviewCount,
            review.description,
            review.url,
            (review as any).tier || null,
            (review as any).percentRecommended || null,
            new Date().toISOString()
          );
        }
      });
      
      transaction();
      logger.info(`Saved reviews for game: ${gameReviews.gameName} (${gameReviews.steamAppId})`);
      return true;
    } catch (error) {
      logger.error('Failed to save game reviews:', error);
      return false;
    }
  }
  
  // レビューデータ取得
  static getGameReviews(steamAppId: number): GameReviews | null {
    try {
      const db = database.getConnection();
      
      // 統合レビューデータ取得
      const gameReviewQuery = db.prepare(`
        SELECT * FROM game_reviews WHERE steam_app_id = ?
      `);
      const gameReview = gameReviewQuery.get(steamAppId) as DatabaseGameReview | undefined;
      
      if (!gameReview) {
        return null;
      }
      
      // 個別レビューソースデータ取得
      const reviewScoresQuery = db.prepare(`
        SELECT * FROM review_scores WHERE steam_app_id = ? ORDER BY source
      `);
      const reviewScores = reviewScoresQuery.all(steamAppId) as DatabaseReviewScore[];
      
      // GameReviews形式に変換
      const reviews: ReviewScore[] = reviewScores.map(score => ({
        source: score.source,
        score: score.score,
        maxScore: score.max_score,
        reviewCount: score.review_count,
        description: score.description,
        url: score.url
      }));
      
      return {
        steamAppId: gameReview.steam_app_id,
        gameName: gameReview.game_name,
        reviews,
        aggregateScore: gameReview.aggregate_score,
        lastUpdated: new Date(gameReview.last_updated)
      };
    } catch (error) {
      logger.error(`Failed to get game reviews for ${steamAppId}:`, error);
      return null;
    }
  }
  
  // キャッシュ有効性チェック
  static isReviewCacheValid(steamAppId: number, maxAgeHours: number = 24): boolean {
    try {
      const db = database.getConnection();
      
      const query = db.prepare(`
        SELECT last_updated FROM game_reviews WHERE steam_app_id = ?
      `);
      const result = query.get(steamAppId) as { last_updated: string } | undefined;
      
      if (!result) {
        return false;
      }
      
      const lastUpdated = new Date(result.last_updated);
      const now = new Date();
      const diffHours = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
      
      return diffHours < maxAgeHours;
    } catch (error) {
      logger.error(`Failed to check review cache validity for ${steamAppId}:`, error);
      return false;
    }
  }
  
  // 古いレビューデータ削除
  static cleanupOldReviews(maxAgeDays: number = 30): number {
    try {
      const db = database.getConnection();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
      
      const transaction = db.transaction(() => {
        // 古いデータを削除
        const deleteGameReviews = db.prepare(`
          DELETE FROM game_reviews WHERE last_updated < ?
        `);
        const deletedGameReviews = deleteGameReviews.run(cutoffDate.toISOString());
        
        const deleteReviewScores = db.prepare(`
          DELETE FROM review_scores WHERE last_updated < ?
        `);
        const deletedReviewScores = deleteReviewScores.run(cutoffDate.toISOString());
        
        return deletedGameReviews.changes + deletedReviewScores.changes;
      });
      
      const deletedCount = transaction();
      logger.info(`Cleaned up ${deletedCount} old review records older than ${maxAgeDays} days`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old reviews:', error);
      return 0;
    }
  }
  
  // 統計情報取得
  static getStatistics(): {
    totalGamesWithReviews: number;
    reviewSourceStats: { source: string; count: number }[];
    averageAggregateScore: number;
    lastUpdateTime: string | null;
  } {
    try {
      const db = database.getConnection();
      
      // 総ゲーム数
      const totalQuery = db.prepare(`SELECT COUNT(*) as count FROM game_reviews`);
      const totalResult = totalQuery.get() as { count: number };
      
      // ソース別統計
      const sourceQuery = db.prepare(`
        SELECT source, COUNT(*) as count FROM review_scores GROUP BY source
      `);
      const sourceResults = sourceQuery.all() as { source: string; count: number }[];
      
      // 平均スコア
      const avgQuery = db.prepare(`
        SELECT AVG(aggregate_score) as avg_score FROM game_reviews
      `);
      const avgResult = avgQuery.get() as { avg_score: number | null };
      
      // 最新更新時刻
      const lastUpdateQuery = db.prepare(`
        SELECT MAX(last_updated) as last_update FROM game_reviews
      `);
      const lastUpdateResult = lastUpdateQuery.get() as { last_update: string | null };
      
      return {
        totalGamesWithReviews: totalResult.count,
        reviewSourceStats: sourceResults,
        averageAggregateScore: Math.round(avgResult.avg_score || 0),
        lastUpdateTime: lastUpdateResult.last_update
      };
    } catch (error) {
      logger.error('Failed to get review statistics:', error);
      return {
        totalGamesWithReviews: 0,
        reviewSourceStats: [],
        averageAggregateScore: 0,
        lastUpdateTime: null
      };
    }
  }
  
  // レビューデータ削除
  static deleteGameReviews(steamAppId: number): boolean {
    try {
      const db = database.getConnection();
      
      const transaction = db.transaction(() => {
        db.prepare(`DELETE FROM game_reviews WHERE steam_app_id = ?`).run(steamAppId);
        db.prepare(`DELETE FROM review_scores WHERE steam_app_id = ?`).run(steamAppId);
      });
      
      transaction();
      logger.info(`Deleted reviews for steam app ID: ${steamAppId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete reviews for ${steamAppId}:`, error);
      return false;
    }
  }
  
  // 複数ゲームのレビューデータ取得
  static getMultipleGameReviews(steamAppIds: number[]): Map<number, GameReviews | null> {
    const reviewMap = new Map<number, GameReviews | null>();
    
    for (const steamAppId of steamAppIds) {
      const reviews = this.getGameReviews(steamAppId);
      reviewMap.set(steamAppId, reviews);
    }
    
    return reviewMap;
  }
}

export default ReviewModel;