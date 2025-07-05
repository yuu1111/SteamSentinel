import { Request, Response } from 'express';
import { PriceHistoryModel } from '../models/PriceHistory';
import { GameModel } from '../models/Game';
import { ApiResponseHelper, BaseController, PerformanceHelper } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import database from '../db/database';

export class PriceController extends BaseController {
    // GET /api/v1/prices/history/:appId - 価格履歴取得
    async getPriceHistory(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const steamAppId = parseInt(req.params.appId);
            const days = parseInt(req.query.days as string) || 30;
            const limit = parseInt(req.query.limit as string) || 100;

            if (isNaN(steamAppId)) {
                return ApiResponseHelper.badRequest(res, '無効なSteam App IDです');
            }

            if (days < 1 || days > 365) {
                return ApiResponseHelper.badRequest(res, '日数は1〜365の範囲で指定してください');
            }

            // ゲームの存在確認
            const game = GameModel.getBySteamAppId(steamAppId);
            if (!game) {
                return ApiResponseHelper.notFound(res, 'ゲーム');
            }

            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);
            const priceHistory = PriceHistoryModel.getByGameId(steamAppId, limit, fromDate);
            
            ApiResponseHelper.success(res, {
                game: {
                    steam_app_id: game.steam_app_id,
                    name: game.name
                },
                priceHistory,
                meta: {
                    days,
                    recordCount: priceHistory.length
                }
            }, `${days}日間の価格履歴を取得しました`, 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get price history:', error);
            ApiResponseHelper.error(res, '価格履歴の取得に失敗しました', 500, error);
        }
    }

    // GET /api/v1/prices/latest/:appId - 最新価格取得
    async getLatestPrice(req: Request, res: Response): Promise<void> {
        try {
            const steamAppId = parseInt(req.params.appId);

            if (isNaN(steamAppId)) {
                return ApiResponseHelper.badRequest(res, '無効なSteam App IDです');
            }

            const db = database.getConnection();
            const latestPrice = db.prepare(`
                SELECT lp.*, g.name as game_name
                FROM latest_prices lp
                JOIN games g ON g.steam_app_id = lp.steam_app_id
                WHERE lp.steam_app_id = ?
            `).get(steamAppId) as any;

            if (!latestPrice) {
                return ApiResponseHelper.notFound(res, '価格情報');
            }

            ApiResponseHelper.success(res, latestPrice);

        } catch (error) {
            logger.error('Failed to get latest price:', error);
            ApiResponseHelper.error(res, '最新価格の取得に失敗しました', 500, error);
        }
    }

    // GET /api/v1/prices/statistics - 価格統計取得
    async getPriceStatistics(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const db = database.getConnection();
            
            // 基本統計を取得
            const stats = db.prepare(`
                SELECT 
                    COUNT(DISTINCT lp.steam_app_id) as total_games,
                    COUNT(CASE WHEN lp.is_on_sale = 1 THEN 1 END) as games_on_sale,
                    ROUND(AVG(CASE WHEN lp.is_on_sale = 1 THEN lp.discount_percent END), 2) as avg_discount,
                    ROUND(SUM(CASE WHEN lp.is_on_sale = 1 THEN (lp.original_price - lp.current_price) END), 2) as total_savings,
                    MIN(lp.current_price) as lowest_price,
                    MAX(lp.discount_percent) as highest_discount
                FROM latest_prices lp
                JOIN games g ON g.steam_app_id = lp.steam_app_id
                WHERE g.enabled = 1
            `).get() as any;

            // トップ割引ゲーム
            const topDiscounts = db.prepare(`
                SELECT 
                    lp.steam_app_id,
                    g.name,
                    lp.current_price,
                    lp.original_price,
                    lp.discount_percent,
                    lp.source
                FROM latest_prices lp
                JOIN games g ON g.steam_app_id = lp.steam_app_id
                WHERE lp.is_on_sale = 1 AND g.enabled = 1
                ORDER BY lp.discount_percent DESC
                LIMIT 10
            `).all();

            // 最安値更新ゲーム（直近7日）
            const recentLows = db.prepare(`
                SELECT 
                    lp.steam_app_id,
                    g.name,
                    lp.current_price,
                    lp.historical_low,
                    lp.all_time_low_date
                FROM latest_prices lp
                JOIN games g ON g.steam_app_id = lp.steam_app_id
                WHERE lp.all_time_low_date >= date('now', '-7 days')
                ORDER BY lp.all_time_low_date DESC
                LIMIT 10
            `).all();

            ApiResponseHelper.success(res, {
                overview: stats,
                topDiscounts,
                recentHistoricalLows: recentLows
            }, '価格統計を取得しました', 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get price statistics:', error);
            ApiResponseHelper.error(res, '価格統計の取得に失敗しました', 500, error);
        }
    }

    // POST /api/v1/prices/track - 価格追跡開始（認証必須）
    async startTracking(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                return ApiResponseHelper.unauthorized(res);
            }

            const { steamAppIds } = req.body;

            if (!Array.isArray(steamAppIds) || steamAppIds.length === 0) {
                return ApiResponseHelper.badRequest(res, '追跡するゲームのIDを指定してください');
            }

            if (steamAppIds.length > 10) {
                return ApiResponseHelper.badRequest(res, '一度に追跡できるゲームは10個までです');
            }

            const db = database.getConnection();
            const results = [];

            for (const steamAppId of steamAppIds) {
                try {
                    // ゲームが存在するかチェック
                    const game = GameModel.getBySteamAppId(steamAppId);
                    if (!game) {
                        results.push({
                            steam_app_id: steamAppId,
                            success: false,
                            error: 'ゲームが見つかりません'
                        });
                        continue;
                    }

                    // 追跡を有効化
                    db.prepare(`
                        UPDATE games 
                        SET enabled = 1, alert_enabled = 1, updated_at = CURRENT_TIMESTAMP
                        WHERE steam_app_id = ?
                    `).run(steamAppId);

                    results.push({
                        steam_app_id: steamAppId,
                        game_name: game.name,
                        success: true
                    });

                } catch (error) {
                    results.push({
                        steam_app_id: steamAppId,
                        success: false,
                        error: 'データベースエラー'
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            
            ApiResponseHelper.success(res, {
                results,
                summary: {
                    total: steamAppIds.length,
                    successful: successCount,
                    failed: steamAppIds.length - successCount
                }
            }, `${successCount}個のゲームの価格追跡を開始しました`);

        } catch (error) {
            logger.error('Failed to start price tracking:', error);
            ApiResponseHelper.error(res, '価格追跡の開始に失敗しました', 500, error);
        }
    }

    // DELETE /api/v1/prices/track/:appId - 価格追跡停止（認証必須）
    async stopTracking(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                return ApiResponseHelper.unauthorized(res);
            }

            const steamAppId = parseInt(req.params.appId);

            if (isNaN(steamAppId)) {
                return ApiResponseHelper.badRequest(res, '無効なSteam App IDです');
            }

            const db = database.getConnection();
            const result = db.prepare(`
                UPDATE games 
                SET enabled = 0, alert_enabled = 0, updated_at = CURRENT_TIMESTAMP
                WHERE steam_app_id = ?
            `).run(steamAppId);

            if (result.changes === 0) {
                return ApiResponseHelper.notFound(res, 'ゲーム');
            }

            ApiResponseHelper.success(res, {
                steam_app_id: steamAppId
            }, '価格追跡を停止しました');

        } catch (error) {
            logger.error('Failed to stop price tracking:', error);
            ApiResponseHelper.error(res, '価格追跡の停止に失敗しました', 500, error);
        }
    }

    // GET /api/v1/prices/alerts/potential - アラート候補取得
    async getPotentialAlerts(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const thresholdPercent = parseInt(req.query.threshold as string) || 50;
            
            if (thresholdPercent < 10 || thresholdPercent > 90) {
                return ApiResponseHelper.badRequest(res, '閾値は10〜90%の範囲で指定してください');
            }

            const db = database.getConnection();
            const potentialAlerts = db.prepare(`
                SELECT 
                    g.steam_app_id,
                    g.name,
                    g.price_threshold,
                    lp.current_price,
                    lp.original_price,
                    lp.discount_percent,
                    lp.historical_low,
                    lp.is_on_sale,
                    CASE 
                        WHEN lp.current_price <= COALESCE(g.price_threshold, lp.historical_low)
                        THEN 'threshold_met'
                        WHEN lp.current_price <= lp.historical_low
                        THEN 'new_low'
                        WHEN lp.discount_percent >= ?
                        THEN 'high_discount'
                        ELSE 'none'
                    END as alert_reason
                FROM games g
                JOIN latest_prices lp ON g.steam_app_id = lp.steam_app_id
                WHERE g.enabled = 1 
                AND g.alert_enabled = 1
                AND (
                    lp.current_price <= COALESCE(g.price_threshold, lp.historical_low)
                    OR lp.current_price <= lp.historical_low
                    OR lp.discount_percent >= ?
                )
                ORDER BY 
                    CASE 
                        WHEN lp.current_price <= lp.historical_low THEN 1
                        WHEN lp.current_price <= COALESCE(g.price_threshold, 999999) THEN 2
                        ELSE 3
                    END,
                    lp.discount_percent DESC
                LIMIT 50
            `).all(thresholdPercent, thresholdPercent);

            ApiResponseHelper.success(res, {
                potentialAlerts,
                meta: {
                    threshold: thresholdPercent,
                    count: potentialAlerts.length
                }
            }, `${potentialAlerts.length}件のアラート候補を取得しました`, 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get potential alerts:', error);
            ApiResponseHelper.error(res, 'アラート候補の取得に失敗しました', 500, error);
        }
    }
}