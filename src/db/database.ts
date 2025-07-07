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
    
    // 開発環境用：直接スキーマ初期化
    
    // ユーザー管理テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'readonly')),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      )
    `);

    // ユーザー権限テーブル
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        permission TEXT NOT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        granted_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id),
        UNIQUE(user_id, permission)
      )
    `);

    // リフレッシュトークン管理
    db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        revoked_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
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

    // アラート履歴テーブル（正規化版）
    db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        steam_app_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL CHECK(alert_type IN ('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released', 'test')),
        triggered_price REAL,
        threshold_value REAL,
        discount_percent INTEGER,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notified_discord BOOLEAN NOT NULL DEFAULT 0,
        is_read BOOLEAN NOT NULL DEFAULT 0,
        metadata TEXT, -- JSON形式で拡張可能なメタデータ
        FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id) ON DELETE CASCADE
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

    // game_reviewsテーブルは削除 - review_scoresテーブルのみを使用して統合スコアを計算

    // レビューソース別詳細テーブル（拡張版）
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
        weight REAL DEFAULT 1.0,
        confidence_level TEXT DEFAULT 'medium' CHECK(confidence_level IN ('low', 'medium', 'high')),
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

    // 価格統計事前計算テーブル（パフォーマンス最適化用）
    db.exec(`
      CREATE TABLE IF NOT EXISTS price_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        calculated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_games INTEGER NOT NULL,
        monitored_games INTEGER NOT NULL,
        games_on_sale INTEGER NOT NULL,
        average_discount REAL DEFAULT 0,
        total_savings REAL DEFAULT 0,
        highest_discount_percent INTEGER DEFAULT 0,
        highest_discount_game_id INTEGER,
        lowest_current_price REAL,
        highest_current_price REAL,
        new_lows_today INTEGER DEFAULT 0,
        sale_starts_today INTEGER DEFAULT 0,
        statistics_json TEXT, -- JSON形式で拡張統計データを格納
        FOREIGN KEY (highest_discount_game_id) REFERENCES games(steam_app_id)
      )
    `);

    // インデックスの作成
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_games_enabled ON games(enabled);
      CREATE INDEX IF NOT EXISTS idx_games_is_purchased ON games(is_purchased);
      CREATE INDEX IF NOT EXISTS idx_games_enabled_purchased ON games(enabled, is_purchased);
      CREATE INDEX IF NOT EXISTS idx_price_history_app_id ON price_history(steam_app_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_price_history_source ON price_history(source);
      CREATE INDEX IF NOT EXISTS idx_price_history_app_id_date ON price_history(steam_app_id, recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_app_id ON alerts(steam_app_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_game_id ON alerts(game_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts(alert_type);
      CREATE INDEX IF NOT EXISTS idx_alerts_notified_discord ON alerts(notified_discord);
      CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(alert_type, notified_discord, created_at);
      CREATE INDEX IF NOT EXISTS idx_review_scores_source ON review_scores(source);
      CREATE INDEX IF NOT EXISTS idx_review_scores_app_id_source ON review_scores(steam_app_id, source);
      CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_type, start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active, period_type);
      CREATE INDEX IF NOT EXISTS idx_budget_expenses_budget_id ON budget_expenses(budget_id);
      CREATE INDEX IF NOT EXISTS idx_budget_expenses_date ON budget_expenses(purchase_date);
      CREATE INDEX IF NOT EXISTS idx_epic_games_dates ON epic_free_games(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_epic_games_claimed ON epic_free_games(is_claimed);
      CREATE INDEX IF NOT EXISTS idx_steam_free_games_app_id ON steam_free_games(app_id);
      CREATE INDEX IF NOT EXISTS idx_steam_free_games_claimed ON steam_free_games(is_claimed);
      CREATE INDEX IF NOT EXISTS idx_price_statistics_calculated_at ON price_statistics(calculated_at);
      CREATE INDEX IF NOT EXISTS idx_price_statistics_total_games ON price_statistics(total_games, games_on_sale);
    `);

    // JSON フィールドの最適化
    this.optimizeJsonFields(db);

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

    // latest_prices自動更新トリガー
    this.createLatestPricesTriggers(db);

    // 統合レビュースコア計算ビューの作成
    this.createIntegratedReviewView(db);

    // 価格統計自動更新トリガーの作成
    this.createPriceStatisticsTriggers(db);

    // 旧game_reviewsテーブルのクリーンアップ
    this.cleanupLegacyReviewData(db);

    // アラートテーブルの正規化マイグレーション
    this.migrateAlertsTable(db);
    
    // 初期設定とシードデータ
    this.seedDatabase(db);
    
    logger.info('Database initialized successfully');
  }

  // JSON データの診断・メンテナンス
  analyzeJsonFields(): {
    alerts_metadata: any;
    price_statistics_json: any;
    invalid_records: any[];
  } {
    const db = this.getConnection();
    
    try {
      // アラートメタデータの分析
      const alertsAnalysis = db.prepare(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(metadata) as records_with_metadata,
          AVG(LENGTH(metadata)) as avg_metadata_size,
          MAX(LENGTH(metadata)) as max_metadata_size,
          SUM(LENGTH(metadata)) as total_metadata_size
        FROM alerts
        WHERE metadata IS NOT NULL
      `).get();

      // 価格統計JSONの分析
      const statisticsAnalysis = db.prepare(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(statistics_json) as records_with_json,
          AVG(LENGTH(statistics_json)) as avg_json_size,
          MAX(LENGTH(statistics_json)) as max_json_size,
          SUM(LENGTH(statistics_json)) as total_json_size
        FROM price_statistics
        WHERE statistics_json IS NOT NULL
      `).get();

      // 無効なJSONレコードの検出
      const invalidRecords = [];
      
      const invalidAlerts = db.prepare(`
        SELECT 'alerts' as table_name, id, 'metadata' as field, metadata as content
        FROM alerts 
        WHERE metadata IS NOT NULL AND NOT json_valid(metadata)
        LIMIT 10
      `).all();

      const invalidStatistics = db.prepare(`
        SELECT 'price_statistics' as table_name, id, 'statistics_json' as field, statistics_json as content
        FROM price_statistics 
        WHERE statistics_json IS NOT NULL AND NOT json_valid(statistics_json)
        LIMIT 10
      `).all();

      invalidRecords.push(...invalidAlerts, ...invalidStatistics);

      return {
        alerts_metadata: alertsAnalysis,
        price_statistics_json: statisticsAnalysis,
        invalid_records: invalidRecords
      };
    } catch (error) {
      logger.error('Failed to analyze JSON fields:', error);
      throw error;
    }
  }

  // 無効なJSONデータのクリーンアップ
  cleanupInvalidJsonData(): { cleaned_alerts: number; cleaned_statistics: number } {
    const db = this.getConnection();
    
    try {
      // 無効なアラートメタデータのクリーンアップ
      const cleanAlertsStmt = db.prepare(`
        UPDATE alerts 
        SET metadata = NULL 
        WHERE metadata IS NOT NULL 
          AND (
            metadata = '' 
            OR metadata = '{}' 
            OR metadata = '[]'
            OR NOT json_valid(metadata)
          )
      `);
      
      const alertsResult = cleanAlertsStmt.run();

      // 無効な統計JSONのクリーンアップ
      const cleanStatisticsStmt = db.prepare(`
        UPDATE price_statistics 
        SET statistics_json = NULL 
        WHERE statistics_json IS NOT NULL 
          AND (
            statistics_json = '' 
            OR statistics_json = '{}' 
            OR statistics_json = '[]'
            OR NOT json_valid(statistics_json)
          )
      `);
      
      const statisticsResult = cleanStatisticsStmt.run();

      logger.info(`JSON cleanup completed: ${alertsResult.changes} alerts, ${statisticsResult.changes} statistics`);

      return {
        cleaned_alerts: alertsResult.changes,
        cleaned_statistics: statisticsResult.changes
      };
    } catch (error) {
      logger.error('Failed to cleanup invalid JSON data:', error);
      throw error;
    }
  }

  // JSON フィールドの最適化
  private optimizeJsonFields(db: Database.Database): void {
    try {
      logger.debug('Optimizing JSON field storage and indexing...');

      // JSON 検証とバリデーション関数を作成
      db.exec(`
        -- JSON バリデーション用の関数的インデックス
        CREATE INDEX IF NOT EXISTS idx_alerts_metadata_legacy_message 
        ON alerts(json_extract(metadata, '$.legacy_message')) 
        WHERE metadata IS NOT NULL AND json_valid(metadata);

        CREATE INDEX IF NOT EXISTS idx_alerts_metadata_legacy_game_name 
        ON alerts(json_extract(metadata, '$.legacy_game_name')) 
        WHERE metadata IS NOT NULL AND json_valid(metadata);

        -- 価格統計のJSONデータ用インデックス
        CREATE INDEX IF NOT EXISTS idx_price_statistics_discount_ranges 
        ON price_statistics(json_extract(statistics_json, '$.discount_ranges')) 
        WHERE statistics_json IS NOT NULL AND json_valid(statistics_json);

        CREATE INDEX IF NOT EXISTS idx_price_statistics_calculation_method 
        ON price_statistics(json_extract(statistics_json, '$.calculation_method')) 
        WHERE statistics_json IS NOT NULL AND json_valid(statistics_json);
      `);

      // JSON データの整合性チェック用トリガー
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS validate_alerts_metadata_json
        BEFORE INSERT ON alerts
        WHEN NEW.metadata IS NOT NULL
        BEGIN
          SELECT CASE
            WHEN NOT json_valid(NEW.metadata) THEN
              RAISE(ABORT, 'Invalid JSON in alerts.metadata field')
          END;
        END;

        CREATE TRIGGER IF NOT EXISTS validate_alerts_metadata_json_update
        BEFORE UPDATE ON alerts
        WHEN NEW.metadata IS NOT NULL AND NEW.metadata != OLD.metadata
        BEGIN
          SELECT CASE
            WHEN NOT json_valid(NEW.metadata) THEN
              RAISE(ABORT, 'Invalid JSON in alerts.metadata field')
          END;
        END;

        CREATE TRIGGER IF NOT EXISTS validate_price_statistics_json
        BEFORE INSERT ON price_statistics
        WHEN NEW.statistics_json IS NOT NULL
        BEGIN
          SELECT CASE
            WHEN NOT json_valid(NEW.statistics_json) THEN
              RAISE(ABORT, 'Invalid JSON in price_statistics.statistics_json field')
          END;
        END;
      `);

      logger.debug('JSON field optimization completed successfully');
    } catch (error) {
      logger.error('Failed to optimize JSON fields:', error);
    }
  }

  // latest_prices自動更新トリガーの作成
  private createLatestPricesTriggers(db: Database.Database): void {
    try {
      // price_history挿入時のトリガー
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_latest_prices_on_insert
        AFTER INSERT ON price_history
        BEGIN
          INSERT OR REPLACE INTO latest_prices (
            steam_app_id, current_price, original_price, discount_percent,
            historical_low, all_time_low_date, is_on_sale, source, recorded_at, release_date
          )
          SELECT 
            NEW.steam_app_id,
            NEW.current_price,
            NEW.original_price,
            NEW.discount_percent,
            CASE 
              WHEN NEW.current_price < COALESCE(
                (SELECT historical_low FROM latest_prices WHERE steam_app_id = NEW.steam_app_id), 
                NEW.current_price + 1
              )
              THEN NEW.current_price
              ELSE COALESCE(
                (SELECT historical_low FROM latest_prices WHERE steam_app_id = NEW.steam_app_id),
                NEW.historical_low
              )
            END as historical_low,
            CASE 
              WHEN NEW.current_price < COALESCE(
                (SELECT historical_low FROM latest_prices WHERE steam_app_id = NEW.steam_app_id), 
                NEW.current_price + 1
              )
              THEN NEW.recorded_at
              ELSE COALESCE(
                (SELECT all_time_low_date FROM latest_prices WHERE steam_app_id = NEW.steam_app_id),
                NEW.recorded_at
              )
            END as all_time_low_date,
            NEW.is_on_sale,
            NEW.source,
            NEW.recorded_at,
            NEW.release_date;
        END;
      `);

      // price_history更新時のトリガー（稀だが念のため）
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_latest_prices_on_update
        AFTER UPDATE ON price_history
        WHEN NEW.recorded_at = (
          SELECT MAX(recorded_at) 
          FROM price_history 
          WHERE steam_app_id = NEW.steam_app_id
        )
        BEGIN
          UPDATE latest_prices
          SET 
            current_price = NEW.current_price,
            original_price = NEW.original_price,
            discount_percent = NEW.discount_percent,
            historical_low = CASE 
              WHEN NEW.current_price < historical_low
              THEN NEW.current_price
              ELSE historical_low
            END,
            all_time_low_date = CASE 
              WHEN NEW.current_price < historical_low
              THEN NEW.recorded_at
              ELSE all_time_low_date
            END,
            is_on_sale = NEW.is_on_sale,
            source = NEW.source,
            recorded_at = NEW.recorded_at,
            release_date = NEW.release_date
          WHERE steam_app_id = NEW.steam_app_id;
        END;
      `);

      logger.debug('Latest prices triggers created successfully');
    } catch (error) {
      logger.error('Failed to create latest prices triggers:', error);
    }
  }

  // 統合レビュースコア計算ビューの作成
  private createIntegratedReviewView(db: Database.Database): void {
    try {
      // 既存のビューを削除（存在する場合）
      db.exec('DROP VIEW IF EXISTS integrated_review_scores');
      
      // 統合レビュースコア計算ビューを作成
      db.exec(`
        CREATE VIEW integrated_review_scores AS
        SELECT 
          steam_app_id,
          ROUND(SUM(score * weight) / SUM(weight), 2) as integrated_score,
          COUNT(*) as source_count,
          CASE 
            WHEN COUNT(*) >= 3 THEN 'high'
            WHEN COUNT(*) = 2 THEN 'medium'
            ELSE 'low'
          END as confidence,
          MAX(last_updated) as last_updated,
          GROUP_CONCAT(source, ', ') as sources,
          AVG(score) as average_score,
          MIN(score) as lowest_score,
          MAX(score) as highest_score,
          SUM(review_count) as total_review_count,
          GROUP_CONCAT(
            source || ':' || score || '/' || max_score || 
            CASE WHEN review_count IS NOT NULL THEN '(' || review_count || ')' ELSE '' END,
            '; '
          ) as score_breakdown
        FROM review_scores 
        WHERE score IS NOT NULL 
        GROUP BY steam_app_id
      `);
      
      logger.debug('Integrated review scores view created successfully');
    } catch (error) {
      logger.error('Failed to create integrated review scores view:', error);
    }
  }

  // 旧game_reviewsテーブルのクリーンアップ
  private cleanupLegacyReviewData(db: Database.Database): void {
    try {
      // game_reviewsテーブルが存在するかチェック
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='game_reviews'
      `).get();

      if (tableExists) {
        logger.info('Migrating data from game_reviews to review_scores...');
        
        // game_reviewsからreview_scoresに既存データを移行（重複回避）
        const migrateStmt = db.prepare(`
          INSERT OR IGNORE INTO review_scores (
            steam_app_id, source, score, max_score, review_count, 
            description, url, weight, created_at, last_updated
          )
          SELECT 
            steam_app_id, 
            'steam' as source, 
            steam_score as score, 
            100 as max_score,
            steam_review_count as review_count,
            steam_description as description,
            NULL as url,
            1.0 as weight,
            created_at,
            last_updated
          FROM game_reviews 
          WHERE steam_score IS NOT NULL
          
          UNION ALL
          
          SELECT 
            steam_app_id, 
            'metacritic' as source, 
            metacritic_score as score, 
            100 as max_score,
            NULL as review_count,
            metacritic_description as description,
            metacritic_url as url,
            1.0 as weight,
            created_at,
            last_updated
          FROM game_reviews 
          WHERE metacritic_score IS NOT NULL
          
          UNION ALL
          
          SELECT 
            steam_app_id, 
            'igdb' as source, 
            igdb_score as score, 
            100 as max_score,
            igdb_review_count as review_count,
            igdb_description as description,
            igdb_url as url,
            1.0 as weight,
            created_at,
            last_updated
          FROM game_reviews 
          WHERE igdb_score IS NOT NULL
        `);
        
        const migrationResult = migrateStmt.run();
        logger.info(`Migrated ${migrationResult.changes} review records from game_reviews to review_scores`);
        
        // game_reviewsテーブルを削除
        db.exec('DROP TABLE game_reviews');
        logger.info('Legacy game_reviews table removed successfully');
      } else {
        logger.debug('game_reviews table not found, skipping migration');
      }
    } catch (error) {
      logger.error('Failed to cleanup legacy review data:', error);
    }
  }

  // 価格統計自動更新トリガーの作成
  private createPriceStatisticsTriggers(db: Database.Database): void {
    try {
      // price_history挿入時の統計更新トリガー（100件ごと）
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_statistics_on_price_change
        AFTER INSERT ON price_history
        WHEN (SELECT COUNT(*) FROM price_history) % 100 = 0
        BEGIN
          INSERT INTO price_statistics (
            total_games, monitored_games, games_on_sale, average_discount, 
            total_savings, highest_discount_percent, highest_discount_game_id,
            lowest_current_price, highest_current_price, new_lows_today, 
            sale_starts_today, statistics_json
          )
          SELECT 
            (SELECT COUNT(*) FROM games) as total_games,
            (SELECT COUNT(*) FROM games WHERE enabled = 1) as monitored_games,
            (SELECT COUNT(*) FROM latest_prices WHERE is_on_sale = 1) as games_on_sale,
            (SELECT ROUND(AVG(discount_percent), 2) FROM latest_prices WHERE is_on_sale = 1) as average_discount,
            (SELECT ROUND(SUM(original_price - current_price), 2) FROM latest_prices WHERE is_on_sale = 1) as total_savings,
            (SELECT MAX(discount_percent) FROM latest_prices WHERE is_on_sale = 1) as highest_discount_percent,
            (SELECT steam_app_id FROM latest_prices WHERE is_on_sale = 1 ORDER BY discount_percent DESC LIMIT 1) as highest_discount_game_id,
            (SELECT MIN(current_price) FROM latest_prices WHERE current_price > 0) as lowest_current_price,
            (SELECT MAX(current_price) FROM latest_prices) as highest_current_price,
            (SELECT COUNT(*) FROM alerts WHERE alert_type = 'new_low' AND date(created_at) = date('now')) as new_lows_today,
            (SELECT COUNT(*) FROM alerts WHERE alert_type = 'sale_start' AND date(created_at) = date('now')) as sale_starts_today,
            json_object(
              'calculation_method', 'automatic_trigger',
              'data_points', (SELECT COUNT(*) FROM latest_prices),
              'last_price_update', (SELECT MAX(recorded_at) FROM latest_prices),
              'discount_ranges', json_object(
                '0-25', (SELECT COUNT(*) FROM latest_prices WHERE discount_percent BETWEEN 0 AND 25 AND is_on_sale = 1),
                '26-50', (SELECT COUNT(*) FROM latest_prices WHERE discount_percent BETWEEN 26 AND 50 AND is_on_sale = 1),
                '51-75', (SELECT COUNT(*) FROM latest_prices WHERE discount_percent BETWEEN 51 AND 75 AND is_on_sale = 1),
                '76-100', (SELECT COUNT(*) FROM latest_prices WHERE discount_percent BETWEEN 76 AND 100 AND is_on_sale = 1)
              )
            ) as statistics_json;
        END;
      `);

      // 古い統計データの自動削除トリガー（30日より古いデータを削除）
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS cleanup_old_statistics
        AFTER INSERT ON price_statistics
        WHEN NEW.id % 50 = 0  -- 50件ごとにクリーンアップ実行
        BEGIN
          DELETE FROM price_statistics 
          WHERE calculated_at < datetime('now', '-30 days')
          AND id NOT IN (
            SELECT id FROM price_statistics 
            ORDER BY calculated_at DESC 
            LIMIT 10  -- 最新10件は保持
          );
        END;
      `);

      logger.debug('Price statistics triggers created successfully');
    } catch (error) {
      logger.error('Failed to create price statistics triggers:', error);
    }
  }

  // アラートテーブルの正規化マイグレーション
  private migrateAlertsTable(db: Database.Database): void {
    try {
      // 現在のalertsテーブル構造を確認
      const tableInfo = db.prepare(`
        PRAGMA table_info(alerts)
      `).all() as any[];

      const hasLegacyFields = tableInfo.some(col => 
        ['message', 'price_data', 'game_name', 'game_id', 'previous_low', 'release_date'].includes(col.name)
      );

      if (hasLegacyFields) {
        logger.info('Migrating alerts table to normalized structure...');
        
        // 新しい正規化テーブルを作成
        db.exec(`
          CREATE TABLE IF NOT EXISTS alerts_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            steam_app_id INTEGER NOT NULL,
            alert_type TEXT NOT NULL CHECK(alert_type IN ('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released', 'test')),
            triggered_price REAL,
            threshold_value REAL,
            discount_percent INTEGER,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            notified_discord BOOLEAN NOT NULL DEFAULT 0,
            is_read BOOLEAN NOT NULL DEFAULT 0,
            metadata TEXT,
            FOREIGN KEY (steam_app_id) REFERENCES games(steam_app_id) ON DELETE CASCADE
          )
        `);

        // 既存データを新テーブルにマイグレーション
        const migrateStmt = db.prepare(`
          INSERT INTO alerts_new (
            steam_app_id, alert_type, triggered_price, threshold_value, 
            discount_percent, created_at, updated_at, notified_discord, is_read, metadata
          )
          SELECT 
            steam_app_id,
            alert_type,
            COALESCE(trigger_price, triggered_price) as triggered_price,
            NULL as threshold_value,
            discount_percent,
            created_at,
            updated_at,
            COALESCE(notified_discord, 0) as notified_discord,
            COALESCE(is_read, 0) as is_read,
            CASE 
              WHEN message IS NOT NULL OR price_data IS NOT NULL OR game_name IS NOT NULL 
              THEN json_object(
                'legacy_message', message,
                'legacy_price_data', price_data,
                'legacy_game_name', game_name,
                'legacy_previous_low', previous_low,
                'legacy_release_date', release_date
              )
              ELSE NULL
            END as metadata
          FROM alerts
        `);
        
        const migrationResult = migrateStmt.run();
        logger.info(`Migrated ${migrationResult.changes} alert records to normalized structure`);
        
        // 古いテーブルを削除し、新しいテーブルをリネーム
        db.exec('DROP TABLE alerts');
        db.exec('ALTER TABLE alerts_new RENAME TO alerts');
        
        logger.info('Alerts table normalization completed successfully');
      } else {
        logger.debug('Alerts table already normalized, skipping migration');
      }
    } catch (error) {
      logger.error('Failed to migrate alerts table:', error);
    }
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

  // データクリーンアップ（拡張版）
  cleanupOldData(daysToKeep: number = 30): { 
    priceHistory: number, 
    alerts: number, 
    epicGames: number,
    logs: number 
  } {
    try {
      const db = this.getConnection();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      // トランザクションで複数のクリーンアップを実行
      const cleanup = db.transaction(() => {
        // 1. 古い価格履歴を削除（最新100件は保持）
        const priceHistoryResult = db.prepare(`
          DELETE FROM price_history 
          WHERE recorded_at < ? 
          AND id NOT IN (
            SELECT id FROM price_history 
            WHERE steam_app_id = price_history.steam_app_id 
            ORDER BY recorded_at DESC 
            LIMIT 100
          )
        `).run(cutoffDate.toISOString());
        
        // 2. 古いアラートを削除（既読のみ）
        const alertsResult = db.prepare(`
          DELETE FROM alerts 
          WHERE created_at < ? 
          AND is_read = 1
        `).run(cutoffDate.toISOString());
        
        // 3. 期限切れのEpic無料ゲームを削除
        const epicGamesResult = db.prepare(`
          DELETE FROM epic_free_games 
          WHERE end_date < date('now', '-90 days') 
          AND is_claimed = 0
        `).run();
        
        // 4. 古いログデータを削除（もしログテーブルがあれば）
        let logsDeleted = 0;
        const logTableExists = db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='logs'
        `).get();
        
        if (logTableExists) {
          const logsResult = db.prepare(`
            DELETE FROM logs 
            WHERE created_at < ?
          `).run(cutoffDate.toISOString());
          logsDeleted = logsResult.changes;
        }
        
        return {
          priceHistory: priceHistoryResult.changes,
          alerts: alertsResult.changes,
          epicGames: epicGamesResult.changes,
          logs: logsDeleted
        };
      });
      
      const results = cleanup();
      
      logger.info(`Data cleanup completed:`, {
        priceHistory: results.priceHistory,
        alerts: results.alerts,
        epicGames: results.epicGames,
        logs: results.logs,
        totalDeleted: results.priceHistory + results.alerts + results.epicGames + results.logs
      });
      
      // VACUUM実行（データベースサイズ最適化）
      if (results.priceHistory + results.alerts > 1000) {
        logger.info('Running VACUUM to optimize database size...');
        db.exec('VACUUM');
      }
      
      return results;
    } catch (error) {
      logger.error('Failed to cleanup old data:', error);
      return { priceHistory: 0, alerts: 0, epicGames: 0, logs: 0 };
    }
  }
}

export default new DatabaseManager();