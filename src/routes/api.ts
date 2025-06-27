import { Router } from 'express';
import { GameController } from '../controllers/GameController';
import { MonitoringController } from '../controllers/MonitoringController';
import { validateSteamAppId, apiLimiter } from '../middleware/security';
import discordService from '../services/DiscordService';

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
gameRoutes.get('/:id', (req, res) => GameController.getGameById(req, res));
gameRoutes.post('/', (req, res) => GameController.addGame(req, res));
gameRoutes.put('/:id', (req, res) => GameController.updateGame(req, res));
gameRoutes.delete('/:id', (req, res) => GameController.deleteGame(req, res));
gameRoutes.get('/:appId/price-history', validateSteamAppId, (req, res) => GameController.getGamePriceHistory(req, res));
gameRoutes.get('/:appId/reviews', validateSteamAppId, (req, res) => GameController.getGameReviews(req, res));
gameRoutes.post('/reviews/batch', (req, res) => GameController.getMultipleGameReviews(req, res));
gameRoutes.get('/:appId/info', validateSteamAppId, (req, res) => GameController.getGameInfo(req, res));
gameRoutes.post('/info/batch', (req, res) => GameController.getMultipleGameInfo(req, res));

// 手動最安値設定
gameRoutes.put('/:id/manual-historical-low', (req, res) => GameController.setManualHistoricalLow(req, res));

// 購入済みマーク
gameRoutes.put('/:id/mark-purchased', (req, res) => GameController.markAsPurchased(req, res));
gameRoutes.put('/:id/unmark-purchased', (req, res) => GameController.unmarkAsPurchased(req, res));
gameRoutes.get('/purchased', (req, res) => GameController.getPurchasedGames(req, res));

router.use('/games', gameRoutes);

// 監視関連のルート
const monitoringRoutes = Router();

monitoringRoutes.get('/status', (req, res) => MonitoringController.getStatus(req, res));
monitoringRoutes.get('/progress', (req, res) => MonitoringController.getProgress(req, res));
monitoringRoutes.post('/run', (req, res) => MonitoringController.runManualMonitoring(req, res));
monitoringRoutes.post('/run/:appId', validateSteamAppId, (req, res) => MonitoringController.runManualGameMonitoring(req, res));
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
    console.error('Price alert test error:', error);
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
      databasePath: './data/steam-sentinel.db',
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
    console.error('Price alert test error:', error);
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
    
    let alerts;
    if (filter === 'all') {
      alerts = AlertModel.getHistory(limit, offset);
    } else {
      // フィルタリング実装（alert_type別など）
      alerts = AlertModel.getHistory(limit, offset);
    }
    
    // 総件数を取得（ページネーション用）
    const db = (await import('../db/database')).default.getConnection();
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number };
    
    res.json({
      success: true,
      data: alerts,
      pagination: {
        page,
        limit,
        total: totalCount.count,
        totalPages: Math.ceil(totalCount.count / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
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
    console.error('Failed to fetch alert statistics:', error);
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
    console.error('Failed to fetch recent alerts:', error);
    res.status(500).json({
      success: false,
      error: '最新アラートの取得に失敗しました'
    });
  }
});

router.use('/alerts', alertRoutes);

export default router;