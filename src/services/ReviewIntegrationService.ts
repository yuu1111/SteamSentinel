import { SteamStoreAPI } from '../api/SteamStoreAPI';
import logger from '../utils/logger';

export interface ReviewScore {
  source: 'steam' | 'metacritic' | 'opencritic';
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
  aggregateScore: number; // 0-100の統合スコア
  lastUpdated: Date;
}

export class ReviewIntegrationService {
  private steamAPI: SteamStoreAPI;
  private reviewCache = new Map<number, GameReviews>();
  private cacheTimeout = 24 * 60 * 60 * 1000; // 24時間

  constructor() {
    this.steamAPI = new SteamStoreAPI();
  }

  // ゲームのレビュー統合情報を取得
  async getGameReviews(steamAppId: number, gameName: string): Promise<GameReviews | null> {
    try {
      // キャッシュをチェック
      const cached = this.reviewCache.get(steamAppId);
      if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheTimeout) {
        return cached;
      }

      logger.info(`Fetching reviews for ${gameName} (${steamAppId})`);

      const reviews: ReviewScore[] = [];

      // Steam レビューを取得
      const steamReview = await this.getSteamReview(steamAppId);
      if (steamReview) {
        reviews.push(steamReview);
      }

      // Metacritic レビューを取得（OpenCritic APIをフォールバックとして使用）
      const metacriticReview = await this.getMetacriticReview(gameName);
      if (metacriticReview) {
        reviews.push(metacriticReview);
      }

      // OpenCritic レビューを取得
      const opencriticReview = await this.getOpenCriticReview(gameName);
      if (opencriticReview) {
        reviews.push(opencriticReview);
      }

      // 統合スコアを計算
      const aggregateScore = this.calculateAggregateScore(reviews);

      const gameReviews: GameReviews = {
        steamAppId,
        gameName,
        reviews,
        aggregateScore,
        lastUpdated: new Date()
      };

      // キャッシュに保存
      this.reviewCache.set(steamAppId, gameReviews);

      return gameReviews;

    } catch (error) {
      logger.error(`Failed to get reviews for ${gameName} (${steamAppId}):`, error);
      return null;
    }
  }

  // Steam レビューを取得
  private async getSteamReview(steamAppId: number): Promise<ReviewScore | null> {
    try {
      const gameInfo = await this.steamAPI.getGameInfo(steamAppId);
      
      if (gameInfo?.positive_reviews !== undefined && gameInfo?.negative_reviews !== undefined) {
        const totalReviews = gameInfo.positive_reviews + gameInfo.negative_reviews;
        const positivePercent = totalReviews > 0 ? 
          Math.round((gameInfo.positive_reviews / totalReviews) * 100) : 0;

        return {
          source: 'steam',
          score: positivePercent,
          maxScore: 100,
          reviewCount: totalReviews,
          description: this.getSteamReviewDescription(positivePercent, totalReviews),
          url: `https://store.steampowered.com/app/${steamAppId}/`
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get Steam review for ${steamAppId}:`, error);
      return null;
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

  // Metacritic レビューを取得（シミュレーション）
  private async getMetacriticReview(gameName: string): Promise<ReviewScore | null> {
    try {
      // 実際のプロダクションでは Metacritic API または スクレイピングを使用
      // ここではデモンストレーション用のシミュレーション
      
      // よく知られたゲームの場合はサンプルスコアを返す
      const knownGames: Record<string, number> = {
        'Cyberpunk 2077': 86,
        'The Witcher 3: Wild Hunt': 93,
        'Baldur\'s Gate 3': 96,
        'Grand Theft Auto V': 97,
        'Dark Souls III': 89
      };

      const score = knownGames[gameName];
      if (score) {
        return {
          source: 'metacritic',
          score,
          maxScore: 100,
          description: this.getMetacriticDescription(score),
          url: `https://www.metacritic.com/search/game/${encodeURIComponent(gameName)}/`
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get Metacritic review for ${gameName}:`, error);
      return null;
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

  // OpenCritic レビューを取得
  private async getOpenCriticReview(gameName: string): Promise<ReviewScore | null> {
    try {
      // OpenCritic API は無料で利用可能
      // const searchUrl = `https://opencritic-api.p.rapidapi.com/game/search?criteria=${encodeURIComponent(gameName)}`;
      
      // 実際のAPI呼び出しは省略（APIキーが必要）
      // ここではサンプルデータを返す
      
      const knownGames: Record<string, { score: number; reviewCount: number }> = {
        'Cyberpunk 2077': { score: 78, reviewCount: 142 },
        'The Witcher 3: Wild Hunt': { score: 93, reviewCount: 156 },
        'Baldur\'s Gate 3': { score: 96, reviewCount: 89 },
        'Elden Ring': { score: 94, reviewCount: 178 }
      };

      const gameData = knownGames[gameName];
      if (gameData) {
        return {
          source: 'opencritic',
          score: gameData.score,
          maxScore: 100,
          reviewCount: gameData.reviewCount,
          description: this.getOpenCriticDescription(gameData.score),
          url: `https://opencritic.com/search?criteria=${encodeURIComponent(gameName)}`
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get OpenCritic review for ${gameName}:`, error);
      return null;
    }
  }

  // OpenCriticスコアの説明文を生成
  private getOpenCriticDescription(score: number): string {
    if (score >= 90) {
      return 'Mighty';
    } else if (score >= 80) {
      return 'Strong';
    } else if (score >= 70) {
      return 'Fair';
    } else if (score >= 60) {
      return 'Weak';
    } else {
      return 'Awful';
    }
  }

  // 統合スコアを計算
  private calculateAggregateScore(reviews: ReviewScore[]): number {
    if (reviews.length === 0) return 0;

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
          weight = 1.8;
          break;
        case 'opencritic':
          weight = 1.5;
          break;
      }

      totalWeightedScore += normalizedScore * weight;
      totalWeight += weight;
    }

    return Math.round(totalWeightedScore / totalWeight);
  }

  // 複数ゲームのレビューを一括取得
  async getMultipleGameReviews(games: Array<{ steamAppId: number; name: string }>): Promise<Map<number, GameReviews | null>> {
    const reviewMap = new Map<number, GameReviews | null>();
    
    // 並列処理で複数ゲームのレビューを取得
    const promises = games.map(async (game) => {
      const reviews = await this.getGameReviews(game.steamAppId, game.name);
      return { steamAppId: game.steamAppId, reviews };
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const game = games[index];
      if (result.status === 'fulfilled') {
        reviewMap.set(game.steamAppId, result.value.reviews);
      } else {
        logger.error(`Failed to get reviews for ${game.name}:`, result.reason);
        reviewMap.set(game.steamAppId, null);
      }
    });

    return reviewMap;
  }

  // キャッシュクリア
  clearCache(): void {
    this.reviewCache.clear();
    logger.info('Review cache cleared');
  }

  // 統計情報取得
  getStatistics(): {
    cachedGames: number;
    cacheSize: number;
  } {
    return {
      cachedGames: this.reviewCache.size,
      cacheSize: this.reviewCache.size * 1024 // 概算
    };
  }
}

export default new ReviewIntegrationService();