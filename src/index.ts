import app from './app';
import database from './db/database';
import { SchedulerService } from './services/SchedulerService';
import { MonitoringController } from './controllers/MonitoringController';
import { config, validateRequiredConfig, getFeatureStatus } from './config';
import logger from './utils/logger';

class SteamSentinelApp {
  private server: any = null;
  private schedulerService: SchedulerService | null = null;

  async start(): Promise<void> {
    try {
      logger.info('🎮 Starting SteamSentinel - Steam Price Monitor');
      logger.info('================================================');

      // 設定検証
      await this.validateConfiguration();

      // データベース初期化
      await this.initializeDatabase();

      // スケジューラー初期化
      await this.initializeScheduler();

      // Webサーバー起動
      await this.startWebServer();

      // 起動完了
      this.logStartupSummary();

    } catch (error) {
      logger.error('Failed to start SteamSentinel:', error);
      await this.gracefulShutdown();
      process.exit(1);
    }
  }

  private async validateConfiguration(): Promise<void> {
    logger.info('🔧 Validating configuration...');
    
    const validation = validateRequiredConfig();
    if (!validation.valid) {
      logger.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => logger.error(`   - ${error}`));
      throw new Error('Invalid configuration');
    }

    const features = getFeatureStatus();
    logger.info('📋 Feature status:');
    Object.entries(features).forEach(([feature, status]) => {
      const emoji = status.enabled ? '✅' : '⚠️';
      logger.info(`   ${emoji} ${feature}: ${status.message}`);
    });

    logger.info('✅ Configuration validated');
  }

  private async initializeDatabase(): Promise<void> {
    logger.info('💾 Initializing database...');
    
    database.connect();
    database.initialize();
    
    const isHealthy = database.checkIntegrity();
    if (!isHealthy) {
      throw new Error('Database integrity check failed');
    }
    
    logger.info('✅ Database initialized successfully');
  }

  private async initializeScheduler(): Promise<void> {
    logger.info('⏰ Initializing scheduler...');
    
    this.schedulerService = new SchedulerService();
    await this.schedulerService.initialize();
    
    // コントローラーにスケジューラーサービスを設定
    MonitoringController.setSchedulerService(this.schedulerService);
    
    this.schedulerService.start();
    
    logger.info('✅ Scheduler initialized and started');
  }

  private async startWebServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = app.listen(config.webPort, config.webHost, () => {
          logger.info(`🌐 Web server started on http://${config.webHost}:${config.webPort}`);
          resolve(undefined);
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`❌ Port ${config.webPort} is already in use`);
          } else {
            logger.error('❌ Web server error:', error);
          }
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private logStartupSummary(): void {
    const stats = this.schedulerService?.getStatus();
    
    logger.info('');
    logger.info('🚀 SteamSentinel started successfully!');
    logger.info('====================================');
    logger.info(`📍 Web UI: http://${config.webHost}:${config.webPort}`);
    logger.info(`📊 Monitoring: ${stats?.monitoringStats.enabledGamesCount || 0} games`);
    logger.info(`⏱️ Interval: ${config.monitoringIntervalHours} hour(s)`);
    logger.info(`💾 Database: ${database.getConnection().name}`);
    logger.info(`📝 Logs: ${config.logsPath}`);
    logger.info('');
    logger.info('Use Ctrl+C to stop the application');
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('📴 Shutting down SteamSentinel...');

    // Webサーバー停止
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          logger.info('✅ Web server stopped');
          resolve();
        });
      });
    }

    // スケジューラー停止
    if (this.schedulerService) {
      this.schedulerService.shutdown();
      logger.info('✅ Scheduler stopped');
    }

    // データベース接続閉じる
    database.close();
    logger.info('✅ Database connection closed');

    logger.info('👋 SteamSentinel shutdown completed');
  }

  // シグナルハンドラーの設定
  setupSignalHandlers(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        await this.gracefulShutdown();
        process.exit(0);
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown().then(() => process.exit(1));
    });
  }
}

// アプリケーション実行
async function main() {
  const app = new SteamSentinelApp();
  app.setupSignalHandlers();
  await app.start();
}

// プロセスがメインモジュールとして実行された場合のみ開始
if (require.main === module) {
  main().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
  });
}

export default SteamSentinelApp;