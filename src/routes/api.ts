import { Router } from 'express';
import { GameController } from '../controllers/GameController';
import { MonitoringController } from '../controllers/MonitoringController';
import { validateSteamAppId, apiLimiter } from '../middleware/security';
import discordService from '../services/DiscordService';
import budgetRoutes from './budgets';
import epicGamesRoutes from './epicGames';
import steamFreeGamesRoutes from './steamFreeGames';
import itadSettingsController from '../controllers/ITADSettingsController';
import logger from '../utils/logger';

const router = Router();

// APIレート制限を適用
router.use(apiLimiter);

// ゲーム関連のルート
const gameRoutes = Router();

gameRoutes.get('/', (req, res) => GameController.getAllGames(req, res));
gameRoutes.get('/dashboard', (req, res) => GameController.getDashboardData(req, res));
gameRoutes.get('/expenses', (req, res) => GameController.getExpenseData(req, res));
gameRoutes.get('/export', (req, res) => GameController.exportGames(req, res));
gameRoutes.post('/import', (req, res) => GameController.importGames(req, res));

// 高割引ゲーム検知 - 専用ルート
gameRoutes.get('/highDiscount', (req, res) => GameController.getHighDiscountGames(req, res));
gameRoutes.post('/highDiscount/detect', (req, res) => GameController.runHighDiscountDetection(req, res));

gameRoutes.get('/:id(\\d+)', (req, res) => GameController.getGameById(req, res));
gameRoutes.post('/', (req, res) => GameController.addGame(req, res));
gameRoutes.put('/:id(\\d+)', (req, res) => GameController.updateGame(req, res));
gameRoutes.delete('/:id(\\d+)', (req, res) => GameController.deleteGame(req, res));
gameRoutes.get('/:appId(\\d+)/price-history', validateSteamAppId, (req, res) => GameController.getGamePriceHistory(req, res));
gameRoutes.get('/:appId(\\d+)/reviews', validateSteamAppId, (req, res) => GameController.getGameReviews(req, res));
gameRoutes.post('/reviews/batch', (req, res) => GameController.getMultipleGameReviews(req, res));
gameRoutes.get('/:appId(\\d+)/info', validateSteamAppId, (req, res) => GameController.getGameInfo(req, res));
gameRoutes.post('/info/batch', (req, res) => GameController.getMultipleGameInfo(req, res));

// 手動最安値設定
gameRoutes.put('/:id(\\d+)/manual-historical-low', (req, res) => GameController.setManualHistoricalLow(req, res));

// 購入済みマーク
gameRoutes.put('/:id(\\d+)/mark-purchased', (req, res) => GameController.markAsPurchased(req, res));
gameRoutes.put('/:id(\\d+)/unmark-purchased', (req, res) => GameController.unmarkAsPurchased(req, res));
gameRoutes.get('/purchased', (req, res) => GameController.getPurchasedGames(req, res));


// 重複チェック用API
gameRoutes.get('/check/:appId(\\d+)', validateSteamAppId, (req, res) => GameController.checkGameExists(req, res));

// 開発用：テスト特別状況ゲーム追加
gameRoutes.post('/test/add-special-games', (req, res) => GameController.addTestSpecialGames(req, res));

router.use('/games', gameRoutes);

// 監視関連のルート
const monitoringRoutes = Router();

monitoringRoutes.get('/status', (req, res) => MonitoringController.getStatus(req, res));
monitoringRoutes.get('/progress', (req, res) => MonitoringController.getProgress(req, res));
monitoringRoutes.post('/run', (req, res) => MonitoringController.runManualMonitoring(req, res));
monitoringRoutes.post('/run/:appId(\\d+)', validateSteamAppId, (req, res) => MonitoringController.runManualGameMonitoring(req, res));
monitoringRoutes.put('/interval', (req, res) => MonitoringController.updateMonitoringInterval(req, res));
monitoringRoutes.get('/health', (req, res) => MonitoringController.healthCheck(req, res));
monitoringRoutes.get('/logs', (req, res) => MonitoringController.getLogs(req, res));
monitoringRoutes.get('/system', (req, res) => MonitoringController.getSystemInfo(req, res));

router.use('/monitoring', monitoringRoutes);

// Discord関連のルート
const discordRoutes = Router();

discordRoutes.get('/status', (_req, res) => {
  try {
    const isEnabled = discordService.isEnabled();
    res.json({
      success: true,
      enabled: isEnabled,
      message: isEnabled ? 'Discord連携が有効です' : 'Discord Webhook URLが設定されていません'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Discord状態確認に失敗しました'
    });
  }
});

discordRoutes.post('/test/:testType', async (req, res) => {
  try {
    const { testType } = req.params;
    
    if (!['connection', 'price_alert', 'high_discount', 'epic_free'].includes(testType)) {
      return res.status(400).json({
        success: false,
        error: '不正なテストタイプです。connection, price_alert, high_discount, epic_free のいずれかを指定してください。'
      });
    }

    const result = await discordService.sendTestMessage(testType as 'connection' | 'price_alert' | 'high_discount' | 'epic_free');
    
    if (result.success) {
      return res.json({
        success: true,
        message: `Discord ${testType} テストメッセージを送信しました`,
        testType
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'テストメッセージ送信に失敗しました',
        testType
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Discordテスト実行中にエラーが発生しました'
    });
  }
});

router.use('/discord', discordRoutes);

// テスト関連のルート
const testRoutes = Router();

testRoutes.post('/price-alert', async (req, res) => {
  try {
    const { gameId, alertType, testPrice, sendDiscord } = req.body;
    
    if (!gameId || !alertType || testPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'gameId, alertType, testPrice が必要です'
      });
    }

    // ゲーム情報を取得
    const { GameController } = await import('../controllers/GameController');
    const game = await GameController.getGameByIdInternal(parseInt(gameId));
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'ゲームが見つかりません'
      });
    }

    // テスト用のアラートデータを作成
    const testAlert = {
      game,
      alertType: alertType as 'new_low' | 'sale_start' | 'threshold_met',
      currentPrice: parseFloat(testPrice),
      originalPrice: game.name === 'Cyberpunk 2077' ? 7980 : 5980, // テスト用の元価格
      discountPercent: Math.round((1 - parseFloat(testPrice) / 5980) * 100),
      previousLow: game.name === 'Cyberpunk 2077' ? 3500 : 2500 // テスト用の前回最安値
    };

    // アラート履歴をデータベースに追加
    const dbManager = await import('../db/database');
    const db = dbManager.default.getConnection();
    const alertHistoryStmt = db.prepare(`
      INSERT INTO alerts (steam_app_id, alert_type, trigger_price, previous_low, discount_percent, notified_discord, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const alertId = alertHistoryStmt.run(
      game.steam_app_id,
      alertType,
      testAlert.currentPrice,
      testAlert.previousLow,
      testAlert.discountPercent,
      sendDiscord ? 1 : 0
    ).lastInsertRowid;

    // Discord通知を送信（オプション）
    let discordResult = null;
    if (sendDiscord) {
      const mappedAlertType = alertType === 'threshold_met' ? 'new_low' : alertType;
      discordResult = await discordService.sendPriceAlert(
        game,
        mappedAlertType as 'new_low' | 'sale_start',
        testAlert.currentPrice,
        testAlert.originalPrice,
        testAlert.discountPercent,
        testAlert.previousLow
      );
    }

    return res.json({
      success: true,
      message: 'テストアラートを実行しました',
      data: {
        alertId,
        game: {
          name: game.name,
          steam_app_id: game.steam_app_id
        },
        alertType,
        testPrice: testAlert.currentPrice,
        discordSent: sendDiscord ? discordResult : false,
        alertHistory: {
          id: alertId,
          created_at: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Price alert test error:', error);
    return res.status(500).json({
      success: false,
      error: '価格アラートテスト実行中にエラーが発生しました'
    });
  }
});

router.use('/test', testRoutes);

// システム関連のルート
const systemRoutes = Router();

systemRoutes.get('/info', (_req, res) => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      databasePath: './data/steam_sentinel.db',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'システム情報の取得に失敗しました'
    });
  }
});

systemRoutes.get('/api-status', (_req, res) => {
  try {
    const apiStatus = {
      steamApiKey: !!process.env.STEAM_API_KEY,
      discordWebhook: !!process.env.DISCORD_WEBHOOK_URL,
      itadApiKey: !!process.env.ITAD_API_KEY,
      igdbClientId: !!process.env.IGDB_CLIENT_ID,
      igdbClientSecret: !!process.env.IGDB_CLIENT_SECRET,
      youtubeApiKey: !!process.env.YOUTUBE_API_KEY,
      twitchClientId: !!process.env.TWITCH_CLIENT_ID,
      twitchClientSecret: !!process.env.TWITCH_CLIENT_SECRET
    };
    
    res.json({
      success: true,
      data: apiStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'API設定状況の確認に失敗しました'
    });
  }
});

systemRoutes.get('/discord-status', (_req, res) => {
  try {
    const isConfigured = !!process.env.DISCORD_WEBHOOK_URL;
    
    res.json({
      success: true,
      data: {
        configured: isConfigured,
        message: isConfigured 
          ? 'Discord Webhook URLが設定されています' 
          : 'Discord Webhook URLが設定されていません。環境変数DISCORD_WEBHOOK_URLを設定してください。'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Discord設定状況の確認に失敗しました'
    });
  }
});

systemRoutes.get('/build-info', (_req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const buildInfoPath = path.join(__dirname, '../../build-info.json');
    
    if (fs.existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      res.json({
        success: true,
        data: buildInfo
      });
    } else {
      res.json({
        success: true,
        data: {
          buildTime: null,
          buildDate: '開発モード',
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'ビルド情報の取得に失敗しました'
    });
  }
});

systemRoutes.post('/test-discord', async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!['connection', 'price_alert', 'high_discount', 'epic_free'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: '不正なテストタイプです。connection, price_alert, high_discount, epic_free のいずれかを指定してください。'
      });
    }

    const result = await discordService.sendTestMessage(type as 'connection' | 'price_alert' | 'high_discount' | 'epic_free');
    
    if (result.success) {
      return res.json({
        success: true,
        message: `Discord ${type} テストメッセージを送信しました`,
        testType: type
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'テストメッセージ送信に失敗しました',
        testType: type
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Discordテスト実行中にエラーが発生しました'
    });
  }
});

systemRoutes.post('/test-price-alert', async (req, res) => {
  try {
    const { gameId, alertType, testPrice, sendDiscord } = req.body;
    
    if (!gameId || !alertType || testPrice === undefined) {
      return res.status(400).json({
        success: false,
        error: 'gameId, alertType, testPrice が必要です'
      });
    }

    // ゲーム情報を取得
    const { GameController } = await import('../controllers/GameController');
    const game = await GameController.getGameByIdInternal(parseInt(gameId));
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'ゲームが見つかりません'
      });
    }

    // テスト用のアラートデータを作成
    const testAlert = {
      game,
      alertType: alertType as 'new_low' | 'sale_start' | 'threshold_met',
      currentPrice: parseFloat(testPrice),
      originalPrice: game.name === 'Cyberpunk 2077' ? 7980 : 5980, // テスト用の元価格
      discountPercent: Math.round((1 - parseFloat(testPrice) / 5980) * 100),
      previousLow: game.name === 'Cyberpunk 2077' ? 3500 : 2500 // テスト用の前回最安値
    };

    // アラート履歴をデータベースに追加
    const dbManager = await import('../db/database');
    const db = dbManager.default.getConnection();
    const alertHistoryStmt = db.prepare(`
      INSERT INTO alerts (steam_app_id, alert_type, trigger_price, previous_low, discount_percent, notified_discord, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const alertId = alertHistoryStmt.run(
      game.steam_app_id,
      alertType,
      testAlert.currentPrice,
      testAlert.previousLow,
      testAlert.discountPercent,
      sendDiscord ? 1 : 0
    ).lastInsertRowid;

    // Discord通知を送信（オプション）
    let discordResult = null;
    if (sendDiscord) {
      const mappedAlertType = alertType === 'threshold_met' ? 'new_low' : alertType;
      discordResult = await discordService.sendPriceAlert(
        game,
        mappedAlertType as 'new_low' | 'sale_start',
        testAlert.currentPrice,
        testAlert.originalPrice,
        testAlert.discountPercent,
        testAlert.previousLow
      );
    }

    return res.json({
      success: true,
      message: 'テストアラートを実行しました',
      data: {
        alertId,
        game: {
          name: game.name,
          steam_app_id: game.steam_app_id
        },
        alertType,
        testPrice: testAlert.currentPrice,
        discordSent: sendDiscord ? discordResult : false,
        alertHistory: {
          id: alertId,
          created_at: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Price alert test error:', error);
    return res.status(500).json({
      success: false,
      error: '価格アラートテスト実行中にエラーが発生しました'
    });
  }
});

router.use('/system', systemRoutes);

// アラート関連のルート
const alertRoutes = Router();

alertRoutes.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const filter = req.query.filter as string || 'all';
    
    const offset = (page - 1) * limit;
    
    // AlertModelを動的インポート
    const { AlertModel } = await import('../models/Alert');
    
    const alerts = AlertModel.getHistoryFiltered(filter, limit, offset);
    const totalCount = AlertModel.getFilteredCount(filter);
    
    res.json({
      success: true,
      data: {
        alerts: alerts,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
        currentPage: page
      }
    });
  } catch (error) {
    logger.error('Failed to fetch alerts:', error);
    res.status(500).json({
      success: false,
      error: 'アラート履歴の取得に失敗しました'
    });
  }
});

alertRoutes.get('/statistics', async (_req, res) => {
  try {
    const { AlertModel } = await import('../models/Alert');
    const stats = AlertModel.getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to fetch alert statistics:', error);
    res.status(500).json({
      success: false,
      error: 'アラート統計の取得に失敗しました'
    });
  }
});

alertRoutes.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const { AlertModel } = await import('../models/Alert');
    const recentAlerts = AlertModel.getRecent(limit);
    
    res.json({
      success: true,
      data: recentAlerts
    });
  } catch (error) {
    logger.error('Failed to fetch recent alerts:', error);
    res.status(500).json({
      success: false,
      error: '最新アラートの取得に失敗しました'
    });
  }
});

// アラート全削除
alertRoutes.delete('/', async (_req, res) => {
  try {
    const db = (await import('../db/database')).default.getConnection();
    
    // 全てのアラートを削除
    const result = db.prepare('DELETE FROM alerts').run();
    
    logger.info(`All alerts cleared. ${result.changes} alerts deleted.`);
    
    res.json({
      success: true,
      message: `${result.changes}件のアラートを削除しました`,
      deletedCount: result.changes
    });
  } catch (error) {
    logger.error('Failed to clear all alerts:', error);
    res.status(500).json({
      success: false,
      error: 'アラート履歴の削除に失敗しました'
    });
  }
});

router.use('/alerts', alertRoutes);

// 予算管理関連のルート
router.use('/budgets', budgetRoutes);

// Epic Games関連のルート
router.use('/epic-games', epicGamesRoutes);
router.use('/steam-free-games', steamFreeGamesRoutes);

// ITAD設定ルート
const itadRoutes = Router();
itadRoutes.get('/settings', (req, res) => itadSettingsController.getAllSettings(req, res));
itadRoutes.put('/settings', (req, res) => itadSettingsController.updateMultipleSettings(req, res));
itadRoutes.post('/settings/reset', (req, res) => itadSettingsController.resetToDefaults(req, res));
itadRoutes.get('/settings/filter', (req, res) => itadSettingsController.getFilterConfig(req, res));
itadRoutes.get('/settings/:name', (req, res) => itadSettingsController.getSetting(req, res));
itadRoutes.put('/settings/:name', (req, res) => itadSettingsController.updateSetting(req, res));
itadRoutes.put('/settings/filter/config', (req, res) => itadSettingsController.updateFilterConfig(req, res));
itadRoutes.get('/settings/category/:category', (req, res) => itadSettingsController.getSettingsByCategory(req, res));

router.use('/itad', itadRoutes);

export default router;