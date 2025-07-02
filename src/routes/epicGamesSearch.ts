import { Router } from 'express';
import { EpicGamesSearchService } from '../services/EpicGamesSearchService';
import logger from '../utils/logger';

const router = Router();
const epicSearchService = EpicGamesSearchService.getInstance();

// Epic Games Store URL検索テスト
router.post('/search', async (req, res) => {
  try {
    const { gameTitle, provider = 'both' } = req.body;
    
    if (!gameTitle) {
      res.status(400).json({
        success: false,
        error: 'gameTitle is required'
      });
      return;
    }

    logger.info(`🔍 API比較テスト開始: "${gameTitle}"`);
    
    const results = await epicSearchService.searchEpicStoreUrl(gameTitle, provider);
    
    res.json({
      success: true,
      data: {
        gameTitle,
        provider,
        results,
        summary: {
          totalResults: results.length,
          foundUrls: results.filter(r => r.url).length,
          providers: results.map(r => r.provider),
          bestResult: results[0] || null
        }
      }
    });
  } catch (error) {
    logger.error('Epic Games search test error:', error);
    res.status(500).json({
      success: false,
      error: 'Epic Games検索テストでエラーが発生しました'
    });
  }
});

// API比較テスト
router.post('/compare', async (req, res) => {
  try {
    const { gameTitle } = req.body;
    
    if (!gameTitle) {
      res.status(400).json({
        success: false,
        error: 'gameTitle is required'
      });
      return;
    }

    logger.info(`🏁 API比較テスト開始: "${gameTitle}"`);
    
    const comparison = await epicSearchService.compareAPIs(gameTitle);
    
    // 詳細なログ出力
    logger.info(`📊 API比較結果 for "${gameTitle}":`);
    logger.info(`  ITAD: ${comparison.itad ? 
      `✅ ${comparison.itad.title} (信頼度: ${comparison.itad.confidence}%, ${comparison.itad.searchTime}ms)` : 
      '❌ 見つからない'}`);
    if (comparison.itad?.url) {
      logger.info(`    URL: ${comparison.itad.url}`);
    }
    
    logger.info(`  IGDB: ${comparison.igdb ? 
      `✅ ${comparison.igdb.title} (信頼度: ${comparison.igdb.confidence}%, ${comparison.igdb.searchTime}ms)` : 
      '❌ 見つからない'}`);
    if (comparison.igdb?.url) {
      logger.info(`    URL: ${comparison.igdb.url}`);
    }
    
    logger.info(`  勝者:`);
    logger.info(`    速度: ${comparison.comparison.faster}`);
    logger.info(`    正確性: ${comparison.comparison.moreAccurate}`);
    logger.info(`    両方見つかった: ${comparison.comparison.bothFound}`);
    
    res.json({
      success: true,
      data: {
        gameTitle,
        ...comparison,
        recommendation: {
          bestOverall: comparison.comparison.bothFound ? 
            (comparison.comparison.moreAccurate !== 'tie' ? comparison.comparison.moreAccurate : comparison.comparison.faster) :
            (comparison.itad?.url ? 'itad' : comparison.igdb?.url ? 'igdb' : 'none'),
          reason: comparison.comparison.bothFound ? 
            '両方見つかったため、より正確な結果を推奨' :
            '片方のみ見つかったため、それを推奨'
        }
      }
    });
  } catch (error) {
    logger.error('Epic Games API comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'API比較テストでエラーが発生しました'
    });
  }
});

// バッチテスト（複数ゲーム）
router.post('/batch-test', async (req, res) => {
  try {
    const { gameTitles, provider = 'both' } = req.body;
    
    if (!Array.isArray(gameTitles) || gameTitles.length === 0) {
      res.status(400).json({
        success: false,
        error: 'gameTitles array is required'
      });
      return;
    }

    logger.info(`🔄 バッチテスト開始: ${gameTitles.length}ゲーム`);
    
    const results = await epicSearchService.searchMultipleEpicUrls(gameTitles, provider);
    
    const summary = {
      totalGames: gameTitles.length,
      totalResults: Array.from(results.values()).flat().length,
      successfulLookups: Array.from(results.values()).filter(r => r.some(result => result.url)).length,
      averageSearchTime: {
        itad: 0,
        igdb: 0
      },
      providerStats: {
        itad: { found: 0, total: 0 },
        igdb: { found: 0, total: 0 }
      }
    };

    // 統計計算
    const allResults = Array.from(results.values()).flat();
    const itadResults = allResults.filter(r => r.provider === 'itad');
    const igdbResults = allResults.filter(r => r.provider === 'igdb');
    
    summary.averageSearchTime.itad = itadResults.length > 0 ? 
      itadResults.reduce((sum, r) => sum + r.searchTime, 0) / itadResults.length : 0;
    summary.averageSearchTime.igdb = igdbResults.length > 0 ? 
      igdbResults.reduce((sum, r) => sum + r.searchTime, 0) / igdbResults.length : 0;
    
    summary.providerStats.itad.total = itadResults.length;
    summary.providerStats.itad.found = itadResults.filter(r => r.url).length;
    summary.providerStats.igdb.total = igdbResults.length;
    summary.providerStats.igdb.found = igdbResults.filter(r => r.url).length;

    logger.info(`📈 バッチテスト結果:`);
    logger.info(`  成功率: ${summary.successfulLookups}/${summary.totalGames} (${Math.round(summary.successfulLookups/summary.totalGames*100)}%)`);
    logger.info(`  ITAD: ${summary.providerStats.itad.found}/${summary.providerStats.itad.total} 平均${Math.round(summary.averageSearchTime.itad)}ms`);
    logger.info(`  IGDB: ${summary.providerStats.igdb.found}/${summary.providerStats.igdb.total} 平均${Math.round(summary.averageSearchTime.igdb)}ms`);
    
    res.json({
      success: true,
      data: {
        gameTitles,
        provider,
        results: Object.fromEntries(results),
        summary
      }
    });
  } catch (error) {
    logger.error('Epic Games batch test error:', error);
    res.status(500).json({
      success: false,
      error: 'バッチテストでエラーが発生しました'
    });
  }
});

export default router;