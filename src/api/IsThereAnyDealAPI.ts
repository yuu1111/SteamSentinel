import { BaseAPI } from './BaseAPI';
import { config } from '../config';
import { ITADGameInfo, ITADPriceInfo, ITADOverview } from '../types';
import logger from '../utils/logger';

export class IsThereAnyDealAPI extends BaseAPI {
  private readonly apiKey: string;
  private readonly region = 'jp';
  private readonly country = 'JP';
  // private readonly currency = 'JPY'; // Currently unused but may be needed for future API calls

  constructor() {
    super('ITAD', 'https://api.isthereanydeal.com');
    
    if (!config.itadApiKey) {
      throw new Error('ITAD_API_KEY is not configured');
    }
    
    this.apiKey = config.itadApiKey;
  }

  // ゲーム情報の取得
  async getGameInfo(steamAppId: number): Promise<ITADGameInfo | null> {
    try {
      const response = await this.get<any>('/v02/game/info/', {
        params: {
          key: this.apiKey,
          plains: `app/${steamAppId}`
        }
      });

      if (response?.data && Object.keys(response.data).length > 0) {
        const gameKey = Object.keys(response.data)[0];
        const gameData = response.data[gameKey];
        
        return {
          app_id: steamAppId.toString(),
          title: gameData.title,
          urls: {
            buy: gameData.urls?.buy || `https://store.steampowered.com/app/${steamAppId}/`
          }
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get game info for ${steamAppId}:`, error);
      throw error;
    }
  }

  // 現在価格の取得
  async getCurrentPrices(steamAppIds: number[]): Promise<Map<number, ITADPriceInfo | null>> {
    try {
      const plains = steamAppIds.map(id => `app/${id}`).join(',');
      
      const response = await this.get<any>('/v01/game/prices/', {
        params: {
          key: this.apiKey,
          plains: plains,
          region: this.region,
          country: this.country,
          shops: 'steam'
        }
      });

      const priceMap = new Map<number, ITADPriceInfo | null>();
      
      for (const appId of steamAppIds) {
        const plain = `app/${appId}`;
        const gameData = response?.data?.[plain];
        
        if (gameData?.list && gameData.list.length > 0) {
          const steamPrice = gameData.list.find((shop: any) => shop.shop.id === 'steam');
          if (steamPrice) {
            priceMap.set(appId, {
              price_new: steamPrice.price_new,
              price_old: steamPrice.price_old,
              price_cut: steamPrice.price_cut,
              url: steamPrice.url,
              shop: steamPrice.shop,
              drm: steamPrice.drm || []
            });
          } else {
            priceMap.set(appId, null);
          }
        } else {
          priceMap.set(appId, null);
        }
      }

      return priceMap;
    } catch (error) {
      logger.error('Failed to get current prices:', error);
      throw error;
    }
  }

  // ゲーム概要（歴代最安値含む）の取得
  async getGameOverview(steamAppId: number): Promise<ITADOverview | null> {
    try {
      const response = await this.get<any>('/v01/game/overview/', {
        params: {
          key: this.apiKey,
          plains: `app/${steamAppId}`,
          region: this.region,
          country: this.country,
          shop: 'steam'
        }
      });

      const plain = `app/${steamAppId}`;
      const overview = response?.data?.[plain];
      
      if (overview) {
        return {
          price: overview.price,
          lowest: overview.lowest,
          bundles: overview.bundles
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get game overview for ${steamAppId}:`, error);
      throw error;
    }
  }

  // バッチで複数ゲームの概要を取得
  async getMultipleGameOverviews(steamAppIds: number[]): Promise<Map<number, ITADOverview | null>> {
    try {
      // APIの制限により、一度に処理できる数を制限
      const batchSize = 20;
      const overviewMap = new Map<number, ITADOverview | null>();
      
      for (let i = 0; i < steamAppIds.length; i += batchSize) {
        const batch = steamAppIds.slice(i, i + batchSize);
        const plains = batch.map(id => `app/${id}`).join(',');
        
        const response = await this.get<any>('/v01/game/overview/', {
          params: {
            key: this.apiKey,
            plains: plains,
            region: this.region,
            country: this.country,
            shop: 'steam'
          }
        });

        for (const appId of batch) {
          const plain = `app/${appId}`;
          const overview = response?.data?.[plain];
          
          if (overview) {
            overviewMap.set(appId, {
              price: overview.price,
              lowest: overview.lowest,
              bundles: overview.bundles
            });
          } else {
            overviewMap.set(appId, null);
          }
        }
      }

      return overviewMap;
    } catch (error) {
      logger.error('Failed to get multiple game overviews:', error);
      throw error;
    }
  }

  // 歴代最安値の取得
  async getHistoricalLow(steamAppId: number): Promise<number | null> {
    try {
      const overview = await this.getGameOverview(steamAppId);
      return overview?.lowest?.price || null;
    } catch (error) {
      logger.error(`Failed to get historical low for ${steamAppId}:`, error);
      return null;
    }
  }

  // セール情報の取得（将来的な拡張用）
  async getDeals(options: {
    limit?: number;
    offset?: number;
    minCut?: number;
    maxPrice?: number;
  } = {}): Promise<any[]> {
    try {
      const response = await this.get<any>('/v01/deals/list/', {
        params: {
          key: this.apiKey,
          region: this.region,
          country: this.country,
          shops: 'steam',
          limit: options.limit || 100,
          offset: options.offset || 0,
          cut: options.minCut || 0,
          price_to: options.maxPrice
        }
      });

      return response?.data?.list || [];
    } catch (error) {
      logger.error('Failed to get deals:', error);
      throw error;
    }
  }

  // ヘルスチェック
  async healthCheck(): Promise<boolean> {
    try {
      // シンプルなAPIリクエストでヘルスチェック
      const response = await this.get<any>('/v02/game/info/', {
        params: {
          key: this.apiKey,
          plains: 'app/730' // CS2を使ってテスト
        }
      });
      
      return !!response?.data;
    } catch (error) {
      logger.error('ITAD API health check failed:', error);
      return false;
    }
  }

  // APIキーの検証
  async validateApiKey(): Promise<boolean> {
    try {
      const isHealthy = await this.healthCheck();
      if (isHealthy) {
        logger.info('ITAD API key validated successfully');
      }
      return isHealthy;
    } catch (error) {
      logger.error('ITAD API key validation failed:', error);
      return false;
    }
  }
}