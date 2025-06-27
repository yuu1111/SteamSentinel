import { Request, Response } from 'express';
import { GameModel } from '../models/Game';
import { PriceHistoryModel } from '../models/PriceHistory';
import { AlertModel } from '../models/Alert';
import { MonitoringService } from '../services/MonitoringService';
import logger from '../utils/logger';

export class GameController {
  // 全ゲーム取得
  static async getAllGames(req: Request, res: Response) {
    try {
      const enabledOnly = req.query.enabled === 'true';
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
      const { steam_app_id, name, enabled = true, price_threshold, alert_enabled = true } = req.body;

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
}