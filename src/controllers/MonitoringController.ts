import { Request, Response } from 'express';
import { ApiResponseHelper, BaseController } from '../utils/apiResponse';
import { SchedulerService } from '../services/SchedulerService';
import { config, getFeatureStatus } from '../config';
import { getRecentLogs } from '../utils/logger';
import logger from '../utils/logger';
import database from '../db/database';
import cacheService from '../services/CacheService';

export class MonitoringController extends BaseController {
  private static schedulerService: SchedulerService | null = null;

  // スケジューラーサービスの設定
  static setSchedulerService(service: SchedulerService) {
    this.schedulerService = service;
  }

  // 監視進捗状況取得
  static async getProgress(_req: Request, res: Response): Promise<Response> {
    try {
      if (!this.schedulerService) {
        logger.error('Scheduler service is not initialized');
        ApiResponseHelper.error(res, 'スケジューラーサービスが初期化されていません', 500);
        return res;
      }

      const monitoringService = this.schedulerService.getMonitoringService();
      if (!monitoringService) {
        logger.error('Monitoring service is not available');
        ApiResponseHelper.error(res, '監視サービスが利用できません', 500);
        return res;
      }

      const progress = monitoringService.getProgress();

      ApiResponseHelper.success(res, progress, '監視進捗状況を取得しました');
      return res;
    } catch (error) {
      logger.error('Failed to get monitoring progress:', error);
      ApiResponseHelper.error(res, '監視進捗状況の取得に失敗しました', 500, error);
      return res;
    }
  }

  // 監視状況取得
  static async getStatus(_req: Request, res: Response): Promise<Response> {
    try {
      if (!this.schedulerService) {
        ApiResponseHelper.error(res, 'スケジューラーサービスが初期化されていません', 500);
        return res;
      }

      const status = this.schedulerService.getStatus();
      const monitoringService = this.schedulerService.getMonitoringService();
      const healthStatus = await monitoringService.getHealthStatus();
      const featureStatus = getFeatureStatus();

      const statusData = {
        scheduler: status,
        health: healthStatus,
        features: featureStatus,
        config: {
          monitoringInterval: config.monitoringIntervalHours,
          notificationCooldown: config.notificationCooldownHours,
          dataRetention: config.dataRetentionDays
        }
      };

      ApiResponseHelper.success(res, statusData, '監視状況を取得しました');
      return res;
    } catch (error) {
      logger.error('Failed to get monitoring status:', error);
      ApiResponseHelper.error(res, '監視状況の取得に失敗しました', 500, error);
      return res;
    }
  }

  // 手動監視実行
  static async runManualMonitoring(_req: Request, res: Response): Promise<Response> {
    try {
      if (!this.schedulerService) {
        ApiResponseHelper.error(res, 'スケジューラーサービスが初期化されていません', 500);
        return res;
      }

      await this.schedulerService.runManualMonitoring();
      
      ApiResponseHelper.success(res, null, '手動監視が正常に完了しました');
      return res;
    } catch (error) {
      logger.error('Manual monitoring failed:', error);
      ApiResponseHelper.error(res, '手動監視に失敗しました', 500, error);
      return res;
    }
  }

  // 単一ゲームの手動監視
  static async runManualGameMonitoring(req: Request, res: Response): Promise<Response> {
    try {
      if (!this.schedulerService) {
        ApiResponseHelper.error(res, 'スケジューラーサービスが初期化されていません', 500);
        return res;
      }

      const steamAppId = parseInt(req.params.appId, 10);
      
      await this.schedulerService.runManualGameMonitoring(steamAppId);
      
      ApiResponseHelper.success(res, null, `ゲーム ${steamAppId} の手動監視が正常に完了しました`);
      return res;
    } catch (error) {
      logger.error(`Manual game monitoring failed for ${req.params.appId}:`, error);
      ApiResponseHelper.error(res, 'ゲームの手動監視に失敗しました', 500, error);
      return res;
    }
  }

  // 監視間隔の更新
  static async updateMonitoringInterval(req: Request, res: Response): Promise<Response> {
    try {
      if (!this.schedulerService) {
        ApiResponseHelper.error(res, 'スケジューラーサービスが初期化されていません', 500);
        return res;
      }

      const { intervalHours } = req.body;
      
      if (!intervalHours || intervalHours < 0.1 || intervalHours > 24) {
        ApiResponseHelper.badRequest(res, '無効な間隔です。0.1から24時間の間で指定してください');
        return res;
      }

      this.schedulerService.updateMonitoringInterval(intervalHours);
      
      logger.info(`Monitoring interval updated to ${intervalHours} hours`);
      ApiResponseHelper.success(res, null, `監視間隔が ${intervalHours} 時間に更新されました`);
      return res;
    } catch (error) {
      logger.error('Failed to update monitoring interval:', error);
      ApiResponseHelper.error(res, '監視間隔の更新に失敗しました', 500, error);
      return res;
    }
  }

  // ヘルスチェック
  static async healthCheck(_req: Request, res: Response): Promise<Response> {
    try {
      if (!this.schedulerService) {
        ApiResponseHelper.error(res, 'スケジューラーサービスが初期化されていません', 500);
        return res;
      }

      const monitoringService = this.schedulerService.getMonitoringService();
      const healthStatus = await monitoringService.getHealthStatus();
      
      const overallHealth = healthStatus.monitoring && 
                           healthStatus.api.overall && 
                           healthStatus.database;

      const healthData = {
        ...healthStatus,
        timestamp: new Date().toISOString()
      };

      if (overallHealth) {
        ApiResponseHelper.success(res, healthData, 'ヘルスチェック正常', 200);
      } else {
        ApiResponseHelper.error(res, 'ヘルスチェックでエラーが検出されました', 503, healthData);
      }
      return res;
    } catch (error) {
      logger.error('Health check failed:', error);
      ApiResponseHelper.error(res, 'ヘルスチェックに失敗しました', 503, {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
      return res;
    }
  }

  // ログ取得（ページネーション対応）
  static async getLogs(req: Request, res: Response) {
    try {
      const pagination = new MonitoringController().getPaginationParams(req.query);
      const maxLines = Math.min(pagination.limit, 1000); // 最大1000行
      const allLogs = getRecentLogs(maxLines * 2); // 余裕を持って取得
      
      // ページネーション適用
      const startIndex = pagination.offset;
      const endIndex = startIndex + pagination.limit;
      const paginatedLogs = allLogs.slice(startIndex, endIndex);
      
      ApiResponseHelper.paginated(
        res,
        paginatedLogs,
        allLogs.length,
        pagination,
        `${paginatedLogs.length}行のログを取得しました`
      );
    } catch (error) {
      logger.error('Failed to get logs:', error);
      ApiResponseHelper.error(res, 'ログの取得に失敗しました', 500, error);
    }
  }

  // システム情報取得
  static async getSystemInfo(_req: Request, res: Response): Promise<Response> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      const systemInfo = {
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: Math.floor(uptime),
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
          }
        },
        config: {
          environment: process.env.NODE_ENV || 'development',
          webPort: config.webPort,
          webHost: config.webHost,
          logLevel: config.logLevel,
          monitoringInterval: config.monitoringIntervalHours
        },
        apiKeys: {
          itad: !!process.env.ITAD_API_KEY,
          discord: !!process.env.DISCORD_WEBHOOK_URL,
          steam: !!process.env.STEAM_API_KEY,
          igdb: !!(process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET),
          youtube: !!process.env.YOUTUBE_API_KEY,
          twitch: !!(process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET)
        }
      };

      ApiResponseHelper.success(res, systemInfo, 'システム情報を取得しました');
      return res;
    } catch (error) {
      logger.error('Failed to get system info:', error);
      ApiResponseHelper.error(res, 'システム情報の取得に失敗しました', 500, error);
      return res;
    }
  }

  // データベースクリーンアップ実行
  static async runDatabaseCleanup(req: Request, res: Response): Promise<Response> {
    try {
      const { daysToKeep } = req.body;
      const days = daysToKeep && typeof daysToKeep === 'number' && daysToKeep > 0 
        ? daysToKeep 
        : 30;
      
      logger.info(`Running manual database cleanup for data older than ${days} days`);
      const results = database.cleanupOldData(days);
      
      const cleanupData = {
        daysToKeep: days,
        results: {
          priceHistory: results.priceHistory,
          alerts: results.alerts,
          epicGames: results.epicGames,
          logs: results.logs,
          total: results.priceHistory + results.alerts + results.epicGames + results.logs
        },
        executedAt: new Date().toISOString()
      };
      
      ApiResponseHelper.success(
        res, 
        cleanupData, 
        `データベースクリーンアップが完了しました。${cleanupData.results.total}件のレコードを削除しました`
      );
      return res;
    } catch (error) {
      logger.error('Failed to run database cleanup:', error);
      ApiResponseHelper.error(res, 'データベースクリーンアップに失敗しました', 500, error);
      return res;
    }
  }

  // データベース統計取得
  static async getDatabaseStats(_req: Request, res: Response): Promise<Response> {
    try {
      const db = database.getConnection();
      
      // 各テーブルのレコード数を取得
      const stats = {
        games: db.prepare('SELECT COUNT(*) as count FROM games').get() as any,
        priceHistory: db.prepare('SELECT COUNT(*) as count FROM price_history').get() as any,
        alerts: db.prepare('SELECT COUNT(*) as count FROM alerts').get() as any,
        epicFreeGames: db.prepare('SELECT COUNT(*) as count FROM epic_free_games').get() as any,
        budgets: db.prepare('SELECT COUNT(*) as count FROM budgets').get() as any,
        users: db.prepare('SELECT COUNT(*) as count FROM users').get() as any,
        priceStatistics: db.prepare('SELECT COUNT(*) as count FROM price_statistics').get() as any,
        latestPrices: db.prepare('SELECT COUNT(*) as count FROM latest_prices').get() as any,
        
        // 最古のデータ
        oldestPriceHistory: db.prepare('SELECT MIN(recorded_at) as oldest FROM price_history').get() as any,
        oldestAlert: db.prepare('SELECT MIN(created_at) as oldest FROM alerts').get() as any,
        
        // データベースファイルサイズ
        databaseSize: (() => {
          try {
            const fs = require('fs');
            const stats = fs.statSync(config.databasePath);
            return Math.round(stats.size / 1024 / 1024 * 100) / 100; // MB
          } catch {
            return null;
          }
        })()
      };
      
      ApiResponseHelper.success(res, stats, 'データベース統計を取得しました');
      return res;
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      ApiResponseHelper.error(res, 'データベース統計の取得に失敗しました', 500, error);
      return res;
    }
  }

  // キャッシュ統計取得
  static async getCacheStats(_req: Request, res: Response): Promise<Response> {
    try {
      const stats = cacheService.getStats();
      
      ApiResponseHelper.success(res, {
        size: stats.size,
        memorySizeEstimate: `${Math.round(stats.memorySizeEstimate / 1024)} KB`,
        keys: stats.keys.length,
        sampleKeys: stats.keys.slice(0, 10) // 最初の10個のキーを表示
      }, 'キャッシュ統計を取得しました');
      return res;
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      ApiResponseHelper.error(res, 'キャッシュ統計の取得に失敗しました', 500, error);
      return res;
    }
  }

  // キャッシュクリア
  static async clearCache(req: Request, res: Response): Promise<Response> {
    try {
      const { pattern } = req.body;
      
      if (pattern) {
        // パターン指定でクリア
        const regex = new RegExp(pattern);
        const deleted = cacheService.deletePattern(regex);
        
        ApiResponseHelper.success(
          res, 
          { deleted, pattern }, 
          `パターン "${pattern}" に一致する ${deleted} 個のキャッシュエントリを削除しました`
        );
      } else {
        // 全キャッシュクリア
        cacheService.clear();
        
        ApiResponseHelper.success(
          res, 
          null, 
          'すべてのキャッシュをクリアしました'
        );
      }
      
      return res;
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      ApiResponseHelper.error(res, 'キャッシュのクリアに失敗しました', 500, error);
      return res;
    }
  }
}