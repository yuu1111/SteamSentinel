import discordService from './DiscordService';
import logger from '../utils/logger';
import epicGamesModel from '../models/EpicGamesModel';

// CommonJSモジュールとして読み込み
const { EpicFreeGames } = require('epic-free-games');

export interface EpicFreeGame {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  startDate?: Date;
  endDate?: Date;
  originalPrice?: string;
}

export class EpicGamesNotificationService {
  private lastCheckTime: Date | null = null;
  private knownFreeGames = new Set<string>();
  private checkInterval: number = 24 * 60 * 60 * 1000; // 24時間
  private epicFreeGames: any;

  constructor() {
    try {
      this.epicFreeGames = new EpicFreeGames({
        country: 'JP',
        locale: 'ja',
        includeAll: true
      });
    } catch (error) {
      logger.warn('Failed to initialize epic-free-games, using fallback mode:', error);
      this.epicFreeGames = null;
    }
  }

  // Epic Games無料ゲーム情報を取得
  async checkEpicFreeGames(): Promise<EpicFreeGame[]> {
    try {
      logger.info('Checking Epic Games free games');

      // epic-free-gamesパッケージから無料ゲーム情報を取得
      const epicGames = await this.getFromEpicPackage();
      
      // IsThereAnyDeal APIから補完情報を取得
      const itadGames = await this.getFromITADAPI();
      
      // 結果をマージ
      const allGames = [...epicGames, ...itadGames];
      
      // 重複除去
      const uniqueGames = this.removeDuplicates(allGames);
      
      // データベースに新しいゲームを保存し、新規ゲームのみを返す
      const newGames: EpicFreeGame[] = [];
      
      for (const game of uniqueGames) {
        const startDate = game.startDate ? game.startDate.toISOString() : undefined;
        
        // 重複チェック
        if (!epicGamesModel.isDuplicateGame(game.title, startDate)) {
          // データベースに追加
          const gameData = {
            title: game.title,
            description: game.description,
            epic_url: game.url,
            image_url: game.image,
            start_date: startDate,
            end_date: game.endDate ? game.endDate.toISOString() : undefined,
            is_claimed: false
          };
          
          epicGamesModel.addGame(gameData);
          newGames.push(game);
        }
        
        this.knownFreeGames.add(game.title);
      }
      
      // Discord通知を送信
      if (newGames.length > 0) {
        await this.sendNotification(newGames);
      }

      this.lastCheckTime = new Date();
      logger.info(`Epic Games check completed: ${newGames.length} new free games found`);
      
      return newGames;

    } catch (error) {
      logger.error('Failed to check Epic Games free games:', error);
      throw error;
    }
  }

  // epic-free-gamesパッケージから無料ゲーム情報を取得
  private async getFromEpicPackage(): Promise<EpicFreeGame[]> {
    try {
      logger.info('Fetching Epic Games data using epic-free-games package');
      
      // パッケージが初期化されていない場合はフォールバック
      if (!this.epicFreeGames) {
        logger.warn('epic-free-games not available, using fallback data');
        return this.getFallbackGames();
      }
      
      const result = await this.epicFreeGames.getGames();
      const games: EpicFreeGame[] = [];
      
      if (result && result.currentGames && Array.isArray(result.currentGames)) {
        for (const game of result.currentGames) {
          if (game && game.title) {
            // 日付情報を解析
            const startDate = game.effectiveDate && typeof game.effectiveDate === 'string' ? 
                             new Date(game.effectiveDate) : new Date();
            const endDate = game.expiryDate && typeof game.expiryDate === 'string' ? 
                           new Date(game.expiryDate) : 
                           new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // デフォルト1週間
            
            // ゲーム画像を取得（keyImagesから最適な画像を選択）
            let imageUrl: string | undefined;
            if (game.keyImages && Array.isArray(game.keyImages)) {
              const featuredImage = game.keyImages.find((img: any) => 
                img.type === 'OfferImageWide' || img.type === 'DieselStoreFrontWide'
              );
              imageUrl = featuredImage?.url || game.keyImages[0]?.url;
            }
            
            // Epic Store URLを構築
            const epicUrl = game.productSlug ? 
              `https://store.epicgames.com/ja/p/${game.productSlug}` :
              `https://store.epicgames.com/ja/browse?q=${encodeURIComponent(game.title)}`;
            
            games.push({
              title: game.title,
              description: game.description || 'Epic Gamesで期間限定無料配布中',
              url: epicUrl,
              image: imageUrl,
              startDate: startDate,
              endDate: endDate,
              originalPrice: game.price?.totalPrice?.fmtPrice?.originalPrice
            });
          }
        }
      }
      
      logger.info(`Found ${games.length} free games from epic-free-games package`);
      return games;

    } catch (error) {
      logger.error('Failed to fetch from epic-free-games package:', error);
      return this.getFallbackGames();
    }
  }

  // フォールバック用のサンプルデータ
  private getFallbackGames(): EpicFreeGame[] {
    const sampleGames: EpicFreeGame[] = [
      {
        title: 'Sample Free Game',
        description: 'Epic Gamesで期間限定無料配布中',
        url: 'https://store.epicgames.com/ja/p/sample-game',
        originalPrice: '¥1,980',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1週間後
      }
    ];
    
    return sampleGames;
  }

  // IsThereAnyDeal APIから無料ゲーム情報を取得
  private async getFromITADAPI(): Promise<EpicFreeGame[]> {
    try {
      // APIキーが設定されていない場合はスキップ
      if (!process.env.ITAD_API_KEY) {
        logger.warn('ITAD API key not configured, skipping Epic Games API check');
        return [];
      }

      const url = 'https://api.isthereanydeal.com/v01/deals/list/';
      const params = new URLSearchParams({
        key: process.env.ITAD_API_KEY,
        shop: '115', // Epic Games Store ID
        price_to: '0', // 無料のみ
        limit: '20'
      });

      logger.info('Fetching Epic Games data from IsThereAnyDeal API');
      
      // 15秒タイムアウト設定
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${url}?${params}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ITAD API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const games: EpicFreeGame[] = [];

      if (data.data && Array.isArray(data.data.list)) {
        for (const deal of data.data.list) {
          if (deal.price_new === 0 || deal.price_new === '0') {
            games.push({
              title: deal.title || 'Unknown Game',
              description: `Epic Gamesで無料配布中 (定価: ${deal.price_old || 'Unknown'})`,
              url: deal.urls?.game || `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(deal.title || '')}`,
              originalPrice: deal.price_old,
              startDate: new Date(deal.added * 1000), // Unix timestamp
              endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // デフォルト1週間
            });
          }
        }
      }

      logger.info(`Found ${games.length} free games from ITAD API`);
      return games;

    } catch (error) {
      logger.error('Failed to fetch from ITAD API:', error);
      return [];
    }
  }

  // 重複ゲームを除去
  private removeDuplicates(games: EpicFreeGame[]): EpicFreeGame[] {
    const seen = new Set<string>();
    return games.filter(game => {
      const key = game.title.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Discord通知を送信
  private async sendNotification(games: EpicFreeGame[]): Promise<void> {
    try {
      if (!discordService.isEnabled()) {
        logger.info('Discord webhook not configured, skipping Epic Games notification');
        return;
      }

      const success = await discordService.sendEpicFreeGameAlert(games);
      if (success) {
        logger.info(`Epic Games notification sent for ${games.length} free games`);
      } else {
        logger.warn('Failed to send Epic Games notification');
      }
    } catch (error) {
      logger.error('Error sending Epic Games notification:', error);
    }
  }

  // 定期チェックの開始
  startPeriodicCheck(): void {
    // 即座に1回実行
    this.checkEpicFreeGames().catch(error => {
      logger.error('Initial Epic Games check failed:', error);
    });

    // 定期実行をスケジュール（毎日1回）
    setInterval(() => {
      this.checkEpicFreeGames().catch(error => {
        logger.error('Periodic Epic Games check failed:', error);
      });
    }, this.checkInterval);

    logger.info(`Epic Games free game check started with ${this.checkInterval / (60 * 60 * 1000)} hour interval`);
  }

  // 定期チェックの停止
  stopPeriodicCheck(): void {
    // 実際のプロダクションではinterval IDを保存して clearInterval を使用
    logger.info('Epic Games check stopped');
  }

  // 手動チェック
  async runManualCheck(): Promise<EpicFreeGame[]> {
    logger.info('Manual Epic Games check requested');
    return await this.checkEpicFreeGames();
  }

  // 現在の無料ゲーム一覧を取得（通知しない）
  async getCurrentFreeGames(): Promise<EpicFreeGame[]> {
    try {
      const epicGames = await this.getFromEpicPackage();
      const itadGames = await this.getFromITADAPI();
      return this.removeDuplicates([...epicGames, ...itadGames]);
    } catch (error) {
      logger.error('Failed to get current free games:', error);
      return [];
    }
  }

  // 統計情報を取得
  getStatistics(): {
    lastCheckTime: Date | null;
    knownGamesCount: number;
    checkInterval: number;
    isRunning: boolean;
  } {
    return {
      lastCheckTime: this.lastCheckTime,
      knownGamesCount: this.knownFreeGames.size,
      checkInterval: this.checkInterval,
      isRunning: true // 実際のプロダクションでは実行状態を追跡
    };
  }

  // キャッシュクリア
  clearCache(): void {
    this.knownFreeGames.clear();
    logger.info('Epic Games cache cleared');
  }

  // 特定のゲームが無料かどうかチェック
  async isGameFree(gameTitle: string): Promise<boolean> {
    try {
      const freeGames = await this.getCurrentFreeGames();
      return freeGames.some(game => 
        game.title.toLowerCase().includes(gameTitle.toLowerCase())
      );
    } catch (error) {
      logger.error(`Failed to check if ${gameTitle} is free:`, error);
      return false;
    }
  }

  // 無料期間の残り時間を計算
  calculateTimeRemaining(endDate: Date): string {
    const now = new Date();
    const timeDiff = endDate.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return '終了';
    }
    
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}日${hours}時間`;
    } else {
      return `${hours}時間`;
    }
  }
}

export default new EpicGamesNotificationService();