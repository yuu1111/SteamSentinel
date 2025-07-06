import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import logger from '../utils/logger';

// レート制限の設定
export const createRateLimiter = (windowMs: number = 15 * 60 * 1000, max: number = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// 一般的なレート制限（本番環境のみ有効）
export const generalLimiter = process.env.NODE_ENV === 'production' 
  ? createRateLimiter(15 * 60 * 1000, 100)  // 本番: 15分間に100リクエスト
  : (_req: any, _res: any, next: any) => next(); // 開発: 無効化

// API用の厳しいレート制限（本番環境のみ有効）
export const apiLimiter = process.env.NODE_ENV === 'production'
  ? createRateLimiter(15 * 60 * 1000, 50)   // 本番: 15分間に50リクエスト  
  : (_req: any, _res: any, next: any) => next(); // 開発: 無効化

// 認証エンドポイント用のレート制限（ブルートフォース対策）
export const authLimiter = process.env.NODE_ENV === 'production'
  ? createRateLimiter(15 * 60 * 1000, 5)    // 本番: 15分間に5リクエスト
  : (_req: any, _res: any, next: any) => next(); // 開発: 無効化

// 重い処理用のレート制限（エクスポート、バッチ処理など）
export const heavyOperationLimiter = process.env.NODE_ENV === 'production'
  ? createRateLimiter(60 * 60 * 1000, 10)   // 本番: 1時間に10リクエスト
  : (_req: any, _res: any, next: any) => next(); // 開発: 無効化

// 読み取り専用エンドポイント用の緩いレート制限
export const readOnlyLimiter = process.env.NODE_ENV === 'production'
  ? createRateLimiter(15 * 60 * 1000, 200)  // 本番: 15分間に200リクエスト
  : (_req: any, _res: any, next: any) => next(); // 開発: 無効化

// Discord/通知関連のレート制限
export const notificationLimiter = process.env.NODE_ENV === 'production'
  ? createRateLimiter(60 * 60 * 1000, 20)   // 本番: 1時間に20リクエスト
  : (_req: any, _res: any, next: any) => next(); // 開発: 無効化

// 管理者操作用のレート制限
export const adminLimiter = process.env.NODE_ENV === 'production'
  ? createRateLimiter(15 * 60 * 1000, 30)   // 本番: 15分間に30リクエスト
  : (_req: any, _res: any, next: any) => next(); // 開発: 無効化

// セキュリティヘッダーの設定
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"], // onclick属性を許可
      imgSrc: ["'self'", "data:", "blob:", "https://cdn.akamai.steamstatic.com", "https://store.steampowered.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// 入力検証用のヘルパー
export const validateSteamAppId = (req: Request, res: Response, next: NextFunction): void => {
  const { appId } = req.params;
  const steamAppId = parseInt(appId, 10);
  
  if (isNaN(steamAppId) || steamAppId <= 0) {
    res.status(400).json({
      error: 'Invalid Steam App ID',
      message: 'Steam App ID must be a positive integer'
    });
    return;
  }
  
  req.params.appId = steamAppId.toString();
  next();
};

// JSONペイロードサイズ制限
export const jsonSizeLimit = '10mb';

// エラーハンドリングミドルウェア
export const errorHandler = (error: any, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error('Error:', error);
  
  if (error.type === 'entity.parse.failed') {
    res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
    return;
  }
  
  if (error.type === 'entity.too.large') {
    res.status(413).json({
      error: 'Payload too large',
      message: 'Request body is too large'
    });
    return;
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
};