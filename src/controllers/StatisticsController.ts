import { Request, Response } from 'express';
import { ApiResponseHelper, BaseController, PerformanceHelper } from '../utils/apiResponse';
import logger from '../utils/logger';
import database from '../db/database';

export class StatisticsController extends BaseController {
    // GET /api/v1/statistics/dashboard - ダッシュボード統計
    async getDashboardStatistics(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const db = database.getConnection();
            
            // 事前計算統計を取得（最新データ）
            const precomputedStats = db.prepare(`
                SELECT * FROM price_statistics 
                ORDER BY calculated_at DESC 
                LIMIT 1
            `).get() as any;

            // 基本統計（リアルタイム）
            const basicStats = db.prepare(`
                SELECT 
                    (SELECT COUNT(*) FROM games WHERE is_purchased = 1) as purchased_games,
                    (SELECT COUNT(*) FROM alerts WHERE created_at >= date('now', '-7 days')) as recent_alerts,
                    (SELECT COUNT(*) FROM alerts WHERE is_read = 0) as unread_alerts
            `).get() as any;

            // 統合統計データを構築
            const overview = {
                // 事前計算データ（パフォーマンス最適化）
                total_games: precomputedStats?.total_games || 0,
                monitored_games: precomputedStats?.monitored_games || 0,
                games_on_sale: precomputedStats?.games_on_sale || 0,
                average_discount: precomputedStats?.average_discount || 0,
                total_savings: precomputedStats?.total_savings || 0,
                highest_discount_percent: precomputedStats?.highest_discount_percent || 0,
                lowest_current_price: precomputedStats?.lowest_current_price || 0,
                highest_current_price: precomputedStats?.highest_current_price || 0,
                new_lows_today: precomputedStats?.new_lows_today || 0,
                sale_starts_today: precomputedStats?.sale_starts_today || 0,
                
                // リアルタイムデータ
                purchased_games: basicStats.purchased_games || 0,
                recent_alerts: basicStats.recent_alerts || 0,
                unread_alerts: basicStats.unread_alerts || 0,
                
                // 計算フィールド
                savings_potential: precomputedStats?.total_savings || 0,
                statistics_freshness: precomputedStats?.calculated_at || null
            };

            // 最近のトレンド（7日間）
            const trendsData = db.prepare(`
                SELECT 
                    date(created_at) as date,
                    COUNT(*) as alert_count,
                    COUNT(CASE WHEN alert_type = 'new_low' THEN 1 END) as new_lows,
                    COUNT(CASE WHEN alert_type = 'sale_start' THEN 1 END) as new_sales
                FROM alerts 
                WHERE created_at >= date('now', '-7 days')
                GROUP BY date(created_at)
                ORDER BY date
            `).all();

            // 予算統計
            const budgetStats = db.prepare(`
                SELECT 
                    COUNT(*) as active_budgets,
                    ROUND(SUM(budget_amount), 2) as total_budget_amount,
                    ROUND(SUM(
                        COALESCE((
                            SELECT SUM(amount) 
                            FROM budget_expenses be 
                            WHERE be.budget_id = b.id
                        ), 0)
                    ), 2) as total_spent
                FROM budgets b
                WHERE is_active = 1
            `).get() as any;

            // アラートタイプ別統計
            const alertTypeStats = db.prepare(`
                SELECT 
                    alert_type,
                    COUNT(*) as count,
                    COUNT(CASE WHEN created_at >= date('now', '-7 days') THEN 1 END) as recent_count
                FROM alerts
                GROUP BY alert_type
                ORDER BY count DESC
            `).all();

            ApiResponseHelper.success(res, {
                overview,
                trends: trendsData,
                alertBreakdown: alertTypeStats,
                budget: budgetStats,
                extended_statistics: precomputedStats?.statistics_json ? 
                    JSON.parse(precomputedStats.statistics_json) : null,
                meta: {
                    last_updated: new Date().toISOString(),
                    data_range: '7_days',
                    using_precomputed_data: !!precomputedStats,
                    precomputed_at: precomputedStats?.calculated_at || null
                }
            }, 'ダッシュボード統計を取得しました', 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get dashboard statistics:', error);
            ApiResponseHelper.error(res, 'ダッシュボード統計の取得に失敗しました', 500, error);
        }
    }

    // GET /api/v1/statistics/games - ゲーム統計
    async getGameStatistics(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const period = req.query.period as string || '30d';
            const periodDays = this.parsePeriodToDays(period);

            const db = database.getConnection();
            
            // ゲーム追加統計
            const gameAdditionStats = db.prepare(`
                SELECT 
                    date(created_at) as date,
                    COUNT(*) as games_added
                FROM games 
                WHERE created_at >= date('now', '-${periodDays} days')
                GROUP BY date(created_at)
                ORDER BY date
            `).all();

            // ジャンル・カテゴリ統計（メタデータから推定）
            const gameBreakdown = db.prepare(`
                SELECT 
                    CASE 
                        WHEN enabled = 1 AND is_purchased = 0 THEN 'monitoring'
                        WHEN is_purchased = 1 THEN 'purchased'
                        ELSE 'inactive'
                    END as category,
                    COUNT(*) as count,
                    ROUND(AVG(CASE WHEN is_purchased = 1 THEN purchase_price END), 2) as avg_purchase_price
                FROM games
                GROUP BY category
            `).all();

            // 価格閾値統計
            const thresholdStats = db.prepare(`
                SELECT 
                    CASE 
                        WHEN price_threshold IS NULL THEN 'no_threshold'
                        WHEN price_threshold <= 500 THEN '0-500'
                        WHEN price_threshold <= 1000 THEN '501-1000'
                        WHEN price_threshold <= 2000 THEN '1001-2000'
                        WHEN price_threshold <= 5000 THEN '2001-5000'
                        ELSE '5000+'
                    END as threshold_range,
                    COUNT(*) as count
                FROM games
                WHERE enabled = 1
                GROUP BY threshold_range
                ORDER BY 
                    CASE threshold_range
                        WHEN 'no_threshold' THEN 1
                        WHEN '0-500' THEN 2
                        WHEN '501-1000' THEN 3
                        WHEN '1001-2000' THEN 4
                        WHEN '2001-5000' THEN 5
                        ELSE 6
                    END
            `).all();

            // トップパフォーマンスゲーム（アラート頻度）
            const topAlertGames = db.prepare(`
                SELECT 
                    g.steam_app_id,
                    g.name,
                    COUNT(a.id) as alert_count,
                    MAX(a.created_at) as last_alert,
                    lp.current_price,
                    lp.discount_percent
                FROM games g
                LEFT JOIN alerts a ON g.steam_app_id = a.steam_app_id
                LEFT JOIN latest_prices lp ON g.steam_app_id = lp.steam_app_id
                WHERE g.enabled = 1
                GROUP BY g.steam_app_id, g.name
                ORDER BY alert_count DESC
                LIMIT 10
            `).all();

            ApiResponseHelper.success(res, {
                period: {
                    label: period,
                    days: periodDays
                },
                gameAdditionTrend: gameAdditionStats,
                categoryBreakdown: gameBreakdown,
                thresholdDistribution: thresholdStats,
                topAlertGames,
                summary: {
                    total_games: gameBreakdown.reduce((sum, cat: any) => sum + cat.count, 0),
                    monitoring_games: (gameBreakdown.find((cat: any) => cat.category === 'monitoring') as any)?.count || 0,
                    purchased_games: (gameBreakdown.find((cat: any) => cat.category === 'purchased') as any)?.count || 0
                }
            }, 'ゲーム統計を取得しました', 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get game statistics:', error);
            ApiResponseHelper.error(res, 'ゲーム統計の取得に失敗しました', 500, error);
        }
    }

    // GET /api/v1/statistics/alerts - アラート統計
    async getAlertStatistics(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const period = req.query.period as string || '30d';
            const periodDays = this.parsePeriodToDays(period);

            const db = database.getConnection();
            
            // アラート発生トレンド
            const alertTrend = db.prepare(`
                SELECT 
                    date(created_at) as date,
                    alert_type,
                    COUNT(*) as count
                FROM alerts 
                WHERE created_at >= date('now', '-${periodDays} days')
                GROUP BY date(created_at), alert_type
                ORDER BY date, alert_type
            `).all();

            // アラート効果分析
            const alertEffectiveness = db.prepare(`
                SELECT 
                    alert_type,
                    COUNT(*) as total_alerts,
                    COUNT(CASE WHEN is_read = 1 THEN 1 END) as read_count,
                    COUNT(CASE WHEN notified_discord = 1 THEN 1 END) as discord_sent,
                    ROUND(
                        COUNT(CASE WHEN is_read = 1 THEN 1 END) * 100.0 / COUNT(*), 2
                    ) as read_rate
                FROM alerts
                WHERE created_at >= date('now', '-${periodDays} days')
                GROUP BY alert_type
                ORDER BY total_alerts DESC
            `).all();

            // 時間別パターン分析
            const hourlyPattern = db.prepare(`
                SELECT 
                    CAST(strftime('%H', created_at) AS INTEGER) as hour,
                    COUNT(*) as alert_count
                FROM alerts
                WHERE created_at >= date('now', '-${periodDays} days')
                GROUP BY hour
                ORDER BY hour
            `).all();

            // アラート応答時間統計
            const responseStats = db.prepare(`
                SELECT 
                    alert_type,
                    COUNT(*) as total_alerts,
                    ROUND(AVG(
                        CASE WHEN is_read = 1 
                        THEN (julianday(updated_at) - julianday(created_at)) * 24 * 60
                        END
                    ), 2) as avg_response_minutes
                FROM alerts
                WHERE created_at >= date('now', '-${periodDays} days')
                AND is_read = 1
                GROUP BY alert_type
                ORDER BY avg_response_minutes
            `).all();

            ApiResponseHelper.success(res, {
                period: {
                    label: period,
                    days: periodDays
                },
                alertTrend,
                effectiveness: alertEffectiveness,
                hourlyPattern,
                responseTime: responseStats,
                summary: {
                    total_alerts: alertEffectiveness.reduce((sum, type: any) => sum + type.total_alerts, 0),
                    read_alerts: alertEffectiveness.reduce((sum, type: any) => sum + type.read_count, 0),
                    overall_read_rate: alertEffectiveness.length > 0 ? 
                        Math.round(
                            (alertEffectiveness.reduce((sum, type: any) => sum + type.read_count, 0) as number) * 100 /
                            (alertEffectiveness.reduce((sum, type: any) => sum + type.total_alerts, 0) as number)
                        ) : 0
                }
            }, 'アラート統計を取得しました', 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get alert statistics:', error);
            ApiResponseHelper.error(res, 'アラート統計の取得に失敗しました', 500, error);
        }
    }

    // GET /api/v1/statistics/performance - パフォーマンス統計
    async getPerformanceStatistics(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const db = database.getConnection();
            
            // データベースサイズとパフォーマンス
            const dbStats = db.prepare(`
                SELECT 
                    name,
                    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as table_exists,
                    (SELECT sql FROM sqlite_master WHERE type='table' AND name=m.name) as schema
                FROM (
                    SELECT 'games' as name
                    UNION SELECT 'price_history'
                    UNION SELECT 'latest_prices'
                    UNION SELECT 'alerts'
                    UNION SELECT 'review_scores'
                    UNION SELECT 'budgets'
                ) m
            `).all();

            // テーブル行数統計
            const tableCounts = {
                games: db.prepare('SELECT COUNT(*) as count FROM games').get() as any,
                price_history: db.prepare('SELECT COUNT(*) as count FROM price_history').get() as any,
                latest_prices: db.prepare('SELECT COUNT(*) as count FROM latest_prices').get() as any,
                alerts: db.prepare('SELECT COUNT(*) as count FROM alerts').get() as any,
                review_scores: db.prepare('SELECT COUNT(*) as count FROM review_scores').get() as any,
                budgets: db.prepare('SELECT COUNT(*) as count FROM budgets').get() as any
            };

            // インデックス使用状況
            const indexStats = db.prepare(`
                SELECT name, sql
                FROM sqlite_master 
                WHERE type = 'index' 
                AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `).all();

            // 最近のデータ更新統計
            const updateStats = db.prepare(`
                SELECT 
                    'games' as table_name,
                    MAX(updated_at) as last_updated,
                    COUNT(CASE WHEN updated_at >= date('now', '-1 day') THEN 1 END) as recent_updates
                FROM games
                UNION ALL
                SELECT 
                    'alerts',
                    MAX(updated_at),
                    COUNT(CASE WHEN updated_at >= date('now', '-1 day') THEN 1 END)
                FROM alerts
                UNION ALL
                SELECT 
                    'latest_prices',
                    MAX(recorded_at),
                    COUNT(CASE WHEN recorded_at >= date('now', '-1 day') THEN 1 END)
                FROM latest_prices
            `).all();

            ApiResponseHelper.success(res, {
                database: {
                    tables: dbStats,
                    rowCounts: tableCounts,
                    totalRows: Object.values(tableCounts).reduce((sum: number, table: any) => sum + table.count, 0)
                },
                indexes: {
                    count: indexStats.length,
                    indexes: indexStats
                },
                recentActivity: updateStats,
                performance: {
                    query_time_ms: perf.getPerformanceMeta().query_time_ms,
                    timestamp: new Date().toISOString()
                }
            }, 'パフォーマンス統計を取得しました', 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get performance statistics:', error);
            ApiResponseHelper.error(res, 'パフォーマンス統計の取得に失敗しました', 500, error);
        }
    }

    // GET /api/v1/statistics/export - 統計データエクスポート（認証必須）
    async exportStatistics(req: Request, res: Response): Promise<void> {
        try {
            const format = req.query.format as string || 'json';
            const includeSensitive = req.query.include_sensitive === 'true';

            if (!['json', 'csv'].includes(format)) {
                return ApiResponseHelper.badRequest(res, 'サポートされている形式: json, csv');
            }

            // 統計データを収集
            const dashboardData = await this.getDashboardStatsInternal();
            const gameData = await this.getGameStatsInternal();
            const alertData = await this.getAlertStatsInternal();

            const exportData = {
                exported_at: new Date().toISOString(),
                dashboard: dashboardData,
                games: gameData,
                alerts: alertData
            };

            if (format === 'json') {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="steam-sentinel-stats-${new Date().toISOString().split('T')[0]}.json"`);
                res.json(exportData);
            } else {
                // CSV形式での出力（簡略版）
                const csvData = this.convertToCSV(exportData);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="steam-sentinel-stats-${new Date().toISOString().split('T')[0]}.csv"`);
                res.send(csvData);
            }

        } catch (error) {
            logger.error('Failed to export statistics:', error);
            ApiResponseHelper.error(res, '統計データのエクスポートに失敗しました', 500, error);
        }
    }

    // ヘルパーメソッド
    private parsePeriodToDays(period: string): number {
        const periodMap: { [key: string]: number } = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        };
        
        return periodMap[period] || 30;
    }

    private async getDashboardStatsInternal(): Promise<any> {
        const db = database.getConnection();
        return db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM games) as total_games,
                (SELECT COUNT(*) FROM games WHERE enabled = 1) as monitored_games,
                (SELECT COUNT(*) FROM alerts WHERE created_at >= date('now', '-7 days')) as recent_alerts
        `).get();
    }

    private async getGameStatsInternal(): Promise<any> {
        const db = database.getConnection();
        return db.prepare(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN enabled = 1 THEN 1 END) as monitoring,
                COUNT(CASE WHEN is_purchased = 1 THEN 1 END) as purchased
            FROM games
        `).get();
    }

    private async getAlertStatsInternal(): Promise<any> {
        const db = database.getConnection();
        return db.prepare(`
            SELECT 
                alert_type,
                COUNT(*) as count
            FROM alerts
            WHERE created_at >= date('now', '-30 days')
            GROUP BY alert_type
        `).all();
    }

    private convertToCSV(data: any): string {
        const rows = [
            ['Metric', 'Value'],
            ['Export Date', data.exported_at],
            ['Total Games', data.dashboard.total_games],
            ['Monitored Games', data.dashboard.monitored_games],
            ['Recent Alerts', data.dashboard.recent_alerts]
        ];

        return rows.map(row => row.join(',')).join('\n');
    }
}