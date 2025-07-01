import * as xml2js from 'xml2js';
import axios from 'axios';
import logger from '../utils/logger';
import { DiscordService } from './DiscordService';
import { EpicGamesModel } from '../models/EpicGamesModel';
import { SteamFreeGamesModel } from '../models/SteamFreeGamesModel';

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
    logger.info('🎮 FreeGamesRSSService初期化中...');
    await this.checkForNewGames();
    this.startPeriodicCheck();
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
      logger.info('📡 RSSフィードから無料ゲーム情報を取得中...');
      
      const response = await axios.get(this.RSS_URL);
      const result = await this.parser.parseStringPromise(response.data);
      
      if (!result.rss?.channel?.[0]?.item) {
        logger.warn('RSSフィードにアイテムが見つかりません');
        return;
      }

      const items: RSSItem[] = result.rss.channel[0].item;
      const parsedGames = this.parseGames(items);
      
      // Epic Gamesの処理
      const epicGames = parsedGames.filter(g => g.type === 'epic');
      for (const game of epicGames) {
        await this.processEpicGame(game);
      }

      // Steam無料ゲームの処理
      const steamGames = parsedGames.filter(g => g.type === 'steam');
      for (const game of steamGames) {
        await this.processSteamFreeGame(game);
      }

      // 期限切れのEpicゲームをクリーンアップ
      await this.cleanupExpiredEpicGames();

      this.lastCheckTime = new Date();
      logger.info(`✅ 無料ゲームチェック完了: Epic ${epicGames.length}件, Steam ${steamGames.length}件`);
      
    } catch (error) {
      logger.error('RSSフィード取得エラー:', error);
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
        
        // Epic Games判定
        if (description.toLowerCase().includes('epic games') || 
            link.includes('epicgames.com')) {
          
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

          // 期間切れチェック
          const now = new Date();
          if (endDate && endDate < now) {
            // 期間切れの無料ゲームはスキップ
            continue;
          }

          games.push({
            title: cleanTitle,
            description,
            url: link,
            type: 'epic',
            endDate,
            pubDate
          });
        }
        // Steam無料ゲーム判定
        else if (link.includes('store.steampowered.com') && 
                 (description.toLowerCase().includes('free') || 
                  title.toLowerCase().includes('free'))) {
          // Steam無料ゲーム名のクリーンアップ
          const cleanSteamTitle = title
            .replace(/\s*\(Steam\)/i, '')
            .replace(/\s*-\s*Free/i, '')
            .replace(/\s*(free to play|free on Steam)/i, '')
            .replace(/\s*\|\s*Steam.*$/i, '')
            .trim();

          games.push({
            title: cleanSteamTitle,
            description,
            url: link,
            type: 'steam',
            pubDate
          });
        }
        
      } catch (error) {
        logger.error('ゲーム解析エラー:', error);
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
      // 過去の日付の場合は翌年として扱う
      if (date < now) {
        date.setFullYear(year + 1);
      }
      return date;
    }
    
    // パースできない場合は7日後をデフォルトとする
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  private async processEpicGame(game: ParsedFreeGame): Promise<void> {
    try {
      // 既存のゲームかチェック
      const existing = await this.epicGamesModel.findByTitle(game.title);
      
      if (!existing) {
        // 新規ゲームとして追加
        await this.epicGamesModel.create({
          title: game.title,
          description: game.description,
          epic_url: game.url,
          start_date: game.pubDate.toISOString().split('T')[0],
          end_date: game.endDate?.toISOString().split('T')[0],
          is_claimed: false
        });
        
        // Discord通知
        await this.discordService.sendEpicFreeGameAlert([{
          title: game.title,
          description: game.description,
          url: game.url
        }]);
        
        logger.info(`🎮 新しいEpic無料ゲーム追加: ${game.title}`);
      }
    } catch (error) {
      logger.error(`Epic無料ゲーム処理エラー (${game.title}):`, error);
    }
  }

  private async processSteamFreeGame(game: ParsedFreeGame): Promise<void> {
    try {
      // Steam App IDを抽出
      const appIdMatch = game.url.match(/\/app\/(\d+)/);
      if (!appIdMatch) {
        logger.warn(`Steam App ID が見つかりません: ${game.url}`);
        return;
      }
      
      const appId = parseInt(appIdMatch[1]);
      
      // 既存のゲームかチェック
      const existing = await this.steamFreeGamesModel.findByAppId(appId);
      
      if (!existing) {
        // 新規ゲームとして追加
        await this.steamFreeGamesModel.create({
          app_id: appId,
          title: game.title,
          description: game.description,
          steam_url: game.url,
          discovered_at: game.pubDate.toISOString()
        });
        
        // Discord通知
        await this.discordService.sendSteamFreeGameAlert({
          app_id: appId,
          title: game.title,
          description: game.description,
          steam_url: game.url
        });
        
        logger.info(`🎮 新しいSteam無料ゲーム追加: ${game.title} (${appId})`);
      }
    } catch (error) {
      logger.error(`Steam無料ゲーム処理エラー (${game.title}):`, error);
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

  // 期限切れのEpic無料ゲームをクリーンアップ
  private async cleanupExpiredEpicGames(): Promise<void> {
    try {
      const now = new Date();
      const expiredGames = await this.epicGamesModel.getAllGames();
      
      for (const game of expiredGames) {
        if (game.end_date) {
          const endDate = new Date(game.end_date);
          if (endDate < now && !game.is_claimed) {
            // 期限切れで未受け取りのゲームを削除
            await this.epicGamesModel.deleteGame(game.id!);
            logger.info(`期限切れのEpic無料ゲームを削除: ${game.title}`);
          }
        }
      }
    } catch (error) {
      logger.error('Epic無料ゲーム クリーンアップエラー:', error);
    }
  }
}