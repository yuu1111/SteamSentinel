const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'steam_sentinel.db');
console.log('データベースパス:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });
  
  console.log('\n=== 特別なソースタイプのゲーム ===');
  const specialGames = db.prepare(`
    SELECT DISTINCT ph.steam_app_id, g.name, ph.source, ph.recorded_at
    FROM price_history ph
    LEFT JOIN games g ON ph.steam_app_id = g.steam_app_id
    WHERE ph.source IN ('steam_free', 'steam_unreleased', 'steam_removed')
    ORDER BY ph.recorded_at DESC
    LIMIT 10
  `).all();
  
  if (specialGames.length > 0) {
    specialGames.forEach(game => {
      console.log(`${game.name || 'Unknown'} (${game.steam_app_id}) - ${game.source} - ${game.recorded_at}`);
    });
  } else {
    console.log('特別なソースタイプのゲームが見つかりません');
  }
  
  console.log('\n=== 最新の価格履歴 ===');
  const recentHistory = db.prepare(`
    SELECT ph.steam_app_id, g.name, ph.source, ph.current_price, ph.recorded_at
    FROM price_history ph
    LEFT JOIN games g ON ph.steam_app_id = g.steam_app_id
    ORDER BY ph.recorded_at DESC
    LIMIT 20
  `).all();
  
  recentHistory.forEach(game => {
    console.log(`${game.name || 'Unknown'} (${game.steam_app_id}) - ${game.source} - ¥${game.current_price} - ${game.recorded_at}`);
  });
  
  console.log('\n=== ソース別統計 ===');
  const sourceStats = db.prepare(`
    SELECT source, COUNT(*) as count
    FROM price_history
    GROUP BY source
    ORDER BY count DESC
  `).all();
  
  sourceStats.forEach(stat => {
    console.log(`${stat.source}: ${stat.count}件`);
  });
  
  db.close();
} catch (error) {
  console.error('データベースエラー:', error);
}