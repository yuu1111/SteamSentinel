import { Request, Response } from 'express';
import { SchedulerService } from '../services/SchedulerService';
import { config, getFeatureStatus } from '../config';
import { getRecentLogs } from '../utils/logger';
import logger from '../utils/logger';

export class MonitoringController {
  private static schedulerService: SchedulerService | null = null;

  // スケジューラーサービスの設定
  static setSchedulerService(service: SchedulerService) {
    this.schedulerService = service;
  }

  // 監視状況取得
  static async getStatus(req: Request, res: Response) {
    try {
      if (!this.schedulerService) {
        return res.status(500).json({
          success: false,
          error: 'Scheduler service not initialized'
        });
      }

      const status = this.schedulerService.getStatus();
      const monitoringService = this.schedulerService.getMonitoringService();
      const healthStatus = await monitoringService.getHealthStatus();
      const featureStatus = getFeatureStatus();

      res.json({
        success: true,
        data: {
          scheduler: status,
          health: healthStatus,
          features: featureStatus,
          config: {
            monitoringInterval: config.monitoringIntervalHours,
            notificationCooldown: config.notificationCooldownHours,
            dataRetention: config.dataRetentionDays
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get monitoring status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve monitoring status'
      });
    }
  }

  // 手動監視実行
  static async runManualMonitoring(req: Request, res: Response) {
    try {
      if (!this.schedulerService) {
        return res.status(500).json({
          success: false,
          error: 'Scheduler service not initialized'
        });
      }

      await this.schedulerService.runManualMonitoring();
      
      res.json({
        success: true,
        message: 'Manual monitoring completed successfully'
      });
    } catch (error) {
      logger.error('Manual monitoring failed:', error);
      res.status(500).json({
        success: false,
        error: 'Manual monitoring failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 単一ゲームの手動監視
  static async runManualGameMonitoring(req: Request, res: Response) {
    try {
      if (!this.schedulerService) {
        return res.status(500).json({
          success: false,
          error: 'Scheduler service not initialized'
        });
      }

      const steamAppId = parseInt(req.params.appId, 10);
      
      await this.schedulerService.runManualGameMonitoring(steamAppId);
      
      res.json({
        success: true,
        message: `Manual monitoring completed for game ${steamAppId}`
      });
    } catch (error) {
      logger.error(`Manual game monitoring failed for ${req.params.appId}:`, error);
      res.status(500).json({
        success: false,
        error: 'Manual game monitoring failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 監視間隔の更新
  static async updateMonitoringInterval(req: Request, res: Response) {
    try {
      if (!this.schedulerService) {
        return res.status(500).json({
          success: false,
          error: 'Scheduler service not initialized'
        });
      }

      const { intervalHours } = req.body;
      
      if (!intervalHours || intervalHours < 0.1 || intervalHours > 24) {
        return res.status(400).json({
          success: false,
          error: 'Invalid interval. Must be between 0.1 and 24 hours'
        });
      }

      this.schedulerService.updateMonitoringInterval(intervalHours);
      
      logger.info(`Monitoring interval updated to ${intervalHours} hours`);
      res.json({
        success: true,
        message: `Monitoring interval updated to ${intervalHours} hours`
      });
    } catch (error) {
      logger.error('Failed to update monitoring interval:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update monitoring interval'
      });
    }
  }

  // ヘルスチェック
  static async healthCheck(req: Request, res: Response) {
    try {
      if (!this.schedulerService) {
        return res.status(500).json({
          success: false,
          error: 'Scheduler service not initialized'
        });
      }

      const monitoringService = this.schedulerService.getMonitoringService();
      const healthStatus = await monitoringService.getHealthStatus();
      
      const overallHealth = healthStatus.monitoring && 
                           healthStatus.api.overall && 
                           healthStatus.database;

      res.status(overallHealth ? 200 : 503).json({
        success: overallHealth,
        data: healthStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  // ログ取得
  static async getLogs(req: Request, res: Response) {
    try {
      const lines = parseInt(req.query.lines as string) || 100;
      const logs = getRecentLogs(Math.min(lines, 1000)); // 最大1000行

      res.json({
        success: true,
        data: {
          logs,
          count: logs.length,
          maxLines: 1000
        }
      });
    } catch (error) {
      logger.error('Failed to get logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve logs'
      });
    }
  }

  // システム情報取得
  static async getSystemInfo(req: Request, res: Response) {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      res.json({
        success: true,
        data: {
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
            logLevel: config.logLevel
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get system info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system information'
      });
    }
  }
}