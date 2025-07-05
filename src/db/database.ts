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
    
    // Migrations removed - using direct schema initialization for dev environment
    
    // ゲーム情報テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        price_threshold REAL,
        price_threshold_type TEXT DEFAULT 'price' CHECK(price_threshold_type IN ('price', 'discount', 'any_sale')),
        discount_threshold_percent INTEGER DEFAULT NULL,
        alert_enabled BOOLEAN DEFAULT 1,
        all_time_low REAL DEFAULT 0,
        manual_historical_low REAL DEFAULT NULL,
        is_purchased BOOLEAN DEFAULT 0,
        purchased BOOLEAN DEFAULT 0,
        purchase_date DATETIME,
        purchase_price REAL DEFAULT 0,
        was_unreleased BOOLEAN DEFAULT 0,
        last_known_release_date TEXT DEFAULT NULL,
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
        release_date TEXT,
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id)
      )
    `);

    // アラート履歴テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER NOT NULL,
        game_id INTEGER,
        alert_type TEXT NOT NULL CHECK(alert_type IN ('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released', 'test')),
        message TEXT,
        trigger_price REAL,
        previous_low REAL,
        discount_percent INTEGER,
        price_data TEXT,
        game_name TEXT,
        is_read BOOLEAN DEFAULT 0,
        notified_discord BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        release_date TEXT,
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id),
        FOREIGN KEY (game_id) REFERENCES games(id)
      )
    `);

    // システム設定テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 予算管理テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        period_type TEXT NOT NULL CHECK(period_type IN ('monthly', 'yearly', 'custom')),
        budget_amount REAL NOT NULL,
        start_date DATE,
        end_date DATE,
        category_filter TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 予算出費記録テーブル
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
      )
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
      )
    `);

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
        UNIQUE(title, start_date)
      )
    `);

    // レビュー統合データテーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER NOT NULL,
        game_name TEXT NOT NULL,
        steam_score INTEGER,
        steam_review_count INTEGER,
        steam_description TEXT,
        metacritic_score INTEGER,
        metacritic_description TEXT,
        metacritic_url TEXT,
        igdb_score INTEGER,
        igdb_review_count INTEGER,
        igdb_description TEXT,
        igdb_url TEXT,
        aggregate_score INTEGER,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id),
        UNIQUE(steam_app_id)
      )
    `);

    // レビューソース別詳細テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS review_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER NOT NULL,
        source TEXT NOT NULL CHECK(source IN ('steam', 'metacritic', 'igdb')),
        score INTEGER NOT NULL,
        max_score INTEGER NOT NULL DEFAULT 100,
        review_count INTEGER,
        description TEXT,
        url TEXT,
        tier TEXT,
        percent_recommended REAL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id),
        UNIQUE(steam_app_id, source)
      )
    `);

    // Steam無料ゲーム管理テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS steam_free_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        steam_url TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        is_expired BOOLEAN DEFAULT 0,
        is_claimed BOOLEAN DEFAULT 0,
        claimed_date DATETIME,
        discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // バージョン管理テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // latest_pricesキャッシュテーブル（パフォーマンス最適化用）
    db.exec(`
      CREATE TABLE IF NOT EXISTS latest_prices (
        steam_app_id INTEGER PRIMARY KEY,
        current_price REAL NOT NULL,
        original_price REAL NOT NULL,
        discount_percent INTEGER NOT NULL,
        historical_low REAL NOT NULL,
        all_time_low_date TEXT,
        is_on_sale BOOLEAN NOT NULL,
        source TEXT NOT NULL,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        release_date TEXT,
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id) ON DELETE CASCADE
      )
    `);

    // インデックスの作成
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_price_history_app_id ON price_history(steam_app_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_app_id ON alerts(steam_app_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_game_id ON alerts(game_id);
      CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_type, start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_budget_expenses_budget_id ON budget_expenses(budget_id);
      CREATE INDEX IF NOT EXISTS idx_budget_expenses_date ON budget_expenses(purchase_date);
      CREATE INDEX IF NOT EXISTS idx_epic_games_dates ON epic_free_games(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_epic_games_claimed ON epic_free_games(is_claimed);
      CREATE INDEX IF NOT EXISTS idx_steam_free_games_app_id ON steam_free_games(app_id);
      CREATE INDEX IF NOT EXISTS idx_steam_free_games_claimed ON steam_free_games(is_claimed);
    `);

    // 既存のsteam_free_gamesテーブルをマイグレーション
    try {
      // カラムが存在するかチェック
      const tableInfo = db.prepare("PRAGMA table_info(steam_free_games)").all();
      const hasStartDate = tableInfo.some((col: any) => col.name === 'start_date');
      
      if (!hasStartDate) {
        logger.info('Migrating steam_free_games table...');
        db.exec(`
          ALTER TABLE steam_free_games ADD COLUMN start_date DATE;
          ALTER TABLE steam_free_games ADD COLUMN end_date DATE;
          ALTER TABLE steam_free_games ADD COLUMN is_expired BOOLEAN DEFAULT 0;
        `);
        logger.info('steam_free_games table migration completed');
      }
    } catch (error) {
      logger.debug('Migration check for steam_free_games:', error);
    }

    // review_scoresテーブルのIGDBソース対応マイグレーション
    try {
      // テーブルが存在するかチェック
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='review_scores'
      `).get();
      
      if (tableExists) {
        // 現在のCHECK制約を確認
        const tableSchema = db.prepare(`
          SELECT sql FROM sqlite_master 
          WHERE type='table' AND name='review_scores'
        `).get() as any;
        
        if (tableSchema && !tableSchema.sql.includes('igdb')) {
          logger.info('Migrating review_scores table to support IGDB...');
          
          // 新しいテーブルを作成
          db.exec(`
            CREATE TABLE review_scores_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              steam_app_id INTEGER NOT NULL,
              source TEXT NOT NULL CHECK(source IN ('steam', 'metacritic', 'igdb')),
              score INTEGER NOT NULL,
              max_score INTEGER NOT NULL DEFAULT 100,
              review_count INTEGER,
              description TEXT,
              url TEXT,
              tier TEXT,
              percent_recommended REAL,
              last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(steam_app_id, source)
            );
          `);
          
          // 既存データをコピー
          db.exec(`
            INSERT INTO review_scores_new 
            SELECT * FROM review_scores;
          `);
          
          // 古いテーブルを削除し、新しいテーブルをリネーム
          db.exec(`DROP TABLE review_scores;`);
          db.exec(`ALTER TABLE review_scores_new RENAME TO review_scores;`);
          
          logger.info('review_scores table migration completed');
        }
      }
    } catch (error) {
      logger.warn('Failed to migrate review_scores table:', error);
    }

    // トリガーの作成
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_games_timestamp 
      AFTER UPDATE ON games
      BEGIN
        UPDATE games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

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

      CREATE TRIGGER IF NOT EXISTS update_steam_free_games_timestamp 
      AFTER UPDATE ON steam_free_games
      BEGIN
        UPDATE steam_free_games SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER IF NOT EXISTS update_alerts_timestamp 
      AFTER UPDATE ON alerts
      BEGIN
        UPDATE alerts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // 初期設定とシードデータ
    this.seedDatabase(db);
    
    logger.info('Database initialized successfully');
  }

  // データベースシード（初期データ）
  private seedDatabase(db: Database.Database): void {
    try {
      // バージョン1として記録
      db.prepare('INSERT OR IGNORE INTO db_version (version) VALUES (1)').run();

      // システム設定の初期値
      const insertSystemSetting = db.prepare(`
        INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)
      `);
      insertSystemSetting.run('last_fetch_time', '1970-01-01T00:00:00.000Z');

      // ITAD設定の初期値
      const insertItadSetting = db.prepare(`
        INSERT OR IGNORE INTO itad_settings (name, value, description, category) VALUES (?, ?, ?, ?)
      `);
      insertItadSetting.run('min_discount', '20', '最小割引率（%）', 'filter');
      insertItadSetting.run('max_price', '5000', '最大価格（円）', 'filter');
      insertItadSetting.run('limit', '50', '取得件数制限', 'filter');
      insertItadSetting.run('region', 'JP', '地域設定', 'filter');
      insertItadSetting.run('enabled', 'true', '高割引検知有効化', 'general');
      insertItadSetting.run('notification_enabled', 'true', 'Discord通知有効化', 'notification');

      // デフォルト予算の作成（既存チェック）
      const existingBudget = db.prepare('SELECT COUNT(*) as count FROM budgets WHERE name = ?').get('月次予算') as any;
      if (existingBudget.count === 0) {
        const insertBudget = db.prepare(`
          INSERT INTO budgets (name, period_type, budget_amount, start_date, end_date, is_active) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        insertBudget.run('月次予算', 'monthly', 10000, startOfMonth, endOfMonth, 1);
      }

      // プリセットゲームデータの追加
      const existingGames = db.prepare('SELECT COUNT(*) as count FROM games').get() as any;
      if (existingGames.count === 0) {
        this.loadPresetGames(db);
      }

      logger.info('Database seeded with initial data');
    } catch (error) {
      logger.error('Failed to seed database:', error);
    }
  }

  // プリセットゲームを読み込み
  private loadPresetGames(db: Database.Database): void {
    try {
      const presetPath = path.join(process.cwd(), 'preset_games.json');
      if (!fs.existsSync(presetPath)) {
        logger.warn('Preset games file not found, skipping preset loading');
        return;
      }

      const presetData = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
      const insertGame = db.prepare(`
        INSERT INTO games (steam_app_id, name, enabled, alert_enabled, all_time_low) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      let addedCount = 0;
      for (const game of presetData) {
        try {
          insertGame.run(game.app_id, game.name, 1, 1, 0);
          addedCount++;
        } catch (error: any) {
          if (!error.message.includes('UNIQUE constraint failed')) {
            logger.error(`Failed to add preset game ${game.name}:`, error);
          }
        }
      }
      
      logger.info(`Added ${addedCount} preset games from preset_games.json`);
    } catch (error) {
      logger.error('Failed to load preset games:', error);
    }
  }

  // 既存処理との互換性メソッド
  checkIntegrity(): boolean {
    try {
      const db = this.getConnection();
      db.exec('PRAGMA integrity_check');
      return true;
    } catch (error) {
      logger.error('Database integrity check failed:', error);
      return false;
    }
  }

  updateLastFetchTime(timestamp?: Date): void {
    try {
      const db = this.getConnection();
      const time = timestamp ? timestamp.toISOString() : new Date().toISOString();
      db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run('last_fetch_time', time);
    } catch (error) {
      logger.error('Failed to update last fetch time:', error);
    }
  }

  getLastFetchTime(): Date {
    try {
      const db = this.getConnection();
      const result = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('last_fetch_time') as any;
      return result ? new Date(result.value) : new Date(0);
    } catch (error) {
      logger.error('Failed to get last fetch time:', error);
      return new Date(0);
    }
  }

  getNextFetchTime(): Date {
    const lastFetch = this.getLastFetchTime();
    const nextFetch = new Date(lastFetch.getTime() + (60 * 60 * 1000)); // 1時間後
    return nextFetch;
  }

  shouldFetch(): boolean {
    const now = new Date();
    const nextFetch = this.getNextFetchTime();
    return now >= nextFetch;
  }

  cleanupOldData(): number {
    try {
      const db = this.getConnection();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // 30日前
      
      const result = db.prepare(`
        DELETE FROM price_history 
        WHERE recorded_at < ? AND steam_app_id NOT IN (SELECT steam_app_id FROM games)
      `).run(cutoffDate.toISOString());
      
      logger.info(`Cleaned up ${result.changes} old price history records`);
      return result.changes;
    } catch (error) {
      logger.error('Failed to cleanup old data:', error);
      return 0;
    }
  }
}

export default new DatabaseManager();