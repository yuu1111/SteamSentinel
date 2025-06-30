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
      logger.info(`Attempting to connect to database at: ${this.dbPath}`);
      logger.info(`Database file exists: ${require('fs').existsSync(this.dbPath)}`);
      logger.info(`Current working directory: ${process.cwd()}`);
      
      this.db = new Database(this.dbPath);
      // WSL環境でのWALモードの問題を回避
      try {
        this.db.pragma('journal_mode = WAL');
      } catch (walError) {
        logger.warn('Failed to set WAL mode, using default journal mode:', walError);
        this.db.pragma('journal_mode = DELETE');
      }
      this.db.pragma('foreign_keys = ON');
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Database connection failed:', error);
      logger.error(`Failed database path: ${this.dbPath}`);
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
        source TEXT NOT NULL CHECK(source IN ('itad', 'steam', 'steam_unreleased', 'steam_free', 'steam_removed')),
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        release_date TEXT, -- 未リリースゲームのリリース日（ISO文字列）
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id)
      )
    `);

    // アラート履歴テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL CHECK(alert_type IN ('new_low', 'sale_start', 'release')),
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

    // マイグレーション実行
    this.runMigrations();
    
    logger.info('Database initialized successfully');
  }

  // データベースマイグレーション
  private runMigrations(): void {
    const db = this.getConnection();
    
    try {
      // バージョン管理テーブルの作成
      db.exec(`
        CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 現在のバージョンを取得
      const currentVersion = this.getCurrentVersion();
      
      // v2: 閾値タイプと割引率閾値の追加
      if (currentVersion < 2) {
        logger.info('Running migration v2: Adding threshold type and discount threshold fields');
        
        // 新しいカラムを追加
        db.exec(`
          ALTER TABLE games ADD COLUMN price_threshold_type TEXT DEFAULT 'price' 
          CHECK(price_threshold_type IN ('price', 'discount', 'any_sale'));
        `);
        
        db.exec(`
          ALTER TABLE games ADD COLUMN discount_threshold_percent INTEGER DEFAULT NULL;
        `);
        
        // バージョンを記録
        db.prepare('INSERT INTO db_version (version) VALUES (?)').run(2);
        logger.info('Migration v2 completed successfully');
      }

      // v3: 手動最安値設定と購入管理の追加
      if (currentVersion < 3) {
        logger.info('Running migration v3: Adding manual historical low and purchase tracking fields');
        
        // 手動最安値カラムを追加
        db.exec(`
          ALTER TABLE games ADD COLUMN manual_historical_low REAL DEFAULT NULL;
        `);
        
        // 購入済みマークカラムを追加
        db.exec(`
          ALTER TABLE games ADD COLUMN is_purchased BOOLEAN DEFAULT 0;
        `);
        
        // 購入価格カラムを追加
        db.exec(`
          ALTER TABLE games ADD COLUMN purchase_price REAL DEFAULT NULL;
        `);
        
        // 購入日カラムを追加
        db.exec(`
          ALTER TABLE games ADD COLUMN purchase_date DATETIME DEFAULT NULL;
        `);
        
        // バージョンを記録
        db.prepare('INSERT INTO db_version (version) VALUES (?)').run(3);
        logger.info('Migration v3 completed successfully');
      }

      // v4: 最後のフェッチ時間管理の追加
      if (currentVersion < 4) {
        logger.info('Running migration v4: Adding last fetch time tracking');
        
        // システム設定テーブルを作成
        db.exec(`
          CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 最後のフェッチ時間を初期化
        db.prepare(`
          INSERT OR IGNORE INTO system_settings (key, value) 
          VALUES ('last_fetch_time', '1970-01-01T00:00:00.000Z')
        `).run();
        
        // バージョンを記録
        db.prepare('INSERT INTO db_version (version) VALUES (?)').run(4);
        logger.info('Migration v4 completed successfully');
      }

      // v5: price_historyテーブルにrelease_dateカラムを追加
      if (currentVersion < 5) {
        logger.info('Running migration v5: Adding release_date column to price_history table');
        
        try {
          // カラムが存在するかチェック
          const columnExists = db.prepare(`
            SELECT COUNT(*) as count FROM pragma_table_info('price_history') 
            WHERE name = 'release_date'
          `).get() as any;
          
          if (columnExists.count === 0) {
            db.exec(`
              ALTER TABLE price_history 
              ADD COLUMN release_date TEXT DEFAULT NULL
            `);
            logger.info('Added release_date column to price_history table');
          }
        } catch (error) {
          logger.warn('Release_date column may already exist:', error);
        }
        
        // バージョンを記録
        db.prepare('INSERT INTO db_version (version) VALUES (?)').run(5);
        logger.info('Migration v5 completed successfully');
      }

      // v6: リリース通知機能の追加
      if (currentVersion < 6) {
        logger.info('Running migration v6: Adding release notification support');
        
        // ゲームテーブルにリリース追跡フィールドを追加
        db.exec(`
          ALTER TABLE games ADD COLUMN was_unreleased BOOLEAN DEFAULT 0;
          ALTER TABLE games ADD COLUMN last_known_release_date TEXT DEFAULT NULL;
        `);
        
        // アラートテーブルを更新（新しいアラートタイプとフィールドを追加）
        db.exec(`
          CREATE TABLE IF NOT EXISTS alerts_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            steam_app_id INTEGER NOT NULL,
            game_id INTEGER,
            alert_type TEXT NOT NULL CHECK(alert_type IN ('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released')),
            message TEXT,
            trigger_price REAL,
            previous_low REAL,
            discount_percent INTEGER,
            price_data TEXT, -- JSON形式の価格データ
            game_name TEXT,
            notified_discord BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            release_date TEXT, -- リリース通知の場合のリリース日
            FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id),
            FOREIGN KEY (game_id) REFERENCES games(id)
          );
        `);
        
        // 既存データを移行
        db.exec(`
          INSERT INTO alerts_new (steam_app_id, alert_type, trigger_price, previous_low, discount_percent, notified_discord, created_at)
          SELECT steam_app_id, 
                 CASE alert_type 
                   WHEN 'release' THEN 'game_released' 
                   ELSE 'threshold_met' 
                 END,
                 trigger_price, 
                 previous_low, 
                 discount_percent, 
                 notified_discord, 
                 created_at
          FROM alerts;
        `);
        
        // 古いテーブルを削除して新しいテーブルをリネーム
        db.exec(`
          DROP TABLE alerts;
          ALTER TABLE alerts_new RENAME TO alerts;
          
          -- インデックスを再作成
          CREATE INDEX idx_alerts_app_id ON alerts(steam_app_id);
          CREATE INDEX idx_alerts_created_at ON alerts(created_at);
          CREATE INDEX idx_alerts_game_id ON alerts(game_id);
        `);
        
        // 既存の未リリースゲームを特定してフラグを設定
        db.exec(`
          UPDATE games 
          SET was_unreleased = 1 
          WHERE steam_app_id IN (
            SELECT DISTINCT g.steam_app_id 
            FROM games g 
            JOIN price_history ph ON g.steam_app_id = ph.steam_app_id 
            WHERE ph.source = 'steam_unreleased' 
              AND ph.recorded_at = (
                SELECT MAX(recorded_at) 
                FROM price_history 
                WHERE steam_app_id = g.steam_app_id
              )
          );
        `);
        
        // バージョンを記録
        db.prepare('INSERT INTO db_version (version) VALUES (?)').run(6);
        logger.info('Migration v6 completed successfully');
      }

      // v7: 予算管理とEpic Games無料ゲーム管理
      if (currentVersion < 7) {
        logger.info('Running migration v7: Adding budget management and Epic Games free games tracking');
        
        // 予算管理テーブル
        db.exec(`
          CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            period_type TEXT NOT NULL CHECK(period_type IN ('monthly', 'yearly', 'custom')),
            budget_amount REAL NOT NULL,
            start_date DATE,
            end_date DATE,
            category_filter TEXT, -- JSON array of categories
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // 予算関連支出記録テーブル
        db.exec(`
          CREATE TABLE IF NOT EXISTS budget_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            budget_id INTEGER NOT NULL,
            steam_app_id INTEGER,
            game_name TEXT,
            amount REAL NOT NULL,
            purchase_date DATE NOT NULL,
            category TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
          );
        `);

        // ITAD設定テーブル
        db.exec(`
          CREATE TABLE IF NOT EXISTS itad_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'filter',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // ITAD設定の初期値を挿入
        const insertDefaultSettings = db.prepare(`
          INSERT OR IGNORE INTO itad_settings (name, value, description, category) 
          VALUES (?, ?, ?, ?)
        `);
        
        insertDefaultSettings.run('min_discount', '20', '最小割引率（%）', 'filter');
        insertDefaultSettings.run('max_price', '5000', '最大価格（円）', 'filter');
        insertDefaultSettings.run('limit', '50', '取得件数制限', 'filter');
        insertDefaultSettings.run('region', 'JP', '地域設定', 'filter');
        insertDefaultSettings.run('enabled', 'true', '高割引検知有効化', 'general');
        insertDefaultSettings.run('notification_enabled', 'true', 'Discord通知有効化', 'notification');
        
        // Epic Games無料ゲーム管理テーブル
        db.exec(`
          CREATE TABLE IF NOT EXISTS epic_free_games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            epic_url TEXT,
            image_url TEXT,
            start_date DATE,
            end_date DATE,
            is_claimed BOOLEAN DEFAULT 0,
            claimed_date DATETIME,
            discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(title, start_date) -- 同一ゲームの重複防止
          );
        `);
        
        // インデックスの作成
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_type, start_date, end_date);
          CREATE INDEX IF NOT EXISTS idx_budget_expenses_budget_id ON budget_expenses(budget_id);
          CREATE INDEX IF NOT EXISTS idx_budget_expenses_date ON budget_expenses(purchase_date);
          CREATE INDEX IF NOT EXISTS idx_epic_games_dates ON epic_free_games(start_date, end_date);
          CREATE INDEX IF NOT EXISTS idx_epic_games_claimed ON epic_free_games(is_claimed);
        `);
        
        // 予算テーブルのトリガー
        db.exec(`
          CREATE TRIGGER IF NOT EXISTS update_budgets_timestamp 
          AFTER UPDATE ON budgets
          BEGIN
            UPDATE budgets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END;
          
          CREATE TRIGGER IF NOT EXISTS update_epic_games_timestamp 
          AFTER UPDATE ON epic_free_games
          BEGIN
            UPDATE epic_free_games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END;
        `);
        
        // バージョンを記録
        db.prepare('INSERT INTO db_version (version) VALUES (?)').run(7);
        logger.info('Migration v7 completed successfully');
      }
      
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  // 現在のデータベースバージョンを取得
  private getCurrentVersion(): number {
    const db = this.getConnection();
    try {
      const result = db.prepare('SELECT MAX(version) as version FROM db_version').get() as any;
      return result?.version || 1; // デフォルトはv1
    } catch {
      // テーブルが存在しない場合はv1
      return 1;
    }
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

  // 最後のフェッチ時間を取得
  getLastFetchTime(): Date {
    const db = this.getConnection();
    try {
      const result = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('last_fetch_time') as any;
      return result ? new Date(result.value) : new Date(0);
    } catch (error) {
      logger.error('Failed to get last fetch time:', error);
      return new Date(0);
    }
  }

  // 最後のフェッチ時間を更新
  updateLastFetchTime(fetchTime: Date): void {
    const db = this.getConnection();
    try {
      db.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value, updated_at) 
        VALUES ('last_fetch_time', ?, CURRENT_TIMESTAMP)
      `).run(fetchTime.toISOString());
    } catch (error) {
      logger.error('Failed to update last fetch time:', error);
    }
  }

  // 次のフェッチ予定時間を計算
  getNextFetchTime(): Date {
    const lastFetch = this.getLastFetchTime();
    const intervalMs = config.monitoringIntervalHours * 60 * 60 * 1000;
    return new Date(lastFetch.getTime() + intervalMs);
  }

  // フェッチが必要かチェック
  shouldFetch(): boolean {
    const nextFetch = this.getNextFetchTime();
    return new Date() >= nextFetch;
  }
}

export default new DatabaseManager();