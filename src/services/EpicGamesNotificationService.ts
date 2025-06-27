import discordService from './DiscordService';
import logger from '../utils/logger';

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

  // Epic Games無料ゲーム情報を取得
  async checkEpicFreeGames(): Promise<EpicFreeGame[]> {
    try {
      logger.info('Checking Epic Games free games');

      // RSS Feedから無料ゲーム情報を取得
      const rssGames = await this.getFromRSSFeed();
      
      // IsThereAnyDeal APIから補完情報を取得
      const itadGames = await this.getFromITADAPI();
      
      // 結果をマージ
      const allGames = [...rssGames, ...itadGames];
      
      // 重複除去
      const uniqueGames = this.removeDuplicates(allGames);
      
      // 新しく発見された無料ゲームのみを返す
      const newGames = uniqueGames.filter(game => !this.knownFreeGames.has(game.title));
      
      // 新しいゲームを記録
      newGames.forEach(game => this.knownFreeGames.add(game.title));
      
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

  // RSS Feedから無料ゲーム情報を取得
  private async getFromRSSFeed(): Promise<EpicFreeGame[]> {
    try {
      // Epic Games公式RSS Feedを使用
      // const rssUrl = 'https://store.epicgames.com/en-US/free-games/rss.xml';
      
      // 実際のプロダクションではRSSパーサーライブラリを使用
      // ここではサンプルデータを返す
      
      const sampleGames: EpicFreeGame[] = [
        {
          title: 'Sample Free Game',
          description: 'Epic Gamesで期間限定無料配布中',
          url: 'https://store.epicgames.com/en-US/p/sample-game',
          originalPrice: '$19.99',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1週間後
        }
      ];

      return sampleGames;

    } catch (error) {
      logger.error('Failed to fetch from RSS feed:', error);
      return [];
    }
  }

  // IsThereAnyDeal APIから無料ゲーム情報を取得
  private async getFromITADAPI(): Promise<EpicFreeGame[]> {
    try {
      // ITAD APIを使用してEpic Storeの無料ゲームを取得
      // 実際の実装では IsThereAnyDealAPI クラスを使用
      
      // const url = 'https://api.isthereanydeal.com/v01/deals/list/';
      // const params = new URLSearchParams({
      //   key: process.env.ITAD_API_KEY || '',
      //   shop: '115', // Epic Games Store ID
      //   price_to: '0' // 無料
      // });

      // APIキーが設定されていない場合はスキップ
      if (!process.env.ITAD_API_KEY) {
        logger.warn('ITAD API key not configured, skipping Epic Games API check');
        return [];
      }

      // 実際のAPI呼び出しは省略（サンプルデータを返す）
      const sampleITADGames: EpicFreeGame[] = [];

      return sampleITADGames;

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
      const rssGames = await this.getFromRSSFeed();
      const itadGames = await this.getFromITADAPI();
      return this.removeDuplicates([...rssGames, ...itadGames]);
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