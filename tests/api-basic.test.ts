import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';

describe('SteamSentinel RESTful API - Basic Tests', () => {
  // ユニークなIDを生成するヘルパー
  const generateUniqueId = () => Date.now() + Math.floor(Math.random() * 1000);
  let authToken: string;
  
  beforeAll(async () => {
    // テスト用データベース初期化
    database.connect();
    database.initialize();
    
    // テスト用ユーザー作成と認証
    const testUser = {
      username: 'apitestuser',
      email: 'api.test@example.com',
      password: 'TestPassword123!',
      role: 'admin'
    };

    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    if (registerRes.status !== 201) {
      console.error('Registration failed:', registerRes.status, registerRes.body);
    }

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });

    if (!loginRes.body.data || !loginRes.body.data.access_token) {
      console.error('Login failed:', loginRes.status, loginRes.body);
      throw new Error('Authentication setup failed');
    }

    authToken = loginRes.body.data.access_token;
  });

  afterAll(async () => {
    // データベース接続を閉じる
    database.close();
  });

  // 各テストスイート後にクリーンアップ（個別テスト後はしない）
  afterAll(async () => {
    try {
      const db = database.getConnection();
      // テストデータのクリーンアップ（テスト用のsteam_app_idのみ）
      db.prepare('DELETE FROM alerts WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM latest_prices WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM games WHERE steam_app_id >= 900000').run();
    } catch (error) {
      // クリーンアップエラーは無視
    }
  });

  describe('Health Check', () => {
    it('GET /api/v1/health - should return healthy status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        status: 'healthy',
        timestamp: expect.any(String),
        version: '2.0.0'
      });
    });
  });

  describe('System Endpoints', () => {
    it('GET /api/v1/system/info - should return system information', async () => {
      const response = await request(app)
        .get('/api/v1/system/info')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nodeVersion');
      expect(response.body.data).toHaveProperty('platform');
      expect(response.body.data).toHaveProperty('databasePath');
      expect(response.body.data).toHaveProperty('environment');
    });

    it('GET /api/v1/system/api-status - should return API configuration status', async () => {
      const response = await request(app)
        .get('/api/v1/system/api-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('steamApiKey');
      expect(response.body.data).toHaveProperty('discordWebhook');
      expect(response.body.data).toHaveProperty('itadApiKey');
    });

    it('GET /api/v1/system/discord-status - should return Discord configuration status', async () => {
      const response = await request(app)
        .get('/api/v1/system/discord-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('configured');
      expect(response.body.data).toHaveProperty('message');
    });
  });

  describe('Basic Games API', () => {
    let testGameId: number;
    let testSteamAppId: number;

    beforeAll(async () => {
      // すべてのテストで使用するゲームを事前に作成
      testSteamAppId = generateUniqueId();
      const gameData = {
        steam_app_id: testSteamAppId,
        name: 'Test Game Basic',
        enabled: true,
        price_threshold: 1000,
        alert_enabled: true
      };

      const response = await request(app)
        .post('/api/v1/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameData)
        .expect(201);

      testGameId = response.body.data.id;
    });

    it('POST /api/v1/games - should create a new game', async () => {
      // beforeAllで作成されたゲームの存在を確認
      expect(testGameId).toBeGreaterThan(0);
      expect(testSteamAppId).toBeGreaterThan(0);
    });

    it('GET /api/v1/games - should return paginated games list', async () => {
      const response = await request(app).get('/api/v1/games');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('pagination');
      expect(response.body.meta.pagination).toHaveProperty('limit');
      expect(response.body.meta.pagination).toHaveProperty('total');
      expect(response.body.meta.pagination).toHaveProperty('offset');
    });

    it('GET /api/v1/games/check/:appId - should check if game exists', async () => {
      const response = await request(app)
        .get(`/api/v1/games/check/${testSteamAppId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
    });

    it('PUT /api/v1/games/:id - should update game', async () => {
      const updateData = {
        name: 'Updated Test Game Basic',
        price_threshold: 1500
      };

      const response = await request(app)
        .put(`/api/v1/games/${testGameId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price_threshold).toBe(updateData.price_threshold);
    });
  });

  describe('Basic Alerts API', () => {
    let testAlertId: number;
    let alertTestSteamAppId: number;

    beforeAll(async () => {
      // アラートテスト用のゲームを作成
      alertTestSteamAppId = generateUniqueId();
      const gameResponse = await request(app)
        .post('/api/v1/games')
        .send({
          steam_app_id: alertTestSteamAppId,
          name: 'Alert Test Game',
          enabled: true,
          alert_enabled: true
        })
        .expect(201);
        
      expect(gameResponse.body.success).toBe(true);
    });

    it('POST /api/v1/alerts - should create test alert via direct DB access', async () => {
      // 直接DBにテストアラートを作成（プロダクションコードを汚さない）
      const db = database.getConnection();
      const stmt = db.prepare(`
        INSERT INTO alerts (steam_app_id, alert_type, message, trigger_price, is_read, notified_discord)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(alertTestSteamAppId, 'test', 'Test alert message', 500, 0, 0);
      testAlertId = result.lastInsertRowid as number;
      
      expect(testAlertId).toBeGreaterThan(0);
    });

    it('GET /api/v1/alerts - should return paginated alerts list', async () => {
      const response = await request(app)
        .get('/api/v1/alerts');

      if (response.status !== 200) {
        console.log('Alert list error:', response.status, response.body);
      }
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('GET /api/v1/alerts/recent - should return recent alerts', async () => {
      const response = await request(app)
        .get('/api/v1/alerts/recent?limit=5');

      if (response.status !== 200) {
        console.log('Recent alerts error:', response.body);
      }
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('PUT /api/v1/alerts/:id/read - should mark alert as read', async () => {
      const response = await request(app)
        .put(`/api/v1/alerts/${testAlertId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('DELETE /api/v1/alerts/:id - should delete alert', async () => {
      const response = await request(app)
        .delete(`/api/v1/alerts/${testAlertId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Budgets API', () => {
    it('GET /api/v1/budgets - should return budgets list', async () => {
      const response = await request(app)
        .get('/api/v1/budgets')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('GET /api/v1/budgets/active - should return active budgets', async () => {
      const response = await request(app)
        .get('/api/v1/budgets/active')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('ITAD Settings API', () => {
    it('GET /api/v1/itad/settings - should return ITAD settings', async () => {
      const response = await request(app)
        .get('/api/v1/itad/settings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('GET /api/v1/itad/settings/filter - should return filter configuration', async () => {
      const response = await request(app)
        .get('/api/v1/itad/settings/filter')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('min_discount');
      expect(response.body.data).toHaveProperty('max_price');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('region');
    });
  });

  describe('Discord Integration', () => {
    it('GET /api/v1/discord/status - should return Discord status', async () => {
      const response = await request(app)
        .get('/api/v1/discord/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('message');
    });

    it('POST /api/v1/discord/test - should test Discord connection', async () => {
      const testData = {
        type: 'connection'
      };

      const response = await request(app)
        .post('/api/v1/discord/test')
        .send(testData);

      // Discord設定の有無によって結果が変わるため、ステータスコードは確認しない
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('testType', 'connection');
    });
  });

  describe('Error Handling', () => {
    it('GET /api/v1/games/999999 - should return 404 for non-existent game', async () => {
      const nonExistentId = generateUniqueId();
      const response = await request(app)
        .get(`/api/v1/games/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('POST /api/v1/games - should return 400 for invalid data', async () => {
      const invalidData = {
        steam_app_id: 'invalid', // 数値である必要がある
        name: '', // 空文字は無効
      };

      const response = await request(app)
        .post('/api/v1/games')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('GET /api/nonexistent - should return 404', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('API endpoint not found');
    });
  });

  describe('Legacy API Compatibility', () => {
    it('GET /api/health - should work with legacy endpoint', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        status: 'healthy',
        timestamp: expect.any(String),
        version: '2.0.0'
      });
    });

    it('GET /api/games - should work with legacy endpoint', async () => {
      const response = await request(app)
        .get('/api/games')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });
});