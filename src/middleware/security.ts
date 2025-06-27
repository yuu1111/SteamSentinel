import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

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

// ローカルホストのみアクセス許可
export const localhostOnly = (req: Request, res: Response, next: NextFunction) => {
  const allowedHosts = ['127.0.0.1', 'localhost', '::1'];
  const clientIP = req.ip || req.connection.remoteAddress || '';
  
  if (allowedHosts.some(host => clientIP.includes(host)) || clientIP === '') {
    next();
  } else {
    res.status(403).json({
      error: 'Access denied',
      message: 'This application is only accessible from localhost'
    });
  }
};

// セキュリティヘッダーの設定
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https://cdn.akamai.steamstatic.com", "https://store.steampowered.com"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
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
  console.error('Error:', error);
  
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