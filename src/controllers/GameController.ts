import { Request, Response } from 'express';
import { GameModel } from '../models/Game';
import { PriceHistoryModel } from '../models/PriceHistory';
import { AlertModel } from '../models/Alert';
import { MonitoringService } from '../services/MonitoringService';
import reviewIntegrationService from '../services/ReviewIntegrationService';
import gameInfoService from '../services/GameInfoService';
import logger from '../utils/logger';

export class GameController {
  // 全ゲーム取得
  static async getAllGames(req: Request, res: Response) {
    try {
      const enabled = req.query.enabled as string;
      let enabledOnly = false;
      
      if (enabled === 'true') {
        enabledOnly = true;
      } else if (enabled === 'all') {
        enabledOnly = false; // 全ゲーム取得
      } else {
        enabledOnly = false; // デフォルトは全ゲーム
      }
      
      const games = GameModel.getAll(enabledOnly);
      
      res.json({
        success: true,
        data: games,
        count: games.length
      });
    } catch (error) {
      logger.error('Failed to get games:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve games'
      });
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
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }

      // 最新価格情報を取得
      const latestPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);
      
      // 価格履歴を取得（直近30日）
      const priceHistory = PriceHistoryModel.getByGameId(game.steam_app_id, 30);
      
      // アラート履歴を取得
      const alerts = AlertModel.getByGameId(game.steam_app_id, 10);

      return res.json({
        success: true,
        data: {
          game,
          latestPrice,
          priceHistory,
          alerts
        }
      });
    } catch (error) {
      logger.error('Failed to get game details:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve game details'
      });
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
      if (!steam_app_id || !name) {
        return res.status(400).json({
          success: false,
          error: 'Steam App ID and name are required'
        });
      }

      // 重複チェック
      const existingGame = GameModel.getBySteamAppId(steam_app_id);
      if (existingGame) {
        return res.status(409).json({
          success: false,
          error: 'Game already exists'
        });
      }

      const game = GameModel.create({
        steam_app_id,
        name,
        enabled,
        price_threshold,
        price_threshold_type,
        discount_threshold_percent,
        alert_enabled
      });

      logger.info(`Game added: ${name} (${steam_app_id})`);

      // 初回価格データを取得（非同期・エラーでも処理続行）
      try {
        logger.info(`Fetching initial price data for newly added game: ${name} (${steam_app_id})`);
        const monitoringService = new MonitoringService();
        await monitoringService.initialize();
        
        // 単一ゲームの監視を実行（初回データ取得）
        const monitoringResult = await monitoringService.monitorSingleGame(steam_app_id);
        
        if (monitoringResult.error) {
          logger.warn(`Failed to fetch initial price data for ${name}: ${monitoringResult.error.message}`);
        } else {
          logger.info(`Successfully fetched initial price data for ${name}`);
        }
      } catch (priceError) {
        // 価格取得失敗はログのみで、ゲーム追加は成功扱い
        logger.warn(`Initial price data fetch failed for ${name} (${steam_app_id}):`, priceError);
      }

      return res.status(201).json({
        success: true,
        data: game,
        message: `${name} を追加しました。価格データを取得中です...`
      });
    } catch (error) {
      logger.error('Failed to add game:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add game'
      });
    }
  }

  // ゲーム更新
  static async updateGame(req: Request, res: Response): Promise<Response> {
    try {
      const gameId = parseInt(req.params.id, 10);
      const updates = req.body;

      const updatedGame = GameModel.update(gameId, updates);
      
      if (!updatedGame) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }

      logger.info(`Game updated: ${updatedGame.name} (${updatedGame.steam_app_id})`);
      return res.json({
        success: true,
        data: updatedGame
      });
    } catch (error) {
      logger.error('Failed to update game:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update game'
      });
    }
  }

  // ゲーム削除
  static async deleteGame(req: Request, res: Response): Promise<Response> {
    try {
      const gameId = parseInt(req.params.id, 10);
      const success = GameModel.delete(gameId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }

      logger.info(`Game deleted: ID ${gameId}`);
      return res.json({
        success: true,
        message: 'Game deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete game:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete game'
      });
    }
  }

  // ゲーム価格履歴取得
  static async getGamePriceHistory(req: Request, res: Response): Promise<Response> {
    try {
      const steamAppId = parseInt(req.params.appId, 10);
      const days = parseInt(req.query.days as string) || 30;
      
      const game = GameModel.getBySteamAppId(steamAppId);
      if (!game) {
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
      }

      const chartData = PriceHistoryModel.getChartData(steamAppId, days);
      const priceHistory = PriceHistoryModel.getByGameId(steamAppId, 100);

      return res.json({
        success: true,
        data: {
          game,
          chartData,
          priceHistory
        }
      });
    } catch (error) {
      logger.error('Failed to get price history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve price history'
      });
    }
  }

  // ダッシュボード用データ取得
  static async getDashboardData(_req: Request, res: Response): Promise<Response> {
    try {
      const games = GameModel.getAll(true);
      
      // 各ゲームの最新価格を取得
      const gamesWithPrices = games.map(game => {
        const latestPrice = PriceHistoryModel.getLatestByGameId(game.steam_app_id);
        return {
          ...game,
          latestPrice
        };
      });

      // 統計情報
      const priceStats = PriceHistoryModel.getStatistics();
      const alertStats = AlertModel.getStatistics();
      const recentAlerts = AlertModel.getRecent(5);
      const recentPriceChanges = PriceHistoryModel.getRecentPriceChanges(5);

      return res.json({
        success: true,
        data: {
          games: gamesWithPrices,
          statistics: {
            ...priceStats,
            ...alertStats
          },
          recentAlerts,
          recentPriceChanges
        }
      });
    } catch (error) {
      logger.error('Failed to get dashboard data:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
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

      // 現在の日時を日本時間で取得
      const now = new Date();
      const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
      const dateStr = jstDate.toISOString().split('T')[0].replace(/-/g, '');
      
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

      for (const gameData of games) {
        try {
          // バリデーション
          if (!gameData.steam_app_id || !gameData.name) {
            errors.push(`Invalid game data: missing steam_app_id or name`);
            continue;
          }

          // 既存ゲームチェック
          const existingGame = GameModel.getBySteamAppId(gameData.steam_app_id);
          
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

      // 期間内のアラート（実際の購入として扱う）
      const alerts = AlertModel.getByDateRange(startDate, new Date());
      
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

      for (const alert of alerts) {
        const game = GameModel.getBySteamAppId(alert.steam_app_id);
        if (!game) continue;

        const purchasePrice = alert.trigger_price || 0;
        const originalPrice = alert.previous_low || purchasePrice;
        const savings = originalPrice - purchasePrice;

        totalExpenses += purchasePrice;
        totalSavings += savings;

        if (expensesByGame.has(alert.steam_app_id)) {
          const existing = expensesByGame.get(alert.steam_app_id)!;
          existing.totalSpent += purchasePrice;
          existing.purchaseCount++;
          existing.averageDiscount = ((existing.averageDiscount * (existing.purchaseCount - 1)) + (alert.discount_percent || 0)) / existing.purchaseCount;
          if (alert.created_at > existing.lastPurchase) {
            existing.lastPurchase = alert.created_at;
          }
        } else {
          expensesByGame.set(alert.steam_app_id, {
            game,
            totalSpent: purchasePrice,
            purchaseCount: 1,
            averageDiscount: alert.discount_percent || 0,
            lastPurchase: alert.created_at
          });
        }
      }

      // 月別支出統計
      const monthlyExpenses = new Map<string, number>();
      const monthlySavings = new Map<string, number>();
      
      for (const alert of alerts) {
        const monthKey = alert.created_at.toISOString().substring(0, 7); // YYYY-MM
        const purchasePrice = alert.trigger_price || 0;
        const originalPrice = alert.previous_low || purchasePrice;
        const savings = originalPrice - purchasePrice;

        monthlyExpenses.set(monthKey, (monthlyExpenses.get(monthKey) || 0) + purchasePrice);
        monthlySavings.set(monthKey, (monthlySavings.get(monthKey) || 0) + savings);
      }

      // カテゴリ別統計（割引率による分類）
      const categories = {
        bargain: { count: 0, total: 0, label: '大幅割引 (70%+)' },
        moderate: { count: 0, total: 0, label: '中割引 (30-69%)' },
        small: { count: 0, total: 0, label: '小割引 (1-29%)' },
        full_price: { count: 0, total: 0, label: '定価購入' }
      };

      for (const alert of alerts) {
        const discountPercent = alert.discount_percent || 0;
        const price = alert.trigger_price || 0;

        if (discountPercent >= 70) {
          categories.bargain.count++;
          categories.bargain.total += price;
        } else if (discountPercent >= 30) {
          categories.moderate.count++;
          categories.moderate.total += price;
        } else if (discountPercent > 0) {
          categories.small.count++;
          categories.small.total += price;
        } else {
          categories.full_price.count++;
          categories.full_price.total += price;
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
          recentPurchases: alerts.slice(0, 10)
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
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
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

      const games = gameIds.map(id => {
        const game = GameModel.getBySteamAppId(id);
        return game ? { steamAppId: id, name: game.name } : null;
      }).filter(Boolean) as Array<{ steamAppId: number; name: string }>;

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
        return res.status(404).json({
          success: false,
          error: 'Game not found'
        });
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

      const games = gameIds.map(id => {
        const game = GameModel.getBySteamAppId(id);
        return game ? { steamAppId: id, name: game.name } : null;
      }).filter(Boolean) as Array<{ steamAppId: number; name: string }>;

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
}