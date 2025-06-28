import { GameModel } from '../src/models/Game';
import { PriceHistoryModel } from '../src/models/PriceHistory';
import database from '../src/db/database';
import logger from '../src/utils/logger';

// テスト用の特別状況ゲームを追加
async function addTestSpecialGames() {
  try {
    database.connect();
    database.initialize();

    console.log('Adding test games with special statuses...');

    // 基本無料ゲーム
    const freeGame = GameModel.create({
      steam_app_id: 999901,
      name: 'Test Free Game',
      enabled: true
    });

    PriceHistoryModel.create({
      steam_app_id: 999901,
      current_price: 0,
      original_price: 0,
      discount_percent: 0,
      historical_low: 0,
      is_on_sale: false,
      source: 'steam_free'
    });

    // 未リリースゲーム
    const unreleasedGame = GameModel.create({
      steam_app_id: 999902,
      name: 'Test Unreleased Game',
      enabled: true
    });

    PriceHistoryModel.create({
      steam_app_id: 999902,
      current_price: 0,
      original_price: 2980,
      discount_percent: 0,
      historical_low: 0,
      is_on_sale: false,
      source: 'steam_unreleased',
      release_date: '2025-12-31'
    });

    // 販売終了ゲーム
    const removedGame = GameModel.create({
      steam_app_id: 999903,
      name: 'Test Removed Game',
      enabled: true
    });

    PriceHistoryModel.create({
      steam_app_id: 999903,
      current_price: 0,
      original_price: 0,
      discount_percent: 0,
      historical_low: 1980,
      is_on_sale: false,
      source: 'steam_removed'
    });

    console.log('✅ Test special games added successfully');
    console.log('- Free game: Test Free Game (ID: 999901)');
    console.log('- Unreleased game: Test Unreleased Game (ID: 999902)');
    console.log('- Removed game: Test Removed Game (ID: 999903)');

  } catch (error) {
    console.error('❌ Failed to add test games:', error);
  } finally {
    database.close();
  }
}

if (require.main === module) {
  addTestSpecialGames();
}