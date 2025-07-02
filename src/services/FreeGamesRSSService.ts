import * as xml2js from 'xml2js';
import axios from 'axios';
import logger from '../utils/logger';
import { DiscordService } from './DiscordService';
import { EpicGamesModel } from '../models/EpicGamesModel';
import { SteamFreeGamesModel } from '../models/SteamFreeGamesModel';
import { SteamStoreAPI } from '../api/SteamStoreAPI';
// import { EpicGamesSearchService } from './EpicGamesSearchService'; // 未使用のため削除

interface RSSItem {
  title: string[];
  description: string[];
  link: string[];
  pubDate: string[];
  author?: string[];
}

interface ParsedFreeGame {
  title: string;
  description: string;
  url: string;
  type: 'steam' | 'epic' | 'other';
  endDate?: Date;
  pubDate: Date;
}

export class FreeGamesRSSService {
  private static instance: FreeGamesRSSService;
  private RSS_URL = 'https://steamcommunity.com/groups/freegamesfinders/rss/';
  private CHECK_INTERVAL = 3600000; // 1時間ごと
  private parser = new xml2js.Parser();
  private discordService = new DiscordService();
  private epicGamesModel = new EpicGamesModel();
  private steamFreeGamesModel = new SteamFreeGamesModel();
  private steamAPI = new SteamStoreAPI();
  private checkInterval?: NodeJS.Timeout;
  private lastCheckTime: Date | null = null;

  private constructor() {}

  public static getInstance(): FreeGamesRSSService {
    if (!FreeGamesRSSService.instance) {
      FreeGamesRSSService.instance = new FreeGamesRSSService();
    }
    return FreeGamesRSSService.instance;
  }

  public async initialize(): Promise<void> {
    logger.info('Initializing FreeGamesRSSService...');
    await this.checkForNewGames();
    this.startPeriodicCheck();
    
    // Execute Steam API verification after server startup (background)
    this.scheduleInitialVerification();
  }
  
  private scheduleInitialVerification(): void {
    // Start Steam API verification after 30 seconds (after server startup completion)
    setTimeout(async () => {
      try {
        logger.info('Starting Steam free games verification after server startup...');
        const result = await this.verifyAllSteamFreeGames();
        logger.info('Steam free games verification completed:', result);
      } catch (error) {
        logger.error('Error during startup Steam free games verification:', error);
      }
    }, 30000); // Wait 30 seconds
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private startPeriodicCheck(): void {
    this.checkInterval = setInterval(async () => {
      await this.checkForNewGames();
    }, this.CHECK_INTERVAL);
  }

  public async checkForNewGames(): Promise<void> {
    try {
      logger.info('Fetching free games information from RSS feed...');
      
      const response = await axios.get(this.RSS_URL);
      const result = await this.parser.parseStringPromise(response.data);
      
      if (!result.rss?.channel?.[0]?.item) {
        logger.warn('No items found in RSS feed');
        return;
      }

      const items: RSSItem[] = result.rss.channel[0].item;
      
      // Debug: Check all items
      logger.info(`RSS items found: ${items.length}`);
      
      const parsedGames = this.parseGames(items);
      
      // Process Epic Games
      const epicGames = parsedGames.filter(g => g.type === 'epic');
      for (const game of epicGames) {
        await this.processEpicGame(game);
      }

      // Process Steam free games
      const steamGames = parsedGames.filter(g => g.type === 'steam');
      for (const game of steamGames) {
        await this.processSteamFreeGame(game);
      }


      this.lastCheckTime = new Date();
      logger.info(`Free games check completed: Epic ${epicGames.length} games, Steam ${steamGames.length} games`);
      
    } catch (error) {
      logger.error('RSS feed fetch error:', error);
    }
  }

  private parseGames(items: RSSItem[]): ParsedFreeGame[] {
    const games: ParsedFreeGame[] = [];
    
    for (const item of items) {
      try {
        const title = item.title?.[0] || '';
        const description = item.description?.[0] || '';
        const link = item.link?.[0] || '';
        const pubDate = new Date(item.pubDate?.[0] || '');
        
        // Epic Games detection
        if (description.toLowerCase().includes('epic games') || 
            link.includes('epicgames.com')) {
          
          // Debug: Detailed RSS data output
          logger.debug(`=== Epic Games RSS Data Debug ===`);
          logger.debug(`Title: ${title}`);
          logger.debug(`Link: ${link}`);
          logger.debug(`Description (first 500 chars): ${description.substring(0, 500)}...`);
          logger.debug(`Full Description: ${description}`);
          logger.debug(`PubDate: ${item.pubDate?.[0] || ''}`);
          
          // 説明文からEpic Store URLを直接抽出（URLエンコード対応）
          let epicStoreUrl = link; // デフォルトはRSSリンク
          
          // 通常のURLパターンをチェック
          let epicUrlMatch = description.match(/https?:\/\/store\.epicgames\.com\/[^\s"<>]+/i);
          
          if (!epicUrlMatch) {
            // URLエンコードされたパターンをチェック
            const encodedUrlMatch = description.match(/https?%3A%2F%2Fstore\.epicgames\.com%2F[^"\s<>&]+/i);
            if (encodedUrlMatch) {
              epicUrlMatch = [decodeURIComponent(encodedUrlMatch[0])];
            }
          }
          
          if (epicUrlMatch) {
            epicStoreUrl = epicUrlMatch[0];
            logger.debug(`Epic Store URL found in description: ${epicStoreUrl}`);
          } else {
            logger.debug(`Epic Store URL not found in description`);
            logger.debug(`Using RSS link as fallback: ${link}`);
          }
          logger.debug(`=== End Epic Games RSS Data Debug ===`);
          
          // 終了日の抽出 - 複数のパターンに対応
          const endDateMatch = description.match(/(?:until|through)\s+(\w+\s+\d{1,2})/i);
          let endDate: Date | undefined;
          if (endDateMatch) {
            const dateStr = endDateMatch[1];
            endDate = this.parseEndDate(dateStr);
          }

          // ゲーム名のクリーンアップ
          const cleanTitle = title
            .replace(/\s*\(Epic Games\)/i, '')
            .replace(/\s*(free from Epic Games store|from Epic Games|Epic Games Store)/i, '')
            .replace(/\s*\|\s*Epic.*$/i, '')
            .trim();

          // 期間切れチェック（配布終了のゲームも記録する）

          games.push({
            title: cleanTitle,
            description,
            url: epicStoreUrl,
            type: 'epic',
            endDate,
            pubDate
          });
        }
        // Steam無料ゲーム判定
        else if ((description.includes('store.steampowered.com') || 
                  title.toLowerCase().includes('free in the steam store')) && 
                 (description.toLowerCase().includes('free') || 
                  title.toLowerCase().includes('free'))) {
          
          // descriptionからSteamストアURLを抽出
          const steamUrlMatch = description.match(/store\.steampowered\.com\/app\/(\d+)[^">\s]*/);
          if (!steamUrlMatch) {
            continue; // SteamストアURLが見つからない場合はスキップ
          }
          
          const steamStoreUrl = `https://${steamUrlMatch[0]}`;
          
          // Steam無料ゲーム名のクリーンアップ
          const cleanSteamTitle = title
            .replace(/\s*free in the steam store$/i, '')
            .replace(/\s*\(Steam\)/i, '')
            .replace(/\s*-\s*Free/i, '')
            .replace(/\s*(free to play|free on Steam)/i, '')
            .replace(/\s*\|\s*Steam.*$/i, '')
            .trim();

          // Steam無料ゲームの期限判定
          let endDate: Date | undefined;
          const steamEndDateMatch = description.match(/(?:until|through|ends)\s+(?:Steam\s+Dawn\s+on\s+)?(\w+\s+\d{1,2})/i);
          if (steamEndDateMatch) {
            endDate = this.parseEndDate(steamEndDateMatch[1]);
          }

          games.push({
            title: cleanSteamTitle,
            description,
            url: steamStoreUrl,
            type: 'steam',
            endDate,
            pubDate
          });
        }
        
      } catch (error) {
        logger.error('Game parsing error:', error);
      }
    }
    
    return games;
  }

  private parseEndDate(dateStr: string): Date {
    const now = new Date();
    const year = now.getFullYear();
    
    // "July 03" のような形式をパース
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                   'july', 'august', 'september', 'october', 'november', 'december'];
    
    const parts = dateStr.toLowerCase().split(' ');
    const monthIndex = months.findIndex(m => m.startsWith(parts[0]));
    const day = parseInt(parts[1]);
    
    if (monthIndex !== -1 && !isNaN(day)) {
      const date = new Date(year, monthIndex, day, 23, 59, 59);
      
      // 未来の日付の場合（例：12月など）は今年
      // 過去の日付の場合、大幅に過去（3ヶ月以上前）なら翌年、そうでなければ期限切れとして今年
      if (date > now) {
        // 未来の日付はそのまま今年
        return date;
      } else {
        const monthsAgo = (now.getMonth() - monthIndex + 12) % 12;
        if (monthsAgo > 3) {
          // 大幅に過去（3ヶ月以上前）の場合は翌年として扱う
          date.setFullYear(year + 1);
        }
        // そうでなければ期限切れとして今年のまま返す
        return date;
      }
    }
    
    // パースできない場合は7日後をデフォルトとする
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  private async processEpicGame(game: ParsedFreeGame): Promise<void> {
    try {
      // Debug: Output detailed information for all Epic games
      logger.debug(`Processing Epic Game: ${game.title}`);
      logger.debug(`Description length: ${game.description.length} chars`);
      logger.debug(`URL: ${game.url}`);
      logger.debug(`Pub Date: ${game.pubDate}`);
      logger.debug(`End Date: ${game.endDate || 'none'}`);
      
      // 既存のゲームかチェック
      const existing = await this.epicGamesModel.findByTitle(game.title);
      
      if (!existing) {
        const now = new Date();
        const isExpired = game.endDate && game.endDate < now;
        
        // Epic Games Store URLを使用（RSS処理で既に説明文から抽出済み）
        const epicStoreUrl = game.url;
        logger.debug(`Epic Store URL: ${epicStoreUrl}`);
        
        // 新規ゲームとして追加（配布終了のゲームも含む）
        await this.epicGamesModel.create({
          title: game.title,
          description: game.description,
          epic_url: epicStoreUrl,
          start_date: game.pubDate.toISOString().split('T')[0],
          end_date: game.endDate?.toISOString().split('T')[0],
          is_claimed: false
        });
        
        // Discord通知（配布中のゲームのみ）
        if (!isExpired) {
          await this.discordService.sendEpicFreeGameAlert([{
            title: game.title,
            description: game.description,
            url: epicStoreUrl
          }]);
        }
        
        logger.info(`New Epic free game added: ${game.title}${isExpired ? ' (expired)' : ''}`);
      }
    } catch (error) {
      logger.error(`Epic free game processing error (${game.title}):`, error);
    }
  }

  private async processSteamFreeGame(game: ParsedFreeGame): Promise<void> {
    try {
      // Steam App IDを抽出
      const appIdMatch = game.url.match(/\/app\/(\d+)/);
      if (!appIdMatch) {
        logger.warn(`Steam App ID not found: ${game.url}`);
        return;
      }
      
      const appId = parseInt(appIdMatch[1]);
      
      // 既存のゲームかチェック
      const existing = await this.steamFreeGamesModel.findByAppId(appId);
      
      if (!existing) {
        const now = new Date();
        const isRssExpired = game.endDate && game.endDate < now;
        
        // RSSに掲載されたものは必ず履歴として保存
        await this.steamFreeGamesModel.create({
          app_id: appId,
          title: game.title,
          description: game.description,
          steam_url: game.url,
          start_date: game.pubDate.toISOString().split('T')[0],
          end_date: game.endDate?.toISOString().split('T')[0],
          is_expired: isRssExpired || false, // RSS期限のみで判定
          discovered_at: game.pubDate.toISOString()
        });
        
        // Discord通知（RSS期限内のゲームのみ）
        if (!isRssExpired) {
          await this.discordService.sendSteamFreeGameAlert({
            app_id: appId,
            title: game.title,
            description: game.description,
            steam_url: game.url
          });
          logger.info(`New Steam free game added: ${game.title} (${appId}) - History saved and Discord notification sent`);
        } else {
          logger.info(`New Steam free game added: ${game.title} (${appId}) - History only saved (RSS expired)`);
        }
      }
    } catch (error) {
      logger.error(`Steam free game processing error (${game.title}):`, error);
    }
  }

  // Steam APIでゲームの無料配布状況を検証
  private async verifySteamFreeGame(appId: number, title: string): Promise<{
    isFree: boolean;
    gameType: 'free' | 'paid' | 'unreleased' | 'removed' | 'dlc';
    price?: number;
    name?: string;
  } | null> {
    try {
      logger.debug(`Starting Steam API verification: ${title} (${appId})`);
      
      const appDetails = await this.steamAPI.getAppDetails(appId);
      
      if (!appDetails) {
        logger.warn(`No Steam API response: ${title} (${appId})`);
        return null;
      }
      
      if (!appDetails.success) {
        logger.warn(`Steam API failed: ${title} (${appId}) - Game does not exist or has been removed`);
        return {
          isFree: false,
          gameType: 'removed'
        };
      }
      
      const data = appDetails.data;
      const isFree = data?.is_free || false;
      const gameType = appDetails.gameType;
      const currentPrice = data?.price_overview?.final ? 
        Math.round(data.price_overview.final / 100) : undefined;
      
      logger.debug(`Steam API verification result: ${title} (${appId})`);
      logger.debug(`   - Free: ${isFree}`);
      logger.debug(`   - Type: ${gameType}`);
      logger.debug(`   - Current price: ${currentPrice ? `¥${currentPrice.toLocaleString()}` : 'No price info'}`);
      logger.debug(`   - Name: ${data?.name || 'Unknown'}`);
      
      return {
        isFree,
        gameType: gameType || 'removed',
        price: currentPrice,
        name: data?.name
      };
      
    } catch (error) {
      logger.error(`Steam API verification error: ${title} (${appId}):`, error);
      return null;
    }
  }

  public async manualCheck(): Promise<{epicCount: number, steamCount: number}> {
    await this.checkForNewGames();
    
    const epicGames = await this.epicGamesModel.getCurrentGames();
    const steamGames = await this.steamFreeGamesModel.getActiveGames();
    
    return {
      epicCount: epicGames.length,
      steamCount: steamGames.length
    };
  }

  public getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  // 既存のSteam無料ゲームの配布状況を一括検証
  public async verifyAllSteamFreeGames(): Promise<{
    verified: number;
    stillFree: number;
    expired: number;
    errors: number;
  }> {
    logger.info('Starting bulk verification of existing Steam free games...');
    
    const activeGames = await this.steamFreeGamesModel.getActiveGames();
    let verified = 0;
    let stillFree = 0;
    let expired = 0;
    let errors = 0;
    
    for (const game of activeGames) {
      try {
        const result = await this.verifySteamFreeGame(game.app_id, game.title);
        verified++;
        
        if (result) {
          if (result.isFree) {
            stillFree++;
            logger.debug(`Still free: ${game.title} (${game.app_id})`);
          } else {
            expired++;
            // 配布終了をデータベースに反映
            await this.steamFreeGamesModel.markAsExpired(game.app_id);
            logger.info(`Distribution ended: ${game.title} (${game.app_id}) - Type: ${result.gameType}`);
          }
        } else {
          errors++;
          logger.warn(`Verification error: ${game.title} (${game.app_id})`);
        }
        
        // API制限を考慮して1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errors++;
        logger.error(`Steam free game verification error: ${game.title} (${game.app_id}):`, error);
      }
    }
    
    const result = { verified, stillFree, expired, errors };
    logger.info('Steam free games verification completed:', result);
    
    return result;
  }

  // 特定のSteam無料ゲームの配布状況を検証
  public async verifySingleSteamGame(appId: number): Promise<{
    isFree: boolean;
    gameType: string;
    price?: number;
    name?: string;
    verified: boolean;
  }> {
    const game = await this.steamFreeGamesModel.findByAppId(appId);
    if (!game) {
      throw new Error(`Steam free game (App ID: ${appId}) not found`);
    }
    
    const result = await this.verifySteamFreeGame(appId, game.title);
    
    if (result) {
      // 配布状況が変わった場合はデータベースを更新
      if (!result.isFree && !game.is_expired) {
        await this.steamFreeGamesModel.markAsExpired(appId);
        logger.info(`Distribution end confirmed, database updated: ${game.title} (${appId})`);
      }
      
      return {
        isFree: result.isFree,
        gameType: result.gameType,
        price: result.price,
        name: result.name,
        verified: true
      };
    }
    
    return {
      isFree: false,
      gameType: 'unknown',
      verified: false
    };
  }

}