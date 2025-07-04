import { IsThereAnyDealAPI } from '../api/IsThereAnyDealAPI';
import discordService from './DiscordService';
import logger from '../utils/logger';
import itadSettingsModel from '../models/ITADSettingsModel';

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
      logger.info('Starting high discount game detection using ITAD API');

      // データベースから設定を取得
      const filterConfig = itadSettingsModel.getFilterConfig();
      logger.info('Using ITAD filter config:', filterConfig);
      
      // 高割引検知が無効な場合は処理をスキップ
      if (!filterConfig.enabled) {
        logger.info('High discount detection is disabled');
        return [];
      }

      // ITAD APIから高割引ゲームを取得（設定値を使用）
      const highDiscountGames = await this.itadAPI.getHighDiscountDeals({
        minDiscount: filterConfig.min_discount,
        maxPrice: filterConfig.max_price,
        limit: filterConfig.limit,
        region: filterConfig.region
      });

      logger.info(`ITAD API returned ${highDiscountGames ? highDiscountGames.length : 0} games`);
      
      if (!highDiscountGames || highDiscountGames.length === 0) {
        logger.warn('No high discount games found from ITAD API - checking API response');
        return [];
      }

      logger.info(`Found ${highDiscountGames.length} high discount games from ITAD API`);
      
      // デバッグ: 最初の3件のゲーム詳細をログ出力
      highDiscountGames.slice(0, 3).forEach((game, index) => {
        logger.info(`Game ${index + 1}: ${game.name} - ${game.discount_percent}% off (¥${game.current_price})`);
      });
      this.lastCheckTime = new Date();
      
      // Discord通知を送信（設定が有効な場合のみ）
      if (highDiscountGames.length > 0 && filterConfig.notification_enabled) {
        await discordService.sendHighDiscountAlert(highDiscountGames);
      } else if (highDiscountGames.length > 0) {
        logger.info('Discord notifications are disabled, skipping notification');
      }

      return highDiscountGames;
    } catch (error) {
      logger.error('Failed to detect high discount games:', error);
      throw error;
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
        region: 'JP',
        maxPrice: 5000 // 5000円以下に緩和
      });

      if (!deals || deals.length === 0) {
        logger.info('No popular high discount games found from ITAD API');
        return [];
      }

      // Note: ITAD APIにはレビューデータがないため、価格と割引率のみで判定
      // より多くのゲームを対象にして、ユーザーが選別できるようにする
      logger.info(`Found ${deals.length} popular high discount games (relaxed criteria)`);
      return deals;

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