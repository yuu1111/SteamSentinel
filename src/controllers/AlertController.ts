import { Request, Response } from 'express';
import { AlertModel, AlertFilters } from '../models/AlertModel';
import { GameModel } from '../models/Game';
import { ApiResponseHelper, BaseController, PerformanceHelper, PaginationOptions } from '../utils/apiResponse';
import logger from '../utils/logger';

export class AlertController extends BaseController {
    // GET /api/alerts
    async getAlerts(req: Request, res: Response): Promise<Response> {
        const perf = new PerformanceHelper();
        
        try {
            const pagination = this.getPaginationParams(req.query) as Required<PaginationOptions>;
            const filters: AlertFilters = {
                alertType: req.query.type as string,
                unread: req.query.unread === 'true',
                steamAppId: req.query.steamAppId ? parseInt(req.query.steamAppId as string) : undefined,
                dateFrom: req.query.dateFrom as string,
                dateTo: req.query.dateTo as string
            };

            // バリデーション
            if (filters.steamAppId && isNaN(filters.steamAppId)) {
                return ApiResponseHelper.badRequest(res, '無効なSteam App IDです');
            }

            const alerts = AlertModel.getFiltered(filters, pagination);
            const total = AlertModel.getCount(filters);

            // ゲーム名を追加取得（JOIN最適化のため別途取得）
            const enrichedAlerts = await this.enrichAlertsWithGameNames(alerts);

            return ApiResponseHelper.paginated(
                res,
                enrichedAlerts,
                total,
                pagination,
                `${alerts.length}件のアラートを取得しました`
            );
        } catch (error) {
            logger.error('Failed to fetch alerts:', error);
            return ApiResponseHelper.error(res, 'アラートの取得に失敗しました', 500, error);
        }
    }

    // GET /api/alerts/:id
    async getAlert(req: Request, res: Response): Promise<Response> {
        try {
            const alertId = parseInt(req.params.id);
            
            if (isNaN(alertId)) {
                return ApiResponseHelper.badRequest(res, '無効なアラートIDです');
            }

            const alert = await AlertModel.getById(alertId);
            
            if (!alert) {
                return ApiResponseHelper.notFound(res, 'アラート');
            }

            // ゲーム情報を追加
            const game = await GameModel.getBySteamAppId(alert.steam_app_id);
            const enrichedAlert = {
                ...alert,
                game_name: game?.name || 'Unknown Game'
            };

            return ApiResponseHelper.success(res, enrichedAlert);
        } catch (error) {
            logger.error('Failed to fetch alert:', error);
            return ApiResponseHelper.error(res, 'アラートの取得に失敗しました', 500, error);
        }
    }

    // PUT /api/alerts/:id/read
    async markAsRead(req: Request, res: Response): Promise<Response> {
        try {
            const alertId = parseInt(req.params.id);
            
            if (isNaN(alertId)) {
                return ApiResponseHelper.badRequest(res, '無効なアラートIDです');
            }

            const result = AlertModel.markAsRead(alertId);
            
            if (!result) {
                return ApiResponseHelper.notFound(res, 'アラート');
            }

            return ApiResponseHelper.success(res, { id: alertId }, 'アラートを既読にしました');
        } catch (error) {
            logger.error('Failed to mark alert as read:', error);
            return ApiResponseHelper.error(res, 'アラートの更新に失敗しました', 500, error);
        }
    }

    // PUT /api/alerts/read-all
    async markAllAsRead(req: Request, res: Response): Promise<Response> {
        try {
            const { alertType, steamAppId } = req.body;
            
            const filters: AlertFilters = {
                alertType,
                steamAppId,
                unread: true
            };

            const updatedCount = await AlertModel.markMultipleAsRead(filters);

            return ApiResponseHelper.success(
                res, 
                { updatedCount }, 
                `${updatedCount}件のアラートを既読にしました`
            );
        } catch (error) {
            logger.error('Failed to mark alerts as read:', error);
            return ApiResponseHelper.error(res, 'アラートの一括更新に失敗しました', 500, error);
        }
    }

    // DELETE /api/alerts/:id
    async deleteAlert(req: Request, res: Response): Promise<Response> {
        try {
            const alertId = parseInt(req.params.id);
            
            if (isNaN(alertId)) {
                return ApiResponseHelper.badRequest(res, '無効なアラートIDです');
            }

            const result = AlertModel.delete(alertId);
            
            if (!result) {
                return ApiResponseHelper.notFound(res, 'アラート');
            }

            return ApiResponseHelper.success(res, { id: alertId }, 'アラートを削除しました');
        } catch (error) {
            logger.error('Failed to delete alert:', error);
            return ApiResponseHelper.error(res, 'アラートの削除に失敗しました', 500, error);
        }
    }

    // DELETE /api/alerts/cleanup
    async cleanup(req: Request, res: Response): Promise<Response> {
        try {
            const { olderThan = 30, readOnly = false } = req.query;
            const days = parseInt(olderThan as string);
            
            if (isNaN(days) || days < 1) {
                return ApiResponseHelper.badRequest(res, '無効な日数です（1以上の数値を指定してください）');
            }

            const deletedCount = await AlertModel.deleteOlderThan(days, readOnly === 'true');
            
            const message = readOnly === 'true' 
                ? `${deletedCount}件の既読アラートを削除しました`
                : `${deletedCount}件のアラートを削除しました`;

            return ApiResponseHelper.success(res, { deletedCount, days }, message);
        } catch (error) {
            logger.error('Failed to cleanup alerts:', error);
            return ApiResponseHelper.error(res, 'アラートのクリーンアップに失敗しました', 500, error);
        }
    }

    // GET /api/alerts/statistics
    async getStatistics(req: Request, res: Response): Promise<Response> {
        const perf = new PerformanceHelper();
        
        try {
            const stats = await AlertModel.getStatistics();
            
            return ApiResponseHelper.success(
                res, 
                stats, 
                'アラート統計を取得しました',
                200,
                { performance: perf.getPerformanceMeta() }
            );
        } catch (error) {
            logger.error('Failed to fetch alert statistics:', error);
            return ApiResponseHelper.error(res, 'アラート統計の取得に失敗しました', 500, error);
        }
    }

    // createTestAlert メソッドを削除（テスト専用機能をプロダクションコードから除去）

    // プライベートヘルパーメソッド
    private async enrichAlertsWithGameNames(alerts: any[]): Promise<any[]> {
        const gameIds = [...new Set(alerts.map(alert => alert.steam_app_id))];
        const games = await GameModel.getByMultipleSteamAppIds(gameIds);
        const gameMap = new Map(games.map(game => [game.steam_app_id, game.name]));

        return alerts.map(alert => ({
            ...alert,
            game_name: gameMap.get(alert.steam_app_id) || 'Unknown Game'
        }));
    }
}