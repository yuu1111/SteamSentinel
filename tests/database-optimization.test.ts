import database from '../src/db/database';

describe('Database Optimization Tests', () => {
  let testGameIds: number[] = [];

  beforeAll(async () => {
    // データベース初期化
    database.connect();
    database.initialize();

    // テスト用データ作成
    const db = database.getConnection();

    // テストゲーム作成
    const gameStmt = db.prepare(`
      INSERT INTO games (steam_app_id, name, enabled, price_threshold)
      VALUES (?, ?, ?, ?)
    `);

    for (let i = 0; i < 10; i++) {
      const steamAppId = Date.now() + i;
      gameStmt.run(steamAppId, `DB Test Game ${i + 1}`, i < 8 ? 1 : 0, 1000 + (i * 200));
      testGameIds.push(steamAppId);
    }

    // 価格履歴データ作成
    const priceStmt = db.prepare(`
      INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const baseDate = new Date();
    testGameIds.forEach((steamAppId, gameIndex) => {
      for (let day = 30; day >= 0; day--) {
        const date = new Date(baseDate.getTime() - day * 24 * 60 * 60 * 1000);
        const basePrice = 2000 + (gameIndex * 300);
        const discountPercent = Math.floor(Math.random() * 50);
        const currentPrice = basePrice * (100 - discountPercent) / 100;

        priceStmt.run(
          steamAppId,
          currentPrice,
          basePrice,
          discountPercent,
          currentPrice,
          discountPercent > 0 ? 1 : 0,
          'steam',
          date.toISOString()
        );
      }
    });

    // アラートデータ作成
    const alertStmt = db.prepare(`
      INSERT INTO alerts (steam_app_id, alert_type, triggered_price, created_at, is_read, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    testGameIds.forEach((steamAppId, index) => {
      for (let i = 0; i < 5; i++) {
        const date = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
        alertStmt.run(
          steamAppId,
          ['new_low', 'sale_start', 'threshold_met'][i % 3],
          1500 - (i * 50),
          date.toISOString(),
          i % 2 === 0 ? 1 : 0,
          JSON.stringify({
            legacy_message: `Alert ${i} for game ${index}`,
            legacy_game_name: `Game ${index}`
          })
        );
      }
    });

    // レビューデータ作成
    const reviewStmt = db.prepare(`
      INSERT INTO review_scores (steam_app_id, source, score, max_score, review_count, description, weight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    testGameIds.forEach((steamAppId, index) => {
      reviewStmt.run(steamAppId, 'steam', 85 - index, 100, 1000 + (index * 100), 'Very Positive', 1.0);
      reviewStmt.run(steamAppId, 'metacritic', 80 - index, 100, null, 'Generally favorable', 1.0);
    });
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    const db = database.getConnection();
    testGameIds.forEach(steamAppId => {
      db.prepare('DELETE FROM price_history WHERE steam_app_id = ?').run(steamAppId);
      db.prepare('DELETE FROM latest_prices WHERE steam_app_id = ?').run(steamAppId);
      db.prepare('DELETE FROM alerts WHERE steam_app_id = ?').run(steamAppId);
      db.prepare('DELETE FROM review_scores WHERE steam_app_id = ?').run(steamAppId);
      db.prepare('DELETE FROM games WHERE steam_app_id = ?').run(steamAppId);
    });
  });

  describe('Index Performance', () => {
    test('should have efficient price history queries', () => {
      const db = database.getConnection();
      const startTime = Date.now();

      // インデックスを活用したクエリ
      const result = db.prepare(`
        SELECT * FROM price_history 
        WHERE steam_app_id = ? 
        ORDER BY recorded_at DESC 
        LIMIT 10
      `).all(testGameIds[0]);

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(50); // 50ms以内
    });

    test('should have efficient game filtering', () => {
      const db = database.getConnection();
      const startTime = Date.now();

      // enabled フィールドのインデックスを活用
      const result = db.prepare(`
        SELECT * FROM games 
        WHERE enabled = 1 
        ORDER BY name
      `).all();

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(30); // 30ms以内
    });

    test('should have efficient alert queries', () => {
      const db = database.getConnection();
      const startTime = Date.now();

      // 複合インデックスを活用
      const result = db.prepare(`
        SELECT * FROM alerts 
        WHERE alert_type = ? AND notified_discord = 0
        ORDER BY created_at DESC
      `).all('new_low');

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(40); // 40ms以内
    });

    test('should have efficient review score queries', () => {
      const db = database.getConnection();
      const startTime = Date.now();

      // ソースとアプリIDの複合インデックスを活用
      const result = db.prepare(`
        SELECT * FROM review_scores 
        WHERE source = ? 
        ORDER BY score DESC
      `).all('steam');

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(30); // 30ms以内
    });
  });

  describe('Latest Prices Cache', () => {
    test('should automatically populate latest_prices table', () => {
      const db = database.getConnection();

      // latest_pricesテーブルにデータが存在することを確認
      const latestPrices = db.prepare(`
        SELECT COUNT(*) as count FROM latest_prices
      `).get();

      expect(latestPrices.count).toBeGreaterThan(0);
    });

    test('should update latest_prices on new price history', () => {
      const db = database.getConnection();
      const testAppId = testGameIds[0];

      // 新しい価格履歴を追加
      const newPrice = 999;
      db.prepare(`
        INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(testAppId, newPrice, 2000, 50, newPrice, 1, 'steam', new Date().toISOString());

      // latest_pricesが更新されていることを確認
      const latestPrice = db.prepare(`
        SELECT current_price FROM latest_prices WHERE steam_app_id = ?
      `).get(testAppId);

      expect(latestPrice.current_price).toBe(newPrice);
    });

    test('should maintain historical low correctly', () => {
      const db = database.getConnection();
      const testAppId = testGameIds[1];

      // 現在の最安値を取得
      const currentLow = db.prepare(`
        SELECT historical_low FROM latest_prices WHERE steam_app_id = ?
      `).get(testAppId);

      // より安い価格を追加
      const lowerPrice = currentLow.historical_low - 100;
      db.prepare(`
        INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(testAppId, lowerPrice, 2000, 60, lowerPrice, 1, 'steam', new Date().toISOString());

      // 最安値が更新されていることを確認
      const updatedLow = db.prepare(`
        SELECT historical_low, all_time_low_date FROM latest_prices WHERE steam_app_id = ?
      `).get(testAppId);

      expect(updatedLow.historical_low).toBe(lowerPrice);
      expect(updatedLow.all_time_low_date).toBeTruthy();
    });

    test('should perform much faster than price_history queries', () => {
      const db = database.getConnection();

      // price_historyからの取得時間
      const startTime1 = Date.now();
      const historyResult = db.prepare(`
        SELECT ph.* FROM price_history ph
        INNER JOIN (
          SELECT steam_app_id, MAX(recorded_at) as max_date
          FROM price_history
          GROUP BY steam_app_id
        ) latest ON ph.steam_app_id = latest.steam_app_id AND ph.recorded_at = latest.max_date
      `).all();
      const historyTime = Date.now() - startTime1;

      // latest_pricesからの取得時間
      const startTime2 = Date.now();
      const cacheResult = db.prepare(`
        SELECT * FROM latest_prices
      `).all();
      const cacheTime = Date.now() - startTime2;

      expect(historyResult.length).toBe(cacheResult.length);
      expect(cacheTime).toBeLessThan(historyTime / 2); // キャッシュが少なくとも2倍高速
    });
  });

  describe('JSON Field Optimization', () => {
    test('should have efficient JSON extraction queries', () => {
      const db = database.getConnection();
      const startTime = Date.now();

      // JSON extract インデックスを活用
      const result = db.prepare(`
        SELECT id, json_extract(metadata, '$.legacy_message') as message
        FROM alerts 
        WHERE json_valid(metadata) AND json_extract(metadata, '$.legacy_message') IS NOT NULL
      `).all();

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // 100ms以内
    });

    test('should validate JSON data integrity', () => {
      const db = database.getConnection();

      // 全てのJSONデータが有効であることを確認
      const invalidAlerts = db.prepare(`
        SELECT COUNT(*) as count FROM alerts 
        WHERE metadata IS NOT NULL AND NOT json_valid(metadata)
      `).get();

      const invalidStats = db.prepare(`
        SELECT COUNT(*) as count FROM price_statistics 
        WHERE statistics_json IS NOT NULL AND NOT json_valid(statistics_json)
      `).get();

      expect(invalidAlerts.count).toBe(0);
      expect(invalidStats.count).toBe(0);
    });

    test('should efficiently search JSON content', () => {
      const db = database.getConnection();
      const startTime = Date.now();

      // JSON内容検索
      const result = db.prepare(`
        SELECT * FROM alerts 
        WHERE json_extract(metadata, '$.legacy_game_name') LIKE '%Game%'
      `).all();

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(80); // 80ms以内
    });
  });

  describe('Database Statistics and Analysis', () => {
    test('should generate accurate database statistics', () => {
      const analysis = database.analyzeJsonFields();

      expect(analysis).toHaveProperty('alerts_metadata');
      expect(analysis).toHaveProperty('price_statistics_json');
      expect(analysis).toHaveProperty('invalid_records');

      expect(analysis.alerts_metadata.total_records).toBeGreaterThan(0);
      expect(analysis.alerts_metadata.records_with_metadata).toBeGreaterThan(0);
      expect(analysis.invalid_records).toBeInstanceOf(Array);
    });

    test('should cleanup invalid JSON data', () => {
      const db = database.getConnection();

      // 無効なJSONデータを挿入
      db.prepare(`
        INSERT INTO alerts (steam_app_id, alert_type, triggered_price, metadata)
        VALUES (?, ?, ?, ?)
      `).run(testGameIds[0], 'test', 1000, '{"invalid": json}');

      // クリーンアップ実行
      const result = database.cleanupInvalidJsonData();

      expect(result.cleaned_alerts).toBeGreaterThan(0);
      expect(result.cleaned_statistics).toBeGreaterThanOrEqual(0);

      // 無効なデータが削除されていることを確認
      const remainingInvalid = db.prepare(`
        SELECT COUNT(*) as count FROM alerts 
        WHERE metadata IS NOT NULL AND NOT json_valid(metadata)
      `).get();

      expect(remainingInvalid.count).toBe(0);
    });

    test('should track database size and growth', () => {
      const db = database.getConnection();

      const tables = ['games', 'price_history', 'alerts', 'review_scores', 'latest_prices'];
      const sizes: Record<string, number> = {};

      tables.forEach(table => {
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        sizes[table] = result.count;
      });

      expect(sizes.games).toBeGreaterThan(0);
      expect(sizes.price_history).toBeGreaterThan(sizes.games); // 履歴は複数件
      expect(sizes.latest_prices).toBeLessThanOrEqual(sizes.games); // 最新価格は各ゲーム1件以下
    });
  });

  describe('Query Optimization', () => {
    test('should handle complex joins efficiently', () => {
      const db = database.getConnection();
      const startTime = Date.now();

      // 複雑な結合クエリ
      const result = db.prepare(`
        SELECT 
          g.name,
          lp.current_price,
          lp.discount_percent,
          COUNT(a.id) as alert_count,
          AVG(rs.score) as avg_score
        FROM games g
        LEFT JOIN latest_prices lp ON g.steam_app_id = lp.steam_app_id
        LEFT JOIN alerts a ON g.steam_app_id = a.steam_app_id
        LEFT JOIN review_scores rs ON g.steam_app_id = rs.steam_app_id
        WHERE g.enabled = 1
        GROUP BY g.steam_app_id
        ORDER BY lp.discount_percent DESC
        LIMIT 10
      `).all();

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(150); // 150ms以内
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('current_price');
    });

    test('should optimize pagination queries', () => {
      const db = database.getConnection();
      const limit = 5;
      const offset = 2;

      const startTime = Date.now();

      const result = db.prepare(`
        SELECT g.*, lp.current_price
        FROM games g
        LEFT JOIN latest_prices lp ON g.steam_app_id = lp.steam_app_id
        WHERE g.enabled = 1
        ORDER BY g.name
        LIMIT ? OFFSET ?
      `).all(limit, offset);

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeLessThanOrEqual(limit);
      expect(queryTime).toBeLessThan(50); // 50ms以内
    });

    test('should handle aggregation queries efficiently', () => {
      const db = database.getConnection();
      const startTime = Date.now();

      const result = db.prepare(`
        SELECT 
          DATE(ph.recorded_at) as date,
          COUNT(*) as price_updates,
          AVG(ph.discount_percent) as avg_discount,
          MIN(ph.current_price) as min_price,
          MAX(ph.current_price) as max_price
        FROM price_history ph
        WHERE ph.recorded_at >= date('now', '-7 days')
        GROUP BY DATE(ph.recorded_at)
        ORDER BY date DESC
      `).all();

      const queryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // 100ms以内
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('avg_discount');
    });
  });

  describe('Data Integrity and Constraints', () => {
    test('should enforce foreign key constraints', () => {
      const db = database.getConnection();

      // 存在しないゲームIDでの価格履歴追加を試行
      expect(() => {
        db.prepare(`
          INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(999999999, 1000, 2000, 50, 1000, 1, 'steam');
      }).toThrow(); // 外部キー制約エラー
    });

    test('should validate CHECK constraints', () => {
      const db = database.getConnection();

      // 無効なalert_typeでの挿入を試行
      expect(() => {
        db.prepare(`
          INSERT INTO alerts (steam_app_id, alert_type, triggered_price)
          VALUES (?, ?, ?)
        `).run(testGameIds[0], 'invalid_type', 1000);
      }).toThrow(); // CHECK制約エラー
    });

    test('should maintain data consistency across transactions', () => {
      const db = database.getConnection();

      // トランザクション内での一貫性テスト
      const transaction = db.transaction(() => {
        // 新しいゲームを追加
        const newGameId = Date.now() + 9999;
        db.prepare(`
          INSERT INTO games (steam_app_id, name, enabled, price_threshold)
          VALUES (?, ?, ?, ?)
        `).run(newGameId, 'Transaction Test Game', 1, 1500);

        // 関連する価格履歴を追加
        db.prepare(`
          INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(newGameId, 1000, 2000, 50, 1000, 1, 'steam');

        return newGameId;
      });

      const newGameId = transaction();

      // データが正常に挿入されていることを確認
      const game = db.prepare('SELECT * FROM games WHERE steam_app_id = ?').get(newGameId);
      const price = db.prepare('SELECT * FROM latest_prices WHERE steam_app_id = ?').get(newGameId);

      expect(game).toBeTruthy();
      expect(price).toBeTruthy();
      expect(price.current_price).toBe(1000);

      // クリーンアップ
      db.prepare('DELETE FROM price_history WHERE steam_app_id = ?').run(newGameId);
      db.prepare('DELETE FROM latest_prices WHERE steam_app_id = ?').run(newGameId);
      db.prepare('DELETE FROM games WHERE steam_app_id = ?').run(newGameId);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should handle bulk operations efficiently', () => {
      const db = database.getConnection();
      const bulkSize = 100;
      const testAppId = testGameIds[0];

      const startTime = Date.now();

      // バルク挿入のテスト
      const stmt = db.prepare(`
        INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (let i = 0; i < bulkSize; i++) {
          const date = new Date(Date.now() - i * 60000).toISOString(); // 1分間隔
          stmt.run(testAppId, 1000 + i, 2000, 25, 1000, 1, 'bulk_test', date);
        }
      });

      transaction();
      const bulkTime = Date.now() - startTime;

      expect(bulkTime).toBeLessThan(500); // 500ms以内でバルク挿入完了

      // クリーンアップ
      db.prepare('DELETE FROM price_history WHERE source = ?').run('bulk_test');
    });

    test('should handle concurrent read operations', async () => {
      const db = database.getConnection();
      const concurrentReads = 10;

      const startTime = Date.now();

      // 並行読み取りテスト
      const readPromises = Array.from({ length: concurrentReads }, () => {
        return new Promise<number>(resolve => {
          const result = db.prepare(`
            SELECT COUNT(*) as count FROM games WHERE enabled = 1
          `).get();
          resolve(result.count);
        });
      });

      const results = await Promise.all(readPromises);
      const concurrentTime = Date.now() - startTime;

      expect(results.length).toBe(concurrentReads);
      expect(results.every(count => count === results[0])).toBe(true); // 全て同じ結果
      expect(concurrentTime).toBeLessThan(200); // 200ms以内
    });

    test('should maintain performance with large datasets', () => {
      const db = database.getConnection();

      // 大量データでのクエリ性能テスト
      const startTime = Date.now();

      const result = db.prepare(`
        SELECT 
          g.steam_app_id,
          g.name,
          lp.current_price,
          COUNT(ph.id) as history_count,
          COUNT(a.id) as alert_count
        FROM games g
        LEFT JOIN latest_prices lp ON g.steam_app_id = lp.steam_app_id
        LEFT JOIN price_history ph ON g.steam_app_id = ph.steam_app_id
        LEFT JOIN alerts a ON g.steam_app_id = a.steam_app_id
        GROUP BY g.steam_app_id
        HAVING history_count > 5
        ORDER BY history_count DESC
      `).all();

      const complexQueryTime = Date.now() - startTime;

      expect(result.length).toBeGreaterThan(0);
      expect(complexQueryTime).toBeLessThan(300); // 300ms以内
    });
  });
});