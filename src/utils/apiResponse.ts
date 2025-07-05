import { Response } from 'express';

// 統一APIレスポンス形式のインターフェース
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    meta?: {
        pagination?: {
            total: number;
            limit: number;
            offset: number;
            hasMore: boolean;
        };
        timestamps?: {
            requested_at: string;
            processed_at: string;
        };
        performance?: {
            query_time_ms: number;
            cache_hit: boolean;
        };
    };
}

// ページネーション用オプション
export interface PaginationOptions {
    limit?: number;
    offset?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
}

// 成功レスポンスヘルパー
export const successResponse = <T>(
    data: T, 
    message?: string, 
    meta?: APIResponse['meta']
): APIResponse<T> => ({
    success: true,
    data,
    message,
    meta: {
        ...meta,
        timestamps: {
            requested_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            ...meta?.timestamps
        }
    }
});

// エラーレスポンスヘルパー
export const errorResponse = (
    error: string, 
    details?: any
): APIResponse => ({
    success: false,
    error,
    ...(process.env.NODE_ENV === 'development' && details && { details }),
    meta: {
        timestamps: {
            requested_at: new Date().toISOString(),
            processed_at: new Date().toISOString()
        }
    }
});

// ページネーションレスポンスヘルパー
export const paginatedResponse = <T>(
    data: T[],
    total: number,
    pagination: Required<PaginationOptions>,
    message?: string
): APIResponse<T[]> => ({
    success: true,
    data,
    message,
    meta: {
        pagination: {
            total,
            limit: pagination.limit,
            offset: pagination.offset,
            hasMore: total > pagination.offset + pagination.limit
        },
        timestamps: {
            requested_at: new Date().toISOString(),
            processed_at: new Date().toISOString()
        }
    }
});

// Express レスポンス送信ヘルパー
export class ApiResponseHelper {
    static success<T>(
        res: Response,
        data: T,
        message?: string,
        statusCode: number = 200,
        meta?: APIResponse['meta']
    ): void {
        res.status(statusCode).json(successResponse(data, message, meta));
    }

    static error(
        res: Response,
        error: string,
        statusCode: number = 500,
        details?: any
    ): void {
        res.status(statusCode).json(errorResponse(error, details));
    }

    static paginated<T>(
        res: Response,
        data: T[],
        total: number,
        pagination: Required<PaginationOptions>,
        message?: string,
        statusCode: number = 200
    ): void {
        res.status(statusCode).json(paginatedResponse(data, total, pagination, message));
    }

    static notFound(res: Response, resource: string = 'リソース'): void {
        this.error(res, `${resource}が見つかりません`, 404);
    }

    static badRequest(res: Response, message: string = '不正なリクエストです'): void {
        this.error(res, message, 400);
    }

    static unauthorized(res: Response, message: string = '認証が必要です'): void {
        this.error(res, message, 401);
    }

    static forbidden(res: Response, message: string = 'この操作を行う権限がありません'): void {
        this.error(res, message, 403);
    }

    static validationError(res: Response, errors: Array<{field: string, message: string}>): void {
        res.status(400).json({
            success: false,
            error: 'バリデーションエラー',
            details: errors,
            meta: {
                timestamps: {
                    requested_at: new Date().toISOString(),
                    processed_at: new Date().toISOString()
                }
            }
        });
    }
}

// パフォーマンス測定ヘルパー
export class PerformanceHelper {
    private startTime: number;
    private cacheHit: boolean = false;

    constructor() {
        this.startTime = Date.now();
    }

    setCacheHit(hit: boolean): void {
        this.cacheHit = hit;
    }

    getPerformanceMeta() {
        return {
            query_time_ms: Date.now() - this.startTime,
            cache_hit: this.cacheHit
        };
    }
}

// ベースコントローラークラス
export class BaseController {
    protected getPaginationParams(query: any): Required<PaginationOptions> {
        return {
            limit: Math.min(parseInt(query.limit) || 50, 100),
            offset: parseInt(query.offset) || 0,
            sort: query.sort || 'created_at',
            order: (query.order?.toUpperCase() === 'ASC') ? 'ASC' : 'DESC'
        };
    }

    protected validateRequiredFields(data: any, requiredFields: string[]): string[] {
        const missingFields: string[] = [];
        
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                missingFields.push(field);
            }
        }
        
        return missingFields;
    }

    protected sanitizeOutput(data: any): any {
        // 機密情報の除去
        if (typeof data === 'object' && data !== null) {
            const sanitized = { ...data };
            delete sanitized.password;
            delete sanitized.secret;
            delete sanitized.token;
            delete sanitized.api_key;
            return sanitized;
        }
        return data;
    }
}