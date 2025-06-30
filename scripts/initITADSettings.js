const Database = require('better-sqlite3');
const path = require('path');

const dbPath = '/mnt/c/Dev/SteamSentinel/steam_sentinel.db';
const db = new Database(dbPath);

try {
  console.log('Initializing ITAD settings...');
  
  // デフォルト設定を挿入
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO itad_settings (name, value, description, category) VALUES (?, ?, ?, ?)
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
  
} catch (error) {
  console.error('Failed to initialize ITAD settings:', error);
} finally {
  db.close();
}