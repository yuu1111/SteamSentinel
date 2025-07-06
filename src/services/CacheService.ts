import logger from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * シンプルなインメモリキャッシュサービス
 * 将来的にRedisなどに置き換え可能な設計
 */
export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // 5分ごとに期限切れのエントリをクリーンアップ
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * キャッシュにデータを保存
   * @param key キャッシュキー
   * @param data 保存するデータ
   * @param ttl TTL（秒）。デフォルトは5分
   */
  set<T>(key: string, data: T, ttl: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000 // ミリ秒に変換
    });
  }

  /**
   * キャッシュからデータを取得
   * @param key キャッシュキー
   * @returns データまたはnull（存在しないか期限切れの場合）
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * キャッシュから特定のキーを削除
   * @param key キャッシュキー
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * パターンに一致するキーをすべて削除
   * @param pattern 正規表現パターン
   */
  deletePattern(pattern: RegExp): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュ統計を取得
   */
  getStats(): {
    size: number;
    keys: string[];
    memorySizeEstimate: number;
  } {
    const keys = Array.from(this.cache.keys());
    // 簡易的なメモリサイズ推定（正確ではない）
    const memorySizeEstimate = JSON.stringify(Array.from(this.cache.entries())).length;

    return {
      size: this.cache.size,
      keys,
      memorySizeEstimate
    };
  }

  /**
   * 期限切れのエントリをクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * サービスを停止（アプリケーション終了時に呼ぶ）
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// キャッシュキー生成ヘルパー
export const CacheKeys = {
  // ゲーム関連
  game: (id: number) => `game:${id}`,
  gameBySteamId: (steamAppId: number) => `game:steam:${steamAppId}`,
  gameList: (params: string) => `games:list:${params}`,
  
  // 価格関連
  latestPrice: (steamAppId: number) => `price:latest:${steamAppId}`,
  priceHistory: (steamAppId: number, days: number) => `price:history:${steamAppId}:${days}`,
  priceStatistics: () => `price:statistics`,
  
  // レビュー関連
  reviews: (steamAppId: number) => `reviews:${steamAppId}`,
  
  // アラート関連
  alertCount: (filters: string) => `alerts:count:${filters}`,
  
  // システム関連
  systemStatus: () => `system:status`,
  databaseStats: () => `database:stats`,
};

// デコレーター: メソッドの結果をキャッシュ
export function Cacheable(keyGenerator: (...args: any[]) => string, ttl: number = 300) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = CacheService.getInstance();
      const key = keyGenerator(...args);
      
      // キャッシュチェック
      const cached = cache.get(key);
      if (cached !== null) {
        logger.debug(`Cache hit for key: ${key}`);
        return cached;
      }

      // キャッシュミス - メソッドを実行
      logger.debug(`Cache miss for key: ${key}`);
      const result = await method.apply(this, args);
      
      // 結果をキャッシュ
      if (result !== null && result !== undefined) {
        cache.set(key, result, ttl);
      }
      
      return result;
    };

    return descriptor;
  };
}

// デフォルトインスタンスをエクスポート
export default CacheService.getInstance();