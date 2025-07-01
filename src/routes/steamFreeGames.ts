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
    logger.error('Steam無料ゲーム取得エラー:', error);
    res.status(500).json({ error: 'Steam無料ゲーム取得に失敗しました' });
  }
});

// 現在利用可能なSteam無料ゲームを取得
router.get('/current', async (_req, res) => {
  try {
    const games = await steamFreeGamesModel.getActiveGames();
    res.json(games);
  } catch (error) {
    logger.error('現在のSteam無料ゲーム取得エラー:', error);
    res.status(500).json({ error: '現在のSteam無料ゲーム取得に失敗しました' });
  }
});

// Steam無料ゲームの統計を取得
router.get('/stats', async (_req, res) => {
  try {
    const stats = await steamFreeGamesModel.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Steam無料ゲーム統計取得エラー:', error);
    res.status(500).json({ error: 'Steam無料ゲーム統計取得に失敗しました' });
  }
});

// 手動でSteam無料ゲームをチェック
router.post('/refresh', async (_req, res) => {
  try {
    const result = await freeGamesRSSService.manualCheck();
    return res.json({ 
      message: 'Steam無料ゲームチェック完了',
      steamCount: result.steamCount,
      epicCount: result.epicCount
    });
  } catch (error) {
    logger.error('Steam無料ゲーム手動チェックエラー:', error);
    return res.status(500).json({ error: 'Steam無料ゲーム手動チェックに失敗しました' });
  }
});

// Steam無料ゲームを受け取り済みにマーク
router.put('/:id/claim', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: '無効なIDです' });
    }

    await steamFreeGamesModel.markAsClaimed(id);
    return res.json({ message: 'ゲームを受け取り済みにマークしました' });
  } catch (error) {
    logger.error('Steam無料ゲーム受け取りマークエラー:', error);
    return res.status(500).json({ error: 'ゲームの受け取りマークに失敗しました' });
  }
});

// Steam無料ゲームを未受け取りにマーク
router.put('/:id/unclaim', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: '無効なIDです' });
    }

    await steamFreeGamesModel.markAsUnclaimed(id);
    return res.json({ message: 'ゲームを未受け取りにマークしました' });
  } catch (error) {
    logger.error('Steam無料ゲーム未受け取りマークエラー:', error);
    return res.status(500).json({ error: 'ゲームの未受け取りマークに失敗しました' });
  }
});

export default router;