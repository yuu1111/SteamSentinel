import { Router } from 'express';
import epicGamesModel from '../models/EpicGamesModel';
import epicGamesNotificationService from '../services/EpicGamesNotificationService';
import logger from '../utils/logger';

const router = Router();

// Epic Games無料ゲーム一覧を取得
router.get('/', async (_req, res) => {
  try {
    const games = epicGamesModel.getAllGames();
    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    logger.error('Failed to fetch Epic Games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Epic Games data'
    });
  }
});

// 新しい無料ゲーム情報を手動で取得
router.post('/refresh', async (_req, res) => {
  try {
    logger.info('Manual Epic Games refresh requested');
    const newGames = await epicGamesNotificationService.runManualCheck();
    
    res.json({
      success: true,
      data: newGames,
      message: `${newGames.length}件の新しい無料ゲームを発見しました`
    });
  } catch (error) {
    logger.error('Failed to refresh Epic Games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh Epic Games data'
    });
  }
});

// ゲームの受け取り状況を更新
router.put('/:id/claim', async (req, res) => {
  try {
    const gameId = parseInt(req.params.id);
    const { is_claimed } = req.body;

    if (isNaN(gameId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game ID'
      });
    }

    const success = epicGamesModel.updateGame(gameId, { 
      is_claimed, 
      claimed_date: is_claimed ? new Date().toISOString() : undefined 
    });
    
    if (success) {
      return res.json({
        success: true,
        message: is_claimed ? 'ゲームを受け取り済みにマークしました' : 'ゲームを未受け取りにマークしました'
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
  } catch (error) {
    logger.error('Failed to update claim status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update claim status'
    });
  }
});

// 現在配布中の無料ゲーム（API経由）を取得
router.get('/current', async (_req, res) => {
  try {
    const currentGames = await epicGamesNotificationService.getCurrentFreeGames();
    
    res.json({
      success: true,
      data: currentGames
    });
  } catch (error) {
    logger.error('Failed to fetch current Epic Games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current Epic Games data'
    });
  }
});

// Epic Games統計情報を取得
router.get('/stats', async (_req, res) => {
  try {
    const stats = epicGamesNotificationService.getStatistics();
    const gameStats = epicGamesModel.getStatistics();
    
    res.json({
      success: true,
      data: {
        service: stats,
        database: gameStats
      }
    });
  } catch (error) {
    logger.error('Failed to fetch Epic Games stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Epic Games statistics'
    });
  }
});

export default router;