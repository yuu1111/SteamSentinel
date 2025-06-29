import { Router } from 'express';
import budgetController from '../controllers/BudgetController';

const router = Router();

// 予算一覧取得
router.get('/', budgetController.getAllBudgets.bind(budgetController));

// アクティブな予算のみ取得
router.get('/active', budgetController.getActiveBudgets.bind(budgetController));

// 予算サマリー取得
router.get('/summaries', budgetController.getBudgetSummaries.bind(budgetController));

// 月間予算自動作成
router.post('/monthly', budgetController.createMonthlyBudget.bind(budgetController));

// 年間予算自動作成
router.post('/yearly', budgetController.createYearlyBudget.bind(budgetController));

// 予算作成
router.post('/', budgetController.createBudget.bind(budgetController));

// 予算詳細取得
router.get('/:id', budgetController.getBudgetById.bind(budgetController));

// 予算更新
router.put('/:id', budgetController.updateBudget.bind(budgetController));

// 予算削除
router.delete('/:id', budgetController.deleteBudget.bind(budgetController));

// 予算支出記録取得
router.get('/:id/expenses', budgetController.getBudgetExpenses.bind(budgetController));

// 予算支出記録追加
router.post('/:id/expenses', budgetController.addExpense.bind(budgetController));

// 支出削除
router.delete('/:id/expenses/:expenseId', budgetController.deleteExpense.bind(budgetController));

export default router;