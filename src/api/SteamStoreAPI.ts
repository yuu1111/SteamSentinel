import { BaseAPI } from './BaseAPI';
import { SteamPriceInfo } from '../types';
import logger from '../utils/logger';

export class SteamStoreAPI extends BaseAPI {
  // private readonly currency = 'JPY'; // Currently unused but may be needed for future API calls
  private readonly countryCode = 'JP';

  constructor() {
    // Steam Store APIはレート制限が厳しいため、3秒間隔に設定
    super('Steam', 'https://store.steampowered.com', 3000);
  }

  // 単一ゲームの価格情報取得
  async getAppDetails(appId: number): Promise<SteamPriceInfo | null> {
    try {
      const response = await this.get<any>('/api/appdetails', {
        params: {
          appids: appId,
          cc: this.countryCode,
          l: 'japanese',
          filters: 'price_overview'
        }
      });

      if (response?.[appId]) {
        const appData = response[appId];
        
        if (appData.success && appData.data) {
          return {
            success: true,
            data: {
              price_overview: appData.data.price_overview
            }
          };
        }
      }

      return {
        success: false
      };
    } catch (error) {
      logger.error(`Failed to get Steam app details for ${appId}:`, error);
      return null;
    }
  }

  // 複数ゲームの価格情報を取得（バッチ処理）
  async getMultipleAppDetails(appIds: number[]): Promise<Map<number, SteamPriceInfo | null>> {
    const priceMap = new Map<number, SteamPriceInfo | null>();
    
    // Steam APIは一度に1つのアプリしか処理できないため、順次処理
    for (const appId of appIds) {
      try {
        const priceInfo = await this.getAppDetails(appId);
        priceMap.set(appId, priceInfo);
      } catch (error) {
        logger.error(`Failed to get price for app ${appId}:`, error);
        priceMap.set(appId, null);
      }
    }

    return priceMap;
  }

  // 価格を円に変換（Steam APIは分単位で返すため）
  private convertPriceToYen(priceInCents: number): number {
    return priceInCents / 100;
  }

  // フォーマット済み価格情報の取得
  async getFormattedPriceInfo(appId: number): Promise<{
    currentPrice: number;
    originalPrice: number;
    discountPercent: number;
    isOnSale: boolean;
    formatted: {
      current: string;
      original: string;
    };
  } | null> {
    try {
      const priceInfo = await this.getAppDetails(appId);
      
      if (!priceInfo?.success || !priceInfo.data?.price_overview) {
        return null;
      }

      const priceOverview = priceInfo.data.price_overview;
      
      return {
        currentPrice: this.convertPriceToYen(priceOverview.final),
        originalPrice: this.convertPriceToYen(priceOverview.initial),
        discountPercent: priceOverview.discount_percent,
        isOnSale: priceOverview.discount_percent > 0,
        formatted: {
          current: priceOverview.final_formatted,
          original: priceOverview.initial_formatted
        }
      };
    } catch (error) {
      logger.error(`Failed to get formatted price for ${appId}:`, error);
      return null;
    }
  }

  // ゲームの基本情報取得（名前、画像など - 将来の拡張用）
  async getAppInfo(appId: number): Promise<{
    name: string;
    headerImage: string;
    capsuleImage: string;
    type: string;
  } | null> {
    try {
      const response = await this.get<any>('/api/appdetails', {
        params: {
          appids: appId,
          cc: this.countryCode,
          l: 'japanese'
        }
      });

      if (response?.[appId]?.success && response[appId].data) {
        const data = response[appId].data;
        
        return {
          name: data.name,
          headerImage: data.header_image,
          capsuleImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_231x87.jpg`,
          type: data.type
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to get app info for ${appId}:`, error);
      return null;
    }
  }

  // ヘルスチェック
  async healthCheck(): Promise<boolean> {
    try {
      // 人気ゲーム（CS2）でテスト
      const response = await this.getAppDetails(730);
      return response !== null && response.success !== undefined;
    } catch (error) {
      logger.error('Steam API health check failed:', error);
      return false;
    }
  }

  // ゲームが存在するかチェック
  async isValidAppId(appId: number): Promise<boolean> {
    try {
      const response = await this.get<any>('/api/appdetails', {
        params: {
          appids: appId
        }
      });

      return response?.[appId]?.success === true;
    } catch (error) {
      logger.error(`Failed to validate app ID ${appId}:`, error);
      return false;
    }
  }
}