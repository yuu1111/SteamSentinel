import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { securityHeaders, generalLimiter, errorHandler, jsonSizeLimit } from './middleware/security';
import { extractVersion, getVersionInfo } from './middleware/versioning';
import restfulApiRoutes from './routes/restful-api';

const app = express();

// セキュリティミドルウェア
app.use(securityHeaders);
app.use(generalLimiter); // 開発環境では自動的に無効化される

// CORS設定
app.use(cors({
  origin: [`http://${config.webHost}:${config.webPort}`, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// ボディパーサー
app.use(express.json({ limit: jsonSizeLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonSizeLimit }));

// 静的ファイル配信
app.use(express.static(config.publicPath));

// APIバージョニングミドルウェア
app.use('/api', extractVersion);

// バージョン情報エンドポイント
app.get('/api/version', getVersionInfo);
app.get('/api/v1/version', getVersionInfo);

// APIルート（バージョン別）
app.use('/api/v1', restfulApiRoutes);
// Legacy API support for backward compatibility
app.use('/api', restfulApiRoutes);

// React build files serving
app.use(express.static(path.join(__dirname, '../dist/web')));

// SPAのためのキャッチオール（index.htmlを返す）
app.get('*', (req, res) => {
  // API以外のルートでHTMLを返す
  if (!req.path.startsWith('/api')) {
    // Check if React build exists, otherwise fallback to public
    const reactIndexPath = path.join(__dirname, '../dist/web/index.html');
    const publicIndexPath = path.join(config.publicPath, 'index.html');
    
    try {
      fs.accessSync(reactIndexPath);
      res.sendFile(reactIndexPath);
    } catch {
      res.sendFile(publicIndexPath);
    }
  } else {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found'
    });
  }
});

// エラーハンドリングミドルウェア
app.use(errorHandler);

export default app;