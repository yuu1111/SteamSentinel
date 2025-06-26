import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

// ログディレクトリの作成
const logsDir = config.logsPath;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// カスタムフォーマット
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// ローテーションファイルトランスポート
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'steam-sentinel-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: `${config.logMaxFileSizeMB}m`,
  maxFiles: `${config.logMaxFiles}d`,
  format: customFormat
});

// エラー専用ローテーションファイル
const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: `${config.logMaxFileSizeMB}m`,
  maxFiles: `${config.logMaxFiles}d`,
  level: 'error',
  format: customFormat
});

// コンソール出力用フォーマット
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// ロガーインスタンスの作成
const logger = winston.createLogger({
  level: config.logLevel.toLowerCase(),
  transports: [
    // ファイル出力
    fileRotateTransport,
    errorFileRotateTransport,
    
    // コンソール出力
    new winston.transports.Console({
      format: consoleFormat
    })
  ],
  
  // 未処理の例外とPromiseリジェクションをキャッチ
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      format: customFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      format: customFormat
    })
  ]
});

// ログレベルの動的変更
export function setLogLevel(level: string): void {
  logger.level = level.toLowerCase();
}

// 最近のログを取得（Web UI用）
export function getRecentLogs(lines: number = 100): string[] {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `steam-sentinel-${today}.log`);
    
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    const content = fs.readFileSync(logFile, 'utf-8');
    const allLines = content.trim().split('\n');
    
    return allLines.slice(-lines);
  } catch (error) {
    logger.error('Failed to read log file:', error);
    return [];
  }
}

export default logger;