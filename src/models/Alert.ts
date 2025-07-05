import database from '../db/database';
import { Alert } from '../types';
import logger from '../utils/logger';

export interface AlertFilters {
  alertType?: string;
  unread?: boolean;
  steamAppId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export class AlertModel {
  // アラートを作成
  static create(alertData: any): Alert {
    try {
      const db = database.getConnection();
      const stmt = db.prepare(`
        INSERT INTO alerts (
          steam_app_id, game_id, alert_type, message, trigger_price, 
          previous_low, discount_percent, price_data, game_name, 
          notified_discord, release_date
        ) VALUES (
          @steam_app_id, @game_id, @alert_type, @message, @trigger_price,
          @previous_low, @discount_percent, @price_data, @game_name,
          @notified_discord, @release_date
        )
      `);
      
      const info = stmt.run({
        steam_app_id: alertData.steam_app_id,
        game_id: alertData.game_id || null,
        alert_type: alertData.alert_type,
        message: alertData.message || null,
        trigger_price: alertData.trigger_price || null,
        previous_low: alertData.previous_low || null,
        discount_percent: alertData.discount_percent || null,
        price_data: alertData.price_data || null,
        game_name: alertData.game_name || null,
        notified_discord: alertData.notified_discord ? 1 : 0,
        release_date: alertData.release_date || null
      });
      
      logger.info(`Alert created: ${alertData.alert_type} for game ${alertData.steam_app_id}`);
      return this.getById(info.lastInsertRowid as number)!;
    } catch (error) {
      logger.error('Failed to create alert:', error);
      throw error;
    }
  }

  // ID でアラートを取得
  static getById(id: number): Alert | null {
    try {
      const db = database.getConnection();
      const record = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id) as any;
      
      if (!record) {return null;}
      
      return {
        ...record,
        notified_discord: record.notified_discord === 1,
        is_read: record.is_read === 1,
        created_at: new Date(record.created_at),
        updated_at: record.updated_at ? new Date(record.updated_at) : undefined
      };
    } catch (error) {
      logger.error(`Failed to fetch alert with id ${id}:`, error);
      throw error;
    }
  }

  // ゲームの最新アラートを取得
  static getLatestByGameId(steamAppId: number, alertType?: 'new_low' | 'sale_start' | 'threshold_met' | 'free_game' | 'game_released'): Alert | null {
    try {
      const db = database.getConnection();
      let query = 'SELECT * FROM alerts WHERE steam_app_id = ?';
      const params: any[] = [steamAppId];
      
      if (alertType) {
        query += ' AND alert_type = ?';
        params.push(alertType);
      }
      
      query += ' ORDER BY created_at DESC LIMIT 1';
      
      const record = db.prepare(query).get(...params) as any;
      
      if (!record) {return null;}
      
      return {
        ...record,
        notified_discord: record.notified_discord === 1,
        is_read: record.is_read === 1,
        created_at: new Date(record.created_at),
        updated_at: record.updated_at ? new Date(record.updated_at) : undefined
      };
    } catch (error) {
      logger.error(`Failed to fetch latest alert for game ${steamAppId}:`, error);
      throw error;
    }
  }

  // アラート履歴を取得
  static getHistory(limit: number = 50, offset: number = 0): Alert[] {
    try {
      const db = database.getConnection();
      const records = db.prepare(`
        SELECT a.*, g.name as game_name
        FROM alerts a
        JOIN games g ON a.steam_app_id = g.steam_app_id
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset) as any[];
      
      return records.map(record => ({
        ...record,
        notified_discord: record.notified_discord === 1,
        created_at: new Date(record.created_at)
      }));
    } catch (error) {
      logger.error('Failed to fetch alert history:', error);
      throw error;
    }
  }

  // フィルタ付きアラート履歴を取得
  static getHistoryFiltered(filter: string, limit: number = 50, offset: number = 0): Alert[] {
    try {
      const db = database.getConnection();
      let query = `
        SELECT a.*, g.name as game_name
        FROM alerts a
        JOIN games g ON a.steam_app_id = g.steam_app_id
      `;
      const params: any[] = [];

      if (filter !== 'all') {
        query += ' WHERE a.alert_type = ?';
        params.push(filter);
      }

      query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const records = db.prepare(query).all(...params) as any[];
      
      return records.map(record => ({
        ...record,
        notified_discord: record.notified_discord === 1,
        created_at: new Date(record.created_at)
      }));
    } catch (error) {
      logger.error('Failed to fetch filtered alert history:', error);
      throw error;
    }
  }

  // フィルタ付きアラート総数を取得
  static getFilteredCount(filter: string): number {
    try {
      const db = database.getConnection();
      let query = 'SELECT COUNT(*) as count FROM alerts';
      const params: any[] = [];

      if (filter !== 'all') {
        query += ' WHERE alert_type = ?';
        params.push(filter);
      }

      const result = db.prepare(query).get(...params) as { count: number };
      return result.count;
    } catch (error) {
      logger.error('Failed to get filtered alert count:', error);
      throw error;
    }
  }

  // ゲーム別のアラート履歴を取得
  static getByGameId(steamAppId: number, limit: number = 20): Alert[] {
    try {
      const db = database.getConnection();
      const records = db.prepare(`
        SELECT * FROM alerts 
        WHERE steam_app_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(steamAppId, limit) as any[];
      
      return records.map(record => ({
        ...record,
        notified_discord: record.notified_discord === 1,
        created_at: new Date(record.created_at)
      }));
    } catch (error) {
      logger.error(`Failed to fetch alerts for game ${steamAppId}:`, error);
      throw error;
    }
  }

  // クールダウンチェック（同じアラートの連続送信を防ぐ）
  static isInCooldown(steamAppId: number, alertType: 'new_low' | 'sale_start' | 'threshold_met' | 'free_game' | 'game_released', cooldownHours: number): boolean {
    try {
      const db = database.getConnection();
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - cooldownHours);
      
      const record = db.prepare(`
        SELECT COUNT(*) as count FROM alerts
        WHERE steam_app_id = ?
          AND alert_type = ?
          AND created_at > ?
      `).get(steamAppId, alertType, cutoffTime.toISOString()) as { count: number };
      
      return record.count > 0;
    } catch (error) {
      logger.error('Failed to check cooldown:', error);
      return true; // エラーの場合は安全側に倒してクールダウン中とする
    }
  }

  // Discord通知済みフラグを更新
  static markAsNotified(id: number): boolean {
    try {
      const db = database.getConnection();
      const info = db.prepare(`
        UPDATE alerts SET notified_discord = 1 WHERE id = ?
      `).run(id);
      
      return info.changes > 0;
    } catch (error) {
      logger.error(`Failed to mark alert ${id} as notified:`, error);
      throw error;
    }
  }

  // 統計情報を取得
  static getStatistics(): {
    totalAlerts: number;
    newLowAlerts: number;
    saleStartAlerts: number;
    todayAlerts: number;
    notifiedCount: number;
  } {
    try {
      const db = database.getConnection();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total_alerts,
          SUM(CASE WHEN alert_type = 'new_low' THEN 1 ELSE 0 END) as new_low_alerts,
          SUM(CASE WHEN alert_type = 'sale_start' THEN 1 ELSE 0 END) as sale_start_alerts,
          SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today_alerts,
          SUM(CASE WHEN notified_discord = 1 THEN 1 ELSE 0 END) as notified_count
        FROM alerts
      `).get(today.toISOString()) as any;
      
      return {
        totalAlerts: stats.total_alerts || 0,
        newLowAlerts: stats.new_low_alerts || 0,
        saleStartAlerts: stats.sale_start_alerts || 0,
        todayAlerts: stats.today_alerts || 0,
        notifiedCount: stats.notified_count || 0
      };
    } catch (error) {
      logger.error('Failed to fetch alert statistics:', error);
      throw error;
    }
  }

  // 最新のアラートを取得（ダッシュボード用）
  static getRecent(limit: number = 10): Array<{
    id: number;
    steam_app_id: number;
    game_name: string;
    alert_type: 'new_low' | 'sale_start' | 'threshold_met' | 'free_game' | 'game_released';
    trigger_price: number;
    discount_percent: number;
    created_at: Date;
  }> {
    try {
      const db = database.getConnection();
      const records = db.prepare(`
        SELECT 
          a.id,
          a.steam_app_id,
          g.name as game_name,
          a.alert_type,
          a.trigger_price,
          a.discount_percent,
          a.created_at
        FROM alerts a
        JOIN games g ON a.steam_app_id = g.steam_app_id
        ORDER BY a.created_at DESC
        LIMIT ?
      `).all(limit) as any[];
      
      return records.map(record => ({
        ...record,
        created_at: new Date(record.created_at)
      }));
    } catch (error) {
      logger.error('Failed to fetch recent alerts:', error);
      throw error;
    }
  }

  // 日付範囲でアラートを取得（出費追跡用）
  static getByDateRange(startDate: Date, endDate: Date): Alert[] {
    try {
      const db = database.getConnection();
      const records = db.prepare(`
        SELECT a.*, g.name as game_name
        FROM alerts a
        JOIN games g ON a.steam_app_id = g.steam_app_id
        WHERE a.created_at BETWEEN ? AND ?
        ORDER BY a.created_at DESC
      `).all(startDate.toISOString(), endDate.toISOString()) as any[];
      
      return records.map(record => ({
        ...record,
        notified_discord: record.notified_discord === 1,
        created_at: new Date(record.created_at)
      }));
    } catch (error) {
      logger.error('Failed to fetch alerts by date range:', error);
      throw error;
    }
  }

  // フィルタ付きアラート取得（新しいController用）
  static getFiltered(filters: AlertFilters, pagination: PaginationOptions): Alert[] {
    try {
      const db = database.getConnection();
      let query = 'SELECT * FROM alerts WHERE 1=1';
      const params: any[] = [];

      // フィルタ条件の構築
      if (filters.alertType) {
        query += ' AND alert_type = ?';
        params.push(filters.alertType);
      }

      if (filters.unread !== undefined) {
        // is_readフィールドがない場合はnotified_discordを使用
        query += ' AND notified_discord = ?';
        params.push(filters.unread ? 0 : 1);
      }

      if (filters.steamAppId) {
        query += ' AND steam_app_id = ?';
        params.push(filters.steamAppId);
      }

      if (filters.dateFrom) {
        query += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }

      // ソート順
      const sortField = pagination.sort || 'created_at';
      const sortOrder = pagination.order || 'DESC';
      query += ` ORDER BY ${sortField} ${sortOrder}`;

      // ページネーション
      query += ' LIMIT ? OFFSET ?';
      params.push(pagination.limit, pagination.offset);

      const records = db.prepare(query).all(...params) as any[];
      
      return records.map(record => ({
        ...record,
        notified_discord: record.notified_discord === 1,
        created_at: new Date(record.created_at)
      }));
    } catch (error) {
      logger.error('Failed to fetch filtered alerts:', error);
      throw error;
    }
  }

  // フィルタ付きアラート数取得
  static getCount(filters: AlertFilters): number {
    try {
      const db = database.getConnection();
      let query = 'SELECT COUNT(*) as count FROM alerts WHERE 1=1';
      const params: any[] = [];

      // フィルタ条件の構築（getFilteredと同じ）
      if (filters.alertType) {
        query += ' AND alert_type = ?';
        params.push(filters.alertType);
      }

      if (filters.unread !== undefined) {
        query += ' AND notified_discord = ?';
        params.push(filters.unread ? 0 : 1);
      }

      if (filters.steamAppId) {
        query += ' AND steam_app_id = ?';
        params.push(filters.steamAppId);
      }

      if (filters.dateFrom) {
        query += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }

      const result = db.prepare(query).get(...params) as { count: number };
      return result.count;
    } catch (error) {
      logger.error('Failed to get filtered alert count:', error);
      throw error;
    }
  }

  // アラートを既読にする
  static markAsRead(id: number): boolean {
    try {
      const db = database.getConnection();
      // notified_discordフィールドを使用（is_readフィールドがないため）
      const info = db.prepare('UPDATE alerts SET notified_discord = 1 WHERE id = ?').run(id);
      return info.changes > 0;
    } catch (error) {
      logger.error(`Failed to mark alert ${id} as read:`, error);
      throw error;
    }
  }

  // 複数アラートを既読にする
  static markMultipleAsRead(filters: AlertFilters): number {
    try {
      const db = database.getConnection();
      let query = 'UPDATE alerts SET notified_discord = 1 WHERE notified_discord = 0';
      const params: any[] = [];

      if (filters.alertType) {
        query += ' AND alert_type = ?';
        params.push(filters.alertType);
      }

      if (filters.steamAppId) {
        query += ' AND steam_app_id = ?';
        params.push(filters.steamAppId);
      }

      const info = db.prepare(query).run(...params);
      return info.changes;
    } catch (error) {
      logger.error('Failed to mark multiple alerts as read:', error);
      throw error;
    }
  }

  // アラートを削除
  static delete(id: number): boolean {
    try {
      const db = database.getConnection();
      const info = db.prepare('DELETE FROM alerts WHERE id = ?').run(id);
      return info.changes > 0;
    } catch (error) {
      logger.error(`Failed to delete alert ${id}:`, error);
      throw error;
    }
  }

  // 古いアラートを削除
  static deleteOlderThan(days: number, readOnly: boolean = false): number {
    try {
      const db = database.getConnection();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = 'DELETE FROM alerts WHERE created_at < ?';
      const params: any[] = [cutoffDate.toISOString()];

      if (readOnly) {
        query += ' AND notified_discord = 1';
      }

      const info = db.prepare(query).run(...params);
      return info.changes;
    } catch (error) {
      logger.error('Failed to delete old alerts:', error);
      throw error;
    }
  }
}