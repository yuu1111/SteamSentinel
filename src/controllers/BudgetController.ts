import { Request, Response } from 'express';
import logger from '../utils/logger';
import budgetModel from '../models/BudgetModel';

export class BudgetController {
  
  // 予算一覧取得
  async getAllBudgets(_req: Request, res: Response): Promise<void> {
    try {
      const budgets = budgetModel.getAllBudgets();
      res.json(budgets);
    } catch (error) {
      logger.error('Failed to get all budgets:', error);
      res.status(500).json({ error: 'Failed to get budgets' });
    }
  }

  // アクティブな予算のみ取得
  async getActiveBudgets(_req: Request, res: Response): Promise<void> {
    try {
      const budgets = budgetModel.getActiveBudgets();
      res.json(budgets);
    } catch (error) {
      logger.error('Failed to get active budgets:', error);
      res.status(500).json({ error: 'Failed to get active budgets' });
    }
  }

  // 予算詳細取得
  async getBudgetById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid budget ID' });
        return;
      }

      const budget = budgetModel.getBudgetById(id);
      if (!budget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      res.json(budget);
    } catch (error) {
      logger.error('Failed to get budget by id:', error);
      res.status(500).json({ error: 'Failed to get budget' });
    }
  }

  // 予算作成
  async createBudget(req: Request, res: Response): Promise<void> {
    try {
      const { name, period_type, budget_amount, start_date, end_date, category_filter, is_active } = req.body;

      // バリデーション
      if (!name || !period_type || !budget_amount || !start_date) {
        res.status(400).json({ error: 'Missing required fields: name, period_type, budget_amount, start_date' });
        return;
      }

      if (!['monthly', 'yearly', 'custom'].includes(period_type)) {
        res.status(400).json({ error: 'Invalid period_type. Must be monthly, yearly, or custom' });
        return;
      }

      if (budget_amount <= 0) {
        res.status(400).json({ error: 'Budget amount must be greater than 0' });
        return;
      }

      // 日付フォーマット検証
      if (!this.isValidDate(start_date)) {
        res.status(400).json({ error: 'Invalid start_date format. Use YYYY-MM-DD' });
        return;
      }

      if (end_date && !this.isValidDate(end_date)) {
        res.status(400).json({ error: 'Invalid end_date format. Use YYYY-MM-DD' });
        return;
      }

      // 期間チェック
      if (end_date && new Date(start_date) >= new Date(end_date)) {
        res.status(400).json({ error: 'End date must be after start date' });
        return;
      }

      const budgetData = {
        name,
        period_type,
        budget_amount: parseFloat(budget_amount),
        start_date,
        end_date,
        category_filter: category_filter ? JSON.stringify(category_filter) : undefined,
        is_active: is_active !== false // デフォルトはtrue
      };

      const budgetId = budgetModel.createBudget(budgetData);
      const newBudget = budgetModel.getBudgetById(budgetId);

      res.status(201).json(newBudget);
    } catch (error) {
      logger.error('Failed to create budget:', error);
      res.status(500).json({ error: 'Failed to create budget' });
    }
  }

  // 予算更新
  async updateBudget(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid budget ID' });
        return;
      }

      const existingBudget = budgetModel.getBudgetById(id);
      if (!existingBudget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      const updates: any = {};
      const { name, period_type, budget_amount, start_date, end_date, category_filter, is_active } = req.body;

      if (name !== undefined) updates.name = name;
      if (period_type !== undefined) {
        if (!['monthly', 'yearly', 'custom'].includes(period_type)) {
          res.status(400).json({ error: 'Invalid period_type. Must be monthly, yearly, or custom' });
          return;
        }
        updates.period_type = period_type;
      }
      if (budget_amount !== undefined) {
        if (budget_amount <= 0) {
          res.status(400).json({ error: 'Budget amount must be greater than 0' });
          return;
        }
        updates.budget_amount = parseFloat(budget_amount);
      }
      if (start_date !== undefined) {
        if (!this.isValidDate(start_date)) {
          res.status(400).json({ error: 'Invalid start_date format. Use YYYY-MM-DD' });
          return;
        }
        updates.start_date = start_date;
      }
      if (end_date !== undefined) {
        if (end_date && !this.isValidDate(end_date)) {
          res.status(400).json({ error: 'Invalid end_date format. Use YYYY-MM-DD' });
          return;
        }
        updates.end_date = end_date;
      }
      if (category_filter !== undefined) {
        updates.category_filter = category_filter ? JSON.stringify(category_filter) : null;
      }
      if (is_active !== undefined) {
        updates.is_active = is_active;
      }

      const success = budgetModel.updateBudget(id, updates);
      if (!success) {
        res.status(404).json({ error: 'Budget not found or no changes made' });
        return;
      }

      const updatedBudget = budgetModel.getBudgetById(id);
      res.json(updatedBudget);
    } catch (error) {
      logger.error('Failed to update budget:', error);
      res.status(500).json({ error: 'Failed to update budget' });
    }
  }

  // 予算削除
  async deleteBudget(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid budget ID' });
        return;
      }

      const success = budgetModel.deleteBudget(id);
      if (!success) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete budget:', error);
      res.status(500).json({ error: 'Failed to delete budget' });
    }
  }

  // 予算サマリー取得
  async getBudgetSummaries(req: Request, res: Response): Promise<void> {
    try {
      const { start_date, end_date } = req.query;
      
      let summaries;
      if (start_date && end_date) {
        if (!this.isValidDate(start_date as string) || !this.isValidDate(end_date as string)) {
          res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
          return;
        }
        summaries = budgetModel.getBudgetSummaryForPeriod(start_date as string, end_date as string);
      } else {
        summaries = budgetModel.getBudgetSummaries();
      }

      res.json(summaries);
    } catch (error) {
      logger.error('Failed to get budget summaries:', error);
      res.status(500).json({ error: 'Failed to get budget summaries' });
    }
  }

  // 予算支出記録追加
  async addExpense(req: Request, res: Response): Promise<void> {
    try {
      const budgetId = parseInt(req.params.id);
      if (isNaN(budgetId)) {
        res.status(400).json({ error: 'Invalid budget ID' });
        return;
      }

      const budget = budgetModel.getBudgetById(budgetId);
      if (!budget) {
        res.status(404).json({ error: 'Budget not found' });
        return;
      }

      const { steam_app_id, game_name, amount, purchase_date, category } = req.body;

      if (!amount || !purchase_date) {
        res.status(400).json({ error: 'Missing required fields: amount, purchase_date' });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({ error: 'Amount must be greater than 0' });
        return;
      }

      if (!this.isValidDate(purchase_date)) {
        res.status(400).json({ error: 'Invalid purchase_date format. Use YYYY-MM-DD' });
        return;
      }

      const expenseData = {
        budget_id: budgetId,
        steam_app_id: steam_app_id ? parseInt(steam_app_id) : undefined,
        game_name,
        amount: parseFloat(amount),
        purchase_date,
        category
      };

      const expenseId = budgetModel.addExpense(expenseData);
      res.status(201).json({ id: expenseId, message: 'Expense added successfully' });
    } catch (error) {
      logger.error('Failed to add expense:', error);
      res.status(500).json({ error: 'Failed to add expense' });
    }
  }

  // 予算支出記録取得
  async getBudgetExpenses(req: Request, res: Response): Promise<void> {
    try {
      const budgetId = parseInt(req.params.id);
      if (isNaN(budgetId)) {
        res.status(400).json({ error: 'Invalid budget ID' });
        return;
      }

      const expenses = budgetModel.getBudgetExpenses(budgetId);
      res.json(expenses);
    } catch (error) {
      logger.error('Failed to get budget expenses:', error);
      res.status(500).json({ error: 'Failed to get budget expenses' });
    }
  }

  // 支出削除
  async deleteExpense(req: Request, res: Response): Promise<void> {
    try {
      const expenseId = parseInt(req.params.expenseId);
      if (isNaN(expenseId)) {
        res.status(400).json({ error: 'Invalid expense ID' });
        return;
      }

      const success = budgetModel.deleteExpense(expenseId);
      if (!success) {
        res.status(404).json({ error: 'Expense not found' });
        return;
      }

      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete expense:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  }

  // 月間予算自動作成
  async createMonthlyBudget(req: Request, res: Response): Promise<void> {
    try {
      const { name, amount, year, month } = req.body;

      if (!name || !amount || !year || !month) {
        res.status(400).json({ error: 'Missing required fields: name, amount, year, month' });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({ error: 'Amount must be greater than 0' });
        return;
      }

      if (month < 1 || month > 12) {
        res.status(400).json({ error: 'Month must be between 1 and 12' });
        return;
      }

      const budgetId = budgetModel.createMonthlyBudget(name, parseFloat(amount), parseInt(year), parseInt(month));
      const newBudget = budgetModel.getBudgetById(budgetId);

      res.status(201).json(newBudget);
    } catch (error) {
      logger.error('Failed to create monthly budget:', error);
      res.status(500).json({ error: 'Failed to create monthly budget' });
    }
  }

  // 年間予算自動作成
  async createYearlyBudget(req: Request, res: Response): Promise<void> {
    try {
      const { name, amount, year } = req.body;

      if (!name || !amount || !year) {
        res.status(400).json({ error: 'Missing required fields: name, amount, year' });
        return;
      }

      if (amount <= 0) {
        res.status(400).json({ error: 'Amount must be greater than 0' });
        return;
      }

      const budgetId = budgetModel.createYearlyBudget(name, parseFloat(amount), parseInt(year));
      const newBudget = budgetModel.getBudgetById(budgetId);

      res.status(201).json(newBudget);
    } catch (error) {
      logger.error('Failed to create yearly budget:', error);
      res.status(500).json({ error: 'Failed to create yearly budget' });
    }
  }

  // ヘルパーメソッド: 日付フォーマット検証
  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

export default new BudgetController();