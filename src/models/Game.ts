import database from '../db/database';
import { Game } from '../types';
import logger from '../utils/logger';

export class GameModel {
  // 全ゲーム取得（最新価格データを含む）
  static getAll(enabledOnly: boolean = false): Game[] {
    try {
      const db = database.getConnection();
      const query = enabledOnly 
        ? `SELECT g.*, 
             ph.current_price, ph.original_price, ph.discount_percent, ph.is_on_sale, 
             ph.source, ph.recorded_at, ph.historical_low
           FROM games g
           LEFT JOIN (
             SELECT steam_app_id, 
                    current_price, original_price, discount_percent, is_on_sale,
                    source, recorded_at, historical_low,
                    ROW_NUMBER() OVER (PARTITION BY steam_app_id ORDER BY recorded_at DESC) as rn
             FROM price_history
           ) ph ON g.steam_app_id = ph.steam_app_id AND ph.rn = 1
           WHERE g.enabled = 1 
           ORDER BY g.name`
        : `SELECT g.*, 
             ph.current_price, ph.original_price, ph.discount_percent, ph.is_on_sale,
             ph.source, ph.recorded_at, ph.historical_low
           FROM games g
           LEFT JOIN (
             SELECT steam_app_id, 
                    current_price, original_price, discount_percent, is_on_sale,
                    source, recorded_at, historical_low,
                    ROW_NUMBER() OVER (PARTITION BY steam_app_id ORDER BY recorded_at DESC) as rn
             FROM price_history
           ) ph ON g.steam_app_id = ph.steam_app_id AND ph.rn = 1
           ORDER BY g.name`;
      
      const rawGames = db.prepare(query).all() as any[];
      
      // 価格データをlatestPriceとして整形
      return rawGames.map(row => {
        const game: Game = {
          id: row.id,
          steam_app_id: row.steam_app_id,
          name: row.name,
          enabled: !!row.enabled,
          alert_enabled: !!row.alert_enabled,
          price_threshold: row.price_threshold,
          price_threshold_type: row.price_threshold_type,
          discount_threshold_percent: row.discount_threshold_percent,
          manual_historical_low: row.manual_historical_low,
          is_purchased: !!row.is_purchased,
          purchase_price: row.purchase_price,
          purchase_date: row.purchase_date,
          was_unreleased: !!row.was_unreleased,
          last_known_release_date: row.last_known_release_date,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        
        // 価格データがある場合はlatestPriceを追加
        if (row.current_price !== null) {
          game.latestPrice = {
            current_price: row.current_price,
            original_price: row.original_price,
            discount_percent: row.discount_percent,
            is_on_sale: !!row.is_on_sale,
            source: row.source,
            recorded_at: row.recorded_at,
            historical_low: row.historical_low,
            all_time_low: row.all_time_low || 0
          };
        }
        
        return game;
      });
    } catch (error) {
      logger.error('Failed to fetch games:', error);
      throw error;
    }
  }

  // ID でゲーム取得
  static getById(id: number): Game | null {
    try {
      const db = database.getConnection();
      const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as Game | undefined;
      return game || null;
    } catch (error) {
      logger.error(`Failed to fetch game with id ${id}:`, error);
      throw error;
    }
  }

  // Steam App ID でゲーム取得
  static getBySteamAppId(steamAppId: number): Game | null {
    try {
      const db = database.getConnection();
      const game = db.prepare('SELECT * FROM games WHERE steam_app_id = ?').get(steamAppId) as Game | undefined;
      return game || null;
    } catch (error) {
      logger.error(`Failed to fetch game with steam_app_id ${steamAppId}:`, error);
      throw error;
    }
  }

  // ゲーム追加
  static create(game: Omit<Game, 'id' | 'created_at' | 'updated_at'>): Game {
    try {
      const db = database.getConnection();
      const stmt = db.prepare(`
        INSERT INTO games (steam_app_id, name, enabled, price_threshold, price_threshold_type, discount_threshold_percent, alert_enabled, was_unreleased, last_known_release_date)
        VALUES (@steam_app_id, @name, @enabled, @price_threshold, @price_threshold_type, @discount_threshold_percent, @alert_enabled, @was_unreleased, @last_known_release_date)
      `);
      
      const info = stmt.run({
        steam_app_id: game.steam_app_id,
        name: game.name,
        enabled: game.enabled ? 1 : 0,
        price_threshold: game.price_threshold || null,
        price_threshold_type: game.price_threshold_type || 'price',
        discount_threshold_percent: game.discount_threshold_percent || null,
        alert_enabled: game.alert_enabled ? 1 : 0,
        was_unreleased: game.was_unreleased ? 1 : 0,
        last_known_release_date: game.last_known_release_date || null
      });
      
      logger.info(`Game added: ${game.name} (${game.steam_app_id})`);
      return this.getById(info.lastInsertRowid as number)!;
    } catch (error) {
      logger.error('Failed to create game:', error);
      throw error;
    }
  }

  // ゲーム更新
  static update(id: number, updates: Partial<Omit<Game, 'id' | 'created_at' | 'updated_at'>>): Game | null {
    try {
      const db = database.getConnection();
      const game = this.getById(id);
      
      if (!game) {
        return null;
      }
      
      const fields = [];
      const values: any = { id };
      
      if (updates.name !== undefined) {
        fields.push('name = @name');
        values.name = updates.name;
      }
      
      if (updates.enabled !== undefined) {
        fields.push('enabled = @enabled');
        values.enabled = updates.enabled ? 1 : 0;
      }
      
      if (updates.price_threshold !== undefined) {
        fields.push('price_threshold = @price_threshold');
        values.price_threshold = updates.price_threshold;
      }
      
      if (updates.price_threshold_type !== undefined) {
        fields.push('price_threshold_type = @price_threshold_type');
        values.price_threshold_type = updates.price_threshold_type;
      }
      
      if (updates.discount_threshold_percent !== undefined) {
        fields.push('discount_threshold_percent = @discount_threshold_percent');
        values.discount_threshold_percent = updates.discount_threshold_percent;
      }
      
      if (updates.alert_enabled !== undefined) {
        fields.push('alert_enabled = @alert_enabled');
        values.alert_enabled = updates.alert_enabled ? 1 : 0;
      }
      
      if (updates.manual_historical_low !== undefined) {
        fields.push('manual_historical_low = @manual_historical_low');
        values.manual_historical_low = updates.manual_historical_low;
      }
      
      if (updates.is_purchased !== undefined) {
        fields.push('is_purchased = @is_purchased');
        values.is_purchased = updates.is_purchased ? 1 : 0;
      }
      
      if (updates.purchase_price !== undefined) {
        fields.push('purchase_price = @purchase_price');
        values.purchase_price = updates.purchase_price;
      }
      
      if (updates.purchase_date !== undefined) {
        fields.push('purchase_date = @purchase_date');
        values.purchase_date = updates.purchase_date;
      }
      
      if (updates.was_unreleased !== undefined) {
        fields.push('was_unreleased = @was_unreleased');
        values.was_unreleased = updates.was_unreleased ? 1 : 0;
      }
      
      if (updates.last_known_release_date !== undefined) {
        fields.push('last_known_release_date = @last_known_release_date');
        values.last_known_release_date = updates.last_known_release_date;
      }
      
      if (fields.length === 0) {
        return game;
      }
      
      const query = `UPDATE games SET ${fields.join(', ')} WHERE id = @id`;
      db.prepare(query).run(values);
      
      logger.info(`Game updated: ${game.name} (${game.steam_app_id})`);
      return this.getById(id);
    } catch (error) {
      logger.error(`Failed to update game ${id}:`, error);
      throw error;
    }
  }

  // ゲーム削除
  static delete(id: number): boolean {
    try {
      const db = database.getConnection();
      const game = this.getById(id);
      
      if (!game) {
        return false;
      }
      
      // 関連データも削除（カスケード）
      db.transaction(() => {
        db.prepare('DELETE FROM alerts WHERE steam_app_id = ?').run(game.steam_app_id);
        db.prepare('DELETE FROM price_history WHERE steam_app_id = ?').run(game.steam_app_id);
        db.prepare('DELETE FROM games WHERE id = ?').run(id);
      })();
      
      logger.info(`Game deleted: ${game.name} (${game.steam_app_id})`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete game ${id}:`, error);
      throw error;
    }
  }

  // バルク追加（プリセットゲーム用）
  static bulkCreate(games: Array<Omit<Game, 'id' | 'created_at' | 'updated_at'>>): number {
    try {
      const db = database.getConnection();
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO games (steam_app_id, name, enabled, price_threshold, price_threshold_type, discount_threshold_percent, alert_enabled, was_unreleased, last_known_release_date)
        VALUES (@steam_app_id, @name, @enabled, @price_threshold, @price_threshold_type, @discount_threshold_percent, @alert_enabled, @was_unreleased, @last_known_release_date)
      `);
      
      let inserted = 0;
      db.transaction(() => {
        for (const game of games) {
          const info = stmt.run({
            steam_app_id: game.steam_app_id,
            name: game.name,
            enabled: game.enabled ? 1 : 0,
            price_threshold: game.price_threshold || null,
            price_threshold_type: game.price_threshold_type || 'price',
            discount_threshold_percent: game.discount_threshold_percent || null,
            alert_enabled: game.alert_enabled ? 1 : 0,
            was_unreleased: game.was_unreleased ? 1 : 0,
            last_known_release_date: game.last_known_release_date || null
          });
          if (info.changes > 0) {inserted++;}
        }
      })();
      
      logger.info(`Bulk insert completed: ${inserted} games added`);
      return inserted;
    } catch (error) {
      logger.error('Failed to bulk create games:', error);
      throw error;
    }
  }

  // 有効なゲーム数を取得
  static getEnabledCount(): number {
    try {
      const db = database.getConnection();
      const result = db.prepare('SELECT COUNT(*) as count FROM games WHERE enabled = 1').get() as { count: number };
      return result.count;
    } catch (error) {
      logger.error('Failed to count enabled games:', error);
      throw error;
    }
  }

  // 購入済みゲーム取得
  static getPurchasedGames(startDate?: Date | null): Game[] {
    try {
      const db = database.getConnection();
      let query = 'SELECT * FROM games WHERE is_purchased = 1';
      const params: any[] = [];
      
      if (startDate) {
        query += ' AND purchase_date >= ?';
        params.push(startDate.toISOString());
      }
      
      query += ' ORDER BY purchase_date DESC';
      
      return db.prepare(query).all(...params) as Game[];
    } catch (error) {
      logger.error('Failed to fetch purchased games:', error);
      throw error;
    }
  }

  // 複数のSteam App IDでゲーム取得（AlertController用）
  static getByMultipleSteamAppIds(steamAppIds: number[]): Game[] {
    try {
      const db = database.getConnection();
      
      if (steamAppIds.length === 0) {
        return [];
      }
      
      const placeholders = steamAppIds.map(() => '?').join(',');
      const query = `SELECT * FROM games WHERE steam_app_id IN (${placeholders})`;
      
      return db.prepare(query).all(...steamAppIds) as Game[];
    } catch (error) {
      logger.error('Failed to fetch games by multiple steam app ids:', error);
      throw error;
    }
  }

  // 最新価格付きでゲーム取得（N+1問題解決）
  static getAllWithLatestPrices(enabledOnly: boolean = false): Game[] {
    try {
      const db = database.getConnection();
      
      // latest_prices テーブルが存在する場合はそれを使用、なければ従来のクエリ
      const query = enabledOnly 
        ? `SELECT g.*, 
             lp.current_price, lp.original_price, lp.discount_percent, lp.is_on_sale, 
             lp.source, lp.recorded_at, lp.historical_low, lp.all_time_low_date
           FROM games g
           LEFT JOIN latest_prices lp ON g.steam_app_id = lp.steam_app_id
           WHERE g.enabled = 1 
           ORDER BY g.name`
        : `SELECT g.*, 
             lp.current_price, lp.original_price, lp.discount_percent, lp.is_on_sale,
             lp.source, lp.recorded_at, lp.historical_low, lp.all_time_low_date
           FROM games g
           LEFT JOIN latest_prices lp ON g.steam_app_id = lp.steam_app_id
           ORDER BY g.name`;
      
      const rawGames = db.prepare(query).all() as any[];
      
      // 価格データをlatestPriceとして整形
      return rawGames.map(row => {
        const game: Game = {
          id: row.id,
          steam_app_id: row.steam_app_id,
          name: row.name,
          enabled: !!row.enabled,
          alert_enabled: !!row.alert_enabled,
          price_threshold: row.price_threshold,
          price_threshold_type: row.price_threshold_type,
          discount_threshold_percent: row.discount_threshold_percent,
          manual_historical_low: row.manual_historical_low,
          is_purchased: !!row.is_purchased,
          purchase_price: row.purchase_price,
          purchase_date: row.purchase_date,
          was_unreleased: !!row.was_unreleased,
          last_known_release_date: row.last_known_release_date,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
        
        // 価格データがある場合はlatestPriceを追加
        if (row.current_price !== null) {
          game.latestPrice = {
            current_price: row.current_price,
            original_price: row.original_price,
            discount_percent: row.discount_percent,
            is_on_sale: !!row.is_on_sale,
            source: row.source,
            recorded_at: row.recorded_at,
            historical_low: row.historical_low,
            all_time_low: row.all_time_low || 0,
            all_time_low_date: row.all_time_low_date
          };
        }
        
        return game;
      });
    } catch (error) {
      logger.error('Failed to fetch games with latest prices:', error);
      // latest_pricesテーブルがない場合は従来のクエリにフォールバック
      logger.warn('Falling back to legacy query');
      return this.getAll(enabledOnly);
    }
  }
}