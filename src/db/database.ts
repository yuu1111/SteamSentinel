import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import logger from '../utils/logger';

class DatabaseManager {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor() {
    this.dbPath = config.databasePath;
    this.ensureDataDirectory();
  }

  private ensureDataDirectory(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      logger.info(`Created data directory: ${dataDir}`);
    }
  }

  connect(): void {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  getConnection(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  // データベース初期化
  initialize(): void {
    const db = this.getConnection();
    
    // ゲーム情報テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        price_threshold REAL,
        alert_enabled BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 価格履歴テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER NOT NULL,
        current_price REAL NOT NULL,
        original_price REAL NOT NULL,
        discount_percent INTEGER NOT NULL,
        historical_low REAL NOT NULL,
        is_on_sale BOOLEAN NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('itad', 'steam')),
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id)
      )
    `);

    // アラート履歴テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL CHECK(alert_type IN ('new_low', 'sale_start')),
        trigger_price REAL NOT NULL,
        previous_low REAL,
        discount_percent INTEGER NOT NULL,
        notified_discord BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id)
      )
    `);

    // インデックスの作成
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_price_history_app_id ON price_history(steam_app_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_app_id ON alerts(steam_app_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
    `);

    // トリガーでupdated_atを自動更新
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_games_timestamp 
      AFTER UPDATE ON games
      BEGIN
        UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    logger.info('Database initialized successfully');
  }

  // データベースの整合性チェック
  checkIntegrity(): boolean {
    try {
      const db = this.getConnection();
      const result = db.prepare('PRAGMA integrity_check').get() as any;
      return result.integrity_check === 'ok';
    } catch (error) {
      logger.error('Database integrity check failed:', error);
      return false;
    }
  }

  // 古いデータのクリーンアップ
  cleanupOldData(): void {
    const db = this.getConnection();
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - config.dataRetentionDays);

    try {
      const priceHistoryDeleted = db.prepare(`
        DELETE FROM price_history 
        WHERE recorded_at < ?
      `).run(retentionDate.toISOString());

      const alertsDeleted = db.prepare(`
        DELETE FROM alerts 
        WHERE created_at < ?
      `).run(retentionDate.toISOString());

      logger.info(`Cleanup completed: ${priceHistoryDeleted.changes} price records, ${alertsDeleted.changes} alerts deleted`);
    } catch (error) {
      logger.error('Data cleanup failed:', error);
    }
  }

  // トランザクション実行
  transaction<T>(fn: (db: Database.Database) => T): T {
    const db = this.getConnection();
    return db.transaction(fn)(db);
  }
}

export default new DatabaseManager();