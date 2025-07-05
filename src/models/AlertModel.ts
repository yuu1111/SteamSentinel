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
  // アラートを作成（正規化版）
  static create(alertData: {
    steam_app_id: number;
    alert_type: string;
    triggered_price?: number;
    threshold_value?: number;
    discount_percent?: number;
    metadata?: any;
  }): Alert {
    try {
      const db = database.getConnection();
      const stmt = db.prepare(`
        INSERT INTO alerts (
          steam_app_id, alert_type, triggered_price, threshold_value,
          discount_percent, notified_discord, is_read, metadata
        ) VALUES (
          @steam_app_id, @alert_type, @triggered_price, @threshold_value,
          @discount_percent, @notified_discord, @is_read, @metadata
        )
      `);
      
      const metadata = alertData.metadata ? JSON.stringify(alertData.metadata) : null;
      
      const info = stmt.run({
        steam_app_id: alertData.steam_app_id,
        alert_type: alertData.alert_type,
        triggered_price: alertData.triggered_price || null,
        threshold_value: alertData.threshold_value || null,
        discount_percent: alertData.discount_percent || null,
        notified_discord: 0,
        is_read: 0,
        metadata
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
      
      if (!record) return null;
      
      return this.mapRecord(record);
    } catch (error) {
      logger.error(`Failed to fetch alert with id ${id}:`, error);
      throw error;
    }
  }

  // フィルタリング付きアラート取得
  static getFiltered(filters: AlertFilters, pagination: PaginationOptions): Alert[] {
    try {
      const db = database.getConnection();
      let query = 'SELECT * FROM alerts WHERE 1=1';
      const params: any[] = [];

      if (filters.alertType) {
        query += ' AND alert_type = ?';
        params.push(filters.alertType);
      }

      if (filters.unread !== undefined) {
        query += ' AND is_read = ?';
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

      query += ` ORDER BY ${pagination.sort || 'created_at'} ${pagination.order || 'DESC'}`;
      query += ' LIMIT ? OFFSET ?';
      params.push(pagination.limit, pagination.offset);

      const records = db.prepare(query).all(...params) as any[];
      return records.map(record => this.mapRecord(record));
    } catch (error) {
      logger.error('Failed to fetch filtered alerts:', error);
      throw error;
    }
  }

  // アラート数を取得
  static getCount(filters: AlertFilters): number {
    try {
      const db = database.getConnection();
      let query = 'SELECT COUNT(*) as count FROM alerts WHERE 1=1';
      const params: any[] = [];

      if (filters.alertType) {
        query += ' AND alert_type = ?';
        params.push(filters.alertType);
      }

      if (filters.unread !== undefined) {
        query += ' AND is_read = ?';
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
      logger.error('Failed to count alerts:', error);
      throw error;
    }
  }

  // アラートを既読にする
  static markAsRead(id: number): boolean {
    try {
      const db = database.getConnection();
      const info = db.prepare(`
        UPDATE alerts SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(id);
      
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
      let query = 'UPDATE alerts SET is_read = 1, updated_at = CURRENT_TIMESTAMP WHERE is_read = 0';
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
      const params = [cutoffDate.toISOString()];
      
      if (readOnly) {
        query += ' AND is_read = 1';
      }
      
      const info = db.prepare(query).run(...params);
      return info.changes;
    } catch (error) {
      logger.error('Failed to delete old alerts:', error);
      throw error;
    }
  }

  // 統計情報を取得
  static getStatistics(): {
    totalAlerts: number;
    unreadAlerts: number;
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
          SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_alerts,
          SUM(CASE WHEN alert_type = 'new_low' THEN 1 ELSE 0 END) as new_low_alerts,
          SUM(CASE WHEN alert_type = 'sale_start' THEN 1 ELSE 0 END) as sale_start_alerts,
          SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today_alerts,
          SUM(CASE WHEN notified_discord = 1 THEN 1 ELSE 0 END) as notified_count
        FROM alerts
      `).get(today.toISOString()) as any;
      
      return {
        totalAlerts: stats.total_alerts || 0,
        unreadAlerts: stats.unread_alerts || 0,
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

  // 最近のアラートを取得
  static getRecent(limit: number = 5): Alert[] {
    try {
      const db = database.getConnection();
      const records = db.prepare(`
        SELECT * FROM alerts 
        ORDER BY created_at DESC 
        LIMIT ?
      `).all(limit) as any[];
      
      return records.map(record => this.mapRecord(record));
    } catch (error) {
      logger.error('Failed to fetch recent alerts:', error);
      throw error;
    }
  }

  // レコードマッピングヘルパー
  private static mapRecord(record: any): Alert {
    return {
      ...record,
      notified_discord: record.notified_discord === 1,
      is_read: record.is_read === 1,
      created_at: new Date(record.created_at),
      updated_at: record.updated_at ? new Date(record.updated_at) : undefined
    };
  }
}