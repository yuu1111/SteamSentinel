import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';

describe('SteamSentinel RESTful API Tests', () => {
  beforeAll(async () => {
    // テスト用データベース初期化
    database.connect();
    database.initialize();
  });

  afterAll(async () => {
    // データベース接続を閉じる
    database.close();
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

  describe('Games API', () => {
    let testGameId: number;

    it('POST /api/v1/games - should create a new game', async () => {
      const gameData = {
        steam_app_id: 999999,
        name: 'Test Game',
        enabled: true,
        price_threshold: 1000,
        alert_enabled: true
      };

      const response = await request(app)
        .post('/api/v1/games')
        .send(gameData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(gameData.name);
      expect(response.body.data.steam_app_id).toBe(gameData.steam_app_id);
      
      testGameId = response.body.data.id;
    });

    it('GET /api/v1/games - should return paginated games list', async () => {
      const response = await request(app)
        .get('/api/v1/games')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('GET /api/v1/games/:id - should return specific game', async () => {
      const response = await request(app)
        .get(`/api/v1/games/${testGameId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testGameId);
      expect(response.body.data).toHaveProperty('name', 'Test Game');
    });

    it('PUT /api/v1/games/:id - should update game', async () => {
      const updateData = {
        name: 'Updated Test Game',
        price_threshold: 1500
      };

      const response = await request(app)
        .put(`/api/v1/games/${testGameId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price_threshold).toBe(updateData.price_threshold);
    });

    it('GET /api/v1/games/steam/:appId - should get game by Steam App ID', async () => {
      const response = await request(app)
        .get('/api/v1/games/steam/999999')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.steam_app_id).toBe(999999);
    });

    it('GET /api/v1/games/check/:appId - should check if game exists', async () => {
      const response = await request(app)
        .get('/api/v1/games/check/999999')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exists).toBe(true);
    });

    it('PUT /api/v1/games/:id/purchase - should mark game as purchased', async () => {
      const purchaseData = {
        is_purchased: true,
        purchase_price: 999,
        purchase_date: new Date().toISOString()
      };

      const response = await request(app)
        .put(`/api/v1/games/${testGameId}/purchase`)
        .send(purchaseData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('DELETE /api/v1/games/:id - should delete game', async () => {
      const response = await request(app)
        .delete(`/api/v1/games/${testGameId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('削除されました');
    });
  });

  describe('Alerts API', () => {
    let testAlertId: number;

    it('POST /api/v1/alerts - should create test alert', async () => {
      // まずテスト用ゲームを作成
      const gameResponse = await request(app)
        .post('/api/v1/games')
        .send({
          steam_app_id: 888888,
          name: 'Alert Test Game',
          enabled: true,
          alert_enabled: true
        });

      const testGame = gameResponse.body.data;

      const alertData = {
        steam_app_id: testGame.steam_app_id,
        alert_type: 'test',
        message: 'Test alert message',
        trigger_price: 500
      };

      const response = await request(app)
        .post('/api/v1/alerts')
        .send(alertData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      testAlertId = response.body.data.id;
    });

    it('GET /api/v1/alerts - should return paginated alerts list', async () => {
      const response = await request(app)
        .get('/api/v1/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
    });

    it('GET /api/v1/alerts/:id - should return specific alert', async () => {
      const response = await request(app)
        .get(`/api/v1/alerts/${testAlertId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testAlertId);
    });

    it('GET /api/v1/alerts/recent - should return recent alerts', async () => {
      const response = await request(app)
        .get('/api/v1/alerts/recent?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('PUT /api/v1/alerts/:id/read - should mark alert as read', async () => {
      const response = await request(app)
        .put(`/api/v1/alerts/${testAlertId}/read`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('DELETE /api/v1/alerts/:id - should delete alert', async () => {
      const response = await request(app)
        .delete(`/api/v1/alerts/${testAlertId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Dashboard & Statistics', () => {
    it('GET /api/v1/dashboard - should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalGames');
      expect(response.body.data).toHaveProperty('enabledGames');
      expect(response.body.data).toHaveProperty('recentAlerts');
    });

    it('GET /api/v1/statistics/alerts - should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byType');
    });

    it('GET /api/v1/statistics/games - should return game statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/games')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Monitoring', () => {
    it('GET /api/v1/monitoring/status - should return monitoring status', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isRunning');
    });

    it('GET /api/v1/monitoring/health - should return health check', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('database');
    });

    it('GET /api/v1/monitoring/system - should return system information', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/system')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('memory');
      expect(response.body.data).toHaveProperty('uptime');
    });
  });

  describe('Budget Management', () => {
    let testBudgetId: number;

    it('POST /api/v1/budgets - should create new budget', async () => {
      const budgetData = {
        name: 'Test Budget',
        period_type: 'monthly',
        budget_amount: 5000
      };

      const response = await request(app)
        .post('/api/v1/budgets')
        .send(budgetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      testBudgetId = response.body.data.id;
    });

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

    it('GET /api/v1/budgets/summaries - should return budget summaries', async () => {
      const response = await request(app)
        .get('/api/v1/budgets/summaries')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Free Games', () => {
    it('GET /api/v1/free-games - should return free games list', async () => {
      const response = await request(app)
        .get('/api/v1/free-games')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toHaveProperty('total');
      expect(response.body.count).toHaveProperty('epic');
      expect(response.body.count).toHaveProperty('steam');
    });

    it('GET /api/v1/free-games?source=epic - should return Epic games only', async () => {
      const response = await request(app)
        .get('/api/v1/free-games?source=epic')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Epic games only
      response.body.data.forEach((game: any) => {
        expect(game.platform).toBe('epic');
      });
    });

    it('GET /api/v1/free-games?source=steam - should return Steam games only', async () => {
      const response = await request(app)
        .get('/api/v1/free-games?source=steam')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      // Steam games only
      response.body.data.forEach((game: any) => {
        expect(game.platform).toBe('steam');
      });
    });
  });

  describe('ITAD Settings', () => {
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
    });

    it('PUT /api/v1/itad/settings - should update multiple settings', async () => {
      const settingsData = {
        settings: [
          { name: 'min_discount', value: '25' },
          { name: 'max_price', value: '6000' }
        ]
      };

      const response = await request(app)
        .put('/api/v1/itad/settings')
        .send(settingsData)
        .expect(200);

      expect(response.body.success).toBe(true);
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

  describe('System Test Endpoints', () => {
    let testGameForAlert: any;

    beforeAll(async () => {
      // テスト用ゲーム作成
      const gameResponse = await request(app)
        .post('/api/v1/games')
        .send({
          steam_app_id: 777777,
          name: 'Price Alert Test Game',
          enabled: true,
          alert_enabled: true,
          price_threshold: 1000
        });
      testGameForAlert = gameResponse.body.data;
    });

    it('POST /api/v1/system/test-price-alert - should create test price alert', async () => {
      const alertData = {
        gameId: testGameForAlert.id,
        alertType: 'new_low',
        testPrice: 800,
        sendDiscord: false
      };

      const response = await request(app)
        .post('/api/v1/system/test-price-alert')
        .send(alertData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alertId');
      expect(response.body.data).toHaveProperty('game');
      expect(response.body.data.alertType).toBe('new_low');
      expect(response.body.data.testPrice).toBe(800);
    });
  });

  describe('Error Handling', () => {
    it('GET /api/v1/games/999999 - should return 404 for non-existent game', async () => {
      const response = await request(app)
        .get('/api/v1/games/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('見つかりません');
    });

    it('POST /api/v1/games - should return 400 for invalid data', async () => {
      const invalidData = {
        steam_app_id: 'invalid', // 数値である必要がある
        name: '', // 空文字は無効
      };

      const response = await request(app)
        .post('/api/v1/games')
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