import { GameModel } from '../models/Game';
import { PriceHistoryModel } from '../models/PriceHistory';
import { AlertModel } from '../models/Alert';
import { APIService } from './APIService';
import { Game, PriceHistory, Alert, MonitoringResult } from '../types';
import { config } from '../config';
import logger from '../utils/logger';

export class MonitoringService {
  private apiService: APIService;
  private isRunning = false;
  private lastRunTime: Date | null = null;

  constructor() {
    this.apiService = new APIService();
  }

  // 初期化
  async initialize(): Promise<void> {
    await this.apiService.initialize();
    logger.info('Monitoring Service initialized');
  }

  // 全ゲームの監視実行
  async runMonitoring(isManualRequest = false): Promise<MonitoringResult[]> {
    if (this.isRunning) {
      logger.warn('Monitoring already in progress, skipping this run');
      return [];
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      logger.info('Starting price monitoring cycle');
      
      // 有効なゲームを取得
      const enabledGames = GameModel.getAll(true);
      if (enabledGames.length === 0) {
        logger.warn('No enabled games found for monitoring');
        return [];
      }

      logger.info(`Monitoring ${enabledGames.length} games`);

      // 価格情報を取得
      const priceResults = await this.apiService.getMultipleGamePriceInfo(
        enabledGames.map(game => ({
          steam_app_id: game.steam_app_id,
          name: game.name
        })),
        isManualRequest
      );

      const results: MonitoringResult[] = [];

      // 各ゲームの結果を処理
      for (const result of priceResults) {
        const game = enabledGames.find(g => g.steam_app_id === result.game.steam_app_id);
        if (!game) continue;

        try {
          const monitoringResult = await this.processGamePriceUpdate(game, result.priceHistory, result.error);
          results.push(monitoringResult);
        } catch (error) {
          logger.error(`Error processing game ${game.name}:`, error);
          results.push({
            game,
            error: {
              code: 'PROCESSING_ERROR',
              message: `Failed to process ${game.name}`,
              details: error
            }
          });
        }
      }

      this.lastRunTime = new Date();
      const duration = Date.now() - startTime;
      
      // 結果の集計
      const successful = results.filter(r => r.currentPrice && !r.error).length;
      const alerts = results.filter(r => r.alert).length;
      const errors = results.filter(r => r.error).length;

      logger.info(`Monitoring cycle completed in ${duration}ms: ${successful} successful, ${alerts} alerts, ${errors} errors`);
      
      return results;

    } catch (error) {
      logger.error('Monitoring cycle failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // 単一ゲームの価格更新処理
  private async processGamePriceUpdate(
    game: Game, 
    newPriceHistory: PriceHistory | null, 
    error?: any
  ): Promise<MonitoringResult> {
    if (error || !newPriceHistory) {
      return {
        game,
        error: error || {
          code: 'NO_PRICE_DATA',
          message: 'No price data available'
        }
      };
    }

    try {
      // 前回の価格履歴を取得
      const lastPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);

      // 価格履歴を保存
      const savedPriceHistory = PriceHistoryModel.create(newPriceHistory);

      // アラート条件をチェック
      const alert = await this.checkAlertConditions(game, newPriceHistory, lastPrice);

      return {
        game,
        currentPrice: savedPriceHistory,
        alert
      };

    } catch (error) {
      logger.error(`Failed to process price update for ${game.name}:`, error);
      return {
        game,
        error: {
          code: 'PROCESSING_ERROR',
          message: `Failed to process price update for ${game.name}`,
          details: error
        }
      };
    }
  }

  // アラート条件のチェック
  private async checkAlertConditions(
    game: Game,
    currentPrice: PriceHistory,
    lastPrice: PriceHistory | null
  ): Promise<Alert | undefined> {
    if (!game.alert_enabled) {
      return undefined;
    }

    const alerts: Alert[] = [];

    // 条件A: 歴代最安値更新
    if (lastPrice && currentPrice.current_price < currentPrice.historical_low) {
      // クールダウンチェック
      if (!AlertModel.isInCooldown(game.steam_app_id, 'new_low', config.notificationCooldownHours)) {
        const newLowAlert: Omit<Alert, 'id' | 'created_at'> = {
          steam_app_id: game.steam_app_id,
          alert_type: 'new_low',
          trigger_price: currentPrice.current_price,
          previous_low: currentPrice.historical_low,
          discount_percent: currentPrice.discount_percent,
          notified_discord: false
        };

        alerts.push(AlertModel.create(newLowAlert));
        logger.info(`New historical low alert: ${game.name} - ${currentPrice.current_price}円 (was ${currentPrice.historical_low}円)`);
      }
    }

    // 条件B: セール開始
    if ((!lastPrice || !lastPrice.is_on_sale) && currentPrice.is_on_sale && currentPrice.discount_percent > 0) {
      // 価格閾値チェック
      let meetsPriceThreshold = true;
      if (game.price_threshold && game.price_threshold > 0) {
        meetsPriceThreshold = currentPrice.current_price <= game.price_threshold;
      }

      if (meetsPriceThreshold && !AlertModel.isInCooldown(game.steam_app_id, 'sale_start', config.notificationCooldownHours)) {
        const saleStartAlert: Omit<Alert, 'id' | 'created_at'> = {
          steam_app_id: game.steam_app_id,
          alert_type: 'sale_start',
          trigger_price: currentPrice.current_price,
          previous_low: lastPrice?.current_price,
          discount_percent: currentPrice.discount_percent,
          notified_discord: false
        };

        alerts.push(AlertModel.create(saleStartAlert));
        logger.info(`Sale start alert: ${game.name} - ${currentPrice.discount_percent}% off (${currentPrice.current_price}円)`);
      }
    }

    // 最初のアラートを返す（複数ある場合は新安値を優先）
    return alerts.find(a => a.alert_type === 'new_low') || alerts[0];
  }

  // 単一ゲームの監視（手動実行用）
  async monitorSingleGame(steamAppId: number): Promise<MonitoringResult> {
    const game = GameModel.getBySteamAppId(steamAppId);
    if (!game) {
      throw new Error(`Game with Steam App ID ${steamAppId} not found`);
    }

    const priceHistory = await this.apiService.getGamePriceInfo(game.steam_app_id, game.name);
    return this.processGamePriceUpdate(game, priceHistory);
  }

  // 監視統計の取得
  getMonitoringStats(): {
    isRunning: boolean;
    lastRunTime: Date | null;
    enabledGamesCount: number;
    totalPriceRecords: number;
    totalAlerts: number;
  } {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      enabledGamesCount: GameModel.getEnabledCount(),
      totalPriceRecords: PriceHistoryModel.getStatistics().totalRecords,
      totalAlerts: AlertModel.getStatistics().totalAlerts
    };
  }

  // サービスの状態確認
  async getHealthStatus(): Promise<{
    monitoring: boolean;
    api: {
      itad: boolean;
      steam: boolean;
      overall: boolean;
    };
    database: boolean;
    lastRun: Date | null;
  }> {
    const apiHealth = await this.apiService.healthCheck();
    
    return {
      monitoring: !this.isRunning, // 実行中でない場合は健全
      api: apiHealth,
      database: true, // データベース操作が成功している前提
      lastRun: this.lastRunTime
    };
  }

  // サービス停止
  shutdown(): void {
    this.apiService.shutdown();
    logger.info('Monitoring Service shutdown completed');
  }

  // APIサービスの取得（テスト用）
  getAPIService(): APIService {
    return this.apiService;
  }
}