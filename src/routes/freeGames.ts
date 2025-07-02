import { Router } from 'express';
import { EpicGamesModel } from '../models/EpicGamesModel';
import { SteamFreeGamesModel } from '../models/SteamFreeGamesModel';
import { FreeGamesRSSService } from '../services/FreeGamesRSSService';
import logger from '../utils/logger';

const router = Router();
const epicGamesModel = new EpicGamesModel();
const steamFreeGamesModel = new SteamFreeGamesModel();
const freeGamesRSSService = FreeGamesRSSService.getInstance();

interface UnifiedFreeGame {
  id: string;
  title: string;
  description?: string;
  url: string;
  platform: 'epic' | 'steam';
  status: 'active' | 'expired' | 'upcoming';
  is_claimed: boolean;
  claimed_date?: string;
  start_date?: string;
  end_date?: string;
  discovered_at: string;
  app_id?: number; // Steam用
}

// 統合無料ゲーム一覧を取得
router.get('/', async (req, res) => {
  try {
    const { platform, status, claimed } = req.query;
    
    let epicGames = epicGamesModel.getAllGames();
    let steamGames = await steamFreeGamesModel.getAll();
    
    // プラットフォームフィルター
    const games: UnifiedFreeGame[] = [];
    
    if (platform !== 'steam') {
      epicGames.forEach(game => {
        const now = new Date();
        let gameStatus: 'active' | 'expired' | 'upcoming' = 'active';
        
        if (game.end_date) {
          const endDate = new Date(game.end_date);
          if (endDate < now) {
            gameStatus = 'expired';
          }
        }
        
        if (game.start_date) {
          const startDate = new Date(game.start_date);
          if (startDate > now) {
            gameStatus = 'upcoming';
          }
        }
        
        games.push({
          id: `epic-${game.id}`,
          title: game.title,
          description: game.description,
          url: game.epic_url || '',
          platform: 'epic',
          status: gameStatus,
          is_claimed: game.is_claimed,
          claimed_date: game.claimed_date,
          start_date: game.start_date,
          end_date: game.end_date,
          discovered_at: game.discovered_at
        });
      });
    }
    
    if (platform !== 'epic') {
      steamGames.forEach(game => {
        let gameStatus: 'active' | 'expired' | 'upcoming' = 'active';
        
        // is_expiredフラグまたは期限をチェック
        if (game.is_expired) {
          gameStatus = 'expired';
        } else if (game.end_date) {
          const now = new Date();
          const endDate = new Date(game.end_date);
          if (endDate < now) {
            gameStatus = 'expired';
          }
        }
        
        games.push({
          id: `steam-${game.id}`,
          title: game.title,
          description: game.description,
          url: game.steam_url,
          platform: 'steam',
          status: gameStatus,
          is_claimed: game.is_claimed || false,
          claimed_date: game.claimed_date,
          start_date: game.start_date,
          end_date: game.end_date,
          discovered_at: game.discovered_at || '',
          app_id: game.app_id
        });
      });
    }
    
    // ステータスフィルター
    let filteredGames = games;
    if (status) {
      filteredGames = filteredGames.filter(game => game.status === status);
    }
    
    // 受け取り状態フィルター
    if (claimed !== undefined) {
      const isClaimedFilter = claimed === 'true';
      filteredGames = filteredGames.filter(game => game.is_claimed === isClaimedFilter);
    }
    
    // 日付順にソート（新しい順）
    filteredGames.sort((a, b) => 
      new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
    );
    
    res.json({
      success: true,
      data: filteredGames,
      count: {
        total: filteredGames.length,
        epic: filteredGames.filter(g => g.platform === 'epic').length,
        steam: filteredGames.filter(g => g.platform === 'steam').length,
        active: filteredGames.filter(g => g.status === 'active').length,
        expired: filteredGames.filter(g => g.status === 'expired').length,
        claimed: filteredGames.filter(g => g.is_claimed).length
      }
    });
  } catch (error) {
    logger.error('統合無料ゲーム取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '無料ゲーム情報の取得に失敗しました'
    });
  }
});

// 現在配布中の無料ゲームのみ取得
router.get('/active', async (_req, res) => {
  try {
    const epicGames = epicGamesModel.getActiveGames();
    const steamGames = await steamFreeGamesModel.getActiveGames();
    
    const activeGames: UnifiedFreeGame[] = [
      ...epicGames.map(game => ({
        id: `epic-${game.id}`,
        title: game.title,
        description: game.description,
        url: game.epic_url || '',
        platform: 'epic' as const,
        status: 'active' as const,
        is_claimed: game.is_claimed,
        claimed_date: game.claimed_date,
        start_date: game.start_date,
        end_date: game.end_date,
        discovered_at: game.discovered_at
      })),
      ...steamGames.map(game => ({
        id: `steam-${game.id}`,
        title: game.title,
        description: game.description,
        url: game.steam_url,
        platform: 'steam' as const,
        status: 'active' as const,
        is_claimed: game.is_claimed || false,
        claimed_date: game.claimed_date,
        discovered_at: game.discovered_at || '',
        app_id: game.app_id
      }))
    ];
    
    res.json({
      success: true,
      data: activeGames
    });
  } catch (error) {
    logger.error('アクティブ無料ゲーム取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'アクティブな無料ゲーム情報の取得に失敗しました'
    });
  }
});

// 統計情報を取得
router.get('/stats', async (_req, res) => {
  try {
    const epicStats = epicGamesModel.getStatistics();
    const steamStats = await steamFreeGamesModel.getStats();
    
    res.json({
      success: true,
      data: {
        total: {
          all: epicStats.total + steamStats.total,
          epic: epicStats.total,
          steam: steamStats.total
        },
        claimed: {
          all: epicStats.claimed + steamStats.claimed,
          epic: epicStats.claimed,
          steam: steamStats.claimed
        },
        unclaimed: {
          all: epicStats.unclaimed + steamStats.unclaimed,
          epic: epicStats.unclaimed,
          steam: steamStats.unclaimed
        },
        active: {
          epic: epicStats.active,
          steam: steamStats.unclaimed // Steamの未受け取り=アクティブ
        },
        claimRate: {
          all: (epicStats.total + steamStats.total) > 0 
            ? Math.round(((epicStats.claimed + steamStats.claimed) / (epicStats.total + steamStats.total)) * 100) 
            : 0,
          epic: epicStats.claimRate,
          steam: Math.round(steamStats.claimRate)
        }
      }
    });
  } catch (error) {
    logger.error('無料ゲーム統計取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '統計情報の取得に失敗しました'
    });
  }
});

// 手動で無料ゲーム情報を更新
router.post('/refresh', async (_req, res) => {
  try {
    logger.info('手動無料ゲーム更新リクエスト');
    const result = await freeGamesRSSService.manualCheck();
    
    res.json({
      success: true,
      data: result,
      message: `Epic: ${result.epicCount}件, Steam: ${result.steamCount}件の無料ゲームを確認しました`
    });
  } catch (error) {
    logger.error('無料ゲーム手動更新エラー:', error);
    res.status(500).json({
      success: false,
      error: '無料ゲーム情報の更新に失敗しました'
    });
  }
});

// RSSデータ確認用（デバッグ）
router.get('/rss-debug', async (_req, res) => {
  try {
    const freeGamesService = FreeGamesRSSService.getInstance();
    logger.info('=== Manual RSS Debug Check ===');
    await freeGamesService.checkForNewGames();
    logger.info('=== End Manual RSS Debug Check ===');
    
    res.json({
      success: true,
      message: 'RSSデバッグ情報をログに出力しました。ログを確認してください。'
    });
  } catch (error) {
    logger.error('RSS debug check failed:', error);
    res.status(500).json({
      success: false,
      error: 'RSSデバッグチェックに失敗しました'
    });
  }
});

// ゲームの受け取り状態を更新
router.put('/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_claimed } = req.body;
    
    // IDからプラットフォームを判定
    const [platform, gameId] = id.split('-');
    const numericId = parseInt(gameId);
    
    if (isNaN(numericId)) {
      return res.status(400).json({
        success: false,
        error: '無効なゲームIDです'
      });
    }
    
    let success = false;
    let message = '';
    
    if (platform === 'epic') {
      success = epicGamesModel.updateGame(numericId, {
        is_claimed,
        claimed_date: is_claimed ? new Date().toISOString() : undefined
      });
      message = is_claimed ? 'Epic無料ゲームを受け取り済みにマークしました' : 'Epic無料ゲームを未受け取りにマークしました';
    } else if (platform === 'steam') {
      if (is_claimed) {
        await steamFreeGamesModel.markAsClaimed(numericId);
      } else {
        await steamFreeGamesModel.markAsUnclaimed(numericId);
      }
      success = true;
      message = is_claimed ? 'Steam無料ゲームを受け取り済みにマークしました' : 'Steam無料ゲームを未受け取りにマークしました';
    } else {
      return res.status(400).json({
        success: false,
        error: '無効なプラットフォームです'
      });
    }
    
    if (success) {
      return res.json({
        success: true,
        message
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'ゲームが見つかりません'
      });
    }
  } catch (error) {
    logger.error('受け取り状態更新エラー:', error);
    return res.status(500).json({
      success: false,
      error: '受け取り状態の更新に失敗しました'
    });
  }
});

// 最終チェック時刻を取得
router.get('/last-check', async (_req, res) => {
  try {
    const lastCheckTime = freeGamesRSSService.getLastCheckTime();
    
    res.json({
      success: true,
      data: {
        lastCheckTime: lastCheckTime?.toISOString() || null,
        nextCheckTime: lastCheckTime 
          ? new Date(lastCheckTime.getTime() + 3600000).toISOString() // 1時間後
          : null
      }
    });
  } catch (error) {
    logger.error('最終チェック時刻取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '最終チェック時刻の取得に失敗しました'
    });
  }
});

export default router;