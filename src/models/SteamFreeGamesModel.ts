import database from '../db/database';
import logger from '../utils/logger';

export interface SteamFreeGame {
  id?: number;
  app_id: number;
  title: string;
  description?: string;
  steam_url: string;
  start_date?: string;
  end_date?: string;
  is_expired?: boolean;
  is_claimed?: boolean;
  claimed_date?: string;
  discovered_at?: string;
  updated_at?: string;
}

export class SteamFreeGamesModel {
  constructor() {
    // シングルトンのデータベースインスタンスを使用
  }

  async create(game: SteamFreeGame): Promise<number> {
    const sql = `
      INSERT INTO steam_free_games (app_id, title, description, steam_url, start_date, end_date, is_expired, discovered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = database.getConnection().prepare(sql);
    const result = stmt.run([
      game.app_id,
      game.title,
      game.description || null,
      game.steam_url,
      game.start_date || null,
      game.end_date || null,
      game.is_expired ? 1 : 0,
      game.discovered_at || new Date().toISOString()
    ]);
    
    return result.lastInsertRowid as number;
  }

  async findByAppId(appId: number): Promise<SteamFreeGame | null> {
    const sql = 'SELECT * FROM steam_free_games WHERE app_id = ?';
    const stmt = database.getConnection().prepare(sql);
    const result = stmt.get([appId]) as SteamFreeGame | undefined;
    return result || null;
  }

  async getAll(): Promise<SteamFreeGame[]> {
    const sql = 'SELECT * FROM steam_free_games ORDER BY discovered_at DESC';
    const stmt = database.getConnection().prepare(sql);
    return stmt.all() as SteamFreeGame[];
  }

  async getActiveGames(): Promise<SteamFreeGame[]> {
    const sql = `
      SELECT * FROM steam_free_games 
      WHERE is_claimed = 0 AND is_expired = 0
      ORDER BY discovered_at DESC
    `;
    const stmt = database.getConnection().prepare(sql);
    return stmt.all() as SteamFreeGame[];
  }

  async getClaimedGames(): Promise<SteamFreeGame[]> {
    const sql = `
      SELECT * FROM steam_free_games 
      WHERE is_claimed = 1 
      ORDER BY claimed_date DESC
    `;
    const stmt = database.getConnection().prepare(sql);
    return stmt.all() as SteamFreeGame[];
  }

  async markAsClaimed(id: number): Promise<void> {
    const sql = `
      UPDATE steam_free_games 
      SET is_claimed = 1, claimed_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const stmt = database.getConnection().prepare(sql);
    stmt.run([id]);
    
    // 受け取った無料ゲームをゲーム一覧に追加（簡易実装）
    const freeGame = await this.findById(id);
    if (freeGame) {
      try {
        // 基本的なゲーム追加ロジック
        const gameInsertSql = `
          INSERT OR IGNORE INTO games (steam_app_id, name, enabled, purchased, purchase_date, purchase_price)
          VALUES (?, ?, 1, 1, ?, 0)
        `;
        const gameStmt = database.getConnection().prepare(gameInsertSql);
        gameStmt.run([
          freeGame.app_id,
          freeGame.title,
          new Date().toISOString().split('T')[0]
        ]);
        
        logger.info(`Free game "${freeGame.title}" added to game list`);
      } catch (error) {
        logger.error('Error adding free game to game list:', error);
      }
    }
  }

  async markAsUnclaimed(id: number): Promise<void> {
    const sql = `
      UPDATE steam_free_games 
      SET is_claimed = 0, claimed_date = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const stmt = database.getConnection().prepare(sql);
    stmt.run([id]);
  }

  async markAsExpired(appId: number): Promise<void> {
    const sql = `
      UPDATE steam_free_games 
      SET is_expired = 1, updated_at = CURRENT_TIMESTAMP
      WHERE app_id = ?
    `;
    
    const stmt = database.getConnection().prepare(sql);
    stmt.run([appId]);
    logger.info(`Steam free game marked as expired: App ID ${appId}`);
  }

  async findById(id: number): Promise<SteamFreeGame | null> {
    const sql = 'SELECT * FROM steam_free_games WHERE id = ?';
    const stmt = database.getConnection().prepare(sql);
    const result = stmt.get([id]) as SteamFreeGame | undefined;
    return result || null;
  }

  async getStats(): Promise<{
    total: number;
    claimed: number;
    unclaimed: number;
    claimRate: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_claimed = 1 THEN 1 ELSE 0 END) as claimed,
        SUM(CASE WHEN is_claimed = 0 THEN 1 ELSE 0 END) as unclaimed
      FROM steam_free_games
    `;
    
    const stmt = database.getConnection().prepare(sql);
    const result = stmt.get() as any;
    const total = result?.total || 0;
    const claimed = result?.claimed || 0;
    const unclaimed = result?.unclaimed || 0;
    
    return {
      total,
      claimed,
      unclaimed,
      claimRate: total > 0 ? (claimed / total) * 100 : 0
    };
  }

  async deleteOldUnclaimed(daysOld: number = 30): Promise<number> {
    const sql = `
      DELETE FROM steam_free_games 
      WHERE is_claimed = 0 
      AND julianday('now') - julianday(discovered_at) > ?
    `;
    
    const stmt = database.getConnection().prepare(sql);
    const result = stmt.run([daysOld]);
    return result.changes || 0;
  }
}