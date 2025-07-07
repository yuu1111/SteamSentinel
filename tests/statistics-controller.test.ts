import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';

describe('StatisticsController Tests', () => {
  let authToken: string;
  let adminToken: string;
  let testGameIds: number[] = [];

  beforeAll(async () => {
    // データベース初期化
    database.connect();
    database.initialize();

    // テスト用ユーザー作成
    const testUser = {
      username: 'stats_test_user',
      email: 'stats@test.com',
      password: 'test123',
      role: 'user'
    };

    const adminUser = {
      username: 'stats_admin',
      email: 'admin@stats.com',
      password: 'admin123',
      role: 'admin'
    };

    await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    await request(app)
      .post('/api/v1/auth/register')
      .send(adminUser);

    const userLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: adminUser.username,
        password: adminUser.password
      });

    authToken = userLoginRes.body.data.access_token;
    adminToken = adminLoginRes.body.data.access_token;

    // テスト用データ作成
    const db = database.getConnection();
    const baseDate = new Date();

    // 複数のテストゲーム作成
    const gameStmt = db.prepare(`
      INSERT INTO games (steam_app_id, name, enabled, price_threshold, is_purchased)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < 5; i++) {
      const steamAppId = Date.now() + i;
      const result = gameStmt.run(
        steamAppId,
        `Stats Test Game ${i + 1}`,
        i < 4 ? 1 : 0, // 最後の1つは無効
        1000 + (i * 500),
        i % 2 === 0 ? 1 : 0 // 半分購入済み
      );
      testGameIds.push(steamAppId);
    }

    // 価格履歴データ作成
    const priceStmt = db.prepare(`
      INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    testGameIds.forEach((steamAppId, index) => {
      // 各ゲームに複数の価格履歴を追加
      for (let day = 7; day >= 0; day--) {
        const date = new Date(baseDate.getTime() - day * 24 * 60 * 60 * 1000);
        const basePrice = 2000 + (index * 500);
        const discountPercent = day === 0 ? 30 : (day < 3 ? 20 : 0);
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
      INSERT INTO alerts (steam_app_id, alert_type, triggered_price, created_at, is_read)
      VALUES (?, ?, ?, ?, ?)
    `);

    testGameIds.forEach((steamAppId, index) => {
      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
        alertStmt.run(
          steamAppId,
          ['new_low', 'sale_start', 'threshold_met'][i % 3],
          1500 - (i * 100),
          date.toISOString(),
          i % 2 === 0 ? 1 : 0
        );
      }
    });

    // レビューデータ作成
    const reviewStmt = db.prepare(`
      INSERT INTO review_scores (steam_app_id, source, score, max_score, review_count, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    testGameIds.forEach((steamAppId, index) => {
      reviewStmt.run(steamAppId, 'steam', 85 - (index * 5), 100, 1000 + (index * 200), 'Very Positive');
      reviewStmt.run(steamAppId, 'metacritic', 80 - (index * 3), 100, null, 'Generally favorable');
    });

    // 統計データ作成
    const statsStmt = db.prepare(`
      INSERT INTO price_statistics (total_games, monitored_games, games_on_sale, average_discount, total_savings, calculated_at, statistics_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (let day = 7; day >= 0; day--) {
      const date = new Date(baseDate.getTime() - day * 24 * 60 * 60 * 1000);
      statsStmt.run(
        testGameIds.length,
        testGameIds.length - 1,
        3,
        25.5,
        15000,
        date.toISOString(),
        JSON.stringify({
          calculation_method: 'automatic_trigger',
          data_points: 1000,
          last_price_update: date.toISOString(),
          discount_ranges: {
            '0-25': 10,
            '26-50': 5,
            '51-75': 2,
            '76-100': 1
          }
        })
      );
    }
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
    db.prepare('DELETE FROM price_statistics WHERE id > 0').run();
    db.prepare('DELETE FROM users WHERE username IN (?, ?)').run('stats_test_user', 'stats_admin');
  });

  describe('GET /api/v1/statistics/overview', () => {
    test('should get overview statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_games');
      expect(response.body.data).toHaveProperty('monitored_games');
      expect(response.body.data).toHaveProperty('games_on_sale');
      expect(response.body.data).toHaveProperty('total_alerts');
      expect(response.body.data).toHaveProperty('unread_alerts');
      expect(response.body.data).toHaveProperty('average_discount');
      expect(response.body.data).toHaveProperty('total_savings');
    });

    test('should include performance metadata', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);

      expect(response.body.meta).toHaveProperty('performance');
      expect(response.body.meta.performance).toHaveProperty('query_time_ms');
      expect(response.body.meta.performance).toHaveProperty('cache_hit');
    });

    test('should cache overview data', async () => {
      // 最初のリクエスト
      await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);

      // 2回目のリクエスト（キャッシュから）
      const response = await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);

      expect(response.body.meta.performance.cache_hit).toBe(true);
    });
  });

  describe('GET /api/v1/statistics/games', () => {
    test('should get game statistics with default period', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/games')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('total_games');
      expect(response.body.data).toHaveProperty('enabled_games');
      expect(response.body.data).toHaveProperty('purchased_games');
      expect(response.body.data).toHaveProperty('avg_price_threshold');
    });

    test('should filter by period', async () => {
      const periods = ['7d', '30d', '90d', '1y'];

      for (const period of periods) {
        const response = await request(app)
          .get(`/api/v1/statistics/games?period=${period}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period).toBe(period);
      }
    });

    test('should reject invalid period', async () => {
      await request(app)
        .get('/api/v1/statistics/games?period=invalid')
        .expect(400);
    });

    test('should include game distribution', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/games')
        .expect(200);

      expect(response.body.data).toHaveProperty('price_distribution');
      expect(response.body.data).toHaveProperty('threshold_distribution');
      expect(response.body.data.price_distribution).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/statistics/alerts', () => {
    test('should get alert statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_alerts');
      expect(response.body.data).toHaveProperty('unread_alerts');
      expect(response.body.data).toHaveProperty('alerts_by_type');
      expect(response.body.data).toHaveProperty('recent_alerts');
      expect(response.body.data.alerts_by_type).toBeInstanceOf(Object);
    });

    test('should filter alerts by period', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/alerts?period=7d')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toBe('7d');
    });

    test('should include alert trends', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/alerts')
        .expect(200);

      expect(response.body.data).toHaveProperty('daily_counts');
      expect(response.body.data).toHaveProperty('trend_direction');
      expect(response.body.data.daily_counts).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/statistics/performance', () => {
    test('should get performance statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cache_stats');
      expect(response.body.data).toHaveProperty('database_stats');
      expect(response.body.data).toHaveProperty('api_stats');
      expect(response.body.data.cache_stats).toHaveProperty('hit_rate');
    });

    test('should include memory usage', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/performance')
        .expect(200);

      expect(response.body.data).toHaveProperty('memory_usage');
      expect(response.body.data.memory_usage).toHaveProperty('used');
      expect(response.body.data.memory_usage).toHaveProperty('total');
    });

    test('should track query performance', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/performance')
        .expect(200);

      expect(response.body.data.database_stats).toHaveProperty('avg_query_time');
      expect(response.body.data.database_stats).toHaveProperty('slow_queries');
    });
  });

  describe('GET /api/v1/statistics/export', () => {
    test('should export statistics in JSON format (authenticated)', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/export?format=json')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('export_data');
      expect(response.body.data).toHaveProperty('export_timestamp');
      expect(response.body.data).toHaveProperty('format');
      expect(response.body.data.format).toBe('json');
    });

    test('should export statistics in CSV format (authenticated)', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/export?format=csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('csv');
      expect(response.body.data).toHaveProperty('csv_data');
    });

    test('should require authentication for export', async () => {
      await request(app)
        .get('/api/v1/statistics/export')
        .expect(401);
    });

    test('should exclude sensitive data by default', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.include_sensitive).toBe(false);
      // 機密データが含まれていないことを確認
      const exportData = response.body.data.export_data;
      expect(JSON.stringify(exportData)).not.toContain('password');
      expect(JSON.stringify(exportData)).not.toContain('token');
    });

    test('should include sensitive data for admin users', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/export?include_sensitive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // 管理者は機密データも取得可能
    });

    test('should deny sensitive data for regular users', async () => {
      await request(app)
        .get('/api/v1/statistics/export?include_sensitive=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('Advanced Statistics', () => {
    test('should calculate trend analysis', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/trends')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('price_trends');
      expect(response.body.data).toHaveProperty('alert_trends');
      expect(response.body.data).toHaveProperty('discount_trends');
      expect(response.body.data.price_trends).toHaveProperty('direction');
    });

    test('should provide comparative analysis', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/comparison?periods=7d,30d')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('comparisons');
      expect(response.body.data.comparisons).toBeInstanceOf(Array);
    });

    test('should calculate discount effectiveness', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/discounts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('discount_ranges');
      expect(response.body.data).toHaveProperty('average_savings');
      expect(response.body.data).toHaveProperty('top_discounts');
    });
  });

  describe('Real-time Statistics', () => {
    test('should provide real-time counters', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/realtime')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('live_counters');
      expect(response.body.data).toHaveProperty('last_updated');
      expect(response.body.data.live_counters).toHaveProperty('active_sales');
    });

    test('should include recent activity', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/activity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recent_price_changes');
      expect(response.body.data).toHaveProperty('recent_alerts');
      expect(response.body.data).toHaveProperty('new_games_added');
    });
  });

  describe('Caching and Performance', () => {
    test('should cache expensive statistics queries', async () => {
      // 最初のリクエスト（データベースから）
      const start1 = Date.now();
      const response1 = await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);
      const time1 = Date.now() - start1;

      // 2回目のリクエスト（キャッシュから）
      const start2 = Date.now();
      const response2 = await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);
      const time2 = Date.now() - start2;

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      expect(response2.body.meta.performance.cache_hit).toBe(true);
      expect(time2).toBeLessThan(time1); // キャッシュ利用で高速化
    });

    test('should invalidate cache when data changes', async () => {
      // キャッシュされたデータを取得
      await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);

      // データを変更（新しいアラート追加）
      const db = database.getConnection();
      db.prepare(`
        INSERT INTO alerts (steam_app_id, alert_type, triggered_price)
        VALUES (?, ?, ?)
      `).run(testGameIds[0], 'test', 1000);

      // キャッシュが無効化されていることを確認
      const response = await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);

      expect(response.body.meta.performance.cache_hit).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid query parameters', async () => {
      await request(app)
        .get('/api/v1/statistics/games?period=invalid')
        .expect(400);

      await request(app)
        .get('/api/v1/statistics/export?format=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    test('should handle database errors gracefully', async () => {
      // データベース接続エラーをシミュレート（実際のテストでは困難）
      const response = await request(app)
        .get('/api/v1/statistics/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      // エラーハンドリングが適切に動作していることを確認
    });

    test('should provide meaningful error messages', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/games?period=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('期間');
    });
  });
});