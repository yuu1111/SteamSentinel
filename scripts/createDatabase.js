const Database = require('better-sqlite3');

const dbPath = '/mnt/c/Dev/SteamSentinel/steam_sentinel.db';

try {
  // データベースファイルを削除
  const fs = require('fs');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Removed existing database file');
  }

  // 新しいデータベースを作成
  const db = new Database(dbPath);
  console.log('Created new database file');

  // ITAD設定テーブルを作成
  db.exec(`
    CREATE TABLE itad_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'filter',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Created itad_settings table');

  // デフォルト設定を挿入
  const insertStmt = db.prepare(`
    INSERT INTO itad_settings (name, value, description, category) VALUES (?, ?, ?, ?)
  `);
  
  const defaultSettings = [
    ['enabled', 'true', '高割引ゲーム検知を有効化', 'filter'],
    ['min_discount', '50', '最小割引率(%)', 'filter'],
    ['max_price', '3000', '最大価格(円)', 'filter'],
    ['limit', '50', '取得件数', 'filter'],
    ['region', 'jp', '地域設定', 'filter'],
    ['discord_notifications_enabled', 'true', 'Discord通知を有効化', 'notification']
  ];
  
  defaultSettings.forEach(([name, value, description, category]) => {
    insertStmt.run(name, value, description, category);
    console.log(`✓ ${name}: ${value}`);
  });

  console.log('ITAD settings initialized successfully!');
  
  db.close();
} catch (error) {
  console.error('Failed to create database:', error);
}