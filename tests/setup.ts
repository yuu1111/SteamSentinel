import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';

// テスト用環境変数を読み込み
config({ path: path.join(__dirname, '..', '.env.test') });

// テスト用のデフォルト環境変数
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:'; // インメモリDB使用
process.env.LOG_LEVEL = 'error'; // ログレベルを下げる

// 既存のテスト用データベースファイルを削除（もしあれば）
const testDbPath = path.join(__dirname, '..', 'data', 'test.db');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

// タイムアウト設定
jest.setTimeout(30000);

// Supertestのリクエストタイムアウト設定
global.setTimeout(() => {}, 30000);