import { IsThereAnyDealAPI } from '../api/IsThereAnyDealAPI';
import { SteamStoreAPI } from '../api/SteamStoreAPI';
import { PriceHistory, APIError } from '../types';
import logger from '../utils/logger';
import { config, getFeatureStatus } from '../config';

export class APIService {
  private itadAPI: IsThereAnyDealAPI | null = null;
  private steamAPI: SteamStoreAPI;
  private isInitialized = false;

  constructor() {
    this.steamAPI = new SteamStoreAPI();
  }

  // 初期化
  async initialize(): Promise<void> {
    try {
      // 機能状況を確認
      const features = getFeatureStatus();
      
      if (features.core.enabled) {
        this.itadAPI = new IsThereAnyDealAPI();
        
        // ITAD APIキーの検証
        const isValid = await this.itadAPI.validateApiKey();
        if (!isValid) {
          throw new Error('ITAD API key validation failed');
        }
        
        logger.info('ITAD API initialized successfully');
      } else {
        logger.error('Core features disabled: ITAD API key not found');
        throw new Error(features.core.message);
      }

      // Steam API ヘルスチェック
      const steamHealthy = await this.steamAPI.healthCheck();
      if (steamHealthy) {
        logger.info('Steam API health check passed');
      } else {
        logger.warn('Steam API health check failed');
      }

      this.isInitialized = true;
      logger.info('API Service initialized successfully');
    } catch (error) {
      logger.error('API Service initialization failed:', error);
      throw error;
    }
  }

  // 単一ゲームの価格情報を取得
  async getGamePriceInfo(steamAppId: number, gameName: string): Promise<PriceHistory | null> {
    if (!this.isInitialized) {
      throw new Error('API Service not initialized');
    }

    try {
      logger.debug(`Getting price info for ${gameName} (${steamAppId})`);

      // 並行して価格情報を取得
      const [itadOverview, steamPrice] = await Promise.allSettled([
        this.itadAPI?.getGameOverview(steamAppId),
        this.steamAPI.getFormattedPriceInfo(steamAppId)
      ]);

      // ITAD結果の処理
      let historicalLow = 0;
      let itadCurrentPrice = 0;
      let itadDiscount = 0;
      let itadOnSale = false;

      if (itadOverview.status === 'fulfilled' && itadOverview.value) {
        const overview = itadOverview.value;
        historicalLow = overview.lowest?.price || 0;
        
        if (overview.price) {
          itadCurrentPrice = overview.price.price;
          itadDiscount = overview.price.cut;
          itadOnSale = itadDiscount > 0;
        }
      } else {
        logger.warn(`ITAD data unavailable for ${gameName}:`, 
          itadOverview.status === 'rejected' ? itadOverview.reason : 'No data');
      }

      // Steam結果の処理
      let steamCurrentPrice = 0;
      let steamOriginalPrice = 0;
      let steamDiscount = 0;
      let steamOnSale = false;

      if (steamPrice.status === 'fulfilled' && steamPrice.value) {
        const price = steamPrice.value;
        steamCurrentPrice = price.currentPrice;
        steamOriginalPrice = price.originalPrice;
        steamDiscount = price.discountPercent;
        steamOnSale = price.isOnSale;
      } else {
        logger.warn(`Steam data unavailable for ${gameName}:`, 
          steamPrice.status === 'rejected' ? steamPrice.reason : 'No data');
      }

      // データの統合（ITADを優先、Steamをフォールバック）
      const currentPrice = itadCurrentPrice > 0 ? itadCurrentPrice : steamCurrentPrice;
      const originalPrice = steamOriginalPrice > 0 ? steamOriginalPrice : currentPrice;
      const discountPercent = itadDiscount > 0 ? itadDiscount : steamDiscount;
      const isOnSale = itadOnSale || steamOnSale;
      
      // 歴代最安値の処理
      const finalHistoricalLow = historicalLow > 0 ? historicalLow : currentPrice;

      if (currentPrice === 0) {
        logger.warn(`No valid price data found for ${gameName}`);
        return null;
      }

      const priceHistory: PriceHistory = {
        steam_app_id: steamAppId,
        current_price: currentPrice,
        original_price: originalPrice,
        discount_percent: discountPercent,
        historical_low: finalHistoricalLow,
        is_on_sale: isOnSale,
        source: itadCurrentPrice > 0 ? 'itad' : 'steam',
        recorded_at: new Date()
      };

      logger.debug(`Price info collected for ${gameName}: Current=${currentPrice}, Historical Low=${finalHistoricalLow}, Sale=${isOnSale}`);
      return priceHistory;

    } catch (error) {
      logger.error(`Failed to get price info for ${gameName}:`, error);
      return null;
    }
  }

  // 複数ゲームの価格情報を取得
  async getMultipleGamePriceInfo(games: Array<{ steam_app_id: number; name: string }>): Promise<Array<{
    game: { steam_app_id: number; name: string };
    priceHistory: PriceHistory | null;
    error?: APIError;
  }>> {
    if (!this.isInitialized) {
      throw new Error('API Service not initialized');
    }

    const results = [];
    const batchSize = config.apiConcurrentLimit;
    
    logger.info(`Processing ${games.length} games in batches of ${batchSize}`);

    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (game) => {
        try {
          const priceHistory = await this.getGamePriceInfo(game.steam_app_id, game.name);
          return {
            game,
            priceHistory
          };
        } catch (error) {
          logger.error(`Error processing ${game.name}:`, error);
          return {
            game,
            priceHistory: null,
            error: {
              code: 'PROCESSING_ERROR',
              message: `Failed to process ${game.name}`,
              details: error
            } as APIError
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // バッチ間の遅延
      if (i + batchSize < games.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  // APIヘルスチェック
  async healthCheck(): Promise<{
    itad: boolean;
    steam: boolean;
    overall: boolean;
  }> {
    const itadHealthy = this.itadAPI ? await this.itadAPI.healthCheck() : false;
    const steamHealthy = await this.steamAPI.healthCheck();
    
    return {
      itad: itadHealthy,
      steam: steamHealthy,
      overall: itadHealthy && steamHealthy
    };
  }

  // 遅延処理
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 初期化状態の確認
  isReady(): boolean {
    return this.isInitialized && this.itadAPI !== null;
  }

  // APIサービスの停止
  shutdown(): void {
    this.isInitialized = false;
    this.itadAPI = null;
    logger.info('API Service shutdown completed');
  }
}