import Database from 'better-sqlite3';
import logger from '../utils/logger';
import database from '../db/database';

export interface Budget {
  id: number;
  name: string;
  period_type: 'monthly' | 'yearly' | 'custom';
  budget_amount: number;
  start_date: string;
  end_date?: string;
  category_filter?: string; // JSON array
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetExpense {
  id: number;
  budget_id: number;
  steam_app_id?: number;
  game_name?: string;
  amount: number;
  purchase_date: string;
  category?: string;
  created_at: string;
}

export interface BudgetSummary {
  id: number;
  name: string;
  budget_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_percentage: number;
  period_type: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export class BudgetModel {
  private getDb(): Database.Database {
    return database.getConnection();
  }

  // 予算一覧取得
  getAllBudgets(): Budget[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM budgets 
        ORDER BY created_at DESC
      `);
      return stmt.all() as Budget[];
    } catch (error) {
      logger.error('Failed to get all budgets:', error);
      throw error;
    }
  }

  // アクティブな予算のみ取得
  getActiveBudgets(): Budget[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM budgets 
        WHERE is_active = 1
        ORDER BY created_at DESC
      `);
      return stmt.all() as Budget[];
    } catch (error) {
      logger.error('Failed to get active budgets:', error);
      throw error;
    }
  }

  // 予算詳細取得
  getBudgetById(id: number): Budget | null {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM budgets WHERE id = ?
      `);
      return stmt.get(id) as Budget | null;
    } catch (error) {
      logger.error('Failed to get budget by id:', error);
      throw error;
    }
  }

  // 予算作成
  createBudget(budget: Omit<Budget, 'id' | 'created_at' | 'updated_at'>): number {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        INSERT INTO budgets (
          name, period_type, budget_amount, start_date, end_date, 
          category_filter, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        budget.name,
        budget.period_type,
        budget.budget_amount,
        budget.start_date,
        budget.end_date || null,
        budget.category_filter || null,
        budget.is_active ? 1 : 0
      );
      
      logger.info(`Budget created with id: ${result.lastInsertRowid}`);
      return result.lastInsertRowid as number;
    } catch (error) {
      logger.error('Failed to create budget:', error);
      throw error;
    }
  }

  // 予算更新
  updateBudget(id: number, budget: Partial<Omit<Budget, 'id' | 'created_at' | 'updated_at'>>): boolean {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (budget.name !== undefined) {
        updates.push('name = ?');
        values.push(budget.name);
      }
      if (budget.period_type !== undefined) {
        updates.push('period_type = ?');
        values.push(budget.period_type);
      }
      if (budget.budget_amount !== undefined) {
        updates.push('budget_amount = ?');
        values.push(budget.budget_amount);
      }
      if (budget.start_date !== undefined) {
        updates.push('start_date = ?');
        values.push(budget.start_date);
      }
      if (budget.end_date !== undefined) {
        updates.push('end_date = ?');
        values.push(budget.end_date);
      }
      if (budget.category_filter !== undefined) {
        updates.push('category_filter = ?');
        values.push(budget.category_filter);
      }
      if (budget.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(budget.is_active ? 1 : 0);
      }
      
      if (updates.length === 0) {
        return false;
      }
      
      values.push(id);
      
      const db = this.getDb();
      const stmt = db.prepare(`
        UPDATE budgets 
        SET ${updates.join(', ')}
        WHERE id = ?
      `);
      
      const result = stmt.run(...values);
      logger.info(`Budget ${id} updated, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to update budget:', error);
      throw error;
    }
  }

  // 予算削除
  deleteBudget(id: number): boolean {
    try {
      const db = this.getDb();
      const stmt = db.prepare('DELETE FROM budgets WHERE id = ?');
      const result = stmt.run(id);
      logger.info(`Budget ${id} deleted, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to delete budget:', error);
      throw error;
    }
  }

  // 予算支出記録追加
  addExpense(expense: Omit<BudgetExpense, 'id' | 'created_at'>): number {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        INSERT INTO budget_expenses (
          budget_id, steam_app_id, game_name, amount, purchase_date, category
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        expense.budget_id,
        expense.steam_app_id || null,
        expense.game_name || null,
        expense.amount,
        expense.purchase_date,
        expense.category || null
      );
      
      logger.info(`Budget expense added with id: ${result.lastInsertRowid}`);
      return result.lastInsertRowid as number;
    } catch (error) {
      logger.error('Failed to add budget expense:', error);
      throw error;
    }
  }

  // 予算支出記録取得
  getBudgetExpenses(budgetId: number): BudgetExpense[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT * FROM budget_expenses 
        WHERE budget_id = ? 
        ORDER BY purchase_date DESC
      `);
      return stmt.all(budgetId) as BudgetExpense[];
    } catch (error) {
      logger.error('Failed to get budget expenses:', error);
      throw error;
    }
  }

  // 予算サマリー取得
  getBudgetSummaries(): BudgetSummary[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT 
          b.id,
          b.name,
          b.budget_amount,
          b.period_type,
          b.start_date,
          b.end_date,
          b.is_active,
          COALESCE(SUM(be.amount), 0) as spent_amount,
          (b.budget_amount - COALESCE(SUM(be.amount), 0)) as remaining_amount,
          CASE 
            WHEN b.budget_amount > 0 
            THEN ROUND((COALESCE(SUM(be.amount), 0) / b.budget_amount) * 100, 2)
            ELSE 0 
          END as utilization_percentage
        FROM budgets b
        LEFT JOIN budget_expenses be ON b.id = be.budget_id
        GROUP BY b.id, b.name, b.budget_amount, b.period_type, b.start_date, b.end_date, b.is_active
        ORDER BY b.created_at DESC
      `);
      return stmt.all() as BudgetSummary[];
    } catch (error) {
      logger.error('Failed to get budget summaries:', error);
      throw error;
    }
  }

  // 特定期間の予算サマリー取得
  getBudgetSummaryForPeriod(startDate: string, endDate: string): BudgetSummary[] {
    try {
      const db = this.getDb();
      const stmt = db.prepare(`
        SELECT 
          b.id,
          b.name,
          b.budget_amount,
          b.period_type,
          b.start_date,
          b.end_date,
          b.is_active,
          COALESCE(SUM(be.amount), 0) as spent_amount,
          (b.budget_amount - COALESCE(SUM(be.amount), 0)) as remaining_amount,
          CASE 
            WHEN b.budget_amount > 0 
            THEN ROUND((COALESCE(SUM(be.amount), 0) / b.budget_amount) * 100, 2)
            ELSE 0 
          END as utilization_percentage
        FROM budgets b
        LEFT JOIN budget_expenses be ON b.id = be.budget_id 
          AND be.purchase_date BETWEEN ? AND ?
        WHERE (b.start_date <= ? AND (b.end_date >= ? OR b.end_date IS NULL))
        GROUP BY b.id, b.name, b.budget_amount, b.period_type, b.start_date, b.end_date, b.is_active
        ORDER BY b.created_at DESC
      `);
      return stmt.all(startDate, endDate, endDate, startDate) as BudgetSummary[];
    } catch (error) {
      logger.error('Failed to get budget summary for period:', error);
      throw error;
    }
  }

  // 支出削除
  deleteExpense(expenseId: number): boolean {
    try {
      const db = this.getDb();
      const stmt = db.prepare('DELETE FROM budget_expenses WHERE id = ?');
      const result = stmt.run(expenseId);
      logger.info(`Budget expense ${expenseId} deleted, changes: ${result.changes}`);
      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to delete budget expense:', error);
      throw error;
    }
  }

  // 月間予算の自動作成
  createMonthlyBudget(name: string, amount: number, year: number, month: number): number {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // 月末日
    
    return this.createBudget({
      name,
      period_type: 'monthly',
      budget_amount: amount,
      start_date: startDate,
      end_date: endDate,
      is_active: true
    });
  }

  // 年間予算の自動作成
  createYearlyBudget(name: string, amount: number, year: number): number {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    return this.createBudget({
      name,
      period_type: 'yearly',
      budget_amount: amount,
      start_date: startDate,
      end_date: endDate,
      is_active: true
    });
  }
}

export default new BudgetModel();