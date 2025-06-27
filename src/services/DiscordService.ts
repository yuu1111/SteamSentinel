// configは現在使用していないため、インポートをコメントアウト
// import { config } from '../config';
import logger from '../utils/logger';
import { Game } from '../types';

export interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  thumbnail?: {
    url: string;
  };
  footer?: {
    text: string;
  };
  timestamp?: string;
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

export class DiscordService {
  private webhookUrl: string | null;

  constructor() {
    this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || null;
  }

  // Discord通知が有効かどうか
  isEnabled(): boolean {
    return this.webhookUrl !== null && this.webhookUrl.length > 0;
  }

  // 価格アラート通知
  async sendPriceAlert(
    game: Game,
    alertType: 'new_low' | 'sale_start' | 'release',
    currentPrice: number,
    originalPrice?: number,
    discountPercent?: number,
    previousLow?: number
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      logger.warn('Discord webhook not configured, skipping notification');
      return false;
    }

    try {
      const embed = this.createPriceAlertEmbed(
        game,
        alertType,
        currentPrice,
        originalPrice,
        discountPercent,
        previousLow
      );

      const message: DiscordMessage = {
        embeds: [embed]
      };

      return await this.sendMessage(message);
    } catch (error) {
      logger.error('Failed to send Discord price alert:', error);
      return false;
    }
  }

  // 高割引ゲーム通知
  async sendHighDiscountAlert(games: Array<{
    name: string;
    steam_app_id: number;
    current_price: number;
    original_price: number;
    discount_percent: number;
  }>): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const embed = this.createHighDiscountEmbed(games);
      const message: DiscordMessage = {
        embeds: [embed]
      };

      return await this.sendMessage(message);
    } catch (error) {
      logger.error('Failed to send Discord high discount alert:', error);
      return false;
    }
  }

  // Epic Games無料ゲーム通知
  async sendEpicFreeGameAlert(games: Array<{
    title: string;
    description?: string;
    url?: string;
    image?: string;
  }>): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      const embed = this.createEpicFreeGameEmbed(games);
      const message: DiscordMessage = {
        embeds: [embed]
      };

      return await this.sendMessage(message);
    } catch (error) {
      logger.error('Failed to send Discord Epic free game alert:', error);
      return false;
    }
  }

  // メッセージ送信（共通処理）
  private async sendMessage(message: DiscordMessage): Promise<boolean> {
    if (!this.webhookUrl) {
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        logger.error(`Discord webhook failed: ${response.status} ${response.statusText}`);
        return false;
      }

      logger.info('Discord notification sent successfully');
      return true;
    } catch (error) {
      logger.error('Failed to send Discord message:', error);
      return false;
    }
  }

  // 価格アラート用Embed作成
  private createPriceAlertEmbed(
    game: Game,
    alertType: 'new_low' | 'sale_start' | 'release',
    currentPrice: number,
    originalPrice?: number,
    discountPercent?: number,
    previousLow?: number
  ): DiscordEmbed {
    const steamUrl = `https://store.steampowered.com/app/${game.steam_app_id}/`;
    const thumbnailUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${game.steam_app_id}/header.jpg`;

    let title: string;
    let color: number;
    let description: string;

    switch (alertType) {
      case 'new_low':
        title = '🔥 新最安値を検知！';
        color = 0xFF4444; // 赤
        description = `**${game.name}** が過去最安値を更新しました！`;
        break;
      case 'sale_start':
        title = '💰 セール開始！';
        color = 0x44FF44; // 緑
        description = `**${game.name}** がセールを開始しました！`;
        break;
      case 'release':
        title = '🚀 ゲームリリース！';
        color = 0x4444FF; // 青
        description = `**${game.name}** がリリースされました！`;
        break;
    }

    const fields: DiscordEmbed['fields'] = [
      {
        name: '💴 現在価格',
        value: currentPrice > 0 ? `¥${currentPrice.toLocaleString()}` : '無料',
        inline: true
      }
    ];

    if (originalPrice && originalPrice > 0 && originalPrice !== currentPrice) {
      fields.push({
        name: '💸 元価格',
        value: `¥${originalPrice.toLocaleString()}`,
        inline: true
      });
    }

    if (discountPercent && discountPercent > 0) {
      fields.push({
        name: '🏷️ 割引率',
        value: `${discountPercent}% OFF`,
        inline: true
      });
    }

    if (previousLow && previousLow > 0 && alertType === 'new_low') {
      fields.push({
        name: '📉 前回最安値',
        value: `¥${previousLow.toLocaleString()}`,
        inline: true
      });
    }

    // アラート条件表示
    if (game.price_threshold_type) {
      let conditionText = '';
      switch (game.price_threshold_type) {
        case 'price':
          if (game.price_threshold) {
            conditionText = `¥${game.price_threshold.toLocaleString()}以下で通知`;
          }
          break;
        case 'discount':
          if (game.discount_threshold_percent) {
            conditionText = `${game.discount_threshold_percent}%以上割引で通知`;
          }
          break;
        case 'any_sale':
          conditionText = 'セール開始で通知';
          break;
      }

      if (conditionText) {
        fields.push({
          name: '⚙️ アラート条件',
          value: conditionText,
          inline: false
        });
      }
    }

    return {
      title,
      description,
      url: steamUrl,
      color,
      fields,
      thumbnail: {
        url: thumbnailUrl
      },
      footer: {
        text: 'SteamSentinel - Steam価格監視システム'
      },
      timestamp: new Date().toISOString()
    };
  }

  // 高割引ゲーム用Embed作成
  private createHighDiscountEmbed(games: Array<{
    name: string;
    steam_app_id: number;
    current_price: number;
    original_price: number;
    discount_percent: number;
  }>): DiscordEmbed {
    const title = '🔥 高割引ゲーム発見！';
    const description = `80%以上の大幅割引ゲームを発見しました！（${games.length}件）`;

    const fields = games.slice(0, 10).map(game => ({
      name: game.name,
      value: `~~¥${game.original_price.toLocaleString()}~~ → **¥${game.current_price.toLocaleString()}** (${game.discount_percent}% OFF)\n[Steamで見る](https://store.steampowered.com/app/${game.steam_app_id}/)`,
      inline: false
    }));

    if (games.length > 10) {
      fields.push({
        name: '📝 その他',
        value: `他にも${games.length - 10}件の高割引ゲームがあります`,
        inline: false
      });
    }

    return {
      title,
      description,
      color: 0xFF6600, // オレンジ
      fields,
      footer: {
        text: 'SteamSentinel - 高割引ゲーム検知'
      },
      timestamp: new Date().toISOString()
    };
  }

  // Epic無料ゲーム用Embed作成
  private createEpicFreeGameEmbed(games: Array<{
    title: string;
    description?: string;
    url?: string;
    image?: string;
  }>): DiscordEmbed {
    const title = '🎁 Epic Games無料ゲーム情報';
    const description = `新しい無料ゲームが利用可能です！（${games.length}件）`;

    const fields = games.slice(0, 5).map(game => ({
      name: game.title,
      value: `${game.description || 'Epic Gamesストアで無料配布中'}\n${game.url ? `[Epic Gamesで受け取る](${game.url})` : ''}`,
      inline: false
    }));

    return {
      title,
      description,
      color: 0x000000, // Epic Gamesブランドカラー（黒）
      fields,
      thumbnail: games[0]?.image ? { url: games[0].image } : undefined,
      footer: {
        text: 'SteamSentinel - Epic Games無料ゲーム監視'
      },
      timestamp: new Date().toISOString()
    };
  }
}

export default new DiscordService();