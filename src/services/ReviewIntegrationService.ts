import { SteamStoreAPI } from '../api/SteamStoreAPI';
import IGDBService from './IGDBService';
import ReviewModel, { GameReviews, ReviewScore } from '../models/ReviewModel';
import logger from '../utils/logger';

// これらの型はReviewModelから再エクスポート
export { GameReviews, ReviewScore } from '../models/ReviewModel';

export class ReviewIntegrationService {
  private steamAPI: SteamStoreAPI;
  private memoryCache = new Map<number, GameReviews>();
  private memoryCacheTimeout = 5 * 60 * 1000; // 5分（メモリキャッシュは短期）
  private dbCacheTimeout = 24; // 24時間（データベースキャッシュ）

  constructor() {
    this.steamAPI = new SteamStoreAPI();
  }

  // ゲームのレビュー統合情報を取得
  async getGameReviews(steamAppId: number, gameName: string): Promise<GameReviews | null> {
    try {
      // メモリキャッシュをチェック
      const memoryCached = this.memoryCache.get(steamAppId);
      if (memoryCached && Date.now() - memoryCached.lastUpdated.getTime() < this.memoryCacheTimeout) {
        logger.debug(`Memory cache hit for ${gameName} (${steamAppId})`);
        return memoryCached;
      }

      // データベースキャッシュをチェック
      if (ReviewModel.isReviewCacheValid(steamAppId, this.dbCacheTimeout)) {
        const dbCached = ReviewModel.getGameReviews(steamAppId);
        if (dbCached) {
          logger.debug(`Database cache hit for ${gameName} (${steamAppId})`);
          // メモリキャッシュにも保存
          this.memoryCache.set(steamAppId, dbCached);
          return dbCached;
        }
      }

      logger.info(`Fetching fresh reviews for ${gameName} (${steamAppId})`);

      const reviews: ReviewScore[] = [];

      // Steam レビューとMetacriticスコアを取得
      const steamData = await this.getSteamReview(steamAppId);
      if (steamData.steamReview) {
        reviews.push(steamData.steamReview);
      }
      
      // SteamからのMetacriticスコア（唯一のプロバイダー）
      if (steamData.metacriticReview) {
        reviews.push(steamData.metacriticReview);
      }

      // IGDB レビューを取得（IGDBスコアのみ、Metacriticは除外）
      const igdbReviews = await this.getIGDBReviews(gameName, steamAppId);
      reviews.push(...igdbReviews);

      // OpenCritic サポート削除

      // 統合スコアを計算
      const aggregateScore = this.calculateAggregateScore(reviews);

      const gameReviews: GameReviews = {
        steamAppId,
        gameName,
        reviews,
        aggregateScore,
        lastUpdated: new Date()
      };

      // データベースに保存
      const saved = ReviewModel.saveGameReviews(gameReviews);
      if (saved) {
        logger.info(`Saved reviews to database for ${gameName} (${steamAppId})`);
      } else {
        logger.warn(`Failed to save reviews to database for ${gameName} (${steamAppId})`);
      }

      // メモリキャッシュに保存
      this.memoryCache.set(steamAppId, gameReviews);

      return gameReviews;

    } catch (error) {
      logger.error(`Failed to get reviews for ${gameName} (${steamAppId}):`, error);
      return null;
    }
  }

  // Steam レビューを取得（Metacriticスコアも含む）
  private async getSteamReview(steamAppId: number): Promise<{ steamReview: ReviewScore | null; metacriticReview: ReviewScore | null }> {
    try {
      const gameInfo = await this.steamAPI.getGameInfo(steamAppId);
      
      let steamReview: ReviewScore | null = null;
      let metacriticReview: ReviewScore | null = null;
      
      // Steamレビュー
      if (gameInfo?.positive_reviews !== undefined && gameInfo?.negative_reviews !== undefined) {
        const totalReviews = gameInfo.positive_reviews + gameInfo.negative_reviews;
        const positivePercent = totalReviews > 0 ? 
          Math.round((gameInfo.positive_reviews / totalReviews) * 100) : 0;

        steamReview = {
          source: 'steam',
          score: positivePercent,
          maxScore: 100,
          reviewCount: totalReviews,
          description: this.getSteamReviewDescription(positivePercent, totalReviews),
          url: `https://store.steampowered.com/app/${steamAppId}/`
        };
      }
      
      // SteamからのMetacriticスコア（最も正確）
      if (gameInfo?.metacritic_score) {
        metacriticReview = {
          source: 'metacritic',
          score: gameInfo.metacritic_score,
          maxScore: 100,
          description: this.getMetacriticDescription(gameInfo.metacritic_score),
          url: gameInfo.metacritic_url || `https://www.metacritic.com/search/game/${encodeURIComponent(gameInfo.name || '')}/`
        };
        logger.info(`Found Metacritic score from Steam for ${gameInfo.name}: ${gameInfo.metacritic_score}`);
      }

      return { steamReview, metacriticReview };
    } catch (error) {
      logger.error(`Failed to get Steam review for ${steamAppId}:`, error);
      return { steamReview: null, metacriticReview: null };
    }
  }

  // Steamレビューの説明文を生成
  private getSteamReviewDescription(positivePercent: number, totalReviews: number): string {
    let description = '';
    
    if (positivePercent >= 95) {
      description = '圧倒的に好評';
    } else if (positivePercent >= 80) {
      description = '非常に好評';
    } else if (positivePercent >= 70) {
      description = 'おおむね好評';
    } else if (positivePercent >= 40) {
      description = '賛否両論';
    } else {
      description = 'おおむね不評';
    }

    if (totalReviews < 10) {
      description += ' (レビュー少数)';
    } else if (totalReviews > 10000) {
      description += ' (多数のレビュー)';
    }

    return description;
  }

  // IGDB レビューを取得（IGDBスコアのみ）
  private async getIGDBReviews(gameName: string, steamAppId?: number): Promise<ReviewScore[]> {
    const reviews: ReviewScore[] = [];
    
    try {
      // IGDBが設定されている場合は実際のAPIを使用
      if (IGDBService.isConfigured()) {
        logger.debug(`Attempting to get IGDB reviews for "${gameName}"${steamAppId ? ` (Steam ID: ${steamAppId})` : ''}`);
        
        const ratings = await IGDBService.getGameRatings(gameName, steamAppId);
        
        // IGDBスコア（複数の評価を個別に表示）
        if (ratings.igdbRating) {
          logger.info(`Found IGDB score for "${gameName}": ${ratings.igdbRating}`);
          reviews.push({
            source: 'igdb',
            score: ratings.igdbRating,
            maxScore: 100,
            reviewCount: ratings.igdbRatingCount,
            description: this.getIGDBDescription(ratings.igdbRating),
            url: ratings.url || `https://www.igdb.com/search?type=1&q=${encodeURIComponent(gameName)}`
          });
        }
        
        if (reviews.length === 0) {
          logger.debug(`No IGDB scores found for "${gameName}"`);
        }
      } else {
        logger.warn('IGDB not configured, skipping IGDB review fetch');
      }

      return reviews;
    } catch (error) {
      logger.error(`Failed to get IGDB reviews for ${gameName}:`, error);
      return reviews;
    }
  }

  // Metacriticスコアの説明文を生成
  private getMetacriticDescription(score: number): string {
    if (score >= 90) {
      return 'Universal Acclaim';
    } else if (score >= 75) {
      return 'Generally Favorable';
    } else if (score >= 50) {
      return 'Mixed Reviews';
    } else {
      return 'Generally Unfavorable';
    }
  }

  // IGDBスコアの説明文を生成
  private getIGDBDescription(score: number): string {
    if (score >= 90) {
      return 'Exceptional';
    } else if (score >= 80) {
      return 'Great';
    } else if (score >= 70) {
      return 'Good';
    } else if (score >= 60) {
      return 'Above Average';
    } else if (score >= 50) {
      return 'Average';
    } else {
      return 'Below Average';
    }
  }

  // OpenCritic サポートは削除されました

  // 統合スコアを計算
  private calculateAggregateScore(reviews: ReviewScore[]): number {
    if (reviews.length === 0) {return 0;}

    // 重み付けスコア計算
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const review of reviews) {
      const normalizedScore = (review.score / review.maxScore) * 100;
      let weight = 1;

      // ソースによる重み付け
      switch (review.source) {
        case 'steam':
          weight = review.reviewCount && review.reviewCount > 1000 ? 2 : 1.5;
          break;
        case 'metacritic':
          weight = 2.0;
          break;
        case 'igdb':
          weight = 1.8;
          break;
      }

      totalWeightedScore += normalizedScore * weight;
      totalWeight += weight;
    }

    return Math.round(totalWeightedScore / totalWeight);
  }

  // 複数ゲームのレビューを一括取得
  async getMultipleGameReviews(games: Array<{ steamAppId: number; name: string }>): Promise<Map<number, GameReviews | null>> {
    // データベースから一括取得を試行
    const steamAppIds = games.map(g => g.steamAppId);
    const dbReviews = ReviewModel.getMultipleGameReviews(steamAppIds);
    
    const reviewMap = new Map<number, GameReviews | null>();
    const needsFetch: Array<{ steamAppId: number; name: string }> = [];
    
    // キャッシュヒット判定
    for (const game of games) {
      const dbReview = dbReviews.get(game.steamAppId);
      
      if (dbReview && ReviewModel.isReviewCacheValid(game.steamAppId, this.dbCacheTimeout)) {
        reviewMap.set(game.steamAppId, dbReview);
        this.memoryCache.set(game.steamAppId, dbReview); // メモリキャッシュにも保存
      } else {
        needsFetch.push(game);
      }
    }
    
    // 新規取得が必要なゲームのみ並列処理
    if (needsFetch.length > 0) {
      logger.info(`Fetching fresh reviews for ${needsFetch.length} games`);
      
      const promises = needsFetch.map(async (game) => {
        const reviews = await this.getGameReviews(game.steamAppId, game.name);
        return { steamAppId: game.steamAppId, reviews };
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        const game = needsFetch[index];
        if (result.status === 'fulfilled') {
          reviewMap.set(game.steamAppId, result.value.reviews);
        } else {
          logger.error(`Failed to get reviews for ${game.name}:`, result.reason);
          reviewMap.set(game.steamAppId, null);
        }
      });
    }

    return reviewMap;
  }

  // キャッシュクリア
  clearCache(): void {
    this.memoryCache.clear();
    logger.info('Memory review cache cleared');
  }

  // データベースキャッシュクリア
  clearDatabaseCache(): void {
    // 古いレビューデータを削除（30日以上前）
    const deletedCount = ReviewModel.cleanupOldReviews(30);
    logger.info(`Database review cache cleanup: ${deletedCount} records deleted`);
  }

  // 統計情報取得
  getStatistics(): {
    memoryCachedGames: number;
    memoryCacheSize: number;
    databaseStats: {
      totalGamesWithReviews: number;
      reviewSourceStats: { source: string; count: number }[];
      averageAggregateScore: number;
      lastUpdateTime: string | null;
    };
  } {
    const dbStats = ReviewModel.getStatistics();
    
    return {
      memoryCachedGames: this.memoryCache.size,
      memoryCacheSize: this.memoryCache.size * 1024, // 概算
      databaseStats: dbStats
    };
  }
}

export default new ReviewIntegrationService();