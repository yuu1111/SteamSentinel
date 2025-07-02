import logger from '../utils/logger';
import { FreeGamesRSSService } from './FreeGamesRSSService';
import { EpicGamesModel } from '../models/EpicGamesModel';

export class EpicGamesNotificationService {
  private static instance: EpicGamesNotificationService;
  private freeGamesRSSService = FreeGamesRSSService.getInstance();
  private epicGamesModel = new EpicGamesModel();

  private constructor() {}

  public static getInstance(): EpicGamesNotificationService {
    if (!EpicGamesNotificationService.instance) {
      EpicGamesNotificationService.instance = new EpicGamesNotificationService();
    }
    return EpicGamesNotificationService.instance;
  }

  public async initialize(): Promise<void> {
    logger.info('Epic Gamesサービス初期化中...');
    // RSSサービスが全ての無料ゲームを処理するため、ここでは初期化のみ
  }

  public stop(): void {
    // RSSサービスの停止はFreeGamesRSSServiceで管理
    logger.info('Epic Gamesサービス停止');
  }

  // 手動チェック（管理画面から呼ばれる）
  public async manualCheck(): Promise<number> {
    const result = await this.freeGamesRSSService.manualCheck();
    return result.epicCount;
  }

  // 現在の無料ゲームを取得
  public async getCurrentFreeGames() {
    return this.epicGamesModel.getCurrentGames();
  }

  // ゲームをクレーム済みにマーク
  public async markAsClaimed(id: number): Promise<void> {
    this.epicGamesModel.markAsClaimed(id);
  }

  // ゲームを未クレームにマーク
  public async markAsUnclaimed(id: number): Promise<void> {
    this.epicGamesModel.markAsUnclaimed(id);
  }

  // 統計情報を取得
  public async getStats() {
    return this.epicGamesModel.getStats();
  }

  // 古いゲームをクリーンアップ
  // TODO: cleanupExpiredGames メソッドが未実装のため、一時的に無効化
  public async cleanupOldGames(): Promise<void> {
    // const deletedCount = await this.epicGamesModel.deleteOldUnclaimed();
    // if (deletedCount > 0) {
    //   logger.info(`${deletedCount}件の古い未クレームゲームを削除しました`);
    // }
    logger.warn('cleanupOldGames: 機能が未実装です');
  }
}

export default EpicGamesNotificationService.getInstance();