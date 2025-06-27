import logger from '../utils/logger';

export interface HowLongToBeatInfo {
  main: number | null; // メインストーリーの時間（時間）
  plus: number | null; // メイン + エクストラの時間
  completionist: number | null; // 完全クリアの時間
  url?: string;
}

export interface PCGamingWikiInfo {
  hasFixesOrMods: boolean;
  commonIssues: string[];
  systemRequirements?: {
    minimum?: string;
    recommended?: string;
  };
  url?: string;
}

export interface ProtonDBInfo {
  tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'borked' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  reportCount: number;
  url?: string;
}

export interface GameInfo {
  steamAppId: number;
  gameName: string;
  howLongToBeat?: HowLongToBeatInfo;
  pcGamingWiki?: PCGamingWikiInfo;
  protonDB?: ProtonDBInfo;
  lastUpdated: Date;
}

export class GameInfoService {
  private infoCache = new Map<number, GameInfo>();
  private cacheTimeout = 7 * 24 * 60 * 60 * 1000; // 7日間

  // ゲーム情報の統合取得
  async getGameInfo(steamAppId: number, gameName: string): Promise<GameInfo | null> {
    try {
      // キャッシュをチェック
      const cached = this.infoCache.get(steamAppId);
      if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheTimeout) {
        return cached;
      }

      logger.info(`Fetching game info for ${gameName} (${steamAppId})`);

      const gameInfo: GameInfo = {
        steamAppId,
        gameName,
        lastUpdated: new Date()
      };

      // 各サービスから情報を並列取得
      const [howLongToBeat, pcGamingWiki, protonDB] = await Promise.allSettled([
        this.getHowLongToBeatInfo(gameName),
        this.getPCGamingWikiInfo(gameName),
        this.getProtonDBInfo(steamAppId)
      ]);

      if (howLongToBeat.status === 'fulfilled' && howLongToBeat.value) {
        gameInfo.howLongToBeat = howLongToBeat.value;
      }

      if (pcGamingWiki.status === 'fulfilled' && pcGamingWiki.value) {
        gameInfo.pcGamingWiki = pcGamingWiki.value;
      }

      if (protonDB.status === 'fulfilled' && protonDB.value) {
        gameInfo.protonDB = protonDB.value;
      }

      // キャッシュに保存
      this.infoCache.set(steamAppId, gameInfo);

      return gameInfo;

    } catch (error) {
      logger.error(`Failed to get game info for ${gameName} (${steamAppId}):`, error);
      return null;
    }
  }

  // HowLongToBeat 情報を取得
  private async getHowLongToBeatInfo(gameName: string): Promise<HowLongToBeatInfo | null> {
    try {
      // HowLongToBeatの非公式APIを使用（実際の実装では適切なAPIを使用）
      // 現在はサンプルデータを返す
      
      const knownGames: Record<string, HowLongToBeatInfo> = {
        'Cyberpunk 2077': {
          main: 24,
          plus: 60,
          completionist: 103,
          url: 'https://howlongtobeat.com/game/67269'
        },
        'The Witcher 3: Wild Hunt': {
          main: 51,
          plus: 103,
          completionist: 173,
          url: 'https://howlongtobeat.com/game/10270'
        },
        'Baldur\'s Gate 3': {
          main: 75,
          plus: 142,
          completionist: 158,
          url: 'https://howlongtobeat.com/game/72612'
        },
        'Elden Ring': {
          main: 54,
          plus: 101,
          completionist: 136,
          url: 'https://howlongtobeat.com/game/68151'
        }
      };

      return knownGames[gameName] || null;

    } catch (error) {
      logger.error(`Failed to get HowLongToBeat info for ${gameName}:`, error);
      return null;
    }
  }

  // PCGamingWiki 情報を取得
  private async getPCGamingWikiInfo(gameName: string): Promise<PCGamingWikiInfo | null> {
    try {
      // PCGamingWikiのAPIを使用（実際にはスクレイピングまたはAPIが必要）
      // 現在はサンプルデータを返す
      
      const knownGames: Record<string, PCGamingWikiInfo> = {
        'Cyberpunk 2077': {
          hasFixesOrMods: true,
          commonIssues: [
            'パフォーマンス問題',
            'バグとクラッシュ',
            'グラフィック設定の最適化が必要'
          ],
          url: 'https://www.pcgamingwiki.com/wiki/Cyberpunk_2077'
        },
        'The Witcher 3: Wild Hunt': {
          hasFixesOrMods: true,
          commonIssues: [
            'DLC統合の問題',
            'MODサポート'
          ],
          url: 'https://www.pcgamingwiki.com/wiki/The_Witcher_3:_Wild_Hunt'
        },
        'Baldur\'s Gate 3': {
          hasFixesOrMods: false,
          commonIssues: [],
          url: 'https://www.pcgamingwiki.com/wiki/Baldur%27s_Gate_3'
        }
      };

      return knownGames[gameName] || {
        hasFixesOrMods: false,
        commonIssues: [],
        url: `https://www.pcgamingwiki.com/wiki/Special:Search/${encodeURIComponent(gameName)}`
      };

    } catch (error) {
      logger.error(`Failed to get PCGamingWiki info for ${gameName}:`, error);
      return null;
    }
  }

  // ProtonDB 情報を取得
  private async getProtonDBInfo(steamAppId: number): Promise<ProtonDBInfo | null> {
    try {
      // ProtonDBの非公式APIを使用
      // 実際のAPI呼び出しは省略（CORSの問題があるため）
      
      const knownGames: Record<number, ProtonDBInfo> = {
        1091500: { // Cyberpunk 2077
          tier: 'gold',
          confidence: 'high',
          reportCount: 1247,
          url: 'https://www.protondb.com/app/1091500'
        },
        292030: { // The Witcher 3
          tier: 'platinum',
          confidence: 'high',
          reportCount: 2156,
          url: 'https://www.protondb.com/app/292030'
        },
        1086940: { // Baldur's Gate 3
          tier: 'platinum',
          confidence: 'high',
          reportCount: 892,
          url: 'https://www.protondb.com/app/1086940'
        }
      };

      const info = knownGames[steamAppId];
      if (info) {
        return info;
      }

      // デフォルト情報を返す
      return {
        tier: 'unknown',
        confidence: 'low',
        reportCount: 0,
        url: `https://www.protondb.com/app/${steamAppId}`
      };

    } catch (error) {
      logger.error(`Failed to get ProtonDB info for ${steamAppId}:`, error);
      return null;
    }
  }

  // 複数ゲームの情報を一括取得
  async getMultipleGameInfo(games: Array<{ steamAppId: number; name: string }>): Promise<Map<number, GameInfo | null>> {
    const infoMap = new Map<number, GameInfo | null>();
    
    // 並列処理で複数ゲームの情報を取得
    const promises = games.map(async (game) => {
      const info = await this.getGameInfo(game.steamAppId, game.name);
      return { steamAppId: game.steamAppId, info };
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      const game = games[index];
      if (result.status === 'fulfilled') {
        infoMap.set(game.steamAppId, result.value.info);
      } else {
        logger.error(`Failed to get info for ${game.name}:`, result.reason);
        infoMap.set(game.steamAppId, null);
      }
    });

    return infoMap;
  }

  // ProtonDBの評価を日本語に変換
  getProtonDBTierDescription(tier: ProtonDBInfo['tier']): string {
    const descriptions = {
      platinum: 'Platinum - ネイティブ同等の動作',
      gold: 'Gold - 軽微な問題はあるが快適に動作',
      silver: 'Silver - 調整が必要だが動作可能',
      bronze: 'Bronze - 頻繁なクラッシュや重大な問題',
      borked: 'Borked - 動作しない',
      unknown: 'Unknown - 報告データ不足'
    };
    return descriptions[tier];
  }

  // HowLongToBeatの時間を読みやすい形式に変換
  formatPlayTime(hours: number | null): string {
    if (!hours) return '不明';
    if (hours < 1) return '1時間未満';
    if (hours < 100) return `${hours}時間`;
    return `${Math.round(hours / 10) * 10}時間+`;
  }

  // キャッシュクリア
  clearCache(): void {
    this.infoCache.clear();
    logger.info('Game info cache cleared');
  }

  // 統計情報取得
  getStatistics(): {
    cachedGames: number;
    cacheSize: number;
  } {
    return {
      cachedGames: this.infoCache.size,
      cacheSize: this.infoCache.size * 2048 // 概算
    };
  }
}

export default new GameInfoService();