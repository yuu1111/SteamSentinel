import { Request, Response } from 'express';
import { GameModel } from '../models/Game';
import reviewIntegrationService from '../services/ReviewIntegrationService';
import { ApiResponseHelper, BaseController, PerformanceHelper } from '../utils/apiResponse';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';
import database from '../db/database';

export class ReviewController extends BaseController {
    // GET /api/v1/reviews/:appId - ゲームレビュー統合取得
    async getGameReviews(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const steamAppId = parseInt(req.params.appId);
            const includeDetails = req.query.details === 'true';

            if (isNaN(steamAppId)) {
                return ApiResponseHelper.badRequest(res, '無効なSteam App IDです');
            }

            // ゲームの存在確認
            const game = GameModel.getBySteamAppId(steamAppId);
            if (!game) {
                return ApiResponseHelper.notFound(res, 'ゲーム');
            }

            const db = database.getConnection();
            
            // 統合レビュースコアビューから統合データを取得
            const integratedReview = db.prepare(`
                SELECT * FROM integrated_review_scores WHERE steam_app_id = ?
            `).get(steamAppId) as any;

            // review_scores から詳細データを取得
            const reviewScores = db.prepare(`
                SELECT 
                    source, score, max_score, review_count, description, 
                    url, tier, percent_recommended, weight, confidence_level, last_updated
                FROM review_scores 
                WHERE steam_app_id = ?
                ORDER BY 
                    CASE source 
                        WHEN 'steam' THEN 1 
                        WHEN 'metacritic' THEN 2 
                        WHEN 'igdb' THEN 3 
                        ELSE 4 
                    END
            `).all(steamAppId);

            // 統合スコア情報
            const integratedScore = integratedReview?.integrated_score || null;
            const confidence = integratedReview?.confidence || 'low';
            
            // レスポンスデータを構築
            const responseData = {
                steam_app_id: steamAppId,
                game_name: game.name,
                integrated_score: integratedScore,
                confidence: confidence,
                source_count: integratedReview?.source_count || 0,
                total_review_count: integratedReview?.total_review_count || 0,
                score_breakdown: integratedReview?.score_breakdown || '',
                sources: reviewScores.map((score: any) => ({
                    source: score.source,
                    score: score.score,
                    max_score: score.max_score,
                    review_count: score.review_count,
                    description: score.description,
                    url: score.url,
                    tier: score.tier,
                    percent_recommended: score.percent_recommended,
                    weight: score.weight,
                    confidence_level: score.confidence_level,
                    last_updated: score.last_updated,
                    ...(includeDetails && {
                        normalized_score: Math.round((score.score / score.max_score) * 100),
                        source_reliability: this.getSourceReliability(score.source)
                    })
                })),
                last_updated: integratedReview?.last_updated || null
            };

            // レスポンスを送信
            ApiResponseHelper.success(res, responseData, 'レビュー情報を取得しました', 200, {
                performance: perf.getPerformanceMeta(),
                cache_info: {
                    using_integrated_view: !!integratedReview,
                    data_sources: reviewScores.map((r: any) => r.source)
                }
            });

        } catch (error) {
            logger.error('Failed to get game reviews:', error);
            ApiResponseHelper.error(res, 'レビュー情報の取得に失敗しました', 500, error);
        }
    }

    // POST /api/v1/reviews/:appId/refresh - レビュー情報更新（認証必須）
    async refreshGameReviews(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user) {
                return ApiResponseHelper.unauthorized(res);
            }

            const steamAppId = parseInt(req.params.appId);
            const forceRefresh = req.query.force === 'true';

            if (isNaN(steamAppId)) {
                return ApiResponseHelper.badRequest(res, '無効なSteam App IDです');
            }

            // ゲームの存在確認
            const game = GameModel.getBySteamAppId(steamAppId);
            if (!game) {
                return ApiResponseHelper.notFound(res, 'ゲーム');
            }

            // 最近更新されているかチェック（強制更新でない場合）
            if (!forceRefresh) {
                const db = database.getConnection();
                const recentUpdate = db.prepare(`
                    SELECT last_updated 
                    FROM review_scores 
                    WHERE steam_app_id = ? 
                    AND last_updated > datetime('now', '-1 day')
                    LIMIT 1
                `).get(steamAppId);

                if (recentUpdate) {
                    return ApiResponseHelper.badRequest(res, 
                        'レビュー情報は24時間以内に更新されています。強制更新する場合は?force=trueを指定してください'
                    );
                }
            }

            // レビュー情報を更新
            try {
                const updatedReviews = await reviewIntegrationService.getGameReviews(steamAppId, game.name);
                
                ApiResponseHelper.success(res, {
                    steam_app_id: steamAppId,
                    game_name: game.name,
                    updated: true,
                    reviews: updatedReviews
                }, 'レビュー情報を更新しました');

            } catch (reviewError) {
                logger.warn(`Failed to update reviews for game ${steamAppId}:`, reviewError);
                ApiResponseHelper.error(res, 'レビュー情報の更新に失敗しました', 500, reviewError);
            }

        } catch (error) {
            logger.error('Failed to refresh game reviews:', error);
            ApiResponseHelper.error(res, 'レビュー情報の更新に失敗しました', 500, error);
        }
    }

    // POST /api/v1/reviews/batch - 複数ゲームレビュー取得
    async getMultipleGameReviews(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const { steamAppIds } = req.body;

            if (!Array.isArray(steamAppIds) || steamAppIds.length === 0) {
                return ApiResponseHelper.badRequest(res, 'Steam App IDの配列を指定してください');
            }

            if (steamAppIds.length > 10) {
                return ApiResponseHelper.badRequest(res, '一度に取得できるゲームは10個までです');
            }

            const db = database.getConnection();
            const results = [];

            for (const steamAppId of steamAppIds) {
                try {
                    const game = GameModel.getBySteamAppId(steamAppId);
                    if (!game) {
                        results.push({
                            steam_app_id: steamAppId,
                            success: false,
                            error: 'ゲームが見つかりません'
                        });
                        continue;
                    }

                    const reviewScores = db.prepare(`
                        SELECT source, score, max_score, review_count, last_updated
                        FROM review_scores 
                        WHERE steam_app_id = ?
                    `).all(steamAppId);

                    // 統合スコア計算
                    let integratedScore = null;
                    if (reviewScores.length > 0) {
                        const validScores = reviewScores.filter((r: any) => r.score !== null);
                        if (validScores.length > 0) {
                            const weights = { steam: 0.4, metacritic: 0.4, igdb: 0.2 };
                            let totalScore = 0;
                            let totalWeight = 0;
                            
                            validScores.forEach((review: any) => {
                                const weight = weights[review.source as keyof typeof weights] || 0.1;
                                const normalizedScore = (review.score / review.max_score) * 100;
                                totalScore += normalizedScore * weight;
                                totalWeight += weight;
                            });
                            
                            integratedScore = Math.round(totalScore / totalWeight);
                        }
                    }

                    results.push({
                        steam_app_id: steamAppId,
                        game_name: game.name,
                        integratedScore,
                        sourceCount: reviewScores.length,
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
            }, `${successCount}個のゲームレビューを取得しました`, 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get multiple game reviews:', error);
            ApiResponseHelper.error(res, '複数ゲームレビューの取得に失敗しました', 500, error);
        }
    }

    // GET /api/v1/reviews/statistics - レビュー統計取得
    async getReviewStatistics(req: Request, res: Response): Promise<void> {
        const perf = new PerformanceHelper();
        
        try {
            const db = database.getConnection();
            
            // 基本統計
            const stats = db.prepare(`
                SELECT 
                    COUNT(DISTINCT steam_app_id) as games_with_reviews,
                    COUNT(*) as total_review_sources,
                    ROUND(AVG(score * 100.0 / max_score), 2) as avg_score,
                    source,
                    COUNT(*) as count
                FROM review_scores
                WHERE score IS NOT NULL
                GROUP BY source
                ORDER BY count DESC
            `).all();

            // スコア分布
            const scoreDistribution = db.prepare(`
                SELECT 
                    CASE 
                        WHEN score * 100.0 / max_score >= 90 THEN '90-100'
                        WHEN score * 100.0 / max_score >= 80 THEN '80-89'
                        WHEN score * 100.0 / max_score >= 70 THEN '70-79'
                        WHEN score * 100.0 / max_score >= 60 THEN '60-69'
                        WHEN score * 100.0 / max_score >= 50 THEN '50-59'
                        ELSE '0-49'
                    END as score_range,
                    COUNT(*) as count
                FROM review_scores
                WHERE score IS NOT NULL
                GROUP BY score_range
                ORDER BY score_range DESC
            `).all();

            // 高評価ゲーム（上位10）
            const topRatedGames = db.prepare(`
                SELECT 
                    rs.steam_app_id,
                    g.name,
                    ROUND(AVG(rs.score * 100.0 / rs.max_score), 2) as avg_score,
                    COUNT(rs.source) as source_count
                FROM review_scores rs
                JOIN games g ON g.steam_app_id = rs.steam_app_id
                WHERE rs.score IS NOT NULL
                GROUP BY rs.steam_app_id, g.name
                HAVING source_count >= 2
                ORDER BY avg_score DESC
                LIMIT 10
            `).all();

            ApiResponseHelper.success(res, {
                overview: {
                    gamesWithReviews: (stats[0] as any)?.games_with_reviews || 0,
                    totalReviewSources: stats.reduce((sum, s: any) => sum + s.count, 0)
                },
                sourceBreakdown: stats,
                scoreDistribution,
                topRatedGames
            }, 'レビュー統計を取得しました', 200, {
                performance: perf.getPerformanceMeta()
            });

        } catch (error) {
            logger.error('Failed to get review statistics:', error);
            ApiResponseHelper.error(res, 'レビュー統計の取得に失敗しました', 500, error);
        }
    }

    // DELETE /api/v1/reviews/:appId - レビュー情報削除（管理者のみ）
    async deleteGameReviews(req: AuthRequest, res: Response): Promise<void> {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return ApiResponseHelper.forbidden(res, 'この操作には管理者権限が必要です');
            }

            const steamAppId = parseInt(req.params.appId);

            if (isNaN(steamAppId)) {
                return ApiResponseHelper.badRequest(res, '無効なSteam App IDです');
            }

            const db = database.getConnection();
            const result = db.prepare(`
                DELETE FROM review_scores WHERE steam_app_id = ?
            `).run(steamAppId);

            if (result.changes === 0) {
                return ApiResponseHelper.notFound(res, 'レビュー情報');
            }

            ApiResponseHelper.success(res, {
                steam_app_id: steamAppId,
                deleted_count: result.changes
            }, 'レビュー情報を削除しました');

        } catch (error) {
            logger.error('Failed to delete game reviews:', error);
            ApiResponseHelper.error(res, 'レビュー情報の削除に失敗しました', 500, error);
        }
    }

    // ソースの信頼性評価
    private getSourceReliability(source: string): string {
        const reliabilityMap: { [key: string]: string } = {
            'steam': 'high',
            'metacritic': 'high',
            'igdb': 'medium'
        };
        return reliabilityMap[source] || 'low';
    }
}