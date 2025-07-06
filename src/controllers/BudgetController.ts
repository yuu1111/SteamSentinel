import { Request, Response } from 'express';
import { ApiResponseHelper, BaseController } from '../utils/apiResponse';
import logger from '../utils/logger';
import budgetModel from '../models/BudgetModel';

export class BudgetController extends BaseController {
  
  // 予算一覧取得
  async getAllBudgets(req: Request, res: Response): Promise<void> {
    try {
      const pagination = this.getPaginationParams(req.query);
      const budgets = budgetModel.getAllBudgets(pagination);
      const total = budgetModel.getBudgetsCount();
      
      ApiResponseHelper.paginated(
        res,
        budgets,
        total,
        pagination,
        `${budgets.length}件の予算を取得しました`
      );
    } catch (error) {
      logger.error('Failed to get all budgets:', error);
      ApiResponseHelper.error(res, '予算一覧の取得に失敗しました', 500, error);
    }
  }

  // アクティブな予算のみ取得
  async getActiveBudgets(req: Request, res: Response): Promise<void> {
    try {
      const pagination = this.getPaginationParams(req.query);
      const budgets = budgetModel.getActiveBudgets(pagination);
      const total = budgetModel.getActiveBudgetsCount();
      
      ApiResponseHelper.paginated(
        res,
        budgets,
        total,
        pagination,
        `${budgets.length}件のアクティブな予算を取得しました`
      );
    } catch (error) {
      logger.error('Failed to get active budgets:', error);
      ApiResponseHelper.error(res, 'アクティブな予算の取得に失敗しました', 500, error);
    }
  }

  // 予算詳細取得
  async getBudgetById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        ApiResponseHelper.badRequest(res, '無効な予算IDです');
        return;
      }

      const budget = budgetModel.getBudgetById(id);
      if (!budget) {
        ApiResponseHelper.notFound(res, '予算');
        return;
      }

      ApiResponseHelper.success(res, budget, '予算詳細を取得しました');
    } catch (error) {
      logger.error('Failed to get budget by id:', error);
      ApiResponseHelper.error(res, '予算詳細の取得に失敗しました', 500, error);
    }
  }

  // 予算作成
  async createBudget(req: Request, res: Response): Promise<void> {
    try {
      const { name, period_type, budget_amount, start_date, end_date, category_filter, is_active } = req.body;

      // バリデーション
      if (!name || !period_type || !budget_amount || !start_date) {
        ApiResponseHelper.badRequest(res, '必須フィールドが不足しています: name, period_type, budget_amount, start_date');
        return;
      }

      if (!['monthly', 'yearly', 'custom'].includes(period_type)) {
        ApiResponseHelper.badRequest(res, '無効なperiod_typeです。monthly、yearly、customのいずれかを指定してください');
        return;
      }

      if (budget_amount <= 0) {
        ApiResponseHelper.badRequest(res, '予算額は0より大きい値である必要があります');
        return;
      }

      // 日付フォーマット検証
      if (!this.isValidDate(start_date)) {
        ApiResponseHelper.badRequest(res, '無効な開始日形式です。YYYY-MM-DD形式を使用してください');
        return;
      }

      if (end_date && !this.isValidDate(end_date)) {
        ApiResponseHelper.badRequest(res, '無効な終了日形式です。YYYY-MM-DD形式を使用してください');
        return;
      }

      // 期間チェック
      if (end_date && new Date(start_date) >= new Date(end_date)) {
        ApiResponseHelper.badRequest(res, '終了日は開始日より後である必要があります');
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

      ApiResponseHelper.success(res, newBudget, '予算が正常に作成されました', 201);
    } catch (error) {
      logger.error('Failed to create budget:', error);
      ApiResponseHelper.error(res, '予算の作成に失敗しました', 500, error);
    }
  }

  // 予算更新
  async updateBudget(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        ApiResponseHelper.badRequest(res, '無効な予算IDです');
        return;
      }

      const existingBudget = budgetModel.getBudgetById(id);
      if (!existingBudget) {
        ApiResponseHelper.notFound(res, '予算');
        return;
      }

      const updates: any = {};
      const { name, period_type, budget_amount, start_date, end_date, category_filter, is_active } = req.body;

      if (name !== undefined) updates.name = name;
      if (period_type !== undefined) {
        if (!['monthly', 'yearly', 'custom'].includes(period_type)) {
          ApiResponseHelper.badRequest(res, '無効なperiod_typeです。monthly、yearly、customのいずれかを指定してください');
          return;
        }
        updates.period_type = period_type;
      }
      if (budget_amount !== undefined) {
        if (budget_amount <= 0) {
          ApiResponseHelper.badRequest(res, '予算額は0より大きい値である必要があります');
          return;
        }
        updates.budget_amount = parseFloat(budget_amount);
      }
      if (start_date !== undefined) {
        if (!this.isValidDate(start_date)) {
          ApiResponseHelper.badRequest(res, '無効な開始日形式です。YYYY-MM-DD形式を使用してください');
          return;
        }
        updates.start_date = start_date;
      }
      if (end_date !== undefined) {
        if (end_date && !this.isValidDate(end_date)) {
          ApiResponseHelper.badRequest(res, '無効な終了日形式です。YYYY-MM-DD形式を使用してください');
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
        ApiResponseHelper.notFound(res, '予算が見つからないか、変更がありません');
        return;
      }

      const updatedBudget = budgetModel.getBudgetById(id);
      ApiResponseHelper.success(res, updatedBudget, '予算が正常に更新されました');
    } catch (error) {
      logger.error('Failed to update budget:', error);
      ApiResponseHelper.error(res, '予算の更新に失敗しました', 500, error);
    }
  }

  // 予算削除
  async deleteBudget(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        ApiResponseHelper.badRequest(res, '無効な予算IDです');
        return;
      }

      const success = budgetModel.deleteBudget(id);
      if (!success) {
        ApiResponseHelper.notFound(res, '予算');
        return;
      }

      ApiResponseHelper.success(res, null, '予算が正常に削除されました');
    } catch (error) {
      logger.error('Failed to delete budget:', error);
      ApiResponseHelper.error(res, '予算の削除に失敗しました', 500, error);
    }
  }

  // 予算サマリー取得
  async getBudgetSummaries(req: Request, res: Response): Promise<void> {
    try {
      const { start_date, end_date } = req.query;
      
      let summaries;
      if (start_date && end_date) {
        if (!this.isValidDate(start_date as string) || !this.isValidDate(end_date as string)) {
          ApiResponseHelper.badRequest(res, '無効な日付形式です。YYYY-MM-DD形式を使用してください');
          return;
        }
        summaries = budgetModel.getBudgetSummaryForPeriod(start_date as string, end_date as string);
      } else {
        summaries = budgetModel.getBudgetSummaries();
      }

      ApiResponseHelper.success(res, summaries, '予算サマリーを取得しました');
    } catch (error) {
      logger.error('Failed to get budget summaries:', error);
      ApiResponseHelper.error(res, '予算サマリーの取得に失敗しました', 500, error);
    }
  }

  // 予算支出記録追加
  async addExpense(req: Request, res: Response): Promise<void> {
    try {
      const budgetId = parseInt(req.params.id);
      if (isNaN(budgetId)) {
        ApiResponseHelper.badRequest(res, '無効な予算IDです');
        return;
      }

      const budget = budgetModel.getBudgetById(budgetId);
      if (!budget) {
        ApiResponseHelper.notFound(res, '予算');
        return;
      }

      const { steam_app_id, game_name, amount, purchase_date, category } = req.body;

      if (!amount || !purchase_date) {
        ApiResponseHelper.badRequest(res, '必須フィールドが不足しています: amount, purchase_date');
        return;
      }

      if (amount <= 0) {
        ApiResponseHelper.badRequest(res, '金額は0より大きい値である必要があります');
        return;
      }

      if (!this.isValidDate(purchase_date)) {
        ApiResponseHelper.badRequest(res, '無効な購入日形式です。YYYY-MM-DD形式を使用してください');
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
      ApiResponseHelper.success(res, { id: expenseId }, '支出が正常に追加されました', 201);
    } catch (error) {
      logger.error('Failed to add expense:', error);
      ApiResponseHelper.error(res, '支出の追加に失敗しました', 500, error);
    }
  }

  // 予算支出記録取得
  async getBudgetExpenses(req: Request, res: Response): Promise<void> {
    try {
      const budgetId = parseInt(req.params.id);
      if (isNaN(budgetId)) {
        ApiResponseHelper.badRequest(res, '無効な予算IDです');
        return;
      }

      const pagination = this.getPaginationParams(req.query);
      const expenses = budgetModel.getBudgetExpenses(budgetId, pagination);
      const total = budgetModel.getBudgetExpensesCount(budgetId);
      
      ApiResponseHelper.paginated(
        res,
        expenses,
        total,
        pagination,
        `${expenses.length}件の予算支出記録を取得しました`
      );
    } catch (error) {
      logger.error('Failed to get budget expenses:', error);
      ApiResponseHelper.error(res, '予算支出記録の取得に失敗しました', 500, error);
    }
  }

  // 支出削除
  async deleteExpense(req: Request, res: Response): Promise<void> {
    try {
      const expenseId = parseInt(req.params.expenseId);
      if (isNaN(expenseId)) {
        ApiResponseHelper.badRequest(res, '無効な支出IDです');
        return;
      }

      const success = budgetModel.deleteExpense(expenseId);
      if (!success) {
        ApiResponseHelper.notFound(res, '支出');
        return;
      }

      ApiResponseHelper.success(res, null, '支出が正常に削除されました');
    } catch (error) {
      logger.error('Failed to delete expense:', error);
      ApiResponseHelper.error(res, '支出の削除に失敗しました', 500, error);
    }
  }

  // 月間予算自動作成
  async createMonthlyBudget(req: Request, res: Response): Promise<void> {
    try {
      const { name, amount, year, month } = req.body;

      if (!name || !amount || !year || !month) {
        ApiResponseHelper.badRequest(res, '必須フィールドが不足しています: name, amount, year, month');
        return;
      }

      if (amount <= 0) {
        ApiResponseHelper.badRequest(res, '金額は0より大きい値である必要があります');
        return;
      }

      if (month < 1 || month > 12) {
        ApiResponseHelper.badRequest(res, '月は1から12の間である必要があります');
        return;
      }

      const budgetId = budgetModel.createMonthlyBudget(name, parseFloat(amount), parseInt(year), parseInt(month));
      const newBudget = budgetModel.getBudgetById(budgetId);

      ApiResponseHelper.success(res, newBudget, '月間予算が正常に作成されました', 201);
    } catch (error) {
      logger.error('Failed to create monthly budget:', error);
      ApiResponseHelper.error(res, '月間予算の作成に失敗しました', 500, error);
    }
  }

  // 年間予算自動作成
  async createYearlyBudget(req: Request, res: Response): Promise<void> {
    try {
      const { name, amount, year } = req.body;

      if (!name || !amount || !year) {
        ApiResponseHelper.badRequest(res, '必須フィールドが不足しています: name, amount, year');
        return;
      }

      if (amount <= 0) {
        ApiResponseHelper.badRequest(res, '金額は0より大きい値である必要があります');
        return;
      }

      const budgetId = budgetModel.createYearlyBudget(name, parseFloat(amount), parseInt(year));
      const newBudget = budgetModel.getBudgetById(budgetId);

      ApiResponseHelper.success(res, newBudget, '年間予算が正常に作成されました', 201);
    } catch (error) {
      logger.error('Failed to create yearly budget:', error);
      ApiResponseHelper.error(res, '年間予算の作成に失敗しました', 500, error);
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