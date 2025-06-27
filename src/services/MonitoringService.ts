import { GameModel } from '../models/Game';
import { PriceHistoryModel } from '../models/PriceHistory';
import { AlertModel } from '../models/Alert';
import { APIService } from './APIService';
import { Game, PriceHistory, Alert, MonitoringResult } from '../types';
import { config } from '../config';
import logger from '../utils/logger';

export interface MonitoringProgress {
  isRunning: boolean;
  currentGame: string | null;
  totalGames: number;
  completedGames: number;
  failedGames: number;
  startTime: Date | null;
  estimatedTimeRemaining: number | null;
  lastRunTime: Date | null;
}

export class MonitoringService {
  private apiService: APIService;
  private isRunning = false;
  private lastRunTime: Date | null = null;
  private progress: MonitoringProgress = {
    isRunning: false,
    currentGame: null,
    totalGames: 0,
    completedGames: 0,
    failedGames: 0,
    startTime: null,
    estimatedTimeRemaining: null,
    lastRunTime: null
  };

  constructor() {
    this.apiService = new APIService();
  }

  // 初期化
  async initialize(): Promise<void> {
    await this.apiService.initialize();
    logger.info('Monitoring Service initialized');
  }

  // 進捗状況を取得
  getProgress(): MonitoringProgress {
    return { ...this.progress };
  }

  // 全ゲームの監視実行
  async runMonitoring(isManualRequest = false): Promise<MonitoringResult[]> {
    if (this.isRunning) {
      logger.warn('Monitoring already in progress, skipping this run');
      return [];
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    // 進捗状況を初期化
    this.progress = {
      isRunning: true,
      currentGame: null,
      totalGames: 0,
      completedGames: 0,
      failedGames: 0,
      startTime: new Date(),
      estimatedTimeRemaining: null,
      lastRunTime: this.lastRunTime
    };
    
    try {
      logger.info('Starting price monitoring cycle');
      
      // 有効なゲームを取得
      const enabledGames = GameModel.getAll(true);
      if (enabledGames.length === 0) {
        logger.warn('No enabled games found for monitoring');
        this.progress.isRunning = false;
        return [];
      }

      this.progress.totalGames = enabledGames.length;
      logger.info(`Monitoring ${enabledGames.length} games`);

      // 価格情報を取得して即座に処理（進捗コールバック付き）
      const results: MonitoringResult[] = [];
      
      await this.apiService.getMultipleGamePriceInfo(
        enabledGames.map(game => ({
          steam_app_id: game.steam_app_id,
          name: game.name
        })),
        isManualRequest,
        async (currentGame: string, completed: number, total: number, priceResult?: {
          game: { steam_app_id: number; name: string };
          priceHistory: PriceHistory | null;
          error?: any;
        }) => {
          // 進捗を更新
          this.progress.currentGame = currentGame;
          this.progress.completedGames = completed;
          
          // 残り時間を推定
          if (completed > 0 && this.progress.startTime) {
            const elapsed = Date.now() - this.progress.startTime.getTime();
            const avgTimePerGame = elapsed / completed;
            const remaining = total - completed;
            this.progress.estimatedTimeRemaining = Math.round((avgTimePerGame * remaining) / 1000);
          }
          
          // 価格データを即座にデータベースに保存
          if (priceResult) {
            const game = enabledGames.find(g => g.steam_app_id === priceResult.game.steam_app_id);
            if (game) {
              try {
                const monitoringResult = await this.processGamePriceUpdate(game, priceResult.priceHistory, priceResult.error);
                results.push(monitoringResult);
                
                // 失敗したゲームの数を更新
                if (monitoringResult.error) {
                  this.progress.failedGames++;
                }
                
                logger.debug(`Saved price data for ${game.name} immediately`);
              } catch (error) {
                logger.error(`Error processing game ${game.name}:`, error);
                this.progress.failedGames++;
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
          }
        }
      );

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
      this.progress.isRunning = false;
      this.progress.currentGame = null;
      this.progress.lastRunTime = this.lastRunTime;
    }
  }

  // 単一ゲームの価格更新処理
  private async processGamePriceUpdate(
    game: Game, 
    newPriceHistory: (PriceHistory & { gameName?: string }) | null, 
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
      // APIから取得したゲーム名でゲーム情報を更新
      if (newPriceHistory.gameName && newPriceHistory.gameName !== game.name) {
        logger.info(`Updating game name: "${game.name}" → "${newPriceHistory.gameName}" (${game.steam_app_id})`);
        const updatedGame = GameModel.update(game.id!, { name: newPriceHistory.gameName });
        // ゲームオブジェクトを更新
        if (updatedGame) {
          game.name = updatedGame.name;
        }
      }

      // 前回の価格履歴を取得
      const lastPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);

      // gameName プロパティを除いて価格履歴を保存
      const { gameName, ...priceHistoryData } = newPriceHistory;
      const savedPriceHistory = PriceHistoryModel.create(priceHistoryData);

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