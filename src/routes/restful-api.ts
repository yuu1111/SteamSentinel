import { Router } from 'express';
import Joi from 'joi';
import { AlertController } from '../controllers/AlertController';
import { GameController } from '../controllers/GameController';
import { MonitoringController } from '../controllers/MonitoringController';
import { PriceController } from '../controllers/PriceController';
import { ReviewController } from '../controllers/ReviewController';
import { StatisticsController } from '../controllers/StatisticsController';
import { JsonMaintenanceController } from '../controllers/JsonMaintenanceController';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { 
  gameSchema, 
  gameUpdateSchema, 
  alertSchema,
  paginationSchema, 
  idParamSchema,
  steamAppIdParamSchema,
  dateRangeSchema
} from '../validation/schemas';
import { 
  apiLimiter, 
  readOnlyLimiter, 
  heavyOperationLimiter, 
  adminLimiter,
  notificationLimiter 
} from '../middleware/security';
import { authenticateToken, authorizeRole, optionalAuth } from '../middleware/auth';
import authRoutes from './auth';

const router = Router();

// デフォルトのAPIレート制限を適用
router.use(apiLimiter);

// 認証ルートを追加（認証不要）
router.use('/auth', authRoutes);

// ===== GAMES RESOURCE =====

// GET /api/v1/games - ゲーム一覧取得（読み取り専用レート制限）
router.get('/games', 
  readOnlyLimiter,
  validateQuery(paginationSchema.keys({
    enabled: Joi.string().valid('true', 'false', 'all').optional(),
    search: Joi.string().max(100).optional(),
    purchased: Joi.boolean().optional()
  })),
  (req, res) => GameController.getAllGames(req, res)
);

// GET /api/v1/games/:id - ゲーム詳細取得
router.get('/games/:id',
  validateParams(idParamSchema),
  (req, res) => GameController.getGameById(req, res)
);

// POST /api/v1/games - ゲーム作成（認証必須）
router.post('/games',
  authenticateToken,
  validateBody(gameSchema),
  (req, res) => GameController.addGame(req, res)
);

// PUT /api/v1/games/:id - ゲーム更新（認証必須）
router.put('/games/:id',
  authenticateToken,
  validateParams(idParamSchema),
  validateBody(gameUpdateSchema),
  (req, res) => GameController.updateGame(req, res)
);

// DELETE /api/v1/games/:id - ゲーム削除（管理者のみ・管理者用レート制限）
router.delete('/games/:id',
  adminLimiter,
  authenticateToken,
  authorizeRole(['admin']),
  validateParams(idParamSchema),
  (req, res) => GameController.deleteGame(req, res)
);

// GET /api/v1/games/:id/price-history - 価格履歴取得
router.get('/games/:id/price-history',
  validateParams(idParamSchema),
  validateQuery(dateRangeSchema.keys({
    days: Joi.number().integer().min(1).max(365).default(30),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  })),
  (req, res) => GameController.getGamePriceHistory(req, res)
);

// GET /api/v1/games/:id/alerts - ゲーム関連アラート取得
router.get('/games/:id/alerts',
  validateParams(idParamSchema),
  validateQuery(paginationSchema.keys({
    type: Joi.string().valid('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released').optional(),
    unread: Joi.boolean().optional()
  })),
  (req, res) => {
    // ゲームIDをsteam_app_idフィルターとして使用
    req.query.steamAppId = req.params.id;
    new AlertController().getAlerts(req, res);
  }
);

// PUT /api/v1/games/:id/purchase - 購入マーク設定
router.put('/games/:id/purchase',
  validateParams(idParamSchema),
  validateBody(Joi.object({
    is_purchased: Joi.boolean().required(),
    purchase_price: Joi.number().min(0).when('is_purchased', {
      is: true,
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    }),
    purchase_date: Joi.date().iso().when('is_purchased', {
      is: true,
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
  })),
  (req, res) => {
    // 購入情報を更新用データに変換
    req.body = {
      is_purchased: req.body.is_purchased,
      purchase_price: req.body.purchase_price || null,
      purchase_date: req.body.purchase_date || null
    };
    GameController.updateGame(req, res);
  }
);

// GET /api/v1/games/steam/:appId - Steam特定IDでゲーム取得
router.get('/games/steam/:appId',
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  (req, res) => GameController.getGameBySteamAppId(req, res)
);

// GET /api/v1/games/check/:appId - ゲーム存在チェック
router.get('/games/check/:appId',
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  (req, res) => GameController.checkGameExists(req, res)
);

// GET /api/v1/games/high-discount - 高割引ゲーム取得
router.get('/games/high-discount',
  validateQuery(paginationSchema.keys({
    threshold: Joi.number().min(10).max(90).default(50)
  })),
  (req, res) => GameController.getHighDiscountGames(req, res)
);

// POST /api/v1/analysis/high-discounts - 高割引分析実行（RESTful化）
router.post('/analysis/high-discounts',
  validateBody(Joi.object({
    threshold: Joi.number().min(10).max(90).default(50),
    force_refresh: Joi.boolean().default(false)
  })),
  (req, res) => GameController.runHighDiscountDetection(req, res)
);

// GET /api/v1/games/:appId/reviews - ゲームレビュー取得（移行先: ReviewController）
router.get('/games/:appId/reviews',
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  validateQuery(Joi.object({
    details: Joi.boolean().default(false)
  })),
  (req, res) => new ReviewController().getGameReviews(req, res)
);

// POST /api/v1/batch/games/reviews - 複数ゲームレビュー取得（RESTful化）
router.post('/batch/games/reviews',
  validateBody(Joi.object({
    steamAppIds: Joi.array().items(Joi.number().integer().positive()).max(10).required()
  })),
  (req, res) => new ReviewController().getMultipleGameReviews(req, res)
);

// GET /api/v1/games/:appId/info - ゲーム情報取得
router.get('/games/:appId/info',
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  (req, res) => GameController.getGameInfo(req, res)
);

// POST /api/v1/batch/games/info - 複数ゲーム情報取得（RESTful化）
router.post('/batch/games/info',
  validateBody(Joi.object({
    steam_app_ids: Joi.array().items(Joi.number().integer().positive()).max(10).required()
  })),
  (req, res) => GameController.getMultipleGameInfo(req, res)
);

// GET /api/v1/games/:appId/details - ゲーム詳細情報取得
router.get('/games/:appId/details',
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  (req, res) => GameController.getGameDetails(req, res)
);

// PUT /api/v1/games/:id/manual-historical-low - 手動最安値設定
router.put('/games/:id/manual-historical-low',
  validateParams(idParamSchema),
  validateBody(Joi.object({
    manual_historical_low: Joi.number().min(0).required()
  })),
  (req, res) => GameController.setManualHistoricalLow(req, res)
);

// GET /api/v1/games/purchased - 購入済みゲーム一覧
router.get('/games/purchased',
  validateQuery(paginationSchema),
  (req, res) => GameController.getPurchasedGames(req, res)
);

// GET /api/v1/games/expenses - ゲーム支出データ
router.get('/games/expenses',
  validateQuery(dateRangeSchema.keys({
    period: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').default('monthly')
  })),
  (req, res) => GameController.getExpenseData(req, res)
);

// ===== ALERTS RESOURCE =====

// GET /api/v1/alerts - アラート一覧取得
router.get('/alerts',
  validateQuery(paginationSchema.keys({
    type: Joi.string().valid('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released', 'test').optional(),
    unread: Joi.boolean().optional(),
    game_id: Joi.number().integer().positive().optional(),
    ...dateRangeSchema.describe()
  })),
  (req, res) => new AlertController().getAlerts(req, res)
);

// GET /api/v1/alerts/recent - 最新アラート取得（具体的なルートを先に定義）
router.get('/alerts/recent',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10)
  })),
  (req, res) => {
    const AlertModel = require('../models/AlertModel').AlertModel;
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const recentAlerts = AlertModel.getRecent(limit);
      
      res.json({
        success: true,
        data: recentAlerts
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '最新アラートの取得に失敗しました'
      });
    }
  }
);

// GET /api/v1/alerts/:id - アラート詳細取得
router.get('/alerts/:id',
  validateParams(idParamSchema),
  (req, res) => new AlertController().getAlert(req, res)
);

// アラート作成エンドポイントは削除（テスト専用機能をプロダクションコードから除去）

// PUT /api/v1/alerts/:id/read - アラート既読マーク
router.put('/alerts/:id/read',
  validateParams(idParamSchema),
  (req, res) => new AlertController().markAsRead(req, res)
);

// PUT /api/v1/alerts/read - 複数アラート既読マーク
router.put('/alerts/read',
  validateBody(Joi.object({
    alert_type: Joi.string().valid('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released', 'test').optional(),
    game_id: Joi.number().integer().positive().optional(),
    all: Joi.boolean().default(false)
  })),
  (req, res) => new AlertController().markAllAsRead(req, res)
);

// DELETE /api/v1/alerts/:id - アラート削除
router.delete('/alerts/:id',
  validateParams(idParamSchema),
  (req, res) => new AlertController().deleteAlert(req, res)
);

// DELETE /api/v1/alerts - アラート一括削除/クリーンアップ
router.delete('/alerts',
  validateQuery(Joi.object({
    older_than_days: Joi.number().integer().min(1).default(30),
    read_only: Joi.boolean().default(false),
    confirm: Joi.boolean().valid(true).required()
  })),
  (req, res) => new AlertController().cleanup(req, res)
);

// ===== PRICES RESOURCE =====

// GET /api/v1/prices/history/:appId - 価格履歴取得
router.get('/prices/history/:appId',
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  validateQuery(Joi.object({
    days: Joi.number().integer().min(1).max(365).default(30),
    limit: Joi.number().integer().min(1).max(1000).default(100)
  })),
  (req, res) => new PriceController().getPriceHistory(req, res)
);

// GET /api/v1/prices/latest/:appId - 最新価格取得
router.get('/prices/latest/:appId',
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  (req, res) => new PriceController().getLatestPrice(req, res)
);

// GET /api/v1/prices/statistics - 価格統計取得
router.get('/prices/statistics',
  (req, res) => new PriceController().getPriceStatistics(req, res)
);

// POST /api/v1/prices/track - 価格追跡開始（認証必須）
router.post('/prices/track',
  authenticateToken,
  validateBody(Joi.object({
    steamAppIds: Joi.array().items(Joi.number().integer().positive()).max(10).required()
  })),
  (req, res) => new PriceController().startTracking(req, res)
);

// DELETE /api/v1/prices/track/:appId - 価格追跡停止（認証必須）
router.delete('/prices/track/:appId',
  authenticateToken,
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  (req, res) => new PriceController().stopTracking(req, res)
);

// GET /api/v1/prices/alerts/potential - アラート候補取得
router.get('/prices/alerts/potential',
  validateQuery(Joi.object({
    threshold: Joi.number().integer().min(10).max(90).default(50)
  })),
  (req, res) => new PriceController().getPotentialAlerts(req, res)
);

// ===== REVIEWS RESOURCE =====

// GET /api/v1/reviews/:appId - ゲームレビュー統合取得
router.get('/reviews/:appId',
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  validateQuery(Joi.object({
    details: Joi.boolean().default(false)
  })),
  (req, res) => new ReviewController().getGameReviews(req, res)
);

// POST /api/v1/reviews/:appId/refresh - レビュー情報更新（認証必須）
router.post('/reviews/:appId/refresh',
  authenticateToken,
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  validateQuery(Joi.object({
    force: Joi.boolean().default(false)
  })),
  (req, res) => new ReviewController().refreshGameReviews(req, res)
);

// POST /api/v1/batch/reviews - 複数ゲームレビュー取得（RESTful化）
router.post('/batch/reviews',
  validateBody(Joi.object({
    steamAppIds: Joi.array().items(Joi.number().integer().positive()).max(10).required()
  })),
  (req, res) => new ReviewController().getMultipleGameReviews(req, res)
);

// GET /api/v1/reviews/statistics - レビュー統計取得
router.get('/reviews/statistics',
  (req, res) => new ReviewController().getReviewStatistics(req, res)
);

// DELETE /api/v1/reviews/:appId - レビュー情報削除（管理者のみ）
router.delete('/reviews/:appId',
  authenticateToken,
  authorizeRole(['admin']),
  validateParams(Joi.object({ appId: Joi.number().integer().positive().required() })),
  (req, res) => new ReviewController().deleteGameReviews(req, res)
);

// ===== DASHBOARD & STATISTICS =====

// GET /api/v1/dashboard - ダッシュボードデータ取得
router.get('/dashboard',
  (req, res) => GameController.getDashboardData(req, res)
);

// GET /api/v1/statistics/dashboard - ダッシュボード統計
router.get('/statistics/dashboard',
  (req, res) => new StatisticsController().getDashboardStatistics(req, res)
);

// GET /api/v1/statistics/games - ゲーム統計取得
router.get('/statistics/games',
  validateQuery(Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d')
  })),
  (req, res) => new StatisticsController().getGameStatistics(req, res)
);

// GET /api/v1/statistics/alerts - アラート統計取得
router.get('/statistics/alerts',
  validateQuery(Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d')
  })),
  (req, res) => new StatisticsController().getAlertStatistics(req, res)
);

// GET /api/v1/statistics/performance - パフォーマンス統計
router.get('/statistics/performance',
  (req, res) => new StatisticsController().getPerformanceStatistics(req, res)
);

// GET /api/v1/statistics/export - 統計データエクスポート（認証必須）
router.get('/statistics/export',
  authenticateToken,
  validateQuery(Joi.object({
    format: Joi.string().valid('json', 'csv').default('json'),
    include_sensitive: Joi.boolean().default(false)
  })),
  (req, res) => new StatisticsController().exportStatistics(req, res)
);

// ===== MONITORING =====

// GET /api/v1/monitoring/status - モニタリングステータス
router.get('/monitoring/status',
  (req, res) => MonitoringController.getStatus(req, res)
);

// GET /api/v1/monitoring/progress - モニタリング進捗
router.get('/monitoring/progress',
  (req, res) => MonitoringController.getProgress(req, res)
);

// POST /api/v1/monitoring/jobs - 手動モニタリング実行（RESTful化）
router.post('/monitoring/jobs',
  validateBody(Joi.object({
    game_id: Joi.number().integer().positive().optional(),
    force: Joi.boolean().default(false)
  })),
  (req, res) => MonitoringController.runManualMonitoring(req, res)
);

// POST /api/v1/monitoring/jobs/:appId - 特定ゲームのモニタリング実行（RESTful化）
router.post('/monitoring/jobs/:appId',
  validateParams(steamAppIdParamSchema.keys({ appId: Joi.number().integer().positive().required() })),
  (req, res) => MonitoringController.runManualGameMonitoring(req, res)
);

// PUT /api/v1/monitoring/interval - モニタリング間隔更新
router.put('/monitoring/interval',
  validateBody(Joi.object({
    interval: Joi.number().integer().min(5).max(1440).required() // 5分〜24時間
  })),
  (req, res) => MonitoringController.updateMonitoringInterval(req, res)
);

// GET /api/v1/monitoring/health - ヘルスチェック
router.get('/monitoring/health',
  (req, res) => MonitoringController.healthCheck(req, res)
);

// GET /api/v1/monitoring/logs - ログ取得
router.get('/monitoring/logs',
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(1000).default(100),
    level: Joi.string().valid('error', 'warn', 'info', 'debug').optional()
  })),
  (req, res) => MonitoringController.getLogs(req, res)
);

// GET /api/v1/monitoring/system - システム情報
router.get('/monitoring/system',
  (req, res) => MonitoringController.getSystemInfo(req, res)
);

// POST /api/v1/monitoring/database/cleanup - データベースクリーンアップ実行（認証必須）
router.post('/monitoring/database/cleanup',
  authenticateToken,
  authorizeRole(['admin']),
  validateBody(Joi.object({
    daysToKeep: Joi.number().integer().min(7).max(365).default(30)
  })),
  (req, res) => MonitoringController.runDatabaseCleanup(req, res)
);

// GET /api/v1/monitoring/database/stats - データベース統計取得
router.get('/monitoring/database/stats',
  optionalAuth,
  (req, res) => MonitoringController.getDatabaseStats(req, res)
);

// GET /api/v1/monitoring/cache/stats - キャッシュ統計取得
router.get('/monitoring/cache/stats',
  readOnlyLimiter,
  optionalAuth,
  (req, res) => MonitoringController.getCacheStats(req, res)
);

// POST /api/v1/monitoring/cache/clear - キャッシュクリア（管理者のみ）
router.post('/monitoring/cache/clear',
  adminLimiter,
  authenticateToken,
  authorizeRole(['admin']),
  validateBody(Joi.object({
    pattern: Joi.string().optional()
  })),
  (req, res) => MonitoringController.clearCache(req, res)
);

// ===== BATCH OPERATIONS =====

// POST /api/v1/games/batch - 複数ゲーム一括操作
router.post('/games/batch',
  validateBody(Joi.object({
    action: Joi.string().valid('import', 'export').required(),
    steam_app_ids: Joi.array().items(Joi.number().integer().positive()).when('action', {
      is: 'import',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  })),
  (req, res) => {
    if (req.body.action === 'import') {
      GameController.importGames(req, res);
    } else if (req.body.action === 'export') {
      GameController.exportGames(req, res);
    }
  }
);

// ===== DISCORD & SYSTEM =====

// GET /api/v1/discord/status - Discord連携状態
router.get('/discord/status', (req, res) => {
  try {
    const discordService = require('../services/DiscordService').default;
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

// POST /api/v1/discord/test - Discordテスト送信
router.post('/discord/test',
  validateBody(Joi.object({
    type: Joi.string().valid('connection', 'price_alert', 'high_discount', 'epic_free').required()
  })),
  async (req, res) => {
    try {
      const discordService = require('../services/DiscordService').default;
      const result = await discordService.sendTestMessage(req.body.type);
      
      if (result.success) {
        res.json({
          success: true,
          message: `Discord ${req.body.type} テストメッセージを送信しました`,
          testType: req.body.type
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'テストメッセージ送信に失敗しました',
          testType: req.body.type
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Discordテスト実行中にエラーが発生しました'
      });
    }
  }
);

// POST /api/v1/system/test-price-alert - 価格アラートテスト
router.post('/system/test-price-alert',
  validateBody(Joi.object({
    gameId: Joi.number().integer().positive().required(),
    alertType: Joi.string().valid('new_low', 'sale_start', 'threshold_met').required(),
    testPrice: Joi.number().min(0).required(),
    sendDiscord: Joi.boolean().default(false)
  })),
  async (req, res) => {
    try {
      const { gameId, alertType, testPrice, sendDiscord } = req.body;
      
      // ゲーム情報を取得
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
        alertType: alertType,
        currentPrice: parseFloat(testPrice),
        originalPrice: game.name === 'Cyberpunk 2077' ? 7980 : 5980,
        discountPercent: Math.round((1 - parseFloat(testPrice) / 5980) * 100),
        previousLow: game.name === 'Cyberpunk 2077' ? 3500 : 2500
      };

      // アラート履歴をデータベースに追加
      const database = require('../db/database').default;
      const db = database.getConnection();
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
        const discordService = require('../services/DiscordService').default;
        const mappedAlertType = alertType === 'threshold_met' ? 'new_low' : alertType;
        discordResult = await discordService.sendPriceAlert(
          game,
          mappedAlertType,
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
      return res.status(500).json({
        success: false,
        error: '価格アラートテスト実行中にエラーが発生しました'
      });
    }
  }
);

// GET /api/v1/system/info - システム情報
router.get('/system/info', (req, res) => {
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

// GET /api/v1/system/api-status - API設定状況
router.get('/system/api-status', (req, res) => {
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

// GET /api/v1/system/discord-status - Discord設定状況
router.get('/system/discord-status', (req, res) => {
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

// GET /api/v1/system/build-info - ビルド情報
router.get('/system/build-info', (req, res) => {
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

// ===== BUDGETS =====

// GET /api/v1/budgets - 予算一覧取得
router.get('/budgets',
  validateQuery(paginationSchema),
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.getAllBudgets(req, res);
  }
);

// GET /api/v1/budgets/active - アクティブ予算取得
router.get('/budgets/active',
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.getActiveBudgets(req, res);
  }
);

// GET /api/v1/budgets/summaries - 予算サマリー取得
router.get('/budgets/summaries',
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.getBudgetSummaries(req, res);
  }
);

// POST /api/v1/budgets - 予算作成
router.post('/budgets',
  validateBody(Joi.object({
    name: Joi.string().required(),
    period_type: Joi.string().valid('monthly', 'yearly', 'custom').required(),
    budget_amount: Joi.number().min(0).required(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional()
  })),
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.createBudget(req, res);
  }
);

// POST /api/v1/budgets/monthly - 月間予算自動作成
router.post('/budgets/monthly',
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.createMonthlyBudget(req, res);
  }
);

// POST /api/v1/budgets/yearly - 年間予算自動作成
router.post('/budgets/yearly',
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.createYearlyBudget(req, res);
  }
);

// GET /api/v1/budgets/:id - 予算詳細取得
router.get('/budgets/:id',
  validateParams(idParamSchema),
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.getBudgetById(req, res);
  }
);

// PUT /api/v1/budgets/:id - 予算更新
router.put('/budgets/:id',
  validateParams(idParamSchema),
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.updateBudget(req, res);
  }
);

// DELETE /api/v1/budgets/:id - 予算削除
router.delete('/budgets/:id',
  validateParams(idParamSchema),
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.deleteBudget(req, res);
  }
);

// GET /api/v1/budgets/:id/expenses - 予算支出記録取得
router.get('/budgets/:id/expenses',
  validateParams(idParamSchema),
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.getBudgetExpenses(req, res);
  }
);

// POST /api/v1/budgets/:id/expenses - 予算支出記録追加
router.post('/budgets/:id/expenses',
  validateParams(idParamSchema),
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.addExpense(req, res);
  }
);

// DELETE /api/v1/budgets/:id/expenses/:expenseId - 支出削除
router.delete('/budgets/:id/expenses/:expenseId',
  validateParams(idParamSchema.keys({ expenseId: Joi.number().integer().positive().required() })),
  (req, res) => {
    const budgetController = require('../controllers/BudgetController').default;
    budgetController.deleteExpense(req, res);
  }
);

// ===== FREE GAMES =====

// GET /api/v1/free-games - 無料ゲーム一覧
router.get('/free-games',
  validateQuery(paginationSchema.keys({
    source: Joi.string().valid('epic', 'steam', 'all').default('all'),
    claimed: Joi.boolean().optional()
  })),
  (req, res) => {
    const freeGamesRoutes = require('./freeGames').default;
    // 現在のリクエストを直接フリーゲームルートに渡す
    const router = freeGamesRoutes;
    router(req, res);
  }
);

// ===== ITAD SETTINGS =====

// GET /api/v1/itad/settings - ITAD設定取得
router.get('/itad/settings',
  (req, res) => {
    const itadSettingsController = require('../controllers/ITADSettingsController').default;
    itadSettingsController.getAllSettings(req, res);
  }
);

// PUT /api/v1/itad/settings - ITAD設定更新
router.put('/itad/settings',
  validateBody(Joi.object({
    settings: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required()
    })).required()
  })),
  (req, res) => {
    const itadSettingsController = require('../controllers/ITADSettingsController').default;
    itadSettingsController.updateMultipleSettings(req, res);
  }
);

// POST /api/v1/itad/settings/reset - ITAD設定リセット
router.post('/itad/settings/reset',
  (req, res) => {
    const itadSettingsController = require('../controllers/ITADSettingsController').default;
    itadSettingsController.resetToDefaults(req, res);
  }
);

// GET /api/v1/itad/settings/filter - ITADフィルター設定取得
router.get('/itad/settings/filter',
  (req, res) => {
    const itadSettingsController = require('../controllers/ITADSettingsController').default;
    itadSettingsController.getFilterConfig(req, res);
  }
);

// GET /api/v1/itad/settings/:name - ITAD個別設定取得
router.get('/itad/settings/:name',
  validateParams(Joi.object({ name: Joi.string().required() })),
  (req, res) => {
    const itadSettingsController = require('../controllers/ITADSettingsController').default;
    itadSettingsController.getSetting(req, res);
  }
);

// PUT /api/v1/itad/settings/:name - ITAD個別設定更新
router.put('/itad/settings/:name',
  validateParams(Joi.object({ name: Joi.string().required() })),
  (req, res) => {
    const itadSettingsController = require('../controllers/ITADSettingsController').default;
    itadSettingsController.updateSetting(req, res);
  }
);

// GET /api/v1/itad/settings/category/:category - カテゴリ別設定取得
router.get('/itad/settings/category/:category',
  validateParams(Joi.object({ category: Joi.string().required() })),
  (req, res) => {
    const itadSettingsController = require('../controllers/ITADSettingsController').default;
    itadSettingsController.getSettingsByCategory(req, res);
  }
);

// ===== HEALTH CHECK =====

// GET /api/v1/health - ヘルスチェック
// ===== JSON MAINTENANCE ENDPOINTS =====

const jsonMaintenanceController = new JsonMaintenanceController();

// GET /api/v1/maintenance/json/analyze - JSON フィールド分析（管理者専用）
router.get('/maintenance/json/analyze',
  adminLimiter,
  authenticateToken,
  authorizeRole(['admin']),
  (req, res) => jsonMaintenanceController.analyzeJsonFields(req, res)
);

// POST /api/v1/maintenance/json/cleanup - 無効JSONデータクリーンアップ（管理者専用）
router.post('/maintenance/json/cleanup',
  adminLimiter,
  authenticateToken,
  authorizeRole(['admin']),
  (req, res) => jsonMaintenanceController.cleanupInvalidJson(req, res)
);

// POST /api/v1/maintenance/json/validate - JSONデータ検証
router.post('/maintenance/json/validate',
  validateBody(Joi.object({
    type: Joi.string().valid('alert_metadata', 'statistics_json', 'general').required(),
    data: Joi.alternatives().try(Joi.string(), Joi.object(), Joi.array()).required()
  })),
  (req, res) => jsonMaintenanceController.validateJsonData(req, res)
);

// POST /api/v1/maintenance/json/size-check - JSONサイズチェック
router.post('/maintenance/json/size-check',
  validateBody(Joi.object({
    data: Joi.alternatives().try(Joi.string(), Joi.object(), Joi.array()).required(),
    max_size_kb: Joi.number().min(1).max(1024).optional()
  })),
  (req, res) => jsonMaintenanceController.checkJsonSize(req, res)
);

// POST /api/v1/maintenance/json/optimize - JSONデータ最適化
router.post('/maintenance/json/optimize',
  validateBody(Joi.object({
    data: Joi.alternatives().try(Joi.string(), Joi.object(), Joi.array()).required()
  })),
  (req, res) => jsonMaintenanceController.optimizeJsonData(req, res)
);

// GET /api/v1/maintenance/json/search-legacy - レガシーメタデータ検索
router.get('/maintenance/json/search-legacy',
  validateQuery(Joi.object({
    message: Joi.string().max(100).optional(),
    game_name: Joi.string().max(100).optional(),
    limit: Joi.number().integer().min(1).max(100).default(50)
  })),
  (req, res) => jsonMaintenanceController.searchLegacyMetadata(req, res)
);

// ===== HEALTH CHECK =====

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

export default router;