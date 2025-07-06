import * as cron from 'node-cron';
import { MonitoringService } from './MonitoringService';
import { EpicGamesNotificationService } from './EpicGamesNotificationService';
import { HighDiscountDetectionService } from './HighDiscountDetectionService';
import { config } from '../config';
import logger from '../utils/logger';
import database from '../db/database';

export class SchedulerService {
  private monitoringService: MonitoringService;
  private epicGamesService: EpicGamesNotificationService;
  private highDiscountService: HighDiscountDetectionService;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private isStarted = false;

  constructor() {
    this.monitoringService = new MonitoringService();
    this.epicGamesService = EpicGamesNotificationService.getInstance();
    this.highDiscountService = new HighDiscountDetectionService();
  }

  // 初期化
  async initialize(): Promise<void> {
    await this.monitoringService.initialize();
    logger.info('Scheduler Service initialized');
  }

  // スケジュールタスクの開始
  start(): void {
    if (this.isStarted) {
      logger.warn('Scheduler already started');
      return;
    }

    try {
      // 価格監視タスク
      this.schedulePriceMonitoring();
      
      // 高割引ゲーム検知タスク
      this.scheduleHighDiscountDetection();
      
      // Epic Games無料ゲーム通知タスク
      this.scheduleEpicGamesNotification();
      
      // データベースクリーンアップタスク
      this.scheduleDatabaseCleanup();
      
      // ヘルスチェックタスク
      this.scheduleHealthCheck();

      this.isStarted = true;
      logger.info('Scheduled tasks started successfully');
      
      // 起動時に一度実行
      this.runInitialMonitoring();
      
    } catch (error) {
      logger.error('Failed to start scheduled tasks:', error);
      throw error;
    }
  }

  // 価格監視スケジュールの設定
  private schedulePriceMonitoring(): void {
    const intervalHours = config.monitoringIntervalHours;
    const cronExpression = this.generateCronExpression(intervalHours);
    
    const task = cron.schedule(cronExpression, async () => {
      try {
        logger.info('Scheduled price monitoring triggered');
        await this.monitoringService.runMonitoring();
      } catch (error) {
        logger.error('Scheduled price monitoring failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.scheduledTasks.set('priceMonitoring', task);
    task.start();
    
    logger.info(`Price monitoring scheduled every ${intervalHours} hour(s) with cron: ${cronExpression}`);
  }

  // データベースクリーンアップスケジュール
  private scheduleDatabaseCleanup(): void {
    // 毎日午前3時に実行
    const task = cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Running scheduled database cleanup');
        const results = database.cleanupOldData(config.dataRetentionDays || 30);
        logger.info('Database cleanup completed', {
          priceHistory: `${results.priceHistory} records`,
          alerts: `${results.alerts} records`,
          epicGames: `${results.epicGames} records`,
          logs: `${results.logs} records`,
          total: `${results.priceHistory + results.alerts + results.epicGames + results.logs} records deleted`
        });
      } catch (error) {
        logger.error('Database cleanup failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.scheduledTasks.set('databaseCleanup', task);
    task.start();
    
    logger.info('Database cleanup scheduled daily at 3:00 AM JST');
  }

  // ヘルスチェックスケジュール
  private scheduleHealthCheck(): void {
    // 15分ごとに実行
    const task = cron.schedule('*/15 * * * *', async () => {
      try {
        const health = await this.monitoringService.getHealthStatus();
        
        if (!health.api.overall) {
          logger.warn('API health check failed', health.api);
        }
        
        // 重大な問題があればアラート
        if (!health.api.itad) {
          logger.error('ITAD API health check failed - core functionality may be impacted');
        }
        
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.scheduledTasks.set('healthCheck', task);
    task.start();
    
    logger.info('Health check scheduled every 15 minutes');
  }

  // 高割引ゲーム検知スケジュール
  private scheduleHighDiscountDetection(): void {
    // 6時間ごとに実行
    const task = cron.schedule('0 */6 * * *', async () => {
      try {
        logger.info('Running scheduled high discount detection');
        await this.highDiscountService.detectHighDiscountGames();
      } catch (error) {
        logger.error('Scheduled high discount detection failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.scheduledTasks.set('highDiscountDetection', task);
    task.start();
    
    logger.info('High discount detection scheduled every 6 hours');
  }

  // Epic Games無料ゲーム通知スケジュール
  private scheduleEpicGamesNotification(): void {
    // 毎日午前10時に実行（JST）
    const task = cron.schedule('0 10 * * *', async () => {
      try {
        logger.info('Running scheduled Epic Games free games check');
        await this.epicGamesService.manualCheck();
      } catch (error) {
        logger.error('Scheduled Epic Games check failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Tokyo'
    });

    this.scheduledTasks.set('epicGamesNotification', task);
    task.start();
    
    logger.info('Epic Games notification scheduled daily at 10:00 AM JST');
  }

  // 時間間隔からcron式を生成
  private generateCronExpression(hours: number): string {
    if (hours >= 24) {
      // 24時間以上の場合は日次実行
      const days = Math.floor(hours / 24);
      return `0 0 */${days} * *`; // 毎日午前0時
    } else if (hours >= 1) {
      // 1時間以上の場合は時間単位
      return `0 */${hours} * * *`; // 毎時0分
    } else {
      // 1時間未満の場合は分単位
      const minutes = Math.max(10, hours * 60); // 最低10分
      return `*/${minutes} * * * *`;
    }
  }

  // 起動時の初回監視実行
  private async runInitialMonitoring(): Promise<void> {
    try {
      const lastFetch = database.getLastFetchTime();
      const nextFetch = database.getNextFetchTime();
      const shouldFetch = database.shouldFetch();
      
      logger.info(`Last fetch: ${lastFetch.toISOString()}`);
      logger.info(`Next fetch scheduled: ${nextFetch.toISOString()}`);
      logger.info(`Should fetch now: ${shouldFetch}`);
      
      if (shouldFetch) {
        logger.info('Interval has passed, running initial monitoring');
        
        // 5秒後に実行（起動処理完了を待つ）
        setTimeout(async () => {
          try {
            await this.monitoringService.runMonitoring();
            logger.info('Initial monitoring completed');
          } catch (error) {
            logger.error('Initial monitoring failed:', error);
          }
        }, 5000);
      } else {
        const timeToNext = nextFetch.getTime() - Date.now();
        const hoursToNext = (timeToNext / (1000 * 60 * 60)).toFixed(1);
        logger.info(`Skipping initial fetch - next scheduled in ${hoursToNext} hours`);
      }
      
    } catch (error) {
      logger.error('Failed to check initial monitoring schedule:', error);
    }
  }

  // 手動監視実行
  async runManualMonitoring(): Promise<void> {
    try {
      logger.info('Manual monitoring triggered');
      await this.monitoringService.runMonitoring();
      logger.info('Manual monitoring completed');
    } catch (error) {
      logger.error('Manual monitoring failed:', error);
      throw error;
    }
  }

  // 特定ゲームの手動監視
  async runManualGameMonitoring(steamAppId: number): Promise<void> {
    try {
      logger.info(`Manual monitoring triggered for game ${steamAppId}`);
      await this.monitoringService.monitorSingleGame(steamAppId);
      logger.info(`Manual monitoring completed for game ${steamAppId}`);
    } catch (error) {
      logger.error(`Manual monitoring failed for game ${steamAppId}:`, error);
      throw error;
    }
  }

  // 手動高割引ゲーム検知
  async runManualHighDiscountDetection(): Promise<any[]> {
    try {
      logger.info('Manual high discount detection triggered');
      const results = await this.highDiscountService.detectHighDiscountGames();
      logger.info(`Manual high discount detection completed: ${results.length} games found`);
      return results;
    } catch (error) {
      logger.error('Manual high discount detection failed:', error);
      throw error;
    }
  }

  // 手動Epic Games無料ゲーム検知
  async runManualEpicGamesCheck(): Promise<number> {
    try {
      logger.info('Manual Epic Games check triggered');
      const results = await this.epicGamesService.manualCheck();
      logger.info(`Manual Epic Games check completed: ${results} free games found`);
      return results;
    } catch (error) {
      logger.error('Manual Epic Games check failed:', error);
      throw error;
    }
  }

  // 監視間隔の動的変更
  updateMonitoringInterval(newIntervalHours: number): void {
    try {
      // 既存のタスクを停止
      const existingTask = this.scheduledTasks.get('priceMonitoring');
      if (existingTask) {
        existingTask.stop();
      }

      // 新しい間隔でタスクを再作成
      const cronExpression = this.generateCronExpression(newIntervalHours);
      
      const newTask = cron.schedule(cronExpression, async () => {
        try {
          logger.info('Scheduled price monitoring triggered');
          await this.monitoringService.runMonitoring();
        } catch (error) {
          logger.error('Scheduled price monitoring failed:', error);
        }
      }, {
        scheduled: true,
        timezone: 'Asia/Tokyo'
      });

      this.scheduledTasks.set('priceMonitoring', newTask);
      
      logger.info(`Monitoring interval updated to ${newIntervalHours} hour(s) with cron: ${cronExpression}`);
      
    } catch (error) {
      logger.error('Failed to update monitoring interval:', error);
      throw error;
    }
  }

  // スケジューラーの状態取得
  getStatus(): {
    isStarted: boolean;
    activeTasks: string[];
    monitoringStats: any;
  } {
    const activeTasks = Array.from(this.scheduledTasks.keys());

    return {
      isStarted: this.isStarted,
      activeTasks,
      monitoringStats: this.monitoringService.getMonitoringStats()
    };
  }

  // 全タスクの停止
  stop(): void {
    if (!this.isStarted) {
      return;
    }

    for (const [name, task] of this.scheduledTasks) {
      try {
        task.stop();
        logger.info(`Stopped scheduled task: ${name}`);
      } catch (error) {
        logger.error(`Failed to stop task ${name}:`, error);
      }
    }

    this.scheduledTasks.clear();
    this.isStarted = false;
    
    logger.info('All scheduled tasks stopped');
  }

  // サービス終了
  shutdown(): void {
    this.stop();
    this.monitoringService.shutdown();
    logger.info('Scheduler Service shutdown completed');
  }

  // モニタリングサービスの取得（テスト・デバッグ用）
  getMonitoringService(): MonitoringService {
    return this.monitoringService;
  }
}