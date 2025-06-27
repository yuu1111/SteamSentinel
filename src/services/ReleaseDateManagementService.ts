import { GameModel } from '../models/Game';
import { PriceHistoryModel } from '../models/PriceHistory';
// AlertModelは現在使用していないため、インポートをコメントアウト
// import { AlertModel } from '../models/Alert';
import { SteamStoreAPI } from '../api/SteamStoreAPI';
import discordService from './DiscordService';
import logger from '../utils/logger';

export interface ReleaseDateInfo {
  steamAppId: number;
  gameName: string;
  releaseDate: Date | null;
  isReleased: boolean;
  daysUntilRelease: number | null;
  lastChecked: Date;
}

export interface UpcomingRelease {
  steamAppId: number;
  gameName: string;
  releaseDate: Date;
  daysUntilRelease: number;
  isWishlisted: boolean;
}

export class ReleaseDateManagementService {
  private steamAPI: SteamStoreAPI;
  private lastCheckTime: Date | null = null;

  constructor() {
    this.steamAPI = new SteamStoreAPI();
  }

  // 未リリースゲームの発売日チェック
  async checkReleaseDates(): Promise<ReleaseDateInfo[]> {
    try {
      logger.info('Checking release dates for unreleased games');

      // 未リリース状態のゲームを取得
      const unreleasedGames = await this.getUnreleasedGames();
      
      if (unreleasedGames.length === 0) {
        logger.info('No unreleased games found');
        return [];
      }

      const releaseDateInfos: ReleaseDateInfo[] = [];

      for (const game of unreleasedGames) {
        try {
          const gameInfo = await this.steamAPI.getGameInfo(game.steam_app_id);
          const releaseDate = this.parseReleaseDate(gameInfo?.release_date);
          
          const info: ReleaseDateInfo = {
            steamAppId: game.steam_app_id,
            gameName: game.name,
            releaseDate,
            isReleased: !gameInfo?.coming_soon,
            daysUntilRelease: releaseDate ? this.calculateDaysUntilRelease(releaseDate) : null,
            lastChecked: new Date()
          };

          releaseDateInfos.push(info);

          // リリース済みに変わった場合の処理
          if (info.isReleased && releaseDate) {
            await this.handleGameReleased(game);
          }

          // API制限を考慮して少し待機
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          logger.error(`Failed to check release date for ${game.name}:`, error);
        }
      }

      this.lastCheckTime = new Date();
      logger.info(`Release date check completed for ${releaseDateInfos.length} games`);
      
      return releaseDateInfos;

    } catch (error) {
      logger.error('Failed to check release dates:', error);
      throw error;
    }
  }

  // 未リリースゲームの取得
  private async getUnreleasedGames(): Promise<Array<{ steam_app_id: number; name: string }>> {
    try {
      // 最新の価格履歴でsource='steam_unreleased'のゲームを取得
      const unreleasedGameIds = PriceHistoryModel.getUnreleasedGames();
      
      const games = [];
      for (const appId of unreleasedGameIds) {
        const game = GameModel.getBySteamAppId(appId);
        if (game && game.enabled) {
          games.push({
            steam_app_id: game.steam_app_id,
            name: game.name
          });
        }
      }

      return games;
    } catch (error) {
      logger.error('Failed to get unreleased games:', error);
      return [];
    }
  }

  // リリース日文字列を解析
  private parseReleaseDate(releaseDateStr?: string): Date | null {
    if (!releaseDateStr) return null;

    try {
      // Steam APIの日付形式を解析
      const patterns = [
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),?\s+(\d{4})/i, // "25 Dec, 2024"
        /(\d{4})-(\d{2})-(\d{2})/, // "2024-12-25"
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i, // "Dec 25, 2024"
        /Q(\d)\s+(\d{4})/i, // "Q4 2024"
        /(\d{4})/  // "2024"
      ];

      const monthMap: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };

      for (const pattern of patterns) {
        const match = releaseDateStr.match(pattern);
        if (match) {
          if (pattern === patterns[0]) { // "25 Dec, 2024"
            const day = parseInt(match[1]);
            const month = monthMap[match[2].toLowerCase()];
            const year = parseInt(match[3]);
            return new Date(year, month, day);
          } else if (pattern === patterns[1]) { // "2024-12-25"
            return new Date(match[0]);
          } else if (pattern === patterns[2]) { // "Dec 25, 2024"
            const month = monthMap[match[1].toLowerCase()];
            const day = parseInt(match[2]);
            const year = parseInt(match[3]);
            return new Date(year, month, day);
          } else if (pattern === patterns[3]) { // "Q4 2024"
            const quarter = parseInt(match[1]);
            const year = parseInt(match[2]);
            const month = (quarter - 1) * 3 + 2; // Q4なら11月(11)
            return new Date(year, month, 1);
          } else if (pattern === patterns[4]) { // "2024"
            const year = parseInt(match[1]);
            return new Date(year, 11, 31); // 年末を仮定
          }
        }
      }

      return null;
    } catch (error) {
      logger.error(`Failed to parse release date: ${releaseDateStr}`, error);
      return null;
    }
  }

  // リリースまでの日数計算
  private calculateDaysUntilRelease(releaseDate: Date): number {
    const now = new Date();
    const timeDiff = releaseDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  }

  // ゲームがリリースされた時の処理
  private async handleGameReleased(game: { steam_app_id: number; name: string }): Promise<void> {
    try {
      logger.info(`Game released detected: ${game.name} (${game.steam_app_id})`);
      
      // リリースアラートを作成（MonitoringServiceで既に実装済み）
      // ここでは追加のDiscord通知やログ出力のみ
      
      // Discord通知を送信
      if (discordService.isEnabled()) {
        const gameObj = GameModel.getBySteamAppId(game.steam_app_id);
        if (gameObj) {
          await discordService.sendPriceAlert(
            gameObj,
            'release',
            0, // 価格は後で更新される
            0,
            0
          );
        }
      }

    } catch (error) {
      logger.error(`Failed to handle game release for ${game.name}:`, error);
    }
  }

  // 近日発売予定のゲーム取得
  async getUpcomingReleases(daysAhead: number = 30): Promise<UpcomingRelease[]> {
    try {
      const releaseDateInfos = await this.checkReleaseDates();
      const upcoming: UpcomingRelease[] = [];

      for (const info of releaseDateInfos) {
        if (info.releaseDate && 
            info.daysUntilRelease !== null && 
            info.daysUntilRelease > 0 && 
            info.daysUntilRelease <= daysAhead) {
          
          upcoming.push({
            steamAppId: info.steamAppId,
            gameName: info.gameName,
            releaseDate: info.releaseDate,
            daysUntilRelease: info.daysUntilRelease,
            isWishlisted: true // 監視中のゲームは全てウィッシュリスト扱い
          });
        }
      }

      // リリース日順でソート
      upcoming.sort((a, b) => a.daysUntilRelease - b.daysUntilRelease);

      return upcoming;
    } catch (error) {
      logger.error('Failed to get upcoming releases:', error);
      return [];
    }
  }

  // 今週発売予定のゲーム通知
  async sendWeeklyReleaseNotification(): Promise<void> {
    try {
      const upcomingReleases = await this.getUpcomingReleases(7);
      
      if (upcomingReleases.length === 0) {
        logger.info('No upcoming releases this week');
        return;
      }

      if (discordService.isEnabled()) {
        // Discord通知のフォーマットを作成
        // const releaseList = upcomingReleases.map(release => ({
        //   title: release.gameName,
        //   description: `${release.daysUntilRelease}日後にリリース予定`,
        //   url: `https://store.steampowered.com/app/${release.steamAppId}/`
        // }));

        // カスタム通知を送信（DiscordServiceに新しいメソッドが必要）
        logger.info(`Found ${upcomingReleases.length} upcoming releases this week`);
      }

    } catch (error) {
      logger.error('Failed to send weekly release notification:', error);
    }
  }

  // リリース日管理の統計情報
  getStatistics(): {
    lastCheckTime: Date | null;
    totalUnreleasedGames: number;
    upcomingThisWeek: number;
    upcomingThisMonth: number;
  } {
    // 統計は非同期処理が必要なため、簡易版を返す
    return {
      lastCheckTime: this.lastCheckTime,
      totalUnreleasedGames: 0, // 実際の実装では計算
      upcomingThisWeek: 0,
      upcomingThisMonth: 0
    };
  }

  // 手動リリース日チェック
  async runManualCheck(): Promise<ReleaseDateInfo[]> {
    logger.info('Manual release date check requested');
    return await this.checkReleaseDates();
  }
}

export default new ReleaseDateManagementService();