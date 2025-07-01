const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('/mnt/c/Dev/SteamSentinel/steam_sentinel.db');

try {
  console.log('📋 Checking database tables...');
  
  // テーブル一覧を確認
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Available tables:', tables.map(t => t.name));
  
  // gamesテーブルが存在するかチェック
  const gamesTableExists = tables.some(t => t.name === 'games');
  
  if (!gamesTableExists) {
    console.log('❌ Games table does not exist. Database may not be properly initialized.');
    db.close();
    process.exit(1);
  }
  
  console.log('✅ Games table exists');
  
  // 現在のゲーム数を確認
  const currentCount = db.prepare('SELECT COUNT(*) as count FROM games').get();
  console.log(`📊 Current games in database: ${currentCount.count}`);
  
  // プリセットゲームを読み込み
  const presetPath = path.join(process.cwd(), 'preset_games.json');
  if (!fs.existsSync(presetPath)) {
    console.log('❌ preset_games.json not found');
    db.close();
    process.exit(1);
  }
  
  const presetData = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
  console.log(`📦 Found ${presetData.length} preset games`);
  
  const insertGame = db.prepare(`
    INSERT OR IGNORE INTO games (steam_app_id, name, enabled, alert_enabled, all_time_low) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  let addedCount = 0;
  for (const game of presetData) {
    try {
      const result = insertGame.run(game.app_id, game.name, 1, 1, 0);
      if (result.changes > 0) {
        addedCount++;
        if (addedCount <= 10) {  // 最初の10個だけログ出力
          console.log(`✅ Added: ${game.name} (${game.app_id})`);
        }
      }
    } catch (error) {
      console.error(`❌ Error adding ${game.name}:`, error.message);
    }
  }
  
  const finalCount = db.prepare('SELECT COUNT(*) as count FROM games').get();
  console.log(`\n📊 Final games count: ${finalCount.count}`);
  console.log(`🎯 Added ${addedCount} new games`);
  
  db.close();
  console.log('\n✅ Preset games loaded successfully!');
} catch (error) {
  console.error('❌ Error:', error);
  if (db) db.close();
}