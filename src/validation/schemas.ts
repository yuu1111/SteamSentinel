import Joi from 'joi';

// 認証関連のバリデーションスキーマ
export const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required()
        .messages({
            'string.alphanum': 'ユーザー名は英数字のみ使用できます',
            'string.min': 'ユーザー名は3文字以上である必要があります',
            'string.max': 'ユーザー名は30文字以下である必要があります',
            'any.required': 'ユーザー名は必須です'
        }),
    email: Joi.string().email().required()
        .messages({
            'string.email': '有効なメールアドレスを入力してください',
            'any.required': 'メールアドレスは必須です'
        }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
        .messages({
            'string.min': 'パスワードは8文字以上である必要があります',
            'string.pattern.base': 'パスワードは大文字、小文字、数字を含む必要があります',
            'any.required': 'パスワードは必須です'
        })
});

export const loginSchema = Joi.object({
    username: Joi.string().required()
        .messages({
            'any.required': 'ユーザー名またはメールアドレスは必須です'
        }),
    password: Joi.string().required()
        .messages({
            'any.required': 'パスワードは必須です'
        })
});

export const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required()
        .messages({
            'any.required': '現在のパスワードは必須です'
        }),
    newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
        .messages({
            'string.min': '新しいパスワードは8文字以上である必要があります',
            'string.pattern.base': '新しいパスワードは大文字、小文字、数字を含む必要があります',
            'any.required': '新しいパスワードは必須です'
        })
});

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required()
        .messages({
            'any.required': 'リフレッシュトークンは必須です'
        })
});

// ゲーム関連のバリデーションスキーマ
export const gameSchema = Joi.object({
    steam_app_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Steam App IDは数値である必要があります',
            'number.positive': 'Steam App IDは正の数値である必要があります',
            'any.required': 'Steam App IDは必須です'
        }),
    name: Joi.string().min(1).max(255).required()
        .messages({
            'string.min': 'ゲーム名は1文字以上である必要があります',
            'string.max': 'ゲーム名は255文字以下である必要があります',
            'any.required': 'ゲーム名は必須です'
        }),
    enabled: Joi.boolean().default(true),
    price_threshold: Joi.number().min(0).allow(null)
        .messages({
            'number.min': '価格閾値は0以上である必要があります'
        }),
    price_threshold_type: Joi.string().valid('price', 'discount', 'any_sale').default('price')
        .messages({
            'any.only': '価格閾値タイプはprice、discount、any_saleのいずれかである必要があります'
        }),
    alert_enabled: Joi.boolean().default(true),
    is_purchased: Joi.boolean().default(false),
    purchase_price: Joi.number().min(0).allow(null),
    purchase_date: Joi.date().iso().allow(null)
});

export const gameUpdateSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    enabled: Joi.boolean().optional(),
    price_threshold: Joi.number().min(0).allow(null).optional(),
    price_threshold_type: Joi.string().valid('price', 'discount', 'any_sale').optional(),
    alert_enabled: Joi.boolean().optional(),
    is_purchased: Joi.boolean().optional(),
    purchase_price: Joi.number().min(0).allow(null).optional(),
    purchase_date: Joi.date().iso().allow(null).optional(),
    manual_historical_low: Joi.number().min(0).allow(null).optional()
});

// アラート関連のバリデーションスキーマ
export const alertSchema = Joi.object({
    steam_app_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Steam App IDは数値である必要があります',
            'number.positive': 'Steam App IDは正の数値である必要があります',
            'any.required': 'Steam App IDは必須です'
        }),
    alert_type: Joi.string().valid('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released', 'test').required()
        .messages({
            'any.only': 'アラートタイプは指定された値のいずれかである必要があります',
            'any.required': 'アラートタイプは必須です'
        }),
    triggered_price: Joi.number().min(0).optional(),
    threshold_value: Joi.number().min(0).when('alert_type', {
        is: Joi.string().valid('threshold_met'),
        then: Joi.required(),
        otherwise: Joi.optional()
    }).messages({
        'number.min': '閾値は0以上である必要があります',
        'any.required': '閾値アラートには閾値が必要です'
    }),
    discount_percent: Joi.number().integer().min(0).max(100).optional(),
    metadata: Joi.object().optional()
});

// 予算関連のバリデーションスキーマ
export const budgetSchema = Joi.object({
    name: Joi.string().min(1).max(100).required()
        .messages({
            'string.min': '予算名は1文字以上である必要があります',
            'string.max': '予算名は100文字以下である必要があります',
            'any.required': '予算名は必須です'
        }),
    budget_amount: Joi.number().positive().required()
        .messages({
            'number.positive': '予算額は正の数値である必要があります',
            'any.required': '予算額は必須です'
        }),
    period_type: Joi.string().valid('monthly', 'yearly', 'custom').required()
        .messages({
            'any.only': '期間タイプはmonthly、yearly、customのいずれかである必要があります',
            'any.required': '期間タイプは必須です'
        }),
    start_date: Joi.date().iso().required()
        .messages({
            'date.base': '開始日は有効な日付である必要があります',
            'any.required': '開始日は必須です'
        }),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required()
        .messages({
            'date.base': '終了日は有効な日付である必要があります',
            'date.greater': '終了日は開始日より後である必要があります',
            'any.required': '終了日は必須です'
        }),
    category_filter: Joi.string().allow(null).optional(),
    is_active: Joi.boolean().default(true)
});

// 共通バリデーションスキーマ
export const paginationSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50)
        .messages({
            'number.min': 'limitは1以上である必要があります',
            'number.max': 'limitは100以下である必要があります'
        }),
    offset: Joi.number().integer().min(0).default(0)
        .messages({
            'number.min': 'offsetは0以上である必要があります'
        }),
    sort: Joi.string().optional(),
    order: Joi.string().valid('ASC', 'DESC').default('DESC').optional()
});

export const idParamSchema = Joi.object({
    id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'IDは数値である必要があります',
            'number.positive': 'IDは正の数値である必要があります',
            'any.required': 'IDは必須です'
        })
});

export const steamAppIdParamSchema = Joi.object({
    appId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Steam App IDは数値である必要があります',
            'number.positive': 'Steam App IDは正の数値である必要があります',
            'any.required': 'Steam App IDは必須です'
        })
});

export const dateRangeSchema = Joi.object({
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
        .messages({
            'date.min': '終了日は開始日以降である必要があります'
        })
});