import { BaseAPI } from './BaseAPI';
import { SteamPriceInfo } from '../types';
import logger from '../utils/logger';

export class SteamStoreAPI extends BaseAPI {
  private readonly countryCode = 'JP';

  constructor() {
    // Steam Store APIはレート制限が厳しいため、3秒間隔に設定
    super('Steam', 'https://store.steampowered.com', 3000);
  }

  // 単一ゲームの詳細情報取得（価格 + ゲームタイプ判別）
  async getAppDetails(appId: number): Promise<SteamPriceInfo | null> {
    try {
      const response = await this.get<any>('/api/appdetails', {
        params: {
          appids: appId,
          cc: this.countryCode,
          l: 'japanese',
          filters: 'basic,price_overview,release_date'
        }
      });

      if (response?.[appId]) {
        const appData = response[appId];
        
        if (appData.success && appData.data) {
          const data = appData.data;
          
          // ゲームタイプを判別
          let gameType: 'paid' | 'free' | 'unreleased' | 'dlc' | 'removed' = 'paid';
          
          if (data.is_free) {
            gameType = 'free';
          } else if (data.release_date?.coming_soon) {
            gameType = 'unreleased';
          } else if (data.type === 'dlc') {
            gameType = 'dlc';
          } else if (!data.price_overview && !data.is_free) {
            gameType = 'removed';
          }
          
          return {
            success: true,
            data: {
              price_overview: data.price_overview,
              type: data.type,
              is_free: data.is_free,
              release_date: data.release_date,
              name: data.name,
              steam_appid: data.steam_appid
            },
            gameType
          };
        }
      }

      return {
        success: false,
        gameType: 'removed'
      };
    } catch (error) {
      logger.error(`Failed to get Steam app details for ${appId}:`, error);
      return null;
    }
  }

  // 複数ゲームの価格情報を取得（バッチ処理）
  async getMultipleAppDetails(appIds: number[]): Promise<Map<number, SteamPriceInfo | null>> {
    const priceMap = new Map<number, SteamPriceInfo | null>();
    
    // Steam APIは一度に1つのアプリしか処理できないため、順次処理
    for (const appId of appIds) {
      try {
        const priceInfo = await this.getAppDetails(appId);
        priceMap.set(appId, priceInfo);
      } catch (error) {
        logger.error(`Failed to get price for app ${appId}:`, error);
        priceMap.set(appId, null);
      }
    }

    return priceMap;
  }

  // 価格を円に変換（通貨によって単位が異なる）
  private convertPriceToYen(price: number, currency: string = 'JPY'): number {
    // Steam APIは通貨によって異なる単位で価格を返す
    // JPY: センチ単位（100で割る必要あり）
    // USD, EUR: セント単位（100で割る必要あり）
    if (currency === 'JPY') {
      // 日本円はセンチ単位で返されるため100で割る
      return Math.round(price / 100);
    }
    
    // その他の通貨もセント単位なので100で割る
    return Math.round(price / 100);
  }

  // フォーマット済み価格情報の取得
  async getFormattedPriceInfo(appId: number): Promise<{
    currentPrice: number;
    originalPrice: number;
    discountPercent: number;
    isOnSale: boolean;
    formatted: {
      current: string;
      original: string;
    };
  } | null> {
    try {
      const priceInfo = await this.getAppDetails(appId);
      
      if (!priceInfo?.success || !priceInfo.data?.price_overview) {
        return null;
      }

      const priceOverview = priceInfo.data.price_overview;
      
      
      return {
        currentPrice: this.convertPriceToYen(priceOverview.final, priceOverview.currency),
        originalPrice: this.convertPriceToYen(priceOverview.initial, priceOverview.currency),
        discountPercent: priceOverview.discount_percent,
        isOnSale: priceOverview.discount_percent > 0,
        formatted: {
          current: priceOverview.final_formatted,
          original: priceOverview.initial_formatted
        }
      };
    } catch (error) {
      logger.error(`Failed to get formatted price for ${appId}:`, error);
      return null;
    }
  }

  // ゲームの基本情報取得（名前、画像など - 将来の拡張用）
  async getAppInfo(appId: number): Promise<{
    name: string;
    headerImage: string;
    capsuleImage: string;
    type: string;
  } | null> {
    try {
      const response = await this.get<any>('/api/appdetails', {
        params: {
          appids: appId,
          cc: this.countryCode,
          l: 'japanese'
        }
      });

      if (response?.[appId]?.success && response[appId].data) {
        const data = response[appId].data;
        
        return {
          name: data.name,
          headerImage: data.header_image,
          capsuleImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`,
          type: data.type
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get app info for ${appId}:`, error);
      return null;
    }
  }

  // ヘルスチェック
  async healthCheck(): Promise<boolean> {
    try {
      // 人気ゲーム（CS2）でテスト
      const response = await this.getAppDetails(730);
      return response !== null && response.success !== undefined;
    } catch (error) {
      logger.error('Steam API health check failed:', error);
      return false;
    }
  }

  // ゲームが存在するかチェック
  async isValidAppId(appId: number): Promise<boolean> {
    try {
      const response = await this.get<any>('/api/appdetails', {
        params: {
          appids: appId
        }
      });

      return response?.[appId]?.success === true;
    } catch (error) {
      logger.error(`Failed to validate app ID ${appId}:`, error);
      return false;
    }
  }

  // ゲーム基本情報取得（レビュー・リリース日・Metacritic等）
  async getGameInfo(appId: number): Promise<{
    name?: string;
    coming_soon?: boolean;
    release_date?: string;
    positive_reviews?: number;
    negative_reviews?: number;
    metacritic_score?: number;
    metacritic_url?: string;
  } | null> {
    try {
      // ゲーム基本情報取得
      const detailsResponse = await this.get<any>('/api/appdetails', {
        params: {
          appids: appId,
          cc: this.countryCode,
          l: 'japanese',
          filters: 'basic,release_date,metacritic'
        }
      });

      let gameInfo: any = {};
      
      if (detailsResponse?.[appId]?.success && detailsResponse[appId].data) {
        const data = detailsResponse[appId].data;
        gameInfo = {
          name: data.name,
          coming_soon: data.release_date?.coming_soon || false,
          release_date: data.release_date?.date,
          positive_reviews: 0,
          negative_reviews: 0,
          metacritic_score: data.metacritic?.score,
          metacritic_url: data.metacritic?.url
        };
      }

      // レビュー数取得（Steam Reviews API）
      try {
        const reviewsResponse = await this.get<any>('/appreviews/' + appId, {
          params: {
            json: 1,
            language: 'all',
            purchase_type: 'all',
            num_per_page: 20, // 少数のレビューサンプルを取得
            filter: 'recent' // 最近のレビューを取得
          }
        });

        if (reviewsResponse?.query_summary) {
          const totalReviews = reviewsResponse.query_summary.total_reviews || 0;
          const totalPositive = reviewsResponse.query_summary.total_positive || 0;
          const totalNegative = totalReviews - totalPositive; // Steam APIでは必ず一致
          
          gameInfo.positive_reviews = totalPositive;
          gameInfo.negative_reviews = totalNegative;
          
          // レビューの詳細情報も保存（ReviewIntegrationServiceで使用）
          gameInfo.review_score_desc = reviewsResponse.query_summary.review_score_desc || 'No user reviews';
          gameInfo.review_percentage = totalReviews > 0 ? Math.round((totalPositive / totalReviews) * 100) : 0;
          
        }
      } catch (reviewError) {
        logger.warn(`Failed to get review counts for ${appId}:`, reviewError);
        // レビュー取得失敗は致命的ではない
      }

      return gameInfo.name ? gameInfo : null;
    } catch (error) {
      logger.error(`Failed to get game info for ${appId}:`, error);
      return null;
    }
  }

  // 詳細なゲーム情報取得（説明、開発者、ジャンル等）
  async getDetailedGameInfo(appId: number): Promise<{
    short_description?: string;
    detailed_description?: string;
    developers?: string[];
    publishers?: string[];
    categories?: Array<{ id: number; description: string }>;
    genres?: Array<{ id: number; description: string }>;
    platforms?: {
      windows?: boolean;
      mac?: boolean;
      linux?: boolean;
    };
    release_date?: {
      coming_soon: boolean;
      date: string;
    };
    required_age?: number;
    achievements?: {
      total: number;
      highlighted?: Array<{
        name: string;
        path: string;
      }>;
    };
    screenshots?: Array<{
      id: number;
      path_thumbnail: string;
      path_full: string;
    }>;
  } | null> {
    try {
      const response = await this.get<any>('/api/appdetails', {
        params: {
          appids: appId,
          cc: this.countryCode,
          l: 'japanese'
        }
      });

      if (response?.[appId]?.success && response[appId].data) {
        const data = response[appId].data;
        
        return {
          short_description: data.short_description,
          detailed_description: data.detailed_description,
          developers: data.developers,
          publishers: data.publishers,
          categories: data.categories,
          genres: data.genres,
          platforms: data.platforms,
          release_date: data.release_date,
          required_age: data.required_age,
          achievements: data.achievements,
          screenshots: data.screenshots?.map((screenshot: any) => ({
            id: screenshot.id,
            path_thumbnail: screenshot.path_thumbnail,
            path_full: screenshot.path_full
          }))
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get detailed game info for ${appId}:`, error);
      return null;
    }
  }
}