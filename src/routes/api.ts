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

export default router;