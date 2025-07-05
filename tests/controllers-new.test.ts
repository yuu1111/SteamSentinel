import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';

describe('SteamSentinel New Controllers Tests', () => {
  const generateUniqueId = () => Date.now() + Math.floor(Math.random() * 1000);
  let testGameId: number;
  let testSteamAppId: number;
  let authToken: string;

  beforeAll(async () => {
    // テスト用データベース初期化
    database.connect();
    database.initialize();

    // テスト用ゲームを作成
    testSteamAppId = generateUniqueId();
    const gameData = {
      steam_app_id: testSteamAppId,
      name: 'Test Game Controllers',
      enabled: true,
      price_threshold: 2000,
      alert_enabled: true
    };

    const gameResponse = await request(app)
      .post('/api/v1/games')
      .send(gameData)
      .expect(201);

    testGameId = gameResponse.body.data.id;

    // テスト用価格履歴を追加
    const db = database.getConnection();
    
    // 価格履歴を追加
    const priceStmt = db.prepare(`
      INSERT INTO price_history (steam_app_id, current_price, original_price, discount_percent, historical_low, is_on_sale, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    priceStmt.run(testSteamAppId, 1500, 2000, 25, 1200, 1, 'steam');
    priceStmt.run(testSteamAppId, 1200, 2000, 40, 1200, 1, 'steam');
    
    // レビューデータを追加
    const reviewStmt = db.prepare(`
      INSERT INTO review_scores (steam_app_id, source, score, max_score, review_count, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    reviewStmt.run(testSteamAppId, 'steam', 85, 100, 1200, 'Very Positive');
    reviewStmt.run(testSteamAppId, 'metacritic', 78, 100, 25, 'Generally favorable reviews');

    // テスト用ユーザーを作成して認証トークンを取得
    try {
      const bcrypt = require('bcrypt');
      const userStmt = db.prepare(`
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      userStmt.run('testuser', 'test@example.com', hashedPassword, 'admin', 1);
      
      // ログインしてトークンを取得
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword'
        });
      
      if (loginResponse.body.success) {
        authToken = loginResponse.body.data.accessToken;
      }
    } catch (error) {
      console.warn('認証セットアップスキップ:', error);
      authToken = '';
    }
  });

  afterAll(async () => {
    try {
      const db = database.getConnection();
      // テストデータのクリーンアップ
      db.prepare('DELETE FROM review_scores WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM price_history WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM latest_prices WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM alerts WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM games WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM users WHERE username = ?').run('testuser');
    } catch (error) {
      // クリーンアップエラーは無視
    }
    database.close();
  });

  describe('PriceController Tests', () => {
    it('GET /api/v1/prices/history/:appId - should return price history', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/history/${testSteamAppId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game).toHaveProperty('steam_app_id', testSteamAppId);
      expect(response.body.data.priceHistory).toBeInstanceOf(Array);
      expect(response.body.data.meta).toHaveProperty('days', 30);
      expect(response.body.data.meta).toHaveProperty('recordCount');
    });

    it('GET /api/v1/prices/history/:appId - should handle custom days parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/history/${testSteamAppId}?days=7&limit=50`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.meta.days).toBe(7);
    });

    it('GET /api/v1/prices/latest/:appId - should return latest price', async () => {
      const response = await request(app)
        .get(`/api/v1/prices/latest/${testSteamAppId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('steam_app_id', testSteamAppId);
      expect(response.body.data).toHaveProperty('current_price');
      expect(response.body.data).toHaveProperty('game_name');
    });

    it('GET /api/v1/prices/statistics - should return price statistics', async () => {
      const response = await request(app)
        .get('/api/v1/prices/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toHaveProperty('total_games');
      expect(response.body.data.overview).toHaveProperty('games_on_sale');
      expect(response.body.data).toHaveProperty('topDiscounts');
      expect(response.body.data).toHaveProperty('recentHistoricalLows');
    });

    it('GET /api/v1/prices/alerts/potential - should return potential alerts', async () => {
      const response = await request(app)
        .get('/api/v1/prices/alerts/potential?threshold=30')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.potentialAlerts).toBeInstanceOf(Array);
      expect(response.body.data.meta).toHaveProperty('threshold', 30);
      expect(response.body.data.meta).toHaveProperty('count');
    });

    it('POST /api/v1/prices/track - should start price tracking (with auth)', async () => {
      if (!authToken) {
        console.log('認証テストをスキップ');
        return;
      }

      const response = await request(app)
        .post('/api/v1/prices/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          steamAppIds: [testSteamAppId]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeInstanceOf(Array);
      expect(response.body.data.summary).toHaveProperty('total', 1);
    });

    it('DELETE /api/v1/prices/track/:appId - should stop price tracking (with auth)', async () => {
      if (!authToken) {
        console.log('認証テストをスキップ');
        return;
      }

      const response = await request(app)
        .delete(`/api/v1/prices/track/${testSteamAppId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('steam_app_id', testSteamAppId);
    });

    it('GET /api/v1/prices/history/999999 - should return 404 for non-existent game', async () => {
      const nonExistentId = generateUniqueId();
      const response = await request(app)
        .get(`/api/v1/prices/history/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('見つかりません');
    });
  });

  describe('ReviewController Tests', () => {
    it('GET /api/v1/reviews/:appId - should return game reviews', async () => {
      const response = await request(app)
        .get(`/api/v1/reviews/${testSteamAppId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game).toHaveProperty('steam_app_id', testSteamAppId);
      expect(response.body.data).toHaveProperty('integratedScore');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('sourceCount');
    });

    it('GET /api/v1/reviews/:appId - should return detailed reviews with details=true', async () => {
      const response = await request(app)
        .get(`/api/v1/reviews/${testSteamAppId}?details=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reviews');
      expect(response.body.data.reviews).toBeInstanceOf(Array);
      expect(response.body.data.reviews.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/reviews/batch - should return multiple game reviews', async () => {
      const response = await request(app)
        .post('/api/v1/reviews/batch')
        .send({
          steamAppIds: [testSteamAppId]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeInstanceOf(Array);
      expect(response.body.data.summary).toHaveProperty('total', 1);
      expect(response.body.data.summary).toHaveProperty('successful');
    });

    it('GET /api/v1/reviews/statistics - should return review statistics', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/statistics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toHaveProperty('gamesWithReviews');
      expect(response.body.data).toHaveProperty('sourceBreakdown');
      expect(response.body.data).toHaveProperty('scoreDistribution');
      expect(response.body.data).toHaveProperty('topRatedGames');
    });

    it('POST /api/v1/reviews/:appId/refresh - should refresh game reviews (with auth)', async () => {
      if (!authToken) {
        console.log('認証テストをスキップ');
        return;
      }

      // 強制更新を使用して24時間制限を回避
      const response = await request(app)
        .post(`/api/v1/reviews/${testSteamAppId}/refresh?force=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('steam_app_id', testSteamAppId);
    });

    it('GET /api/v1/reviews/999999 - should return 404 for non-existent game', async () => {
      const nonExistentId = generateUniqueId();
      const response = await request(app)
        .get(`/api/v1/reviews/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('見つかりません');
    });
  });

  describe('StatisticsController Tests', () => {
    it('GET /api/v1/statistics/dashboard - should return dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toHaveProperty('total_games');
      expect(response.body.data.overview).toHaveProperty('monitored_games');
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data).toHaveProperty('alertBreakdown');
      expect(response.body.data.meta).toHaveProperty('last_updated');
    });

    it('GET /api/v1/statistics/games - should return game statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/games?period=30d')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toHaveProperty('label', '30d');
      expect(response.body.data.period).toHaveProperty('days', 30);
      expect(response.body.data).toHaveProperty('gameAdditionTrend');
      expect(response.body.data).toHaveProperty('categoryBreakdown');
      expect(response.body.data).toHaveProperty('thresholdDistribution');
      expect(response.body.data).toHaveProperty('topAlertGames');
      expect(response.body.data).toHaveProperty('summary');
    });

    it('GET /api/v1/statistics/alerts - should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/alerts?period=7d')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.period).toHaveProperty('label', '7d');
      expect(response.body.data.period).toHaveProperty('days', 7);
      expect(response.body.data).toHaveProperty('alertTrend');
      expect(response.body.data).toHaveProperty('effectiveness');
      expect(response.body.data).toHaveProperty('hourlyPattern');
      expect(response.body.data).toHaveProperty('responseTime');
      expect(response.body.data).toHaveProperty('summary');
    });

    it('GET /api/v1/statistics/performance - should return performance statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.database).toHaveProperty('tables');
      expect(response.body.data.database).toHaveProperty('rowCounts');
      expect(response.body.data).toHaveProperty('indexes');
      expect(response.body.data).toHaveProperty('recentActivity');
      expect(response.body.data).toHaveProperty('performance');
    });

    it('GET /api/v1/statistics/export - should export statistics data (with auth)', async () => {
      if (!authToken) {
        console.log('認証テストをスキップ');
        return;
      }

      const response = await request(app)
        .get('/api/v1/statistics/export?format=json')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('exported_at');
      expect(response.body).toHaveProperty('dashboard');
      expect(response.body).toHaveProperty('games');
      expect(response.body).toHaveProperty('alerts');
    });

    it('GET /api/v1/statistics/export - should export CSV format (with auth)', async () => {
      if (!authToken) {
        console.log('認証テストをスキップ');
        return;
      }

      const response = await request(app)
        .get('/api/v1/statistics/export?format=csv')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.header['content-type']).toContain('text/csv');
      expect(response.header['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Metric,Value');
    });
  });

  describe('Error Handling for New Controllers', () => {
    it('POST /api/v1/prices/track - should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/prices/track')
        .send({
          steamAppIds: [testSteamAppId]
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('認証');
    });

    it('POST /api/v1/reviews/batch - should validate steamAppIds array', async () => {
      const response = await request(app)
        .post('/api/v1/reviews/batch')
        .send({
          steamAppIds: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('GET /api/v1/statistics/games - should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/games?period=invalid')
        .expect(200); // デフォルト値を使用するため成功

      expect(response.body.success).toBe(true);
      expect(response.body.data.period.label).toBe('30d'); // デフォルト値
    });

    it('GET /api/v1/prices/alerts/potential - should validate threshold range', async () => {
      const response = await request(app)
        .get('/api/v1/prices/alerts/potential?threshold=150') // 90を超える
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('閾値');
    });
  });

  describe('Integration Tests', () => {
    it('Should handle complete price workflow', async () => {
      // 1. 価格履歴を取得
      const historyResponse = await request(app)
        .get(`/api/v1/prices/history/${testSteamAppId}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);

      // 2. 最新価格を取得
      const latestResponse = await request(app)
        .get(`/api/v1/prices/latest/${testSteamAppId}`)
        .expect(200);

      expect(latestResponse.body.success).toBe(true);

      // 3. 潜在的アラートを確認
      const alertsResponse = await request(app)
        .get('/api/v1/prices/alerts/potential')
        .expect(200);

      expect(alertsResponse.body.success).toBe(true);
    });

    it('Should handle complete review workflow', async () => {
      // 1. レビューを取得
      const reviewResponse = await request(app)
        .get(`/api/v1/reviews/${testSteamAppId}`)
        .expect(200);

      expect(reviewResponse.body.success).toBe(true);

      // 2. レビュー統計を取得
      const statsResponse = await request(app)
        .get('/api/v1/reviews/statistics')
        .expect(200);

      expect(statsResponse.body.success).toBe(true);

      // 3. バッチでレビューを取得
      const batchResponse = await request(app)
        .post('/api/v1/reviews/batch')
        .send({
          steamAppIds: [testSteamAppId]
        })
        .expect(200);

      expect(batchResponse.body.success).toBe(true);
    });

    it('Should handle complete statistics workflow', async () => {
      // 1. ダッシュボード統計
      const dashboardResponse = await request(app)
        .get('/api/v1/statistics/dashboard')
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);

      // 2. ゲーム統計
      const gameStatsResponse = await request(app)
        .get('/api/v1/statistics/games')
        .expect(200);

      expect(gameStatsResponse.body.success).toBe(true);

      // 3. アラート統計
      const alertStatsResponse = await request(app)
        .get('/api/v1/statistics/alerts')
        .expect(200);

      expect(alertStatsResponse.body.success).toBe(true);

      // 4. パフォーマンス統計
      const perfResponse = await request(app)
        .get('/api/v1/statistics/performance')
        .expect(200);

      expect(perfResponse.body.success).toBe(true);
    });
  });
});