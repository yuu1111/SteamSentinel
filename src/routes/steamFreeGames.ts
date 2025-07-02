import express from 'express';
import { SteamFreeGamesModel } from '../models/SteamFreeGamesModel';
import { FreeGamesRSSService } from '../services/FreeGamesRSSService';
import logger from '../utils/logger';

const router = express.Router();
const steamFreeGamesModel = new SteamFreeGamesModel();
const freeGamesRSSService = FreeGamesRSSService.getInstance();

// すべてのSteam無料ゲームを取得
router.get('/', async (req, res) => {
  try {
    const filter = req.query.filter as string;
    let games;

    switch (filter) {
      case 'claimed':
        games = await steamFreeGamesModel.getClaimedGames();
        break;
      case 'unclaimed':
        games = await steamFreeGamesModel.getActiveGames();
        break;
      default:
        games = await steamFreeGamesModel.getAll();
    }

    res.json(games);
  } catch (error) {
    logger.error('Steam free games fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Steam free games' });
  }
});

// 現在利用可能なSteam無料ゲームを取得
router.get('/current', async (_req, res) => {
  try {
    const games = await steamFreeGamesModel.getActiveGames();
    res.json(games);
  } catch (error) {
    logger.error('Current Steam free games fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch current Steam free games' });
  }
});

// Steam無料ゲームの統計を取得
router.get('/stats', async (_req, res) => {
  try {
    const stats = await steamFreeGamesModel.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Steam free games stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch Steam free games statistics' });
  }
});

// 手動でSteam無料ゲームをチェック
router.post('/refresh', async (_req, res) => {
  try {
    const result = await freeGamesRSSService.manualCheck();
    return res.json({ 
      message: 'Steam free games check completed',
      steamCount: result.steamCount,
      epicCount: result.epicCount
    });
  } catch (error) {
    logger.error('Steam free games manual check error:', error);
    return res.status(500).json({ error: 'Failed to perform manual Steam free games check' });
  }
});

// Steam無料ゲームを受け取り済みにマーク
router.put('/:id/claim', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    await steamFreeGamesModel.markAsClaimed(id);
    return res.json({ message: 'Game marked as claimed' });
  } catch (error) {
    logger.error('Steam free game claim mark error:', error);
    return res.status(500).json({ error: 'Failed to mark game as claimed' });
  }
});

// Steam無料ゲームを未受け取りにマーク
router.put('/:id/unclaim', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    await steamFreeGamesModel.markAsUnclaimed(id);
    return res.json({ message: 'Game marked as unclaimed' });
  } catch (error) {
    logger.error('Steam free game unclaim mark error:', error);
    return res.status(500).json({ error: 'Failed to mark game as unclaimed' });
  }
});

// Steam無料ゲームの配布状況を一括検証
router.post('/verify-all', async (_req, res) => {
  try {
    logger.info('Steam free games bulk verification API called');
    const result = await freeGamesRSSService.verifyAllSteamFreeGames();
    return res.json({
      message: 'Steam free games distribution verification completed',
      ...result
    });
  } catch (error) {
    logger.error('Steam free games bulk verification error:', error);
    return res.status(500).json({ error: 'Failed to verify Steam free games' });
  }
});

// 特定のSteam無料ゲームの配布状況を検証
router.post('/:appId/verify', async (req, res) => {
  try {
    const appId = parseInt(req.params.appId);
    if (isNaN(appId)) {
      return res.status(400).json({ error: 'Invalid App ID' });
    }

    logger.info(`Steam free game individual verification API called: App ID ${appId}`);
    const result = await freeGamesRSSService.verifySingleSteamGame(appId);
    return res.json({
      message: `Steam free game distribution verification completed: App ID ${appId}`,
      appId,
      ...result
    });
  } catch (error) {
    logger.error(`Steam free game individual verification error (App ID: ${req.params.appId}):`, error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to verify Steam free game' 
    });
  }
});

export default router;