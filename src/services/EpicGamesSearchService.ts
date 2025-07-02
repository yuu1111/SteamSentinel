import axios from 'axios';
import logger from '../utils/logger';

type SearchProvider = 'itad' | 'igdb' | 'both';

interface ITADGameInfo {
  title: string;
  plain: string;
  urls: {
    game: string;
  };
  bundles: any[];
  achievements: boolean;
  screenshots: string[];
  image: string;
  is_dlc: boolean;
  dlc_count: number;
  reviews: {
    total_positive: number;
    total_negative: number;
    total_reviews: number;
    steam_score: number;
    steam_reviews: number;
  };
}

interface ITADSearchResult {
  count: number;
  data: ITADGameInfo[];
}

interface ITADPriceData {
  urls: {
    [key: string]: string;
  };
}

interface IGDBGame {
  id: number;
  name: string;
  slug: string;
  url: string;
  websites?: IGDBWebsite[];
  external_games?: IGDBExternalGame[];
}

interface IGDBWebsite {
  id: number;
  category: number; // 13 = Epic Games Store
  url: string;
}

interface IGDBExternalGame {
  id: number;
  category: number; // 26 = Epic Games Store
  uid: string;
  url: string;
}

// interface IGDBResponse {
//   data: IGDBGame[];
// }

interface SearchResult {
  provider: SearchProvider;
  title: string;
  url: string | null;
  confidence: number;
  searchTime: number;
}

export class EpicGamesSearchService {
  private static instance: EpicGamesSearchService;
  private ITAD_API_KEY = process.env.ITAD_API_KEY;
  private ITAD_BASE_URL = 'https://api.isthereanydeal.com';
  private IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
  private IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
  private IGDB_BASE_URL = 'https://api.igdb.com/v4';
  private igdbAccessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private constructor() {}

  public static getInstance(): EpicGamesSearchService {
    if (!EpicGamesSearchService.instance) {
      EpicGamesSearchService.instance = new EpicGamesSearchService();
    }
    return EpicGamesSearchService.instance;
  }

  /**
   * ゲーム名からEpic Games StoreのURLを検索（IGDB優先）
   */
  public async searchEpicStoreUrl(
    gameTitle: string, 
    provider: SearchProvider = 'igdb'
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    // IGDBを優先、フォールバックとしてITAD
    if (provider === 'igdb' || provider === 'both') {
      const igdbResult = await this.searchWithIGDB(gameTitle);
      if (igdbResult) {
        results.push(igdbResult);
      }
    }

    // IGDBで見つからない場合のみITADを試行
    if ((provider === 'itad' || provider === 'both') && results.length === 0) {
      const itadResult = await this.searchWithITAD(gameTitle);
      if (itadResult) {
        results.push(itadResult);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 最も信頼性の高いURLを取得（IGDB優先）
   */
  public async getBestEpicStoreUrl(gameTitle: string): Promise<string | null> {
    const results = await this.searchEpicStoreUrl(gameTitle, 'igdb');
    return results.length > 0 ? results[0].url : null;
  }

  /**
   * ITADを使用してEpic Store URLを検索
   */
  private async searchWithITAD(gameTitle: string): Promise<SearchResult | null> {
    if (!this.ITAD_API_KEY) {
      logger.debug('ITAD_API_KEY not configured');
      return null;
    }

    const startTime = Date.now();
    try {
      const gameInfo = await this.searchGameInfoITAD(gameTitle);
      if (!gameInfo) {
        return null;
      }

      const epicUrl = await this.getEpicStoreUrlFromGame(gameInfo.plain);
      const searchTime = Date.now() - startTime;
      
      // 信頼度計算（タイトルの類似度ベース）
      const confidence = this.calculateTitleSimilarity(gameTitle, gameInfo.title);

      return {
        provider: 'itad',
        title: gameInfo.title,
        url: epicUrl,
        confidence,
        searchTime
      };
    } catch (error) {
      logger.error(`ITAD search failed for "${gameTitle}":`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * IGDBを使用してEpic Store URLを検索
   */
  private async searchWithIGDB(gameTitle: string): Promise<SearchResult | null> {
    if (!this.IGDB_CLIENT_ID || !this.IGDB_CLIENT_SECRET) {
      logger.debug('IGDB credentials not configured');
      return null;
    }

    const startTime = Date.now();
    try {
      await this.ensureIGDBToken();
      
      const games = await this.searchGameInfoIGDB(gameTitle);
      if (!games || games.length === 0) {
        return null;
      }

      // より正確なマッチを探す
      const exactMatch = games.find(game => 
        game.name.toLowerCase() === gameTitle.toLowerCase()
      );
      const closeMatch = games.find(game => 
        game.name.toLowerCase().includes(gameTitle.toLowerCase()) ||
        gameTitle.toLowerCase().includes(game.name.toLowerCase())
      );
      
      const bestMatch = exactMatch || closeMatch || games[0];
      const epicUrl = this.extractEpicUrlFromIGDB(bestMatch);
      const searchTime = Date.now() - startTime;
      
      // 信頼度計算
      const confidence = this.calculateTitleSimilarity(gameTitle, bestMatch.name);

      return {
        provider: 'igdb',
        title: bestMatch.name,
        url: epicUrl,
        confidence,
        searchTime
      };
    } catch (error) {
      logger.error(`IGDB search failed for "${gameTitle}":`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * ITADでゲーム情報を検索
   */
  private async searchGameInfoITAD(gameTitle: string): Promise<ITADGameInfo | null> {
    try {
      const searchUrl = `${this.ITAD_BASE_URL}/v02/search/search/`;
      const response = await axios.get<ITADSearchResult>(searchUrl, {
        params: {
          key: this.ITAD_API_KEY,
          q: gameTitle,
          limit: 5,
          strict: 0
        },
        timeout: 10000
      });

      if (response.data.count === 0) {
        logger.debug(`No games found for title: ${gameTitle}`);
        return null;
      }

      // 最も類似したゲームを選択（通常は最初の結果）
      const bestMatch = response.data.data.find(game => 
        game.title.toLowerCase().includes(gameTitle.toLowerCase()) ||
        gameTitle.toLowerCase().includes(game.title.toLowerCase())
      ) || response.data.data[0];

      logger.debug(`Found game: ${bestMatch.title} (${bestMatch.plain})`);
      return bestMatch;
    } catch (error) {
      logger.error(`Game info search failed for "${gameTitle}":`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * ゲームの価格情報からEpic Games StoreのURLを取得
   */
  private async getEpicStoreUrlFromGame(gamePlain: string): Promise<string | null> {
    try {
      const pricesUrl = `${this.ITAD_BASE_URL}/v01/game/prices/`;
      const response = await axios.get<ITADPriceData>(pricesUrl, {
        params: {
          key: this.ITAD_API_KEY,
          plains: gamePlain,
          shops: 'epicgames', // Epic Games Storeのみ
          country: 'US'
        },
        timeout: 10000
      });

      // Epic Games StoreのURLを探す
      const urls = response.data.urls;
      for (const [shop, url] of Object.entries(urls)) {
        if (shop.includes('epicgames') || url.includes('epicgames.com')) {
          logger.debug(`Found Epic Store URL: ${url}`);
          return url;
        }
      }

      logger.debug(`No Epic Store URL found for game: ${gamePlain}`);
      return null;
    } catch (error) {
      logger.error(`Epic Store URL lookup failed for game "${gamePlain}":`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * 直接Epic Games StoreでゲームURLを構築（フォールバック）
   */
  public generateEpicStoreSearchUrl(gameTitle: string): string {
    // Epic Games Storeの検索URLを生成
    const encodedTitle = encodeURIComponent(gameTitle);
    return `https://store.epicgames.com/browse?q=${encodedTitle}&sortBy=relevancy&sortDir=DESC`;
  }

  /**
   * IGDBでゲーム情報を検索
   */
  private async searchGameInfoIGDB(gameTitle: string): Promise<IGDBGame[] | null> {
    try {
      const response = await axios.post<IGDBGame[]>(
        `${this.IGDB_BASE_URL}/games`,
        `search "${gameTitle}"; fields name,slug,url,websites.category,websites.url,external_games.category,external_games.url,external_games.uid; limit 10;`,
        {
          headers: {
            'Client-ID': this.IGDB_CLIENT_ID!,
            'Authorization': `Bearer ${this.igdbAccessToken}`,
            'Content-Type': 'text/plain'
          },
          timeout: 10000
        }
      );

      if (response.data.length > 0) {
        logger.info(`IGDB search results for "${gameTitle}":`);
        for (const game of response.data) {
          logger.info(`  Game: ${game.name} (ID: ${game.id})`);
          if (game.websites) {
            logger.info(`    Websites: ${game.websites.length} found`);
            for (const website of game.websites) {
              logger.info(`      Category ${website.category}: ${website.url}`);
            }
          }
          if (game.external_games) {
            logger.info(`    External Games: ${game.external_games.length} found`);
            for (const external of game.external_games) {
              logger.info(`      Category ${external.category}, UID: ${external.uid}, URL: ${external.url}`);
            }
          }
        }
      }

      return response.data.length > 0 ? response.data : null;
    } catch (error) {
      logger.error(`IGDB game search failed for "${gameTitle}":`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * IGDBのアクセストークンを取得/更新
   */
  private async ensureIGDBToken(): Promise<void> {
    if (this.igdbAccessToken && Date.now() < this.tokenExpiresAt) {
      return; // トークンはまだ有効
    }

    try {
      const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: this.IGDB_CLIENT_ID,
          client_secret: this.IGDB_CLIENT_SECRET,
          grant_type: 'client_credentials'
        }
      });

      this.igdbAccessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000) - 60000; // 1分のバッファ
      logger.debug('IGDB access token refreshed');
    } catch (error) {
      logger.error('Failed to get IGDB access token:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * IGDBのゲーム情報からEpic Store URLを抽出
   */
  private extractEpicUrlFromIGDB(game: IGDBGame): string | null {
    logger.info(`Extracting Epic URL for game: ${game.name}`);
    
    // External gamesから Epic Games Store を探す
    if (game.external_games && game.external_games.length > 0) {
      logger.info(`Checking ${game.external_games.length} external games for Epic Store`);
      for (const external of game.external_games) {
        logger.info(`External game category: ${external.category}, uid: ${external.uid}, url: ${external.url}`);
        // Epic Games Store は通常 category 26
        if (external.category === 26) {
          if (external.url) {
            logger.info(`Found Epic Store URL: ${external.url}`);
            return external.url;
          }
          if (external.uid) {
            // UIDからEpic Store URLを構築
            const constructedUrl = `https://store.epicgames.com/p/${external.uid}`;
            logger.info(`Constructed Epic Store URL: ${constructedUrl}`);
            return constructedUrl;
          }
        }
      }
    } else {
      logger.info('No external games data available');
    }

    // Websitesから Epic Games Store を探す
    if (game.websites && game.websites.length > 0) {
      logger.info(`Checking ${game.websites.length} websites for Epic Store`);
      for (const website of game.websites) {
        logger.info(`Website category: ${website.category}, url: ${website.url}`);
        // Epic Games Store は通常 category 13 または URL判定
        if (website.url && website.url.includes('epicgames.com')) {
          logger.info(`Found Epic Store website: ${website.url}`);
          return website.url;
        }
      }
    } else {
      logger.info('No websites data available');
    }

    logger.info(`No direct Epic Store URL found for "${game.name}"`);
    return null;
  }

  /**
   * タイトルの類似度を計算（0-100）
   */
  private calculateTitleSimilarity(original: string, found: string): number {
    const orig = original.toLowerCase().trim();
    const fund = found.toLowerCase().trim();

    // 完全一致
    if (orig === fund) return 100;

    // 一方が他方を含む
    if (orig.includes(fund) || fund.includes(orig)) return 90;

    // Levenshtein距離ベースの類似度
    const distance = this.levenshteinDistance(orig, fund);
    const maxLength = Math.max(orig.length, fund.length);
    const similarity = Math.round((1 - distance / maxLength) * 100);
    
    return Math.max(0, similarity);
  }

  /**
   * Levenshtein距離を計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * バッチでEpic Store URLを検索（複数ゲーム対応）
   */
  public async searchMultipleEpicUrls(
    gameTitles: string[], 
    provider: SearchProvider = 'igdb'
  ): Promise<Map<string, SearchResult[]>> {
    const results = new Map<string, SearchResult[]>();
    
    // レート制限を考慮して順次実行
    for (const title of gameTitles) {
      const searchResults = await this.searchEpicStoreUrl(title, provider);
      results.set(title, searchResults);
      
      // API制限を避けるため少し待機
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }

  /**
   * API比較用のテストメソッド
   */
  public async compareAPIs(gameTitle: string): Promise<{
    itad: SearchResult | null;
    igdb: SearchResult | null;
    comparison: {
      faster: SearchProvider | 'tie';
      moreAccurate: SearchProvider | 'tie';
      bothFound: boolean;
    };
  }> {
    const [itadResult, igdbResult] = await Promise.all([
      this.searchWithITAD(gameTitle),
      this.searchWithIGDB(gameTitle)
    ]);

    const comparison = {
      faster: (itadResult && igdbResult 
        ? (itadResult.searchTime < igdbResult.searchTime ? 'itad' : igdbResult.searchTime < itadResult.searchTime ? 'igdb' : 'tie')
        : (itadResult ? 'itad' : igdbResult ? 'igdb' : 'tie')) as SearchProvider | 'tie',
      moreAccurate: (itadResult && igdbResult
        ? (itadResult.confidence > igdbResult.confidence ? 'itad' : igdbResult.confidence > itadResult.confidence ? 'igdb' : 'tie')
        : (itadResult ? 'itad' : igdbResult ? 'igdb' : 'tie')) as SearchProvider | 'tie',
      bothFound: !!(itadResult?.url && igdbResult?.url)
    };

    return {
      itad: itadResult,
      igdb: igdbResult,
      comparison
    };
  }
}