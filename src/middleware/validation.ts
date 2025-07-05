import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiResponseHelper } from '../utils/apiResponse';
import logger from '../utils/logger';

// バリデーション結果の型定義
interface ValidationError {
    field: string;
    message: string;
    value?: any;
}

// バリデーション設定のオプション
interface ValidationOptions {
    abortEarly?: boolean;
    stripUnknown?: boolean;
    allowUnknown?: boolean;
    skipFunctions?: boolean;
}

const defaultOptions: ValidationOptions = {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
    skipFunctions: true
};

/**
 * リクエストボディのバリデーションミドルウェア
 */
export const validateBody = (schema: Joi.ObjectSchema, options: ValidationOptions = {}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationOptions = { ...defaultOptions, ...options };
        
        const { error, value } = schema.validate(req.body, validationOptions);

        if (error) {
            const validationErrors: ValidationError[] = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Body validation failed:', {
                path: req.path,
                method: req.method,
                errors: validationErrors,
                body: req.body
            });

            return ApiResponseHelper.validationError(res, validationErrors);
        }

        // バリデーション済みの値でリクエストボディを置換
        req.body = value;
        next();
    };
};

/**
 * クエリパラメータのバリデーションミドルウェア
 */
export const validateQuery = (schema: Joi.ObjectSchema, options: ValidationOptions = {}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationOptions = { ...defaultOptions, ...options };
        
        const { error, value } = schema.validate(req.query, validationOptions);

        if (error) {
            const validationErrors: ValidationError[] = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Query validation failed:', {
                path: req.path,
                method: req.method,
                errors: validationErrors,
                query: req.query
            });

            return ApiResponseHelper.validationError(res, validationErrors);
        }

        // バリデーション済みの値でクエリパラメータを置換
        req.query = value;
        next();
    };
};

/**
 * URLパラメータのバリデーションミドルウェア
 */
export const validateParams = (schema: Joi.ObjectSchema, options: ValidationOptions = {}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationOptions = { ...defaultOptions, ...options };
        
        const { error, value } = schema.validate(req.params, validationOptions);

        if (error) {
            const validationErrors: ValidationError[] = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Params validation failed:', {
                path: req.path,
                method: req.method,
                errors: validationErrors,
                params: req.params
            });

            return ApiResponseHelper.validationError(res, validationErrors);
        }

        // バリデーション済みの値でパラメータを置換
        req.params = value;
        next();
    };
};

/**
 * 複数のバリデーションを組み合わせるミドルウェア
 */
export const validate = (schemas: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
}, options: ValidationOptions = {}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationOptions = { ...defaultOptions, ...options };
        const errors: ValidationError[] = [];

        // パラメータのバリデーション
        if (schemas.params) {
            const { error: paramsError, value: paramsValue } = schemas.params.validate(req.params, validationOptions);
            if (paramsError) {
                errors.push(...paramsError.details.map(detail => ({
                    field: `params.${detail.path.join('.')}`,
                    message: detail.message,
                    value: detail.context?.value
                })));
            } else {
                req.params = paramsValue;
            }
        }

        // クエリパラメータのバリデーション
        if (schemas.query) {
            const { error: queryError, value: queryValue } = schemas.query.validate(req.query, validationOptions);
            if (queryError) {
                errors.push(...queryError.details.map(detail => ({
                    field: `query.${detail.path.join('.')}`,
                    message: detail.message,
                    value: detail.context?.value
                })));
            } else {
                req.query = queryValue;
            }
        }

        // ボディのバリデーション
        if (schemas.body) {
            const { error: bodyError, value: bodyValue } = schemas.body.validate(req.body, validationOptions);
            if (bodyError) {
                errors.push(...bodyError.details.map(detail => ({
                    field: `body.${detail.path.join('.')}`,
                    message: detail.message,
                    value: detail.context?.value
                })));
            } else {
                req.body = bodyValue;
            }
        }

        if (errors.length > 0) {
            logger.warn('Combined validation failed:', {
                path: req.path,
                method: req.method,
                errors,
                request: {
                    params: req.params,
                    query: req.query,
                    body: req.body
                }
            });

            return ApiResponseHelper.validationError(res, errors);
        }

        next();
    };
};

/**
 * カスタムバリデーション関数を実行するミドルウェア
 */
export const customValidation = (
    validationFn: (req: Request) => ValidationError[] | null,
    message: string = 'カスタムバリデーションエラー'
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationFn(req);
            
            if (errors && errors.length > 0) {
                logger.warn('Custom validation failed:', {
                    path: req.path,
                    method: req.method,
                    errors,
                    message
                });

                return ApiResponseHelper.validationError(res, errors);
            }

            next();
        } catch (error) {
            logger.error('Custom validation error:', error);
            return ApiResponseHelper.error(res, message, 500, error);
        }
    };
};

/**
 * 条件付きバリデーションミドルウェア
 */
export const conditionalValidation = (
    condition: (req: Request) => boolean,
    schema: Joi.ObjectSchema,
    target: 'body' | 'query' | 'params' = 'body',
    options: ValidationOptions = {}
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!condition(req)) {
            return next();
        }

        const validationOptions = { ...defaultOptions, ...options };
        const targetData = req[target];
        
        const { error, value } = schema.validate(targetData, validationOptions);

        if (error) {
            const validationErrors: ValidationError[] = error.details.map(detail => ({
                field: `${target}.${detail.path.join('.')}`,
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Conditional validation failed:', {
                path: req.path,
                method: req.method,
                errors: validationErrors,
                target,
                condition: condition.toString()
            });

            return ApiResponseHelper.validationError(res, validationErrors);
        }

        req[target] = value;
        next();
    };
};

/**
 * 配列バリデーションヘルパー
 */
export const validateArray = (
    schema: Joi.ObjectSchema,
    arrayField: string,
    target: 'body' | 'query' = 'body',
    options: ValidationOptions = {}
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const validationOptions = { ...defaultOptions, ...options };
        const targetData = req[target];
        
        if (!targetData || !Array.isArray(targetData[arrayField])) {
            return ApiResponseHelper.badRequest(res, `${arrayField}は配列である必要があります`);
        }

        const errors: ValidationError[] = [];
        const validatedArray: any[] = [];

        targetData[arrayField].forEach((item: any, index: number) => {
            const { error, value } = schema.validate(item, validationOptions);
            
            if (error) {
                errors.push(...error.details.map(detail => ({
                    field: `${target}.${arrayField}[${index}].${detail.path.join('.')}`,
                    message: detail.message,
                    value: detail.context?.value
                })));
            } else {
                validatedArray.push(value);
            }
        });

        if (errors.length > 0) {
            logger.warn('Array validation failed:', {
                path: req.path,
                method: req.method,
                errors,
                arrayField,
                target
            });

            return ApiResponseHelper.validationError(res, errors);
        }

        targetData[arrayField] = validatedArray;
        next();
    };
};

/**
 * 一意性チェックバリデーション
 */
export const validateUniqueness = (
    checkFn: (value: any, req: Request) => Promise<boolean>,
    field: string,
    message: string = 'この値は既に使用されています'
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const value = req.body[field];
            
            if (value === undefined || value === null) {
                return next();
            }

            const isUnique = await checkFn(value, req);
            
            if (!isUnique) {
                const validationErrors: ValidationError[] = [{
                    field,
                    message,
                    value
                }];

                logger.warn('Uniqueness validation failed:', {
                    path: req.path,
                    method: req.method,
                    field,
                    value,
                    message
                });

                return ApiResponseHelper.validationError(res, validationErrors);
            }

            next();
        } catch (error) {
            logger.error('Uniqueness validation error:', error);
            return ApiResponseHelper.error(res, '一意性チェックでエラーが発生しました', 500, error);
        }
    };
};