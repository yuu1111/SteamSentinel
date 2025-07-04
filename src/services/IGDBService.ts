import { config } from '../config';
import logger from '../utils/logger';

export interface IGDBGame {
  id: number;
  name: string;
  metacritic?: number;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
  total_rating?: number;
  total_rating_count?: number;
  url?: string;
  cover?: {
    id: number;
    url: string;
  };
  genres?: Array<{
    id: number;
    name: string;
  }>;
  first_release_date?: number;
  summary?: string;
  storyline?: string;
  themes?: Array<{ id: number; name: string }>;
  game_modes?: Array<{ id: number; name: string }>;
  player_perspectives?: Array<{ id: number; name: string }>;
  age_ratings?: Array<{
    category: number;
    rating: number;
    content_descriptions?: Array<{ description: string }>;
  }>;
  screenshots?: Array<{
    id: number;
    url: string;
    width: number;
    height: number;
  }>;
  videos?: Array<{
    id: number;
    name: string;
    video_id: string;
  }>;
}

export interface IGDBSearchResult {
  games: IGDBGame[];
  total: number;
}

export class IGDBService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private baseURL = 'https://api.igdb.com/v4';
  private authURL = 'https://id.twitch.tv/oauth2/token';

  constructor() {
    if (!config.igdbClientId || !config.igdbClientSecret) {
      logger.warn('IGDB credentials not configured. Review integration will use mock data.');
      logger.debug(`IGDB_CLIENT_ID: ${config.igdbClientId ? 'SET' : 'NOT SET'}`);
      logger.debug(`IGDB_CLIENT_SECRET: ${config.igdbClientSecret ? 'SET' : 'NOT SET'}`);
    } else {
      logger.info('IGDB credentials configured successfully');
    }
  }

  // Twitch OAuth2 access token取得
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      logger.debug('Using cached IGDB access token');
      return this.accessToken;
    }

    if (!config.igdbClientId || !config.igdbClientSecret) {
      throw new Error('IGDB credentials not configured');
    }

    try {
      logger.debug('Requesting new IGDB access token from Twitch');
      
      const response = await fetch(this.authURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.igdbClientId,
          client_secret: config.igdbClientSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`OAuth2 token request failed: ${response.status} - ${errorText}`);
        throw new Error(`OAuth2 token request failed: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // 5分前に期限切れとする

      logger.info(`IGDB access token obtained successfully (expires in ${data.expires_in}s)`);
      return this.accessToken!;
    } catch (error) {
      logger.error('Failed to get IGDB access token:', error);
      throw error;
    }
  }

  // IGDB APIリクエスト
  private async makeRequest(endpoint: string, query: string): Promise<any> {
    const token = await this.getAccessToken();

    logger.debug(`Making IGDB API request to ${endpoint}`);
    logger.debug(`Query: ${query}`);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': config.igdbClientId!,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: query,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`IGDB API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`IGDB API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    logger.debug(`IGDB API response: ${JSON.stringify(result, null, 2)}`);
    return result;
  }

  // ゲーム名でゲームを検索
  async searchGames(gameName: string, limit: number = 10): Promise<IGDBSearchResult> {
    try {
      const query = `fields id, name, aggregated_rating, aggregated_rating_count, rating, rating_count, total_rating, total_rating_count, url; search "${gameName}"; where category = 0; limit ${limit};`;

      const games = await this.makeRequest('/games', query);
      
      return {
        games: games || [],
        total: games?.length || 0
      };
    } catch (error) {
      logger.error(`Failed to search games for "${gameName}":`, error);
      return { games: [], total: 0 };
    }
  }

  // ゲームIDでゲーム情報を取得
  async getGameById(gameId: number): Promise<IGDBGame | null> {
    try {
      const query = `
        fields id, name, aggregated_rating, aggregated_rating_count, 
               rating, rating_count, total_rating, total_rating_count, url, 
               cover.url, genres.name, first_release_date, summary;
        where id = ${gameId};
      `;

      const games = await this.makeRequest('/games', query);
      
      return games?.[0] || null;
    } catch (error) {
      logger.error(`Failed to get game by ID ${gameId}:`, error);
      return null;
    }
  }

  // Steam App IDでゲームを検索（名前ベースの曖昧検索）
  async findGameByName(gameName: string): Promise<IGDBGame | null> {
    try {
      // 曖昧検索
      const searchResult = await this.searchGames(gameName, 10);
      
      if (searchResult.games.length > 0) {
        // 最も名前が近いゲームを選択（完全一致 > 部分一致）
        const exactMatch = searchResult.games.find(game => 
          game.name.toLowerCase() === gameName.toLowerCase()
        );
        
        if (exactMatch) {
          logger.debug(`Found exact match for "${gameName}": "${exactMatch.name}"`);
          return exactMatch;
        }
        
        const partialMatch = searchResult.games.find(game => 
          game.name.toLowerCase().includes(gameName.toLowerCase()) ||
          gameName.toLowerCase().includes(game.name.toLowerCase())
        );
        
        if (partialMatch) {
          logger.debug(`Found partial match for "${gameName}": "${partialMatch.name}"`);
          return partialMatch;
        }
        
        // レーティングデータがあるゲームを優先
        const gameWithRating = searchResult.games.find(game => 
          game.aggregated_rating || game.total_rating || game.rating
        );
        
        if (gameWithRating) {
          logger.debug(`Found game with rating for "${gameName}": "${gameWithRating.name}"`);
          return gameWithRating;
        }
        
        return searchResult.games[0];
      }

      return null;
    } catch (error) {
      logger.error(`Failed to find game by name "${gameName}":`, error);
      return null;
    }
  }

  // Steam App IDでIGDBゲームを検索
  async findGameBySteamId(steamAppId: number): Promise<IGDBGame | null> {
    try {
      logger.debug(`Searching IGDB for Steam App ID: ${steamAppId}`);
      
      // external_gamesを使ってSteam IDから検索
      const query = `
        fields game.id, game.name, game.aggregated_rating, game.aggregated_rating_count, 
               game.rating, game.rating_count, game.total_rating, game.total_rating_count, game.url;
        where category = 1 & uid = "${steamAppId}";
      `;

      const externalGames = await this.makeRequest('/external_games', query);
      
      if (externalGames && externalGames.length > 0 && externalGames[0].game) {
        const game = externalGames[0].game;
        logger.debug(`Found IGDB game via Steam ID: "${game.name}" (ID: ${game.id})`);
        return game;
      }
      
      logger.debug(`No IGDB game found for Steam App ID: ${steamAppId}`);
      return null;
    } catch (error) {
      logger.error(`Failed to find game by Steam ID ${steamAppId}:`, error);
      return null;
    }
  }

  // ゲームのMetacriticスコアを取得（複数のアプローチ）
  async getMetacriticScore(gameId: number): Promise<number | null> {
    try {
      logger.debug(`Searching for Metacritic score for IGDB game ID: ${gameId}`);
      
      // アプローチ1: game詳細でrating_*フィールドを再確認
      const gameDetailQuery = `
        fields aggregated_rating, total_rating, rating;
        where id = ${gameId};
      `;
      
      const gameDetails = await this.makeRequest('/games', gameDetailQuery);
      if (gameDetails && gameDetails.length > 0) {
        const game = gameDetails[0];
        
        // 複数のレーティングフィールドをチェック
        if (game.aggregated_rating) {
          logger.debug(`Found aggregated_rating as potential Metacritic: ${game.aggregated_rating}`);
          return Math.round(game.aggregated_rating);
        }
        
        if (game.total_rating) {
          logger.debug(`Found total_rating as potential Metacritic: ${game.total_rating}`);
          return Math.round(game.total_rating);
        }
      }

      // アプローチ2: websitesエンドポイントでMetacriticリンクを探す
      const websiteQuery = `
        fields url, category;
        where game = ${gameId};
      `;

      const websites = await this.makeRequest('/websites', websiteQuery);
      if (websites && websites.length > 0) {
        const metacriticSite = websites.find((site: any) => 
          site.url && (site.url.includes('metacritic.com') || site.category === 8)
        );
        
        if (metacriticSite) {
          logger.debug(`Found Metacritic URL for game ID ${gameId}: ${metacriticSite.url}`);
          // URLからスコアを抽出できる可能性があるが、WebスクレイピングになるためNG
        }
      }

      // アプローチ3: involved_companiesでMetacriticの情報を探す
      const companiesQuery = `
        fields company.name;
        where game = ${gameId};
      `;

      try {
        const companies = await this.makeRequest('/involved_companies', companiesQuery);
        if (companies && companies.length > 0) {
          logger.debug(`Found ${companies.length} companies for game ${gameId}`);
        }
      } catch (error) {
        logger.debug(`Companies query failed for game ${gameId}:`, error);
      }
      
      logger.debug(`No separate Metacritic score found for game ID: ${gameId}`);
      return null;
    } catch (error) {
      logger.error(`Failed to get Metacritic score for game ID ${gameId}:`, error);
      return null;
    }
  }

  // IGDBレーティングを取得
  async getGameRatings(gameName: string, steamAppId?: number): Promise<{
    igdbRating?: number;
    igdbRatingCount?: number;
    url?: string;
  }> {
    try {
      logger.debug(`Searching IGDB for game: "${gameName}"${steamAppId ? ` (Steam ID: ${steamAppId})` : ''}`);
      
      let game: IGDBGame | null = null;
      
      // Steam IDがある場合は最初にSteam IDで検索
      if (steamAppId) {
        game = await this.findGameBySteamId(steamAppId);
      }
      
      // Steam IDで見つからない場合は名前で検索
      if (!game) {
        game = await this.findGameByName(gameName);
      }
      
      if (!game) {
        logger.debug(`No IGDB game found for: "${gameName}"`);
        return {};
      }

      logger.debug(`Found IGDB game: "${game.name}" (ID: ${game.id})`);

      const result: any = {};

      // IGDBスコア（total_ratingを使用）
      if (game.total_rating && game.total_rating_count) {
        result.igdbRating = Math.round(game.total_rating);
        result.igdbRatingCount = game.total_rating_count;
        logger.debug(`IGDB total rating: ${result.igdbRating} (${result.igdbRatingCount} reviews)`);
      }
      // フォールバック（ratingを使用）
      else if (game.rating && game.rating_count) {
        result.igdbRating = Math.round(game.rating);
        result.igdbRatingCount = game.rating_count;
        logger.debug(`IGDB rating: ${result.igdbRating} (${result.igdbRatingCount} reviews)`);
      }

      // URL
      if (game.url) {
        result.url = game.url;
      }

      logger.debug(`IGDB result for "${gameName}":`, result);
      return result;
    } catch (error) {
      logger.error(`Failed to get IGDB ratings for "${gameName}":`, error);
      return {};
    }
  }

  // 詳細なゲーム情報を取得
  async getDetailedGameInfo(gameName: string, steamAppId?: number): Promise<{
    summary?: string;
    storyline?: string;
    themes?: Array<{ id: number; name: string }>;
    game_modes?: Array<{ id: number; name: string }>;
    player_perspectives?: Array<{ id: number; name: string }>;
    age_ratings?: Array<{
      category: number;
      rating: number;
      content_descriptions?: Array<{ description: string }>;
    }>;
    screenshots?: Array<{
      id: number;
      url: string;
      width: number;
      height: number;
    }>;
    videos?: Array<{
      id: number;
      name: string;
      video_id: string;
    }>;
  }> {
    try {
      logger.debug(`Searching IGDB for detailed game info: "${gameName}"${steamAppId ? ` (Steam ID: ${steamAppId})` : ''}`);
      
      let game: IGDBGame | null = null;
      
      // Steam IDがある場合は最初にSteam IDで検索
      if (steamAppId) {
        game = await this.findGameBySteamId(steamAppId);
      }
      
      // Steam IDで見つからない場合は名前で検索
      if (!game) {
        game = await this.findGameByName(gameName);
      }
      
      if (!game) {
        logger.debug(`No IGDB game found for detailed info: "${gameName}"`);
        return {};
      }

      // 詳細情報を取得
      const detailedQuery = `
        fields summary, storyline, themes.name, game_modes.name, 
               player_perspectives.name, age_ratings.category, 
               age_ratings.rating, videos.name, videos.video_id;
        where id = ${game.id};
      `;

      const detailedGames = await this.makeRequest('/games', detailedQuery);
      
      // スクリーンショットを別途取得
      let screenshots: any[] = [];
      try {
        const screenshotQuery = `
          fields url, width, height;
          where game = ${game.id};
          limit 10;
        `;
        screenshots = await this.makeRequest('/screenshots', screenshotQuery);
        logger.debug(`Found ${screenshots.length} screenshots for game ${game.id}`);
      } catch (screenshotError) {
        logger.debug(`Failed to get screenshots for game ${game.id}:`, screenshotError);
      }
      
      if (detailedGames && detailedGames.length > 0) {
        const detailedGame = detailedGames[0];
        
        return {
          summary: detailedGame.summary,
          storyline: detailedGame.storyline,
          themes: detailedGame.themes,
          game_modes: detailedGame.game_modes,
          player_perspectives: detailedGame.player_perspectives,
          age_ratings: detailedGame.age_ratings,
          screenshots: screenshots?.map((screenshot: any) => ({
            id: screenshot.id,
            url: screenshot.url ? (screenshot.url.startsWith('//') ? `https:${screenshot.url}` : screenshot.url) : null,
            width: screenshot.width || 1920,
            height: screenshot.height || 1080
          })).filter(s => s.url), // URLがないものは除外
          videos: detailedGame.videos
        };
      }
      
      return {};
    } catch (error) {
      logger.error(`Failed to get detailed IGDB info for "${gameName}":`, error);
      return {};
    }
  }

  // 設定状況確認
  isConfigured(): boolean {
    return !!(config.igdbClientId && config.igdbClientSecret);
  }

  // 統計情報取得
  getStatistics(): {
    configured: boolean;
    hasValidToken: boolean;
    tokenExpiry: string | null;
  } {
    return {
      configured: this.isConfigured(),
      hasValidToken: !!(this.accessToken && Date.now() < this.tokenExpiry),
      tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null
    };
  }
}

export default new IGDBService();