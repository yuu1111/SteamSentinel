import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { securityHeaders, localhostOnly, generalLimiter, errorHandler, jsonSizeLimit } from './middleware/security';
import apiRoutes from './routes/api';
// import logger from './utils/logger'; // May be used for future logging needs

const app = express();

// セキュリティミドルウェア
app.use(securityHeaders);
app.use(localhostOnly);
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

// APIルート
app.use('/api', apiRoutes);

// SPAのためのキャッチオール（index.htmlを返す）
app.get('*', (req, res) => {
  // API以外のルートでHTMLを返す
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(config.publicPath, 'index.html'));
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