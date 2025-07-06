import { Request, Response } from 'express';
import { GameModel } from '../models/Game';
import { PriceHistoryModel } from '../models/PriceHistory';
import { AlertModel } from '../models/Alert';
import { MonitoringService } from '../services/MonitoringService';
import reviewIntegrationService from '../services/ReviewIntegrationService';
import gameInfoService from '../services/GameInfoService';
import { HighDiscountDetectionService } from '../services/HighDiscountDetectionService';
import { SteamStoreAPI } from '../api/SteamStoreAPI';
import IGDBService from '../services/IGDBService';
import { ApiResponseHelper, BaseController, PerformanceHelper } from '../utils/apiResponse';
import logger from '../utils/logger';

export class GameController extends BaseController {
  // 全ゲーム取得（N+1問題解決版）
  static async getAllGames(req: Request, res: Response) {
    const perf = new PerformanceHelper();
    
    try {
      const enabled = req.query.enabled as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;
      
      let enabledOnly = false;
      
      if (enabled === 'true') {
        enabledOnly = true;
      } else if (enabled === 'all') {
        enabledOnly = false; // 全ゲーム取得
      } else {
        enabledOnly = false; // デフォルトは全ゲーム
      }
      
      // N+1問題を解決：latest_pricesテーブルを使用
      const allGames = GameModel.getAllWithLatestPrices(enabledOnly);
      const total = allGames.length;
      const games = allGames.slice(offset, offset + limit);
      
      ApiResponseHelper.paginated(
        res,
        games,
        total,
        { limit, offset, sort: 'id', order: 'ASC' },
        `${games.length}件のゲームを取得しました`
      );
    } catch (error) {
      logger.error('Failed to get games:', error);
      ApiResponseHelper.error(res, 'ゲームの取得に失敗しました', 500, error);
    }
  }

  // ゲーム詳細取得（内部用）
  static async getGameByIdInternal(gameId: number) {
    try {
      return GameModel.getById(gameId);
    } catch (error) {
      logger.error('Failed to get game by id internally:', error);
      return null;
    }
  }

  // ゲーム詳細取得
  static async getGameById(req: Request, res: Response): Promise<Response> {
    try {
      const gameId = parseInt(req.params.id, 10);
      const game = GameModel.getById(gameId);
      
      if (!game) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      // 最新価格情報を取得
      const latestPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);
      
      // 価格履歴を取得（直近30日）
      const priceHistory = PriceHistoryModel.getByGameId(game.steam_app_id, 30);
      
      // アラート履歴を取得
      const alerts = AlertModel.getByGameId(game.steam_app_id, 10);

      return ApiResponseHelper.success(res, {
        game,
        latestPrice,
        priceHistory,
        alerts
      }, 'ゲーム詳細を取得しました');
    } catch (error) {
      logger.error('Failed to get game details:', error);
      return ApiResponseHelper.error(res, 'ゲーム詳細の取得に失敗しました', 500, error);
    }
  }

  // Steam App ID でゲーム詳細取得
  static async getGameBySteamAppId(req: Request, res: Response): Promise<Response> {
    try {
      const steamAppId = parseInt(req.params.appId, 10);
      const game = GameModel.getBySteamAppId(steamAppId);
      
      if (!game) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      // 最新価格情報を取得
      const latestPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);
      
      // 価格履歴を取得（直近30日）
      const priceHistory = PriceHistoryModel.getByGameId(game.steam_app_id, 30);
      
      // アラート履歴を取得
      const alerts = AlertModel.getByGameId(game.steam_app_id, 10);

      return ApiResponseHelper.success(res, {
        game,
        latestPrice,
        priceHistory,
        alerts
      }, 'ゲーム詳細を取得しました');
    } catch (error) {
      logger.error('Failed to get game details by Steam App ID:', error);
      return ApiResponseHelper.error(res, 'ゲーム詳細の取得に失敗しました', 500, error);
    }
  }

  // ゲーム追加
  static async addGame(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        steam_app_id, 
        name, 
        enabled = true, 
        price_threshold, 
        price_threshold_type = 'price',
        discount_threshold_percent,
        alert_enabled = true 
      } = req.body;

      // 入力検証
      if (!steam_app_id) {
        return ApiResponseHelper.badRequest(res, 'Steam App IDが必要です');
      }

      // 重複チェック
      const existingGame = GameModel.getBySteamAppId(steam_app_id);
      if (existingGame) {
        return ApiResponseHelper.error(res, 'ゲームは既に存在します', 409);
      }

      // ゲーム名が空の場合、Steam APIから取得
      let finalGameName = name;
      if (!name || name.trim() === '') {
        logger.info(`Game name is empty for Steam App ID ${steam_app_id}, fetching from Steam API...`);
        
        try {
          const steamAPI = new (await import('../api/SteamStoreAPI')).SteamStoreAPI();
          const steamDetails = await steamAPI.getAppDetails(steam_app_id);
          
          if (steamDetails?.success && steamDetails.data?.name) {
            finalGameName = steamDetails.data.name;
            logger.info(`Got game name from Steam API: ${finalGameName} (${steam_app_id})`);
          } else {
            logger.error(`Steam API failed for ${steam_app_id}:`, steamDetails);
            return ApiResponseHelper.badRequest(res, 'Steam APIからゲーム名を取得できず、名前が指定されていません');
          }
        } catch (error) {
          logger.error(`Failed to fetch game name from Steam API for ${steam_app_id}:`, error);
          return ApiResponseHelper.badRequest(res, 'Steam APIからゲーム名を取得できず、名前が指定されていません');
        }
      }

      const game = GameModel.create({
        steam_app_id,
        name: finalGameName,
        enabled,
        price_threshold,
        price_threshold_type,
        discount_threshold_percent,
        alert_enabled
      });

      logger.info(`Game added: ${finalGameName} (${steam_app_id})`);

      // 初回価格データを取得（非同期・エラーでも処理続行）
      try {
        logger.info(`Fetching initial price data for newly added game: ${finalGameName} (${steam_app_id})`);
        const monitoringService = new MonitoringService();
        await monitoringService.initialize();
        
        // 単一ゲームの監視を実行（初回データ取得）
        const monitoringResult = await monitoringService.monitorSingleGame(steam_app_id);
        
        if (monitoringResult.error) {
          logger.warn(`Failed to fetch initial price data for ${finalGameName}: ${monitoringResult.error.message}`);
        } else {
          logger.info(`Successfully fetched initial price data for ${finalGameName}`);
        }
      } catch (priceError) {
        // 価格取得失敗はログのみで、ゲーム追加は成功扱い
        logger.warn(`Initial price data fetch failed for ${finalGameName} (${steam_app_id}):`, priceError);
      }

      return ApiResponseHelper.success(res, game, `${finalGameName} を追加しました。価格データを取得中です...`, 201);
    } catch (error) {
      logger.error('Failed to add game:', error);
      return ApiResponseHelper.error(res, 'ゲームの追加に失敗しました', 500, error);
    }
  }

  // ゲーム更新
  static async updateGame(req: Request, res: Response): Promise<Response> {
    try {
      const gameId = parseInt(req.params.id, 10);
      const updates = req.body;

      const updatedGame = GameModel.update(gameId, updates);
      
      if (!updatedGame) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      logger.info(`Game updated: ${updatedGame.name} (${updatedGame.steam_app_id})`);
      return ApiResponseHelper.success(res, updatedGame, 'ゲーム情報を更新しました');
    } catch (error) {
      logger.error('Failed to update game:', error);
      return ApiResponseHelper.error(res, 'ゲームの更新に失敗しました', 500, error);
    }
  }

  // ゲーム削除
  static async deleteGame(req: Request, res: Response): Promise<Response> {
    try {
      const gameId = parseInt(req.params.id, 10);
      const success = GameModel.delete(gameId);
      
      if (!success) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      logger.info(`Game deleted: ID ${gameId}`);
      return ApiResponseHelper.success(res, null, 'ゲームを削除しました');
    } catch (error) {
      logger.error('Failed to delete game:', error);
      return ApiResponseHelper.error(res, 'ゲームの削除に失敗しました', 500, error);
    }
  }

  // ゲーム価格履歴取得
  static async getGamePriceHistory(req: Request, res: Response): Promise<Response> {
    try {
      const steamAppId = parseInt(req.params.appId, 10);
      const days = parseInt(req.query.days as string) || 30;
      
      const game = GameModel.getBySteamAppId(steamAppId);
      if (!game) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      const chartData = PriceHistoryModel.getChartData(steamAppId, days);
      const priceHistory = PriceHistoryModel.getByGameId(steamAppId, 100);

      return ApiResponseHelper.success(res, {
        game,
        chartData,
        priceHistory
      }, '価格履歴を取得しました');
    } catch (error) {
      logger.error('Failed to get price history:', error);
      return ApiResponseHelper.error(res, '価格履歴の取得に失敗しました', 500, error);
    }
  }

  // ダッシュボード用データ取得（N+1問題解決版）
  static async getDashboardData(_req: Request, res: Response): Promise<void> {
    const perf = new PerformanceHelper();
    perf.setCacheHit(false); // ダッシュボードはリアルタイムデータ
    
    try {
      // N+1問題を解決：latest_pricesテーブルを使用して一度に取得
      const gamesWithPrices = GameModel.getAllWithLatestPrices(true);

      // 統計情報を並列で取得
      const [priceStats, alertStats, recentAlerts, recentPriceChanges] = await Promise.all([
        Promise.resolve(PriceHistoryModel.getStatistics()),
        Promise.resolve(AlertModel.getStatistics()),
        Promise.resolve(AlertModel.getRecent(5)),
        Promise.resolve(PriceHistoryModel.getRecentPriceChanges(5))
      ]);

      ApiResponseHelper.success(res, {
        games: gamesWithPrices,
        statistics: {
          ...priceStats,
          ...alertStats
        },
        recentAlerts,
        recentPriceChanges
      }, 'ダッシュボードデータを取得しました', 200, {
        performance: perf.getPerformanceMeta()
      });
    } catch (error) {
      logger.error('Failed to get dashboard data:', error);
      ApiResponseHelper.error(res, 'ダッシュボードデータの取得に失敗しました', 500, error);
    }
  }

  // 重複チェック用API
  static async checkGameExists(req: Request, res: Response): Promise<Response> {
    try {
      const steamAppId = parseInt(req.params.appId, 10);
      
      if (isNaN(steamAppId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Steam App ID'
        });
      }

      const existingGame = GameModel.getBySteamAppId(steamAppId);
      
      return res.json({
        success: true,
        data: {
          exists: !!existingGame,
          game: existingGame || null
        }
      });
    } catch (error) {
      logger.error('Failed to check game existence:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check game existence'
      });
    }
  }

  // テスト用特別状況ゲーム追加（開発用）
  static async addTestSpecialGames(_req: Request, res: Response): Promise<Response> {
    try {
      // 既存のテストゲームを削除
      const testGameIds = [999901, 999902, 999903];
      testGameIds.forEach(steamAppId => {
        PriceHistoryModel.deleteByGameId(steamAppId);
        const game = GameModel.getBySteamAppId(steamAppId);
        if (game) {
          GameModel.delete(game.id!);
        }
      });

      // 基本無料ゲーム
      const freeGame = GameModel.create({
        steam_app_id: 999901,
        name: 'Test Free Game',
        enabled: true,
        alert_enabled: true
      });

      PriceHistoryModel.create({
        steam_app_id: 999901,
        current_price: 0,
        original_price: 0,
        discount_percent: 0,
        historical_low: 0,
        is_on_sale: false,
        source: 'steam_free',
        recorded_at: new Date()
      });

      // 未リリースゲーム
      const unreleasedGame = GameModel.create({
        steam_app_id: 999902,
        name: 'Test Unreleased Game',
        enabled: true,
        alert_enabled: true
      });

      PriceHistoryModel.create({
        steam_app_id: 999902,
        current_price: 0,
        original_price: 2980,
        discount_percent: 0,
        historical_low: 0,
        is_on_sale: false,
        source: 'steam_unreleased',
        release_date: '2025-12-31',
        recorded_at: new Date()
      });

      // 販売終了ゲーム
      const removedGame = GameModel.create({
        steam_app_id: 999903,
        name: 'Test Removed Game',
        enabled: true,
        alert_enabled: true
      });

      PriceHistoryModel.create({
        steam_app_id: 999903,
        current_price: 0,
        original_price: 0,
        discount_percent: 0,
        historical_low: 1980,
        is_on_sale: false,
        source: 'steam_removed',
        recorded_at: new Date()
      });

      logger.info('Test special games added successfully');

      return res.json({
        success: true,
        message: 'Test special games added successfully',
        data: {
          freeGame: { id: freeGame.id, name: freeGame.name },
          unreleasedGame: { id: unreleasedGame.id, name: unreleasedGame.name },
          removedGame: { id: removedGame.id, name: removedGame.name }
        }
      });
    } catch (error) {
      logger.error('Failed to add test special games:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add test special games'
      });
    }
  }

  // ゲーム設定エクスポート
  static async exportGames(_req: Request, res: Response): Promise<Response> {
    try {
      const games = GameModel.getAll();
      
      // エクスポート用に必要なフィールドのみ抽出
      const exportData = games.map(game => ({
        steam_app_id: game.steam_app_id,
        name: game.name,
        enabled: game.enabled,
        price_threshold: game.price_threshold,
        price_threshold_type: game.price_threshold_type || 'price',
        discount_threshold_percent: game.discount_threshold_percent,
        alert_enabled: game.alert_enabled
      }));

      // 現在の日時をUTCで取得
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      
      // ファイル名を設定
      const filename = `steamsentinel_backup_${dateStr}.json`;
      
      // レスポンスヘッダーを設定
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return res.json({
        version: '1.0',
        exportDate: new Date().toISOString(),
        gameCount: exportData.length,
        games: exportData
      });
    } catch (error) {
      logger.error('Failed to export games:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export games'
      });
    }
  }

  // ゲーム設定インポート
  static async importGames(req: Request, res: Response): Promise<Response> {
    try {
      const importData = req.body;
      
      // バリデーション
      if (!importData || !importData.games || !Array.isArray(importData.games)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid import data format'
        });
      }

      const games = importData.games;
      const importMode = req.body.mode || 'merge'; // merge | replace
      
      // replaceモードの場合、既存ゲームをすべて削除
      if (importMode === 'replace') {
        const existingGames = GameModel.getAll();
        for (const game of existingGames) {
          if (game.id !== undefined) {
            GameModel.delete(game.id);
          }
        }
      }

      let imported = 0;
      let skipped = 0;
      let updated = 0;
      const errors: string[] = [];

      // N+1問題を解決: 既存ゲームを一括取得
      const importGameIds = games
        .filter(g => g.steam_app_id && g.name)
        .map(g => g.steam_app_id);
      const existingGamesMap = new Map(
        GameModel.getByMultipleSteamAppIds(importGameIds)
          .map(game => [game.steam_app_id, game])
      );

      for (const gameData of games) {
        try {
          // バリデーション
          if (!gameData.steam_app_id || !gameData.name) {
            errors.push(`Invalid game data: missing steam_app_id or name`);
            continue;
          }

          // 既存ゲームチェック（O(1)ルックアップ）
          const existingGame = existingGamesMap.get(gameData.steam_app_id);
          
          if (existingGame) {
            if (importMode === 'skip') {
              skipped++;
              continue;
            }
            
            // 既存ゲームを更新
            if (existingGame.id !== undefined) {
              GameModel.update(existingGame.id, {
                name: gameData.name,
                enabled: gameData.enabled !== false,
                price_threshold: gameData.price_threshold || null,
                price_threshold_type: gameData.price_threshold_type || 'price',
                discount_threshold_percent: gameData.discount_threshold_percent || null,
                alert_enabled: gameData.alert_enabled !== false
              });
            }
            updated++;
          } else {
            // 新規ゲームを追加
            GameModel.create({
              steam_app_id: gameData.steam_app_id,
              name: gameData.name,
              enabled: gameData.enabled !== false,
              price_threshold: gameData.price_threshold || null,
              price_threshold_type: gameData.price_threshold_type || 'price',
              discount_threshold_percent: gameData.discount_threshold_percent || null,
              alert_enabled: gameData.alert_enabled !== false
            });
            imported++;
          }
        } catch (error) {
          errors.push(`Failed to import game ${gameData.name}: ${error}`);
        }
      }

      return res.json({
        success: true,
        data: {
          imported,
          updated,
          skipped,
          errors: errors.length > 0 ? errors : undefined
        },
        message: `インポート完了: ${imported}件追加, ${updated}件更新, ${skipped}件スキップ`
      });
    } catch (error) {
      logger.error('Failed to import games:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to import games'
      });
    }
  }

  // 出費追跡データ取得
  static async getExpenseData(req: Request, res: Response): Promise<Response> {
    try {
      const period = req.query.period as string || 'month'; // month, quarter, year
      const startDate = new Date();
      
      // 期間設定
      switch (period) {
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default: // month
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // 購入済みマークされたゲームを取得
      const purchasedGames = GameModel.getPurchasedGames();
      
      // ゲームごとの出費計算
      const expensesByGame = new Map<number, {
        game: any;
        totalSpent: number;
        purchaseCount: number;
        averageDiscount: number;
        lastPurchase: Date;
      }>();

      let totalExpenses = 0;
      let totalSavings = 0;
      let totalGames = 0;

      // 購入済みゲームから出費を計算
      for (const game of purchasedGames) {
        if (!game.purchase_price || game.purchase_price <= 0) continue;
        
        totalGames++;
        totalExpenses += game.purchase_price;
        
        // 最新の価格履歴から元の価格を取得
        const latestPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);
        const originalPrice = latestPrice?.original_price || game.purchase_price * 2; // 元価格が不明な場合は購入価格の2倍と仮定
        const savings = originalPrice - game.purchase_price;
        const discountPercent = Math.round((1 - game.purchase_price / originalPrice) * 100);
        
        totalSavings += savings;

        expensesByGame.set(game.steam_app_id, {
          game,
          totalSpent: game.purchase_price,
          purchaseCount: 1,
          averageDiscount: discountPercent,
          lastPurchase: game.purchase_date ? new Date(game.purchase_date) : new Date()
        });
      }

      // 月別支出統計
      const monthlyExpenses = new Map<string, number>();
      const monthlySavings = new Map<string, number>();
      
      for (const game of purchasedGames) {
        if (!game.purchase_price || game.purchase_price <= 0) continue;
        
        const purchaseDate = game.purchase_date ? new Date(game.purchase_date) : new Date();
        const monthKey = purchaseDate.toISOString().substring(0, 7); // YYYY-MM
        
        const latestPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);
        const originalPrice = latestPrice?.original_price || game.purchase_price * 2;
        const savings = originalPrice - game.purchase_price;

        monthlyExpenses.set(monthKey, (monthlyExpenses.get(monthKey) || 0) + game.purchase_price);
        monthlySavings.set(monthKey, (monthlySavings.get(monthKey) || 0) + savings);
      }

      // カテゴリ別統計（割引率による分類）
      const categories = {
        bargain: { count: 0, total: 0, label: '大幅割引 (70%+)' },
        moderate: { count: 0, total: 0, label: '中割引 (30-69%)' },
        small: { count: 0, total: 0, label: '小割引 (1-29%)' },
        full_price: { count: 0, total: 0, label: '定価購入' }
      };

      for (const game of purchasedGames) {
        if (!game.purchase_price || game.purchase_price <= 0) continue;
        
        const latestPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);
        const originalPrice = latestPrice?.original_price || game.purchase_price * 2;
        const discountPercent = Math.round((1 - game.purchase_price / originalPrice) * 100);

        if (discountPercent >= 70) {
          categories.bargain.count++;
          categories.bargain.total += game.purchase_price;
        } else if (discountPercent >= 30) {
          categories.moderate.count++;
          categories.moderate.total += game.purchase_price;
        } else if (discountPercent > 0) {
          categories.small.count++;
          categories.small.total += game.purchase_price;
        } else {
          categories.full_price.count++;
          categories.full_price.total += game.purchase_price;
        }
      }

      return res.json({
        success: true,
        data: {
          period,
          summary: {
            totalExpenses,
            totalSavings,
            totalGames: expensesByGame.size,
            averagePrice: expensesByGame.size > 0 ? totalExpenses / expensesByGame.size : 0,
            savingsRate: totalExpenses > 0 ? (totalSavings / (totalExpenses + totalSavings)) * 100 : 0
          },
          gameExpenses: Array.from(expensesByGame.values()).sort((a, b) => b.totalSpent - a.totalSpent),
          monthlyTrends: {
            expenses: Array.from(monthlyExpenses.entries()).map(([month, amount]) => ({ month, amount })),
            savings: Array.from(monthlySavings.entries()).map(([month, amount]) => ({ month, amount }))
          },
          categories,
          recentPurchases: purchasedGames.slice(0, 10).map(game => {
            return {
              game_name: game.name,
              steam_app_id: game.steam_app_id,
              purchase_price: game.purchase_price || 0,
              purchase_date: game.purchase_date || new Date().toISOString()
            };
          })
        }
      });
    } catch (error) {
      logger.error('Failed to get expense data:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve expense data'
      });
    }
  }

  // ゲームレビュー情報取得
  static async getGameReviews(req: Request, res: Response): Promise<Response> {
    try {
      const steamAppId = parseInt(req.params.appId, 10);
      
      const game = GameModel.getBySteamAppId(steamAppId);
      if (!game) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      const reviews = await reviewIntegrationService.getGameReviews(steamAppId, game.name);
      
      return res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      logger.error('Failed to get game reviews:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve game reviews'
      });
    }
  }


  // 複数ゲームのレビュー一括取得
  static async getMultipleGameReviews(req: Request, res: Response): Promise<Response> {
    try {
      const gameIds = req.body.gameIds as number[];
      
      if (!Array.isArray(gameIds) || gameIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Game IDs array is required'
        });
      }

      // N+1問題を解決: 一括取得を使用
      const gamesFromDb = GameModel.getByMultipleSteamAppIds(gameIds);
      const games = gamesFromDb.map(game => ({
        steamAppId: game.steam_app_id,
        name: game.name
      }));

      const reviewsMap = await reviewIntegrationService.getMultipleGameReviews(games);
      
      // Map を Object に変換
      const reviewsObject: Record<number, any> = {};
      for (const [steamAppId, reviews] of reviewsMap.entries()) {
        reviewsObject[steamAppId] = reviews;
      }

      return res.json({
        success: true,
        data: reviewsObject
      });
    } catch (error) {
      logger.error('Failed to get multiple game reviews:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve game reviews'
      });
    }
  }

  // ゲーム詳細情報取得（HowLongToBeat, PCGamingWiki, ProtonDB統合）
  static async getGameInfo(req: Request, res: Response): Promise<Response> {
    try {
      const steamAppId = parseInt(req.params.appId, 10);
      
      const game = GameModel.getBySteamAppId(steamAppId);
      if (!game) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      const gameInfo = await gameInfoService.getGameInfo(steamAppId, game.name);
      
      return res.json({
        success: true,
        data: gameInfo
      });
    } catch (error) {
      logger.error('Failed to get game info:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve game information'
      });
    }
  }

  // 複数ゲームの詳細情報一括取得
  static async getMultipleGameInfo(req: Request, res: Response): Promise<Response> {
    try {
      const gameIds = req.body.gameIds as number[];
      
      if (!Array.isArray(gameIds) || gameIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Game IDs array is required'
        });
      }

      // N+1問題を解決: 一括取得を使用
      const gamesFromDb = GameModel.getByMultipleSteamAppIds(gameIds);
      const games = gamesFromDb.map(game => ({
        steamAppId: game.steam_app_id,
        name: game.name
      }));

      const infoMap = await gameInfoService.getMultipleGameInfo(games);
      
      // Map を Object に変換
      const infoObject: Record<number, any> = {};
      for (const [steamAppId, info] of infoMap.entries()) {
        infoObject[steamAppId] = info;
      }

      return res.json({
        success: true,
        data: infoObject
      });
    } catch (error) {
      logger.error('Failed to get multiple game info:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve game information'
      });
    }
  }

  // 手動最安値設定
  static async setManualHistoricalLow(req: Request, res: Response): Promise<Response> {
    try {
      const gameId = parseInt(req.params.id, 10);
      const { manual_historical_low } = req.body;

      // 入力検証
      if (manual_historical_low !== null && (isNaN(manual_historical_low) || manual_historical_low < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid manual historical low price'
        });
      }

      const updatedGame = GameModel.update(gameId, { manual_historical_low });
      
      if (!updatedGame) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      logger.info(`Manual historical low set for game: ${updatedGame.name} (${updatedGame.steam_app_id}) - ¥${manual_historical_low || 'cleared'}`);
      return res.json({
        success: true,
        data: updatedGame,
        message: manual_historical_low ? `手動最安値を¥${manual_historical_low}に設定しました` : '手動最安値をクリアしました'
      });
    } catch (error) {
      logger.error('Failed to set manual historical low:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to set manual historical low'
      });
    }
  }

  // 購入済みマーク設定
  static async markAsPurchased(req: Request, res: Response): Promise<Response> {
    try {
      const gameId = parseInt(req.params.id, 10);
      const { purchase_price, purchase_date = new Date().toISOString(), budget_id } = req.body;

      // 入力検証
      if (purchase_price !== null && (isNaN(purchase_price) || purchase_price < 0)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid purchase price'
        });
      }

      const updatedGame = GameModel.update(gameId, { 
        is_purchased: true,
        purchase_price,
        purchase_date: new Date(purchase_date).toISOString()
      });
      
      if (!updatedGame) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      // 予算が指定されている場合は支出を記録
      if (budget_id && purchase_price > 0) {
        try {
          const dbManager = await import('../db/database');
          const db = dbManager.default.getConnection();
          
          // 予算支出を記録
          const insertExpenseStmt = db.prepare(`
            INSERT INTO budget_expenses (budget_id, steam_app_id, game_name, amount, purchase_date, category)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          
          const result = insertExpenseStmt.run(
            budget_id,
            updatedGame.steam_app_id,
            updatedGame.name,
            purchase_price,
            purchase_date || new Date().toISOString().split('T')[0], // YYYY-MM-DD形式
            'game'
          );
          
          logger.info(`Budget expense recorded: ¥${purchase_price} for ${updatedGame.name} (Budget ID: ${budget_id}, Insert ID: ${result.lastInsertRowid}, Changes: ${result.changes})`);
        } catch (budgetError) {
          logger.warn(`Error recording budget expense for game ${updatedGame.name}:`, budgetError);
        }
      }

      logger.info(`Game marked as purchased: ${updatedGame.name} (${updatedGame.steam_app_id}) - ¥${purchase_price || 'unknown price'}${budget_id ? ` (Budget ID: ${budget_id})` : ''}`);
      return res.json({
        success: true,
        data: updatedGame,
        message: `${updatedGame.name}を購入済みにマークしました`
      });
    } catch (error) {
      logger.error('Failed to mark game as purchased:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to mark game as purchased'
      });
    }
  }

  // 購入済みマーク解除
  static async unmarkAsPurchased(req: Request, res: Response): Promise<Response> {
    try {
      const gameId = parseInt(req.params.id, 10);

      const updatedGame = GameModel.update(gameId, { 
        is_purchased: false,
        purchase_price: undefined,
        purchase_date: undefined
      });
      
      if (!updatedGame) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      logger.info(`Game unmarked as purchased: ${updatedGame.name} (${updatedGame.steam_app_id})`);
      return res.json({
        success: true,
        data: updatedGame,
        message: `${updatedGame.name}の購入済みマークを解除しました`
      });
    } catch (error) {
      logger.error('Failed to unmark game as purchased:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to unmark game as purchased'
      });
    }
  }

  // 購入済みゲーム一覧取得
  static async getPurchasedGames(req: Request, res: Response): Promise<Response> {
    try {
      const period = req.query.period as string || 'all'; // month, quarter, year, all
      let startDate: Date | null = null;
      
      // 期間設定
      if (period !== 'all') {
        startDate = new Date();
        switch (period) {
          case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          default: // month
            startDate.setMonth(startDate.getMonth() - 1);
        }
      }

      const purchasedGames = GameModel.getPurchasedGames(startDate);
      
      // 支出統計計算
      const totalSpent = purchasedGames.reduce((sum, game) => sum + (game.purchase_price || 0), 0);
      const averagePrice = purchasedGames.length > 0 ? totalSpent / purchasedGames.length : 0;
      
      // 月別統計
      const monthlyStats = new Map<string, { count: number; total: number }>();
      purchasedGames.forEach(game => {
        if (game.purchase_date) {
          const monthKey = game.purchase_date.substring(0, 7); // YYYY-MM
          const existing = monthlyStats.get(monthKey) || { count: 0, total: 0 };
          existing.count++;
          existing.total += game.purchase_price || 0;
          monthlyStats.set(monthKey, existing);
        }
      });

      return res.json({
        success: true,
        data: {
          games: purchasedGames,
          statistics: {
            totalGames: purchasedGames.length,
            totalSpent,
            averagePrice,
            period,
            monthlyStats: Object.fromEntries(monthlyStats)
          }
        }
      });
    } catch (error) {
      logger.error('Failed to get purchased games:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve purchased games'
      });
    }
  }

  // 高割引ゲーム取得
  static async getHighDiscountGames(req: Request, res: Response): Promise<Response> {
    try {
      const { type = 'standard' } = req.query;
      logger.info(`Getting high discount games with type: ${type}`);
      
      const highDiscountService = new HighDiscountDetectionService();
      
      let games: any[] = [];
      try {
        if (type === 'popular') {
          games = await highDiscountService.detectPopularHighDiscountGames();
        } else {
          games = await highDiscountService.detectHighDiscountGames();
        }
      } catch (serviceError) {
        logger.error('High discount service error:', serviceError);
        // サービスエラーの場合は空の配列を返す
        games = [];
      }
      
      return res.json({
        success: true,
        data: {
          games: games || [],
          lastCheck: highDiscountService.getLastCheckTime(),
          statistics: highDiscountService.getStatistics()
        }
      });
    } catch (error) {
      logger.error('Failed to get high discount games:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve high discount games'
      });
    }
  }

  // 高割引ゲーム手動検知
  static async runHighDiscountDetection(req: Request, res: Response): Promise<Response> {
    try {
      const { type = 'standard' } = req.body;
      logger.info(`Running high discount detection with type: ${type}`);
      
      const highDiscountService = new HighDiscountDetectionService();
      
      let games: any[] = [];
      try {
        if (type === 'popular') {
          games = await highDiscountService.detectPopularHighDiscountGames();
        } else {
          games = await highDiscountService.runManualCheck();
        }
      } catch (serviceError) {
        logger.error('High discount detection service error:', serviceError);
        return res.status(500).json({
          success: false,
          error: 'High discount detection service failed',
          details: serviceError instanceof Error ? serviceError.message : 'Unknown error'
        });
      }
      
      return res.json({
        success: true,
        data: games || [],
        message: `${(games || []).length}件の高割引ゲームを発見しました`
      });
    } catch (error) {
      logger.error('Failed to run high discount detection:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to run high discount detection'
      });
    }
  }

  // ゲーム詳細情報取得（Steam + IGDB）
  static async getGameDetails(req: Request, res: Response): Promise<Response> {
    try {
      const steamAppId = parseInt(req.params.appId, 10);
      
      const game = GameModel.getBySteamAppId(steamAppId);
      if (!game) {
        return ApiResponseHelper.notFound(res, 'ゲーム');
      }

      logger.info(`Getting detailed game info for: ${game.name} (${steamAppId})`);

      // Steam APIから詳細情報を取得
      const steamAPI = new SteamStoreAPI();
      const steamDetails = await steamAPI.getDetailedGameInfo(steamAppId);

      // IGDB APIから詳細情報を取得
      let igdbDetails = {};
      if (IGDBService.isConfigured()) {
        igdbDetails = await IGDBService.getDetailedGameInfo(game.name, steamAppId);
      } else {
        logger.warn('IGDB not configured, skipping IGDB detail fetch');
      }

      const gameDetails = {
        steam: steamDetails,
        igdb: igdbDetails
      };

      logger.info(`Retrieved game details for ${game.name}: Steam=${!!steamDetails}, IGDB=${Object.keys(igdbDetails).length > 0}`);

      return res.json({
        success: true,
        data: gameDetails
      });
    } catch (error) {
      logger.error(`Failed to get game details for ${req.params.appId}:`, error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get game details',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}