// 直接実行用のJSファイル
const Database = require('better-sqlite3');
const path = require('path');

async function addTestSpecialGames() {
  const dbPath = path.join(__dirname, 'data', 'steam_sentinel.db');
  const db = new Database(dbPath);
  
  try {
    console.log('Adding test games with special statuses...');

    // 既存のテストゲームを削除
    db.prepare('DELETE FROM price_history WHERE steam_app_id IN (999901, 999902, 999903)').run();
    db.prepare('DELETE FROM games WHERE steam_app_id IN (999901, 999902, 999903)').run();

    // 基本無料ゲーム
    db.prepare(`
      INSERT INTO games (steam_app_id, name, enabled) 
      VALUES (999901, 'Test Free Game', 1)
    `).run();

    db.prepare(`
      INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at) 
      VALUES (999901, 0, 0, 0, 0, 0, 'steam_free', datetime('now'))
    `).run();

    // 未リリースゲーム
    db.prepare(`
      INSERT INTO games (steam_app_id, name, enabled) 
      VALUES (999902, 'Test Unreleased Game', 1)
    `).run();

    db.prepare(`
      INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at) 
      VALUES (999902, 0, 2980, 0, 0, 0, 'steam_unreleased', datetime('now'))
    `).run();

    // 販売終了ゲーム
    db.prepare(`
      INSERT INTO games (steam_app_id, name, enabled) 
      VALUES (999903, 'Test Removed Game', 1)
    `).run();

    db.prepare(`
      INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at) 
      VALUES (999903, 0, 0, 0, 1980, 0, 'steam_removed', datetime('now'))
    `).run();

    console.log('✅ Test special games added successfully');
    console.log('- Free game: Test Free Game (ID: 999901)');
    console.log('- Unreleased game: Test Unreleased Game (ID: 999902)');
    console.log('- Removed game: Test Removed Game (ID: 999903)');

  } catch (error) {
    console.error('❌ Failed to add test games:', error);
  } finally {
    db.close();
  }
}

addTestSpecialGames();