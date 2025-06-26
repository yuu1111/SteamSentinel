import { BaseAPI } from './BaseAPI';
import { config } from '../config';
import { ITADGameInfo, ITADPriceInfo, ITADOverview } from '../types';
import logger from '../utils/logger';

export class IsThereAnyDealAPI extends BaseAPI {
  private readonly apiKey: string;
  private readonly country = 'JP';

  constructor() {
    super('ITAD', 'https://api.isthereanydeal.com');
    
    if (!config.itadApiKey) {
      throw new Error('ITAD_API_KEY is not configured');
    }
    
    this.apiKey = config.itadApiKey;
  }

  // Steam App IDからITAD Game IDを取得
  private async lookupGameId(steamAppId: number): Promise<string | null> {
    try {
      const response = await this.post<any>('/lookup/id/shop/61/v1', [`app/${steamAppId}`], {
        params: {
          key: this.apiKey
        }
      });

      const plain = `app/${steamAppId}`;
      if (response && response[plain]) {
        return response[plain];
      }
      return null;
    } catch (error) {
      logger.error(`Failed to lookup game ID for Steam App ID ${steamAppId}:`, error);
      return null;
    }
  }

  // ゲーム情報の取得（新API v3を使用）
  async getGameInfo(steamAppId: number): Promise<ITADGameInfo | null> {
    try {
      const gameId = await this.lookupGameId(steamAppId);
      if (!gameId) {
        logger.warn(`Game ID not found for Steam App ID ${steamAppId}`);
        return null;
      }

      const response = await this.get<any>('/games/info/v2', {
        params: {
          key: this.apiKey,
          id: gameId
        }
      });

      if (response) {
        return {
          app_id: steamAppId.toString(),
          title: response.title,
          urls: {
            buy: `https://store.steampowered.com/app/${steamAppId}/`
          }
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get game info for ${steamAppId}:`, error);
      throw error;
    }
  }

  // 複数のSteam App IDをバッチでITAD Game IDに変換
  private async lookupMultipleGameIds(steamAppIds: number[]): Promise<Map<number, string>> {
    const gameIdMap = new Map<number, string>();
    
    try {
      // バッチサイズを制限（APIの制限を考慮）
      const batchSize = 50;
      for (let i = 0; i < steamAppIds.length; i += batchSize) {
        const batch = steamAppIds.slice(i, i + batchSize);
        const steamPlains = batch.map(id => `app/${id}`);
        
        const response = await this.post<any>('/lookup/id/shop/61/v1', steamPlains, {
          params: {
            key: this.apiKey
          }
        });

        if (response && typeof response === 'object') {
          for (const appId of batch) {
            const plain = `app/${appId}`;
            if (response[plain]) {
              gameIdMap.set(appId, response[plain]);
            }
          }
        }
        
        // レート制限を考慮して少し待機
        if (i + batchSize < steamAppIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      logger.error('Failed to lookup multiple game IDs:', error);
    }
    
    return gameIdMap;
  }

  // 現在価格の取得（新API v3を使用）
  async getCurrentPrices(steamAppIds: number[]): Promise<Map<number, ITADPriceInfo | null>> {
    try {
      const gameIdMap = await this.lookupMultipleGameIds(steamAppIds);
      const priceMap = new Map<number, ITADPriceInfo | null>();
      
      if (gameIdMap.size === 0) {
        // すべてのAppIDでnullを返す
        steamAppIds.forEach(appId => priceMap.set(appId, null));
        return priceMap;
      }

      const gameIds = Array.from(gameIdMap.values());
      
      const response = await this.post<any>('/games/prices/v3', gameIds, {
        params: {
          key: this.apiKey,
          country: this.country,
          shops: '61' // Steam shop ID
        }
      });

      if (response) {
        // Steam App IDごとの価格情報を構築
        for (const [steamAppId, gameId] of gameIdMap.entries()) {
          const gameData = response[gameId];
          
          if (gameData?.deals && gameData.deals.length > 0) {
            const steamDeal = gameData.deals.find((deal: any) => deal.shop?.id === 61);
            if (steamDeal) {
              priceMap.set(steamAppId, {
                price_new: steamDeal.price?.amount || 0,
                price_old: steamDeal.regular?.amount || 0,
                price_cut: steamDeal.cut || 0,
                url: steamDeal.url || `https://store.steampowered.com/app/${steamAppId}/`,
                shop: { id: 'steam', name: 'Steam' },
                drm: steamDeal.drm || []
              });
            } else {
              priceMap.set(steamAppId, null);
            }
          } else {
            priceMap.set(steamAppId, null);
          }
        }
        
        // 見つからなかったAppIDに対してnullをセット
        steamAppIds.forEach(appId => {
          if (!priceMap.has(appId)) {
            priceMap.set(appId, null);
          }
        });
      }

      return priceMap;
    } catch (error) {
      logger.error('Failed to get current prices:', error);
      throw error;
    }
  }

  // ゲーム概要（歴代最安値含む）の取得（新API v2を使用）
  async getGameOverview(steamAppId: number): Promise<ITADOverview | null> {
    try {
      const gameId = await this.lookupGameId(steamAppId);
      if (!gameId) {
        logger.warn(`Game ID not found for Steam App ID ${steamAppId}`);
        return null;
      }

      const response = await this.post<any>('/games/overview/v2', [gameId], {
        params: {
          key: this.apiKey,
          country: this.country,
          shops: '61' // Steam shop ID
        }
      });

      if (response?.prices && response.prices.length > 0) {
        const gameData = response.prices.find((p: any) => p.id === gameId);
        if (gameData) {
          return {
            price: gameData.current,
            lowest: gameData.lowest,
            bundles: response.bundles || []
          };
        }
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get game overview for ${steamAppId}:`, error);
      throw error;
    }
  }

  // バッチで複数ゲームの概要を取得（新APIを使用）
  async getMultipleGameOverviews(steamAppIds: number[]): Promise<Map<number, ITADOverview | null>> {
    try {
      const gameIdMap = await this.lookupMultipleGameIds(steamAppIds);
      const overviewMap = new Map<number, ITADOverview | null>();
      
      if (gameIdMap.size === 0) {
        // すべてのAppIDでnullを返す
        steamAppIds.forEach(appId => overviewMap.set(appId, null));
        return overviewMap;
      }

      // APIの制限により、一度に処理できる数を制限
      const batchSize = 20;
      const gameIds = Array.from(gameIdMap.values());
      
      for (let i = 0; i < gameIds.length; i += batchSize) {
        const batch = gameIds.slice(i, i + batchSize);
        
        const response = await this.post<any>('/games/overview/v2', batch, {
          params: {
            key: this.apiKey,
            country: this.country,
            shops: '61' // Steam shop ID
          }
        });

        if (response?.prices) {
          for (const gameId of batch) {
            // Game IDからSteam App IDを逆引き
            const steamAppId = Array.from(gameIdMap.entries())
              .find(([_, id]) => id === gameId)?.[0];
            
            if (steamAppId) {
              const gameData = response.prices.find((p: any) => p.id === gameId);
              if (gameData) {
                overviewMap.set(steamAppId, {
                  price: gameData.current,
                  lowest: gameData.lowest,
                  bundles: response.bundles || []
                });
              } else {
                overviewMap.set(steamAppId, null);
              }
            }
          }
        }
        
        // レート制限を考慮して少し待機
        if (i + batchSize < gameIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 見つからなかったAppIDに対してnullをセット
      steamAppIds.forEach(appId => {
        if (!overviewMap.has(appId)) {
          overviewMap.set(appId, null);
        }
      });

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

  // セール情報の取得（新API v2を使用）
  async getDeals(options: {
    limit?: number;
    offset?: number;
    minCut?: number;
    maxPrice?: number;
  } = {}): Promise<any[]> {
    try {
      const response = await this.get<any>('/deals/v2', {
        params: {
          key: this.apiKey,
          country: this.country,
          shops: '61', // Steam shop ID
          limit: options.limit || 100,
          offset: options.offset || 0,
          cut: options.minCut || 0,
          price_to: options.maxPrice
        }
      });

      return response || [];
    } catch (error) {
      logger.error('Failed to get deals:', error);
      throw error;
    }
  }

  // ヘルスチェック（新APIを使用）
  async healthCheck(): Promise<boolean> {
    try {
      // より軽量なエンドポイントでヘルスチェック
      const response = await this.get<any>('/deals/v2', {
        params: {
          key: this.apiKey,
          country: this.country,
          limit: 1
        }
      });
      
      return !!response;
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