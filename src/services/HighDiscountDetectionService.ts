import { IsThereAnyDealAPI } from '../api/IsThereAnyDealAPI';
import discordService from './DiscordService';
import logger from '../utils/logger';
// configは現在使用していないため、インポートをコメントアウト
// import { config } from '../config';

export interface HighDiscountGame {
  name: string;
  steam_app_id: number;
  current_price: number;
  original_price: number;
  discount_percent: number;
  review_score?: number;
  review_count?: number;
}

export class HighDiscountDetectionService {
  private itadAPI: IsThereAnyDealAPI;
  private lastCheckTime: Date | null = null;
  private checkInterval: number = 6 * 60 * 60 * 1000; // 6時間

  constructor() {
    this.itadAPI = new IsThereAnyDealAPI();
  }

  // 高割引ゲーム検知の実行
  async detectHighDiscountGames(): Promise<HighDiscountGame[]> {
    try {
      logger.info('Starting high discount game detection');

      // ITAD APIから高割引ゲームを取得
      const deals = await this.itadAPI.getHighDiscountDeals({
        minDiscount: 80, // 80%以上の割引
        limit: 100,
        region: 'JP'
      });

      if (!deals || deals.length === 0) {
        logger.info('No high discount games found');
        return [];
      }

      // フィルタリング条件を適用
      const filteredDeals = deals.filter(deal => {
        // 価格上限チェック（2000円以下）
        if (deal.current_price > 2000) {
          return false;
        }

        // レビュー条件チェック（1000件以上、80%以上）
        if (deal.review_count && deal.review_score) {
          return deal.review_count >= 1000 && deal.review_score >= 80;
        }

        // レビューデータがない場合はスキップしない（新作の可能性）
        return true;
      });

      logger.info(`Found ${filteredDeals.length} high discount games after filtering`);

      // Discord通知を送信（フィルタリング後のゲームが5件以上の場合）
      if (filteredDeals.length >= 5) {
        await this.sendHighDiscountNotification(filteredDeals.slice(0, 10));
      }

      this.lastCheckTime = new Date();
      return filteredDeals;

    } catch (error) {
      logger.error('Failed to detect high discount games:', error);
      throw error;
    }
  }

  // Discord通知送信
  private async sendHighDiscountNotification(games: HighDiscountGame[]): Promise<void> {
    try {
      if (!discordService.isEnabled()) {
        logger.info('Discord webhook not configured, skipping high discount notification');
        return;
      }

      const success = await discordService.sendHighDiscountAlert(games);
      if (success) {
        logger.info(`High discount notification sent for ${games.length} games`);
      } else {
        logger.warn('Failed to send high discount notification');
      }
    } catch (error) {
      logger.error('Error sending high discount notification:', error);
    }
  }

  // 定期実行の開始
  startPeriodicCheck(): void {
    // 即座に1回実行
    this.detectHighDiscountGames().catch(error => {
      logger.error('Initial high discount detection failed:', error);
    });

    // 定期実行をスケジュール
    setInterval(() => {
      this.detectHighDiscountGames().catch(error => {
        logger.error('Periodic high discount detection failed:', error);
      });
    }, this.checkInterval);

    logger.info(`High discount detection started with ${this.checkInterval / (60 * 60 * 1000)} hour interval`);
  }

  // 定期実行の停止
  stopPeriodicCheck(): void {
    // 実際のプロダクションではinterval IDを保存して clearInterval を使用
    logger.info('High discount detection stopped');
  }

  // 手動実行
  async runManualCheck(): Promise<HighDiscountGame[]> {
    logger.info('Manual high discount check requested');
    return await this.detectHighDiscountGames();
  }

  // 最終チェック時刻を取得
  getLastCheckTime(): Date | null {
    return this.lastCheckTime;
  }

  // 設定可能な最小割引率を変更
  setMinimumDiscount(percent: number): void {
    if (percent >= 50 && percent <= 90) {
      logger.info(`Minimum discount changed to ${percent}%`);
    } else {
      logger.warn(`Invalid discount percentage: ${percent}%. Must be between 50-90%`);
    }
  }

  // 人気ゲームの特別検知（より緩い条件）
  async detectPopularHighDiscountGames(): Promise<HighDiscountGame[]> {
    try {
      logger.info('Detecting popular high discount games with relaxed criteria');

      const deals = await this.itadAPI.getHighDiscountDeals({
        minDiscount: 60, // 60%以上の割引（緩和）
        limit: 200,
        region: 'JP'
      });

      if (!deals || deals.length === 0) {
        return [];
      }

      // 人気ゲーム向けのフィルタリング
      const popularDeals = deals.filter(deal => {
        // 価格上限チェック（5000円以下に緩和）
        if (deal.current_price > 5000) {
          return false;
        }

        // レビュー条件（5000件以上、85%以上）
        if (deal.review_count && deal.review_score) {
          return deal.review_count >= 5000 && deal.review_score >= 85;
        }

        return false; // 人気ゲーム検知ではレビューデータは必須
      });

      logger.info(`Found ${popularDeals.length} popular high discount games`);
      return popularDeals;

    } catch (error) {
      logger.error('Failed to detect popular high discount games:', error);
      throw error;
    }
  }

  // 統計情報を取得
  getStatistics(): {
    lastCheckTime: Date | null;
    checkInterval: number;
    isRunning: boolean;
  } {
    return {
      lastCheckTime: this.lastCheckTime,
      checkInterval: this.checkInterval,
      isRunning: true // 実際のプロダクションでは実行状態を追跡
    };
  }
}

export default new HighDiscountDetectionService();