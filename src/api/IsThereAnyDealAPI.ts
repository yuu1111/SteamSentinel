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
      logger.warn(`No ITAD game ID found for Steam App ID ${steamAppId} in response`);
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

      if (response && Array.isArray(response)) {
        // Steam App IDごとの価格情報を構築
        for (const [steamAppId, gameId] of gameIdMap.entries()) {
          const gameData = response.find((item: any) => item.id === gameId);
          
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
          const overview = {
            price: gameData.current,
            lowest: gameData.lowest,
            bundles: response.bundles || []
          };
          logger.info(`ITAD overview for ${steamAppId}: current=${gameData.current?.price?.amount}, lowest=${gameData.lowest?.price?.amount}`);
          return overview;
        }
      }

      logger.warn(`No price data found in ITAD overview response for ${steamAppId}`);
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
      return overview?.lowest?.price?.amount || null;
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
      logger.info('Starting ITAD API health check');
      
      // まず最もシンプルなパラメータで試す
      const response = await this.get<any>('/deals/v2', {
        params: {
          key: this.apiKey,
          limit: 1
        }
      });
      
      logger.info('ITAD health check response:', {
        hasResponse: !!response,
        responseType: typeof response,
        keys: response ? Object.keys(response) : []
      });
      
      return !!response;
    } catch (error: any) {
      logger.error('ITAD API health check failed:', error);
      if (error?.response) {
        logger.error('Health check error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return false;
    }
  }

  // 高割引ゲームの取得
  async getHighDiscountDeals(options: {
    minDiscount: number;
    limit?: number;
    region?: string;
    maxPrice?: number;
  }): Promise<Array<{
    name: string;
    steam_app_id: number;
    current_price: number;
    original_price: number;
    discount_percent: number;
    review_score?: number;
    review_count?: number;
  }>> {
    try {
      logger.info(`Getting high discount deals with options:`, {
        minDiscount: options.minDiscount,
        limit: options.limit || 100,
        region: options.region || this.country,
        maxPrice: options.maxPrice
      });

      // より基本的なパラメータで試す
      const params: any = {
        key: this.apiKey,
        limit: Math.min(options.limit || 50, 50), // 制限を50に減らす
        offset: 0
      };

      // オプションパラメータを段階的に追加
      if (options.minDiscount && options.minDiscount > 0) {
        params.cut = Math.min(options.minDiscount, 90); // 最大90%に制限
      }

      // 価格制限は一時的に無効化
      // if (options.maxPrice) {
      //   params.price_to = options.maxPrice;
      // }

      // 地域設定を簡素化 - 常に日本に設定
      params.country = options.region || this.country; // JP

      // Steam shopのみに限定
      params.shops = '61';


      const response = await this.get<any>('/deals/v2', { params });


      // デバッグ: 最初の5件のrawデータを出力
      if (response?.list && Array.isArray(response.list) && response.list.length > 0) {
        logger.info(`ITAD API returned ${response.list.length} raw deals, showing first 5:`);
        response.list.slice(0, 5).forEach((deal: any, index: number) => {
          logger.info(`Raw deal ${index + 1}:`, {
            title: deal.title,
            shop: deal.shop,
            plain: deal.plain,
            priceNew: deal.price_new,
            priceOld: deal.price_old,
            priceCut: deal.price_cut,
            url: deal.url
          });
        });
      }

      if (!response?.list || !Array.isArray(response.list)) {
        logger.warn('No deals found in ITAD response or invalid format:', response);
        return [];
      }

      const highDiscountGames = [];
      let steamDealsCount = 0;
      let otherStoresCount = 0;
      let noPlainFieldCount = 0;

      for (const deal of response.list) {
        try {

          // Steam店舗のデータのみを処理
          if (deal.shop?.id === 61 && deal.plain) {
            steamDealsCount++;
            // Steam App IDを抽出（app/123456形式から）
            const appIdMatch = deal.plain.match(/app\/(\d+)/);
            if (!appIdMatch) {
              continue;
            }

            const steamAppId = parseInt(appIdMatch[1], 10);
            
            const gameData = {
              name: deal.title || 'Unknown Game',
              steam_app_id: steamAppId,
              current_price: deal.price_new || 0,
              original_price: deal.price_old || 0,
              discount_percent: deal.price_cut || 0,
              review_score: undefined, // ITADにはレビューデータがないため
              review_count: undefined
            };

            // 基本的な妥当性チェック
            if (gameData.discount_percent >= options.minDiscount && 
                gameData.current_price > 0 && 
                gameData.original_price > gameData.current_price) {
              highDiscountGames.push(gameData);
            }
          } else {
            if (deal.shop?.id !== 61) {
              otherStoresCount++;
            } else if (!deal.plain) {
              noPlainFieldCount++;
            }
          }
        } catch (dealError) {
          logger.warn('Error processing deal:', dealError);
          continue;
        }
      }

      logger.info(`Found ${highDiscountGames.length} high discount games (${options.minDiscount}%+ off)`);
      logger.info(`Statistics: ${steamDealsCount} Steam deals processed, ${otherStoresCount} other stores, ${noPlainFieldCount} without Steam App ID`);
      return highDiscountGames;

    } catch (error: any) {
      logger.error('Failed to get high discount deals:', error);
      if (error?.response) {
        logger.error('Response status:', error.response.status);
        logger.error('Response headers:', error.response.headers);
        logger.error('Response data:', error.response.data);
      }
      throw error;
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