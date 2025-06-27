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
        
        // ITAD APIキーの検証（暫定的に無効化）
        try {
          const isValid = await this.itadAPI.validateApiKey();
          if (isValid) {
            logger.info('ITAD API validated successfully');
          } else {
            logger.warn('ITAD API validation failed, but continuing...');
          }
        } catch (error) {
          logger.warn('ITAD API validation error, but continuing:', error);
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
  async getGamePriceInfo(steamAppId: number, gameName: string): Promise<(PriceHistory & { gameName?: string }) | null> {
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
      let gameType: 'paid' | 'free' | 'unreleased' | 'dlc' | 'removed' = 'paid';
      let actualGameName: string | undefined;

      // 常にSteam APIから詳細情報を取得してゲームタイプを判別
      try {
        const steamDetails = await this.steamAPI.getAppDetails(steamAppId);
        if (steamDetails?.gameType) {
          gameType = steamDetails.gameType;
        }
        if (steamDetails?.data?.name) {
          actualGameName = steamDetails.data.name;
          logger.info(`Got actual game name from Steam API: ${actualGameName} (was: ${gameName})`);
        }
      } catch (error) {
        logger.warn(`Failed to get game type for ${gameName}:`, error);
      }

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

      // ゲームタイプに応じた特別処理（価格の有無に関係なく）
      if (gameType === 'free') {
        logger.info(`${gameName} is a free-to-play game - returning steam_free record`);
        const freeGameRecord = {
          steam_app_id: steamAppId,
          current_price: 0,
          original_price: 0,
          discount_percent: 0,
          historical_low: 0,
          is_on_sale: false,
          source: 'steam_free' as const,
          recorded_at: new Date(),
          gameName: actualGameName
        };
        logger.debug(`Free game record for ${actualGameName || gameName}:`, freeGameRecord);
        return freeGameRecord;
      }
      
      if (gameType === 'unreleased') {
        logger.info(`${gameName} is unreleased (coming soon)`);
        // 未リリースゲームは価格0で記録（リリース日監視用）
        return {
          steam_app_id: steamAppId,
          current_price: 0,
          original_price: 0,
          discount_percent: 0,
          historical_low: 0,
          is_on_sale: false,
          source: 'steam_unreleased',
          recorded_at: new Date(),
          gameName: actualGameName
        };
      }
      
      if (gameType === 'removed') {
        logger.warn(`${gameName} has been removed from Steam store - returning steam_removed record`);
        const removedGameRecord = {
          steam_app_id: steamAppId,
          current_price: 0,
          original_price: 0,
          discount_percent: 0,
          historical_low: 0,
          is_on_sale: false,
          source: 'steam_removed' as const,
          recorded_at: new Date(),
          gameName: actualGameName
        };
        logger.debug(`Removed game record for ${actualGameName || gameName}:`, removedGameRecord);
        return removedGameRecord;
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

      const priceHistory: PriceHistory & { gameName?: string } = {
        steam_app_id: steamAppId,
        current_price: currentPrice,
        original_price: originalPrice,
        discount_percent: discountPercent,
        historical_low: finalHistoricalLow,
        is_on_sale: isOnSale,
        source: itadCurrentPrice > 0 ? 'itad' : 'steam',
        recorded_at: new Date(),
        gameName: actualGameName
      };

      logger.debug(`Price info collected for ${gameName}: Current=${currentPrice}, Historical Low=${finalHistoricalLow}, Sale=${isOnSale}`);
      return priceHistory;

    } catch (error) {
      logger.error(`Failed to get price info for ${gameName}:`, error);
      return null;
    }
  }

  // 複数ゲームの価格情報を取得
  async getMultipleGamePriceInfo(
    games: Array<{ steam_app_id: number; name: string }>, 
    isManualRequest = false,
    onProgress?: (currentGame: string, completed: number, total: number, priceResult?: {
      game: { steam_app_id: number; name: string };
      priceHistory: PriceHistory | null;
      error?: APIError;
    }) => void | Promise<void>
  ): Promise<Array<{
    game: { steam_app_id: number; name: string };
    priceHistory: PriceHistory | null;
    error?: APIError;
  }>> {
    if (!this.isInitialized) {
      throw new Error('API Service not initialized');
    }

    const results = [];
    const batchSize = isManualRequest ? 1 : config.apiConcurrentLimit; // 手動リクエストは1つずつ処理
    const baseDelay = isManualRequest ? 4000 : 1000; // 手動リクエストは4秒間隔
    
    logger.info(`Processing ${games.length} games in batches of ${batchSize} (manual: ${isManualRequest})`);

    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (game, index) => {
        try {
          // バッチ内でも間隔を空ける（手動リクエスト時）
          if (isManualRequest && index > 0) {
            await this.delay(1000);
          }
          
          const priceHistory = await this.getGamePriceInfoWithRetry(game.steam_app_id, game.name);
          const result = {
            game,
            priceHistory
          };
          
          // 進捗コールバックを呼び出し（価格取得完了後）
          if (onProgress) {
            await onProgress(game.name, results.length + index + 1, games.length, result);
          }
          
          return result;
        } catch (error) {
          logger.error(`Error processing ${game.name}:`, error);
          const result = {
            game,
            priceHistory: null,
            error: {
              code: 'PROCESSING_ERROR',
              message: `Failed to process ${game.name}`,
              details: error
            } as APIError
          };
          
          // エラーの場合も進捗コールバックを呼び出し
          if (onProgress) {
            await onProgress(game.name, results.length + index + 1, games.length, result);
          }
          
          return result;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // バッチ間の遅延
      if (i + batchSize < games.length) {
        await this.delay(baseDelay);
      }
    }

    return results;
  }

  // リトライ機能付きの価格情報取得
  private async getGamePriceInfoWithRetry(steamAppId: number, gameName: string, maxRetries = 3): Promise<PriceHistory | null> {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // 指数バックオフ: 2秒、4秒、8秒
          const delayMs = Math.min(2000 * Math.pow(2, attempt), 8000);
          logger.info(`Retrying ${gameName} after ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(delayMs);
        }
        
        return await this.getGamePriceInfo(steamAppId, gameName);
      } catch (error: any) {
        lastError = error;
        
        // レート制限エラーの場合は長めに待つ
        if (error.message && error.message.includes('Too many requests')) {
          logger.warn(`Rate limit hit for ${gameName}, waiting longer...`);
          await this.delay(10000); // 10秒待機
        } else if (attempt === maxRetries - 1) {
          // 最後の試行の場合はエラーを投げる
          throw error;
        }
      }
    }
    
    throw lastError;
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