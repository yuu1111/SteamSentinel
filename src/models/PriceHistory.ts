import database from '../db/database';
import { PriceHistory } from '../types';
import logger from '../utils/logger';

export class PriceHistoryModel {
  // 価格履歴を追加
  static create(priceData: Omit<PriceHistory, 'id'>): PriceHistory {
    try {
      const db = database.getConnection();
      const stmt = db.prepare(`
        INSERT INTO price_history (
          steam_app_id, current_price, original_price, 
          discount_percent, historical_low, is_on_sale, source, release_date
        ) VALUES (
          @steam_app_id, @current_price, @original_price,
          @discount_percent, @historical_low, @is_on_sale, @source, @release_date
        )
      `);
      
      const info = stmt.run({
        steam_app_id: priceData.steam_app_id,
        current_price: priceData.current_price,
        original_price: priceData.original_price,
        discount_percent: priceData.discount_percent,
        historical_low: priceData.historical_low,
        is_on_sale: priceData.is_on_sale ? 1 : 0,
        source: priceData.source,
        release_date: priceData.release_date || null
      });
      
      return this.getById(info.lastInsertRowid as number)!;
    } catch (error) {
      logger.error('Failed to create price history:', error);
      throw error;
    }
  }

  // ID で価格履歴を取得
  static getById(id: number): PriceHistory | null {
    try {
      const db = database.getConnection();
      const record = db.prepare('SELECT * FROM price_history WHERE id = ?').get(id) as any;
      
      if (!record) {return null;}
      
      return {
        ...record,
        is_on_sale: record.is_on_sale === 1,
        recorded_at: new Date(record.recorded_at)
      };
    } catch (error) {
      logger.error(`Failed to fetch price history with id ${id}:`, error);
      throw error;
    }
  }

  // ゲームの最新価格を取得
  static getLatestByGameId(steamAppId: number): PriceHistory | null {
    try {
      const db = database.getConnection();
      const record = db.prepare(`
        SELECT * FROM price_history 
        WHERE steam_app_id = ? 
        ORDER BY recorded_at DESC 
        LIMIT 1
      `).get(steamAppId) as any;
      
      if (!record) {return null;}
      
      return {
        ...record,
        is_on_sale: record.is_on_sale === 1,
        recorded_at: new Date(record.recorded_at)
      };
    } catch (error) {
      logger.error(`Failed to fetch latest price for game ${steamAppId}:`, error);
      throw error;
    }
  }

  // ゲームの価格履歴を取得（期間指定可能）
  static getByGameId(
    steamAppId: number, 
    limit: number = 100,
    fromDate?: Date,
    toDate?: Date
  ): PriceHistory[] {
    try {
      const db = database.getConnection();
      let query = 'SELECT * FROM price_history WHERE steam_app_id = ?';
      const params: any[] = [steamAppId];
      
      if (fromDate) {
        query += ' AND recorded_at >= ?';
        params.push(fromDate.toISOString());
      }
      
      if (toDate) {
        query += ' AND recorded_at <= ?';
        params.push(toDate.toISOString());
      }
      
      query += ' ORDER BY recorded_at DESC LIMIT ?';
      params.push(limit);
      
      const records = db.prepare(query).all(...params) as any[];
      
      return records.map(record => ({
        ...record,
        is_on_sale: record.is_on_sale === 1,
        recorded_at: new Date(record.recorded_at)
      }));
    } catch (error) {
      logger.error(`Failed to fetch price history for game ${steamAppId}:`, error);
      throw error;
    }
  }

  // ゲームの歴代最安値を取得
  static getHistoricalLow(steamAppId: number): number | null {
    try {
      const db = database.getConnection();
      const result = db.prepare(`
        SELECT MIN(current_price) as lowest_price 
        FROM price_history 
        WHERE steam_app_id = ? AND current_price > 0
      `).get(steamAppId) as { lowest_price: number | null };
      
      return result.lowest_price;
    } catch (error) {
      logger.error(`Failed to fetch historical low for game ${steamAppId}:`, error);
      throw error;
    }
  }

  // グラフ用のデータを取得（集約済み）
  static getChartData(steamAppId: number, days: number = 30): Array<{ date: string; price: number }> {
    try {
      const db = database.getConnection();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      // 1日1データポイントに集約
      const records = db.prepare(`
        SELECT 
          DATE(recorded_at) as date,
          MIN(current_price) as price
        FROM price_history
        WHERE steam_app_id = ? AND recorded_at >= ?
        GROUP BY DATE(recorded_at)
        ORDER BY date ASC
      `).all(steamAppId, fromDate.toISOString()) as Array<{ date: string; price: number }>;
      
      return records;
    } catch (error) {
      logger.error(`Failed to fetch chart data for game ${steamAppId}:`, error);
      throw error;
    }
  }

  // 最近の価格変更を取得
  static getRecentPriceChanges(limit: number = 10): Array<{
    steam_app_id: number;
    game_name: string;
    old_price: number;
    new_price: number;
    discount_percent: number;
    changed_at: Date;
  }> {
    try {
      const db = database.getConnection();
      const records = db.prepare(`
        WITH RankedPrices AS (
          SELECT 
            ph.*,
            g.name as game_name,
            LAG(ph.current_price) OVER (PARTITION BY ph.steam_app_id ORDER BY ph.recorded_at) as prev_price,
            ROW_NUMBER() OVER (PARTITION BY ph.steam_app_id ORDER BY ph.recorded_at DESC) as rn
          FROM price_history ph
          JOIN games g ON ph.steam_app_id = g.steam_app_id
        )
        SELECT 
          steam_app_id,
          game_name,
          prev_price as old_price,
          current_price as new_price,
          discount_percent,
          recorded_at as changed_at
        FROM RankedPrices
        WHERE prev_price IS NOT NULL 
          AND prev_price != current_price
          AND rn = 1
        ORDER BY recorded_at DESC
        LIMIT ?
      `).all(limit) as any[];
      
      return records.map(record => ({
        ...record,
        changed_at: new Date(record.changed_at)
      }));
    } catch (error) {
      logger.error('Failed to fetch recent price changes:', error);
      throw error;
    }
  }

  // 統計情報を取得
  static getStatistics(): {
    totalRecords: number;
    gamesTracked: number;
    averageDiscount: number;
    gamesOnSale: number;
  } {
    try {
      const db = database.getConnection();
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT steam_app_id) as games_tracked,
          AVG(CASE WHEN discount_percent > 0 THEN discount_percent ELSE NULL END) as avg_discount,
          COUNT(DISTINCT CASE WHEN is_on_sale = 1 THEN steam_app_id ELSE NULL END) as games_on_sale
        FROM price_history
        WHERE id IN (
          SELECT MAX(id) FROM price_history GROUP BY steam_app_id
        )
      `).get() as any;
      
      return {
        totalRecords: stats.total_records || 0,
        gamesTracked: stats.games_tracked || 0,
        averageDiscount: Math.round(stats.avg_discount || 0),
        gamesOnSale: stats.games_on_sale || 0
      };
    } catch (error) {
      logger.error('Failed to fetch statistics:', error);
      throw error;
    }
  }

  // 未リリースゲームのSteam App IDを取得
  static getUnreleasedGames(): number[] {
    try {
      const db = database.getConnection();
      const records = db.prepare(`
        SELECT DISTINCT steam_app_id
        FROM price_history
        WHERE source = 'steam_unreleased'
          AND id IN (
            SELECT MAX(id) FROM price_history GROUP BY steam_app_id
          )
      `).all() as Array<{ steam_app_id: number }>;
      
      return records.map(record => record.steam_app_id);
    } catch (error) {
      logger.error('Failed to fetch unreleased games:', error);
      throw error;
    }
  }

  // ゲームの価格履歴を削除
  static deleteByGameId(steamAppId: number): boolean {
    try {
      const db = database.getConnection();
      const info = db.prepare('DELETE FROM price_history WHERE steam_app_id = ?').run(steamAppId);
      return info.changes > 0;
    } catch (error) {
      logger.error(`Failed to delete price history for game ${steamAppId}:`, error);
      throw error;
    }
  }
}