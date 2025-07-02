import Database from 'better-sqlite3';
import logger from '../utils/logger';
import database from '../db/database';

export interface EpicFreeGame {
  id?: number;
  title: string;
  description?: string;
  epic_url?: string;
  image_url?: string;
  start_date?: string; // ISO date string
  end_date?: string;   // ISO date string
  is_claimed: boolean;
  claimed_date?: string; // ISO date string
  discovered_at: string; // ISO date string
  updated_at: string;    // ISO date string
}

export class EpicGamesModel {
  private getDb(): Database.Database {
    return database.getConnection();
  }

  // Epic無料ゲーム一覧取得
  getAllGames(): EpicFreeGame[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM epic_free_games 
        ORDER BY discovered_at DESC
      `);
      return stmt.all() as EpicFreeGame[];
    } catch (error) {
      logger.error('Failed to get all Epic free games:', error);
      throw error;
    }
  }

  // 未受け取りゲーム取得
  getUnclaimedGames(): EpicFreeGame[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM epic_free_games 
        WHERE is_claimed = 0
        ORDER BY discovered_at DESC
      `);
      return stmt.all() as EpicFreeGame[];
    } catch (error) {
      logger.error('Failed to get unclaimed Epic free games:', error);
      throw error;
    }
  }

  // アクティブな無料ゲーム取得（期限内）
  getActiveGames(): EpicFreeGame[] {
    try {
      const now = new Date().toISOString();
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM epic_free_games 
        WHERE (end_date > ? OR end_date IS NULL)
        AND (start_date <= ? OR start_date IS NULL)
        ORDER BY discovered_at DESC
      `);
      return stmt.all(now, now) as EpicFreeGame[];
    } catch (error) {
      logger.error('Failed to get active Epic free games:', error);
      throw error;
    }
  }

  // 特定ゲーム取得
  getGameById(id: number): EpicFreeGame | null {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM epic_free_games WHERE id = ?
      `);
      return stmt.get(id) as EpicFreeGame | null;
    } catch (error) {
      logger.error('Failed to get Epic free game by id:', error);
      throw error;
    }
  }

  // タイトルでゲーム検索
  getGameByTitle(title: string): EpicFreeGame | null {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM epic_free_games 
        WHERE title = ? 
        ORDER BY discovered_at DESC 
        LIMIT 1
      `);
      return stmt.get(title) as EpicFreeGame | null;
    } catch (error) {
      logger.error('Failed to get Epic free game by title:', error);
      throw error;
    }
  }

  // 新しいゲーム追加
  addGame(game: Omit<EpicFreeGame, 'id' | 'discovered_at' | 'updated_at'>): number {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        INSERT INTO epic_free_games (
          title, description, epic_url, image_url, start_date, end_date,
          is_claimed, claimed_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        game.title,
        game.description || null,
        game.epic_url || null,
        game.image_url || null,
        game.start_date || null,
        game.end_date || null,
        game.is_claimed ? 1 : 0,
        game.claimed_date || null
      );
      
      logger.info(`Epic free game added with id: ${result.lastInsertRowid}`);
      return result.lastInsertRowid as number;
    } catch (error) {
      logger.error('Failed to add Epic free game:', error);
      throw error;
    }
  }

  // ゲーム情報更新
  updateGame(id: number, updates: Partial<Omit<EpicFreeGame, 'id' | 'discovered_at' | 'updated_at'>>): boolean {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      
      if (updates.title !== undefined) {
        updateFields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.epic_url !== undefined) {
        updateFields.push('epic_url = ?');
        values.push(updates.epic_url);
      }
      if (updates.image_url !== undefined) {
        updateFields.push('image_url = ?');
        values.push(updates.image_url);
      }
      if (updates.start_date !== undefined) {
        updateFields.push('start_date = ?');
        values.push(updates.start_date);
      }
      if (updates.end_date !== undefined) {
        updateFields.push('end_date = ?');
        values.push(updates.end_date);
      }
      if (updates.is_claimed !== undefined) {
        updateFields.push('is_claimed = ?');
        values.push(updates.is_claimed ? 1 : 0);
      }
      if (updates.claimed_date !== undefined) {
        updateFields.push('claimed_date = ?');
        values.push(updates.claimed_date);
      }
      
      if (updateFields.length === 0) {
        return false;
      }
      
      values.push(id);
      
      const db = this.getDb();
      const stmt = db.prepare(`
        UPDATE epic_free_games 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `);
      
      const result = stmt.run(...values);
      logger.info(`Epic free game ${id} updated, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to update Epic free game:', error);
      throw error;
    }
  }

  // 受け取り状態切り替え
  toggleClaimedStatus(id: number): boolean {
    try {
      const game = this.getGameById(id);
      if (!game) {
        return false;
      }
      
      const newClaimedStatus = !game.is_claimed;
      const claimedDate = newClaimedStatus ? new Date().toISOString() : undefined;
      
      return this.updateGame(id, {
        is_claimed: newClaimedStatus,
        claimed_date: claimedDate
      });
    } catch (error) {
      logger.error('Failed to toggle claimed status:', error);
      throw error;
    }
  }

  // ゲーム削除
  deleteGame(id: number): boolean {
    try {
      const db = this.getDb();
      const stmt = db.prepare('DELETE FROM epic_free_games WHERE id = ?');
      const result = stmt.run(id);
      logger.info(`Epic free game ${id} deleted, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to delete Epic free game:', error);
      throw error;
    }
  }

  // 統計情報取得
  getStatistics() {
    try {
      const db = this.getDb();
      const totalStmt = db.prepare('SELECT COUNT(*) as total FROM epic_free_games');
      const claimedStmt = db.prepare('SELECT COUNT(*) as claimed FROM epic_free_games WHERE is_claimed = 1');
      const activeStmt = db.prepare(`
        SELECT COUNT(*) as active 
        FROM epic_free_games 
        WHERE (end_date > ? OR end_date IS NULL)
        AND (start_date <= ? OR start_date IS NULL)
      `);
      
      const now = new Date().toISOString();
      
      const total = (totalStmt.get() as any).total;
      const claimed = (claimedStmt.get() as any).claimed;
      const active = (activeStmt.get(now, now) as any).active;
      
      return {
        total,
        claimed,
        unclaimed: total - claimed,
        active,
        claimRate: total > 0 ? Math.round((claimed / total) * 100) : 0
      };
    } catch (error) {
      logger.error('Failed to get Epic free games statistics:', error);
      throw error;
    }
  }


  // 重複ゲームチェック
  isDuplicateGame(title: string, startDate?: string): boolean {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM epic_free_games 
        WHERE title = ? AND (start_date = ? OR start_date IS NULL)
      `);
      
      const result = stmt.get(title, startDate || null) as any;
      return result.count > 0;
    } catch (error) {
      logger.error('Failed to check for duplicate Epic free game:', error);
      throw error;
    }
  }

  // 互換性メソッド - エイリアス
  getCurrentGames(): EpicFreeGame[] {
    return this.getActiveGames();
  }

  markAsClaimed(id: number): boolean {
    return this.updateGame(id, { 
      is_claimed: true, 
      claimed_date: new Date().toISOString() 
    });
  }

  markAsUnclaimed(id: number): boolean {
    return this.updateGame(id, { 
      is_claimed: false, 
      claimed_date: undefined 
    });
  }

  getStats() {
    return this.getStatistics();
  }

  findByTitle(title: string): EpicFreeGame | null {
    return this.getGameByTitle(title);
  }

  create(game: Omit<EpicFreeGame, 'id' | 'discovered_at' | 'updated_at'>): number {
    return this.addGame(game);
  }

  // 期限切れの日付を修正するメソッド
  public fixExpiredDates(): number {
    try {
      const db = this.getDb();
      
      // 2026年になっているゲームを2025年に修正
      const stmt = db.prepare(`
        UPDATE epic_free_games 
        SET end_date = REPLACE(end_date, '2026-', '2025-'),
            updated_at = datetime('now')
        WHERE end_date LIKE '2026-%'
      `);
      
      const result = stmt.run();
      logger.info(`Fixed ${result.changes} Epic games with incorrect 2026 dates`);
      return result.changes || 0;
    } catch (error) {
      logger.error('Failed to fix Epic game dates:', error);
      throw error;
    }
  }
}

export default new EpicGamesModel();