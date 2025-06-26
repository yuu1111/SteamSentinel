import database from '../src/db/database';
import { GameModel } from '../src/models/Game';
import logger from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

async function seedGames() {
  try {
    console.log('🎮 SteamSentinel - Preset Games Seeding');
    console.log('=======================================\n');

    // データベース接続
    database.connect();

    // プリセットゲームファイルを読み込み
    const presetGamesPath = path.join(process.cwd(), 'preset_games.json');
    
    if (!fs.existsSync(presetGamesPath)) {
      console.error('❌ preset_games.json not found!');
      process.exit(1);
    }

    const presetGames = JSON.parse(fs.readFileSync(presetGamesPath, 'utf-8'));
    console.log(`📋 Found ${presetGames.length} preset games`);

    // ゲームを追加
    const gamesToAdd = presetGames.map((game: any) => ({
      steam_app_id: game.app_id,
      name: game.name,
      enabled: true,
      price_threshold: null,
      alert_enabled: true
    }));

    console.log('💾 Adding games to database...');
    const addedCount = GameModel.bulkCreate(gamesToAdd);
    
    // 現在のゲーム総数を確認
    const totalGames = GameModel.getAll().length;
    
    console.log(`\n✅ Successfully added ${addedCount} new games`);
    console.log(`📊 Total games in database: ${totalGames}`);
    
    // 追加されたゲームのサンプルを表示
    const sampleGames = GameModel.getAll().slice(0, 5);
    console.log('\n🎯 Sample games in database:');
    sampleGames.forEach(game => {
      console.log(`   - ${game.name} (ID: ${game.steam_app_id})`);
    });
    
    if (totalGames > 5) {
      console.log(`   ... and ${totalGames - 5} more`);
    }

  } catch (error) {
    console.error('❌ Failed to seed games:', error);
    process.exit(1);
  } finally {
    database.close();
  }
}

// 実行
seedGames();