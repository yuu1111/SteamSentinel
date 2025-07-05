# SteamSentinel RESTful API リファレンス

**Version:** 2.0.0  
**Base URL:** `/api/v1`  
**Last Updated:** 2025-01-15

## 概要

SteamSentinel v2.0 RESTful API の完全なリファレンスドキュメントです。全てのエンドポイントは統一されたレスポンス形式とバリデーションを提供します。

## 認証

現在、認証は不要です。v3.0でJWT認証を実装予定です。

## ベースURL

```
http://localhost:3000/api/v1
```

## レスポンス形式

全てのAPIレスポンスは以下の統一形式を使用します：

```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "message": string,
  "meta": {
    "pagination": {
      "total": number,
      "limit": number,
      "offset": number,
      "hasMore": boolean
    },
    "performance": {
      "query_time_ms": number,
      "cache_hit": boolean
    },
    "timestamps": {
      "requested_at": string,
      "processed_at": string
    }
  }
}
```

## エラーハンドリング

APIエラーは適切なHTTPステータスコードと統一されたエラーレスポンスを返します：

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "meta": {
    "timestamps": {
      "requested_at": "2025-01-15T10:30:00Z",
      "processed_at": "2025-01-15T10:30:00Z"
    }
  }
}
```

### HTTPステータスコード

- `200` - 成功
- `201` - 作成成功
- `400` - バリデーションエラー
- `404` - リソースが見つからない
- `409` - 競合（重複リソース）
- `429` - レート制限
- `500` - サーバーエラー

## ゲーム管理 API

### ゲーム一覧取得

```http
GET /api/v1/games
```

監視対象ゲームの一覧を取得します。

**クエリパラメータ:**

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|-----|----------|-----|
| `limit` | number | ❌ | 50 | ページサイズ (1-100) |
| `offset` | number | ❌ | 0 | オフセット |
| `enabled` | string | ❌ | all | `true`/`false`/`all` |
| `search` | string | ❌ | - | ゲーム名検索 |
| `purchased` | boolean | ❌ | - | 購入済みフィルター |

**レスポンス例:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "steam_app_id": 730,
      "name": "Counter-Strike 2",
      "enabled": true,
      "price_threshold": 1000,
      "price_threshold_type": "price",
      "created_at": "2025-01-15T10:00:00Z",
      "latestPrice": {
        "current_price": 0,
        "original_price": 0,
        "discount_percent": 0,
        "is_on_sale": false
      }
    }
  ],
  "meta": {
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### その他のエンドポイント

詳細なAPI仕様については、WebUI の **API仕様** ページ (`/api-docs`) をご確認ください。

---

**ドキュメント作成日:** 2025-01-15  
**最終更新:** 2025-01-15  
**API バージョン:** 2.0.0