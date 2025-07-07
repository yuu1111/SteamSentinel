import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';

describe('PriceController Tests', () => {
  let testSteamAppId: number;
  let authToken: string;

  beforeAll(async () => {
    // データベース初期化
    database.connect();
    database.initialize();

    // テスト用ユーザー作成
    const testUser = {
      username: 'price_test_user',
      email: 'price@test.com',
      password: 'test123',
      role: 'user'
    };

    await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });

    authToken = loginRes.body.data.access_token;

    // テスト用データ作成
    testSteamAppId = Date.now();
    const db = database.getConnection();

    // ゲーム追加
    const gameStmt = db.prepare(`
      INSERT INTO games (steam_app_id, name, enabled, price_threshold)
      VALUES (?, ?, ?, ?)
    `);
    gameStmt.run(testSteamAppId, 'Price Test Game', 1, 2000);

    // 価格履歴データ追加
    const priceStmt = db.prepare(`
      INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const baseDate = new Date();
    const dates = [
      new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7日前
      new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5日前
      new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3日前
      new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1日前
      baseDate // 今日
    ];

    const priceData = [
      [2000, 2000, 0, 1800, 0, 'steam'],
      [1900, 2000, 5, 1800, 1, 'steam'],
      [1800, 2000, 10, 1800, 1, 'steam'],
      [1700, 2000, 15, 1700, 1, 'steam'],
      [1600, 2000, 20, 1600, 1, 'steam']
    ];

    priceData.forEach((price, index) => {
      priceStmt.run(
        testSteamAppId,
        price[0], // current_price
        price[1], // original_price
        price[2], // discount_percent
        price[3], // historical_low
        price[4], // is_on_sale
        price[5], // source
        dates[index].toISOString()
      );
    });
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    const db = database.getConnection();
    db.prepare('DELETE FROM price_history WHERE steam_app_id = ?').run(testSteamAppId);
    db.prepare('DELETE FROM latest_prices WHERE steam_app_id = ?').run(testSteamAppId);
    db.prepare('DELETE FROM games WHERE steam_app_id = ?').run(testSteamAppId);
    db.prepare('DELETE FROM users WHERE username = ?').run('price_test_user');
  });

  describe('GET /api/v1/prices/history/:appId', () => {
    test('should get price history for game', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/history/${testSteamAppId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('current_price');
      expect(response.body.data[0]).toHaveProperty('recorded_at');
    });

    test('should filter price history by days', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/history/${testSteamAppId}?days=3`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      // 3日分以下のデータが返される
      expect(response.body.data.length).toBeLessThanOrEqual(4);
    });

    test('should limit price history results', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/history/${testSteamAppId}?limit=2`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    test('should return 404 for non-existent game', async () => {
      const nonExistentId = 999999999;
      const response = await request(app)
        .get(`/api/v1/prices/history/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('価格履歴が見つかりません');
    });

    test('should validate appId parameter', async () => {
      await request(app)
        .get('/api/v1/prices/history/invalid')
        .expect(400);
    });
  });

  describe('GET /api/v1/prices/latest/:appId', () => {
    test('should get latest price for game', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/latest/${testSteamAppId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('current_price');
      expect(response.body.data).toHaveProperty('original_price');
      expect(response.body.data).toHaveProperty('discount_percent');
      expect(response.body.data).toHaveProperty('is_on_sale');
      expect(response.body.data).toHaveProperty('historical_low');
    });

    test('should return 404 for non-existent game latest price', async () => {
      const nonExistentId = 999999999;
      const response = await request(app)
        .get(`/api/v1/prices/latest/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should include performance metadata', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/latest/${testSteamAppId}`)
        .expect(200);

      expect(response.body.meta).toHaveProperty('performance');
      expect(response.body.meta.performance).toHaveProperty('query_time_ms');
    });
  });

  describe('GET /api/v1/prices/statistics', () => {
    test('should get price statistics', async () => {
      const response = await request(app)
        .get('/api/v1/prices/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_games');
      expect(response.body.data).toHaveProperty('monitored_games');
      expect(response.body.data).toHaveProperty('games_on_sale');
      expect(response.body.data).toHaveProperty('average_discount');
      expect(response.body.data).toHaveProperty('total_savings');
    });

    test('should include recent price trends', async () => {
      const response = await request(app)
        .get('/api/v1/prices/statistics')
        .expect(200);

      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data.trends).toBeInstanceOf(Array);
    });

    test('should cache statistics results', async () => {
      // 最初のリクエスト
      const response1 = await request(app)
        .get('/api/v1/prices/statistics')
        .expect(200);

      // 2回目のリクエスト（キャッシュから）
      const response2 = await request(app)
        .get('/api/v1/prices/statistics')
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      // 2回目のレスポンスが高速であることを確認
      expect(response2.body.meta.performance.cache_hit).toBe(true);
    });
  });

  describe('POST /api/v1/prices/bulk-update', () => {
    test('should update multiple game prices (authenticated)', async () => {
      const bulkData = {
        updates: [
          {
            steam_app_id: testSteamAppId,
            current_price: 1500,
            original_price: 2000,
            discount_percent: 25,
            is_on_sale: true,
            source: 'steam'
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/prices/bulk-update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('updated_count');
      expect(response.body.data.updated_count).toBe(1);
    });

    test('should require authentication for bulk update', async () => {
      const bulkData = {
        updates: [
          {
            steam_app_id: testSteamAppId,
            current_price: 1400,
            original_price: 2000,
            discount_percent: 30
          }
        ]
      };

      await request(app)
        .post('/api/v1/prices/bulk-update')
        .send(bulkData)
        .expect(401);
    });

    test('should validate bulk update data', async () => {
      const invalidData = {
        updates: [
          {
            steam_app_id: 'invalid',
            current_price: -100
          }
        ]
      };

      await request(app)
        .post('/api/v1/prices/bulk-update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should limit bulk update size', async () => {
      const largeUpdate = {
        updates: Array.from({ length: 101 }, (_, i) => ({
          steam_app_id: testSteamAppId + i,
          current_price: 1000,
          original_price: 2000
        }))
      };

      await request(app)
        .post('/api/v1/prices/bulk-update')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeUpdate)
        .expect(400);
    });
  });

  describe('GET /api/v1/prices/trends', () => {
    test('should get price trends analysis', async () => {
      const response = await request(app)
        .get('/api/v1/prices/trends')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trending_down');
      expect(response.body.data).toHaveProperty('trending_up');
      expect(response.body.data).toHaveProperty('stable_prices');
      expect(response.body.data.trending_down).toBeInstanceOf(Array);
    });

    test('should filter trends by period', async () => {
      const response = await request(app)
        .get('/api/v1/prices/trends?period=7d')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data.period).toBe('7d');
    });

    test('should include discount analysis', async () => {
      const response = await request(app)
        .get('/api/v1/prices/trends')
        .expect(200);

      expect(response.body.data).toHaveProperty('discount_analysis');
      expect(response.body.data.discount_analysis).toHaveProperty('new_sales');
      expect(response.body.data.discount_analysis).toHaveProperty('ending_sales');
    });
  });

  describe('Performance and Caching', () => {
    test('should track query performance', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/history/${testSteamAppId}`)
        .expect(200);

      expect(response.body.meta).toHaveProperty('performance');
      expect(response.body.meta.performance).toHaveProperty('query_time_ms');
      expect(typeof response.body.meta.performance.query_time_ms).toBe('number');
    });

    test('should cache frequently accessed data', async () => {
      // 統計データのキャッシュテスト
      const start = Date.now();
      
      await request(app)
        .get('/api/v1/prices/statistics')
        .expect(200);

      const firstRequestTime = Date.now() - start;

      const start2 = Date.now();
      
      const response = await request(app)
        .get('/api/v1/prices/statistics')
        .expect(200);

      const secondRequestTime = Date.now() - start2;

      // 2回目のリクエストが高速であることを確認
      expect(secondRequestTime).toBeLessThan(firstRequestTime);
      expect(response.body.meta.performance.cache_hit).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // 無効なSQLを発生させるような状況をシミュレート
      const response = await request(app)
        .get('/api/v1/prices/history/0') // ID 0は通常存在しない
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('should validate request parameters', async () => {
      await request(app)
        .get('/api/v1/prices/history/abc')
        .expect(400);

      await request(app)
        .get('/api/v1/prices/history/-1')
        .expect(400);
    });

    test('should handle malformed request bodies', async () => {
      await request(app)
        .post('/api/v1/prices/bulk-update')
        .set('Authorization', `Bearer ${authToken}`)
        .send('invalid json')
        .expect(400);
    });
  });
});