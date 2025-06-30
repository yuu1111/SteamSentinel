import Database from 'better-sqlite3';
import logger from '../utils/logger';
import database from '../db/database';

export interface ITADSetting {
  id: number;
  name: string;
  value: string;
  description: string;
  category: string;
  updated_at: string;
}

export interface ITADFilterConfig {
  min_discount: number;
  max_price: number;
  limit: number;
  region: string;
  enabled: boolean;
  notification_enabled: boolean;
}

export class ITADSettingsModel {
  private getDb(): Database.Database {
    return database.getConnection();
  }

  // 全設定取得
  getAllSettings(): ITADSetting[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare('SELECT * FROM itad_settings ORDER BY category, name');
      return stmt.all() as ITADSetting[];
    } catch (error) {
      logger.error('Failed to get ITAD settings:', error);
      throw error;
    }
  }

  // 特定設定取得
  getSetting(name: string): ITADSetting | null {
    try {
      const db = this.getDb();
      const stmt = db.prepare('SELECT * FROM itad_settings WHERE name = ?');
      return stmt.get(name) as ITADSetting | null;
    } catch (error) {
      logger.error(`Failed to get ITAD setting ${name}:`, error);
      throw error;
    }
  }

  // 設定値を文字列で取得
  getSettingValue(name: string, defaultValue: string = ''): string {
    const setting = this.getSetting(name);
    return setting ? setting.value : defaultValue;
  }

  // 設定値を数値で取得
  getSettingValueAsNumber(name: string, defaultValue: number = 0): number {
    const value = this.getSettingValue(name);
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // 設定値を真偽値で取得
  getSettingValueAsBoolean(name: string, defaultValue: boolean = false): boolean {
    const value = this.getSettingValue(name, defaultValue.toString());
    return value.toLowerCase() === 'true';
  }

  // 設定更新
  updateSetting(name: string, value: string): boolean {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        UPDATE itad_settings 
        SET value = ?, updated_at = datetime('now') 
        WHERE name = ?
      `);
      const result = stmt.run(value, name);
      logger.info(`ITAD setting ${name} updated to: ${value}`);
      return result.changes > 0;
    } catch (error) {
      logger.error(`Failed to update ITAD setting ${name}:`, error);
      throw error;
    }
  }

  // 複数設定一括更新
  updateSettings(settings: Record<string, string>): boolean {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        UPDATE itad_settings 
        SET value = ?, updated_at = datetime('now') 
        WHERE name = ?
      `);
      
      const transaction = db.transaction((settingsToUpdate: Record<string, string>) => {
        for (const [name, value] of Object.entries(settingsToUpdate)) {
          stmt.run(value, name);
        }
      });

      transaction(settings);
      logger.info('ITAD settings batch updated:', settings);
      return true;
    } catch (error) {
      logger.error('Failed to batch update ITAD settings:', error);
      throw error;
    }
  }

  // 新設定追加
  addSetting(name: string, value: string, description: string, category: string = 'filter'): number {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        INSERT INTO itad_settings (name, value, description, category) 
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(name, value, description, category);
      logger.info(`ITAD setting ${name} added with value: ${value}`);
      return result.lastInsertRowid as number;
    } catch (error) {
      logger.error(`Failed to add ITAD setting ${name}:`, error);
      throw error;
    }
  }

  // 設定削除
  deleteSetting(name: string): boolean {
    try {
      const db = this.getDb();
      const stmt = db.prepare('DELETE FROM itad_settings WHERE name = ?');
      const result = stmt.run(name);
      logger.info(`ITAD setting ${name} deleted`);
      return result.changes > 0;
    } catch (error) {
      logger.error(`Failed to delete ITAD setting ${name}:`, error);
      throw error;
    }
  }

  // フィルター設定オブジェクトを取得
  getFilterConfig(): ITADFilterConfig {
    return {
      min_discount: this.getSettingValueAsNumber('min_discount', 20),
      max_price: this.getSettingValueAsNumber('max_price', 5000),
      limit: this.getSettingValueAsNumber('limit', 50),
      region: this.getSettingValue('region', 'JP'),
      enabled: this.getSettingValueAsBoolean('enabled', true),
      notification_enabled: this.getSettingValueAsBoolean('notification_enabled', true)
    };
  }

  // フィルター設定一括更新
  updateFilterConfig(config: Partial<ITADFilterConfig>): boolean {
    const settings: Record<string, string> = {};
    
    if (config.min_discount !== undefined) {
      settings.min_discount = config.min_discount.toString();
    }
    if (config.max_price !== undefined) {
      settings.max_price = config.max_price.toString();
    }
    if (config.limit !== undefined) {
      settings.limit = config.limit.toString();
    }
    if (config.region !== undefined) {
      settings.region = config.region;
    }
    if (config.enabled !== undefined) {
      settings.enabled = config.enabled.toString();
    }
    if (config.notification_enabled !== undefined) {
      settings.notification_enabled = config.notification_enabled.toString();
    }

    return this.updateSettings(settings);
  }

  // カテゴリ別設定取得
  getSettingsByCategory(category: string): ITADSetting[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare('SELECT * FROM itad_settings WHERE category = ? ORDER BY name');
      return stmt.all(category) as ITADSetting[];
    } catch (error) {
      logger.error(`Failed to get ITAD settings for category ${category}:`, error);
      throw error;
    }
  }

  // 設定リセット（デフォルト値に戻す）
  resetToDefaults(): boolean {
    const defaultSettings = {
      min_discount: '20',
      max_price: '5000',
      limit: '50',
      region: 'JP',
      enabled: 'true',
      notification_enabled: 'true'
    };
    
    return this.updateSettings(defaultSettings);
  }
}

export default new ITADSettingsModel();