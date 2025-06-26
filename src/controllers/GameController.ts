import { Request, Response } from 'express';
import { GameModel } from '../models/Game';
import { PriceHistoryModel } from '../models/PriceHistory';
import { AlertModel } from '../models/Alert';
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
  static async getGameById(req: Request, res: Response) {
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

      res.json({
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
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve game details'
      });
    }
  }

  // ゲーム追加
  static async addGame(req: Request, res: Response) {
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
      res.status(201).json({
        success: true,
        data: game
      });
    } catch (error) {
      logger.error('Failed to add game:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add game'
      });
    }
  }

  // ゲーム更新
  static async updateGame(req: Request, res: Response) {
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
      res.json({
        success: true,
        data: updatedGame
      });
    } catch (error) {
      logger.error('Failed to update game:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update game'
      });
    }
  }

  // ゲーム削除
  static async deleteGame(req: Request, res: Response) {
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
      res.json({
        success: true,
        message: 'Game deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete game:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete game'
      });
    }
  }

  // ゲーム価格履歴取得
  static async getGamePriceHistory(req: Request, res: Response) {
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

      res.json({
        success: true,
        data: {
          game,
          chartData,
          priceHistory
        }
      });
    } catch (error) {
      logger.error('Failed to get price history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve price history'
      });
    }
  }

  // ダッシュボード用データ取得
  static async getDashboardData(req: Request, res: Response) {
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

      res.json({
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
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }
}