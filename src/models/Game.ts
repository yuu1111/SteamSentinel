import database from '../db/database';
import { Game } from '../types';
import logger from '../utils/logger';

export class GameModel {
  // 全ゲーム取得
  static getAll(enabledOnly: boolean = false): Game[] {
    try {
      const db = database.getConnection();
      const query = enabledOnly 
        ? 'SELECT * FROM games WHERE enabled = 1 ORDER BY name'
        : 'SELECT * FROM games ORDER BY name';
      
      return db.prepare(query).all() as Game[];
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
        INSERT INTO games (steam_app_id, name, enabled, price_threshold, price_threshold_type, discount_threshold_percent, alert_enabled)
        VALUES (@steam_app_id, @name, @enabled, @price_threshold, @price_threshold_type, @discount_threshold_percent, @alert_enabled)
      `);
      
      const info = stmt.run({
        steam_app_id: game.steam_app_id,
        name: game.name,
        enabled: game.enabled ? 1 : 0,
        price_threshold: game.price_threshold || null,
        price_threshold_type: game.price_threshold_type || 'price',
        discount_threshold_percent: game.discount_threshold_percent || null,
        alert_enabled: game.alert_enabled ? 1 : 0
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
        INSERT OR IGNORE INTO games (steam_app_id, name, enabled, price_threshold, price_threshold_type, discount_threshold_percent, alert_enabled)
        VALUES (@steam_app_id, @name, @enabled, @price_threshold, @price_threshold_type, @discount_threshold_percent, @alert_enabled)
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
            alert_enabled: game.alert_enabled ? 1 : 0
          });
          if (info.changes > 0) inserted++;
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
}