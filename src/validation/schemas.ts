import Joi from 'joi';

// ゲーム関連のバリデーションスキーマ
export const gameSchema = Joi.object({
    steam_app_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Steam App IDは数値である必要があります',
            'number.integer': 'Steam App IDは整数である必要があります',
            'number.positive': 'Steam App IDは正の数値である必要があります',
            'any.required': 'Steam App IDは必須です'
        }),
    name: Joi.string().min(1).max(255).required()
        .messages({
            'string.base': 'ゲーム名は文字列である必要があります',
            'string.empty': 'ゲーム名は空にできません',
            'string.min': 'ゲーム名は1文字以上である必要があります',
            'string.max': 'ゲーム名は255文字以下である必要があります',
            'any.required': 'ゲーム名は必須です'
        }),
    enabled: Joi.boolean().default(true)
        .messages({
            'boolean.base': 'enabledフラグはtrue/falseである必要があります'
        }),
    price_threshold: Joi.number().min(0).allow(null)
        .messages({
            'number.base': '価格しきい値は数値である必要があります',
            'number.min': '価格しきい値は0以上である必要があります'
        }),
    price_threshold_type: Joi.string().valid('price', 'discount', 'any_sale').default('price')
        .messages({
            'string.base': 'しきい値タイプは文字列である必要があります',
            'any.only': 'しきい値タイプはprice、discount、any_saleのいずれかである必要があります'
        }),
    discount_threshold_percent: Joi.number().min(0).max(100).allow(null)
        .messages({
            'number.base': '割引しきい値は数値である必要があります',
            'number.min': '割引しきい値は0以上である必要があります',
            'number.max': '割引しきい値は100以下である必要があります'
        }),
    alert_enabled: Joi.boolean().default(true)
        .messages({
            'boolean.base': 'アラート有効フラグはtrue/falseである必要があります'
        }),
    manual_historical_low: Joi.number().min(0).allow(null)
        .messages({
            'number.base': '手動最安値は数値である必要があります',
            'number.min': '手動最安値は0以上である必要があります'
        })
});

// ゲーム更新用スキーマ（全フィールドオプショナル）
export const gameUpdateSchema = Joi.object({
    name: Joi.string().min(1).max(255)
        .messages({
            'string.base': 'ゲーム名は文字列である必要があります',
            'string.empty': 'ゲーム名は空にできません',
            'string.min': 'ゲーム名は1文字以上である必要があります',
            'string.max': 'ゲーム名は255文字以下である必要があります'
        }),
    enabled: Joi.boolean()
        .messages({
            'boolean.base': 'enabledフラグはtrue/falseである必要があります'
        }),
    price_threshold: Joi.number().min(0).allow(null)
        .messages({
            'number.base': '価格しきい値は数値である必要があります',
            'number.min': '価格しきい値は0以上である必要があります'
        }),
    price_threshold_type: Joi.string().valid('price', 'discount', 'any_sale')
        .messages({
            'string.base': 'しきい値タイプは文字列である必要があります',
            'any.only': 'しきい値タイプはprice、discount、any_saleのいずれかである必要があります'
        }),
    discount_threshold_percent: Joi.number().min(0).max(100).allow(null)
        .messages({
            'number.base': '割引しきい値は数値である必要があります',
            'number.min': '割引しきい値は0以上である必要があります',
            'number.max': '割引しきい値は100以下である必要があります'
        }),
    alert_enabled: Joi.boolean()
        .messages({
            'boolean.base': 'アラート有効フラグはtrue/falseである必要があります'
        }),
    manual_historical_low: Joi.number().min(0).allow(null)
        .messages({
            'number.base': '手動最安値は数値である必要があります',
            'number.min': '手動最安値は0以上である必要があります'
        }),
    is_purchased: Joi.boolean()
        .messages({
            'boolean.base': '購入済みフラグはtrue/falseである必要があります'
        }),
    purchase_price: Joi.number().min(0).allow(null)
        .messages({
            'number.base': '購入価格は数値である必要があります',
            'number.min': '購入価格は0以上である必要があります'
        }),
    purchase_date: Joi.date().iso().allow(null)
        .messages({
            'date.base': '購入日は有効な日付である必要があります',
            'date.format': '購入日はISO 8601形式である必要があります'
        })
});

// アラート関連のバリデーションスキーマ
export const alertSchema = Joi.object({
    steam_app_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Steam App IDは数値である必要があります',
            'number.integer': 'Steam App IDは整数である必要があります',
            'number.positive': 'Steam App IDは正の数値である必要があります',
            'any.required': 'Steam App IDは必須です'
        }),
    alert_type: Joi.string().valid('new_low', 'sale_start', 'threshold_met', 'free_game', 'game_released', 'test').required()
        .messages({
            'string.base': 'アラートタイプは文字列である必要があります',
            'any.only': 'アラートタイプは指定された値のいずれかである必要があります',
            'any.required': 'アラートタイプは必須です'
        }),
    triggered_price: Joi.number().min(0).allow(null)
        .messages({
            'number.base': 'トリガー価格は数値である必要があります',
            'number.min': 'トリガー価格は0以上である必要があります'
        }),
    threshold_value: Joi.number().min(0).when('alert_type', {
        is: 'threshold_met',
        then: Joi.required(),
        otherwise: Joi.optional()
    })
        .messages({
            'number.base': 'しきい値は数値である必要があります',
            'number.min': 'しきい値は0以上である必要があります',
            'any.required': 'threshold_metタイプの場合、しきい値は必須です'
        }),
    discount_percent: Joi.number().min(0).max(100).allow(null)
        .messages({
            'number.base': '割引率は数値である必要があります',
            'number.min': '割引率は0以上である必要があります',
            'number.max': '割引率は100以下である必要があります'
        }),
    message: Joi.string().max(500).allow(null)
        .messages({
            'string.base': 'メッセージは文字列である必要があります',
            'string.max': 'メッセージは500文字以下である必要があります'
        }),
    metadata: Joi.string().allow(null)
        .messages({
            'string.base': 'メタデータは文字列である必要があります'
        })
});

// 予算関連のバリデーションスキーマ
export const budgetSchema = Joi.object({
    name: Joi.string().min(1).max(100).required()
        .messages({
            'string.base': '予算名は文字列である必要があります',
            'string.empty': '予算名は空にできません',
            'string.min': '予算名は1文字以上である必要があります',
            'string.max': '予算名は100文字以下である必要があります',
            'any.required': '予算名は必須です'
        }),
    budget_amount: Joi.number().positive().required()
        .messages({
            'number.base': '予算金額は数値である必要があります',
            'number.positive': '予算金額は正の数値である必要があります',
            'any.required': '予算金額は必須です'
        }),
    period_type: Joi.string().valid('monthly', 'yearly', 'custom').required()
        .messages({
            'string.base': '期間タイプは文字列である必要があります',
            'any.only': '期間タイプはmonthly、yearly、customのいずれかである必要があります',
            'any.required': '期間タイプは必須です'
        }),
    start_date: Joi.date().iso().required()
        .messages({
            'date.base': '開始日は有効な日付である必要があります',
            'date.format': '開始日はISO 8601形式である必要があります',
            'any.required': '開始日は必須です'
        }),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required()
        .messages({
            'date.base': '終了日は有効な日付である必要があります',
            'date.format': '終了日はISO 8601形式である必要があります',
            'date.greater': '終了日は開始日より後である必要があります',
            'any.required': '終了日は必須です'
        }),
    is_active: Joi.boolean().default(true)
        .messages({
            'boolean.base': 'アクティブフラグはtrue/falseである必要があります'
        })
});

// クエリパラメータのバリデーションスキーマ
export const paginationSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50)
        .messages({
            'number.base': 'limitは数値である必要があります',
            'number.integer': 'limitは整数である必要があります',
            'number.min': 'limitは1以上である必要があります',
            'number.max': 'limitは100以下である必要があります'
        }),
    offset: Joi.number().integer().min(0).default(0)
        .messages({
            'number.base': 'offsetは数値である必要があります',
            'number.integer': 'offsetは整数である必要があります',
            'number.min': 'offsetは0以上である必要があります'
        }),
    sort: Joi.string().valid('id', 'name', 'created_at', 'updated_at', 'steam_app_id').default('created_at')
        .messages({
            'string.base': 'sortは文字列である必要があります',
            'any.only': 'sortは指定された値のいずれかである必要があります'
        }),
    order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC')
        .messages({
            'string.base': 'orderは文字列である必要があります',
            'any.only': 'orderはASC、DESC、asc、descのいずれかである必要があります'
        })
});

// IDパラメータのバリデーションスキーマ
export const idParamSchema = Joi.object({
    id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'IDは数値である必要があります',
            'number.integer': 'IDは整数である必要があります',
            'number.positive': 'IDは正の数値である必要があります',
            'any.required': 'IDは必須です'
        })
});

// Steam App IDパラメータのバリデーションスキーマ
export const steamAppIdParamSchema = Joi.object({
    appId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Steam App IDは数値である必要があります',
            'number.integer': 'Steam App IDは整数である必要があります',
            'number.positive': 'Steam App IDは正の数値である必要があります',
            'any.required': 'Steam App IDは必須です'
        })
});

// バルクインポート用スキーマ
export const bulkImportSchema = Joi.object({
    steam_app_ids: Joi.array().items(
        Joi.number().integer().positive()
            .messages({
                'number.base': 'Steam App IDは数値である必要があります',
                'number.integer': 'Steam App IDは整数である必要があります',
                'number.positive': 'Steam App IDは正の数値である必要があります'
            })
    ).min(1).max(50).required()
        .messages({
            'array.base': 'Steam App IDsは配列である必要があります',
            'array.min': '少なくとも1つのSteam App IDが必要です',
            'array.max': 'Steam App IDsは50個以下である必要があります',
            'any.required': 'Steam App IDsは必須です'
        })
});

// テストアラート用スキーマ
export const testAlertSchema = Joi.object({
    steamAppId: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Steam App IDは数値である必要があります',
            'number.integer': 'Steam App IDは整数である必要があります',
            'number.positive': 'Steam App IDは正の数値である必要があります',
            'any.required': 'Steam App IDは必須です'
        }),
    alertType: Joi.string().valid('test', 'new_low', 'sale_start', 'threshold_met').default('test')
        .messages({
            'string.base': 'アラートタイプは文字列である必要があります',
            'any.only': 'アラートタイプは指定された値のいずれかである必要があります'
        }),
    message: Joi.string().max(255).allow(null)
        .messages({
            'string.base': 'メッセージは文字列である必要があります',
            'string.max': 'メッセージは255文字以下である必要があります'
        })
});

// 日付範囲クエリ用スキーマ
export const dateRangeSchema = Joi.object({
    dateFrom: Joi.date().iso().allow(null)
        .messages({
            'date.base': '開始日は有効な日付である必要があります',
            'date.format': '開始日はISO 8601形式である必要があります'
        }),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).allow(null)
        .messages({
            'date.base': '終了日は有効な日付である必要があります',
            'date.format': '終了日はISO 8601形式である必要があります',
            'date.min': '終了日は開始日以降である必要があります'
        })
});