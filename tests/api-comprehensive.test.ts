import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';

describe('SteamSentinel RESTful API - Comprehensive Tests', () => {
  const generateUniqueId = () => Date.now() + Math.floor(Math.random() * 1000);
  
  beforeAll(async () => {
    database.connect();
    database.initialize();
  });

  afterAll(async () => {
    database.close();
  });

  afterEach(async () => {
    try {
      const db = database.getConnection();
      db.prepare('DELETE FROM alerts WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM latest_prices WHERE steam_app_id >= 900000').run();
      db.prepare('DELETE FROM games WHERE steam_app_id >= 900000').run();
    } catch (error) {
      // クリーンアップエラーは無視
    }
  });

  describe('Games API - Complete CRUD', () => {
    let testGameId: number;
    let testSteamAppId: number;

    it('POST /api/v1/games - should create game', async () => {
      testSteamAppId = generateUniqueId();
      const response = await request(app)
        .post('/api/v1/games')
        .send({
          steam_app_id: testSteamAppId,
          name: 'Complete Test Game',
          enabled: true,
          price_threshold: 2000,
          price_threshold_type: 'price',
          alert_enabled: true
        })
        .expect(201);

      testGameId = response.body.data.id;
      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/games/:id - should get game details', async () => {
      const response = await request(app)
        .get(`/api/v1/games/${testGameId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.game.name).toBe('Complete Test Game');
    });

    it('PUT /api/v1/games/:id - should update game', async () => {
      const response = await request(app)
        .put(`/api/v1/games/${testGameId}`)
        .send({
          name: 'Updated Complete Test Game',
          price_threshold: 1500
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/games/steam/:appId - should get by Steam App ID', async () => {
      const response = await request(app)
        .get(`/api/v1/games/steam/${testSteamAppId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('PUT /api/v1/games/:id/purchase - should mark as purchased', async () => {
      const response = await request(app)
        .put(`/api/v1/games/${testGameId}/purchase`)
        .send({
          is_purchased: true,
          purchase_price: 1000,
          purchase_date: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('PUT /api/v1/games/:id/manual-historical-low - should set manual low', async () => {
      const response = await request(app)
        .put(`/api/v1/games/${testGameId}/manual-historical-low`)
        .send({
          manual_historical_low: 800
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/games/purchased - should get purchased games', async () => {
      const response = await request(app)
        .get('/api/v1/games/purchased')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('DELETE /api/v1/games/:id - should delete game', async () => {
      const response = await request(app)
        .delete(`/api/v1/games/${testGameId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Alerts API - Complete CRUD', () => {
    let testGameId: number;
    let testSteamAppId: number;
    let testAlertId: number;

    beforeAll(async () => {
      testSteamAppId = generateUniqueId();
      const gameResponse = await request(app)
        .post('/api/v1/games')
        .send({
          steam_app_id: testSteamAppId,
          name: 'Alert Test Game',
          enabled: true,
          alert_enabled: true
        });
      testGameId = gameResponse.body.data.id;
    });

    it('POST /api/v1/alerts - should create alert', async () => {
      const response = await request(app)
        .post('/api/v1/alerts')
        .send({
          steam_app_id: testSteamAppId,
          alert_type: 'test',
          message: 'Test alert',
          trigger_price: 500
        })
        .expect(201);

      testAlertId = response.body.data.id;
      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/alerts/:id - should get alert details', async () => {
      const response = await request(app)
        .get(`/api/v1/alerts/${testAlertId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('PUT /api/v1/alerts/:id/read - should mark as read', async () => {
      const response = await request(app)
        .put(`/api/v1/alerts/${testAlertId}/read`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/games/:id/alerts - should get game alerts', async () => {
      const response = await request(app)
        .get(`/api/v1/games/${testGameId}/alerts`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('PUT /api/v1/alerts/read - should bulk mark as read', async () => {
      const response = await request(app)
        .put('/api/v1/alerts/read')
        .send({ all: true })
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
    });

    it('GET /api/v1/statistics/alerts - should return alert statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/statistics/games - should return game statistics', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/games')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Monitoring API', () => {
    it('GET /api/v1/monitoring/status - should return status', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/status')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/monitoring/health - should return health', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/monitoring/system - should return system info', async () => {
      const response = await request(app)
        .get('/api/v1/monitoring/system')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('POST /api/v1/monitoring/run - should trigger monitoring', async () => {
      const response = await request(app)
        .post('/api/v1/monitoring/run')
        .send({ force: true })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Budget Management API', () => {
    let testBudgetId: number;

    it('POST /api/v1/budgets - should create budget', async () => {
      const response = await request(app)
        .post('/api/v1/budgets')
        .send({
          name: 'Test Budget',
          period_type: 'monthly',
          budget_amount: 5000
        })
        .expect(201);

      testBudgetId = response.body.data.id;
      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/budgets/:id - should get budget details', async () => {
      const response = await request(app)
        .get(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('PUT /api/v1/budgets/:id - should update budget', async () => {
      const response = await request(app)
        .put(`/api/v1/budgets/${testBudgetId}`)
        .send({
          budget_amount: 6000
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('POST /api/v1/budgets/:id/expenses - should add expense', async () => {
      const response = await request(app)
        .post(`/api/v1/budgets/${testBudgetId}/expenses`)
        .send({
          game_name: 'Test Game',
          amount: 1000,
          purchase_date: new Date().toISOString().split('T')[0]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/budgets/:id/expenses - should get expenses', async () => {
      const response = await request(app)
        .get(`/api/v1/budgets/${testBudgetId}/expenses`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('DELETE /api/v1/budgets/:id - should delete budget', async () => {
      const response = await request(app)
        .delete(`/api/v1/budgets/${testBudgetId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Free Games API', () => {
    it('GET /api/v1/free-games - should return free games', async () => {
      const response = await request(app)
        .get('/api/v1/free-games')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBeDefined();
    });

    it('GET /api/v1/free-games?source=epic - should filter Epic games', async () => {
      const response = await request(app)
        .get('/api/v1/free-games?source=epic')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/free-games?source=steam - should filter Steam games', async () => {
      const response = await request(app)
        .get('/api/v1/free-games?source=steam')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('POST /api/v1/free-games/refresh - should refresh free games', async () => {
      const response = await request(app)
        .post('/api/v1/free-games/refresh')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('ITAD Settings API', () => {
    it('GET /api/v1/itad/settings - should return all settings', async () => {
      const response = await request(app)
        .get('/api/v1/itad/settings')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('PUT /api/v1/itad/settings - should update multiple settings', async () => {
      const response = await request(app)
        .put('/api/v1/itad/settings')
        .send({
          settings: [
            { name: 'min_discount', value: '25' },
            { name: 'max_price', value: '5000' }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/itad/settings/:name - should get specific setting', async () => {
      const response = await request(app)
        .get('/api/v1/itad/settings/min_discount')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('PUT /api/v1/itad/settings/:name - should update specific setting', async () => {
      const response = await request(app)
        .put('/api/v1/itad/settings/min_discount')
        .send({ value: '30' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('POST /api/v1/itad/settings/reset - should reset to defaults', async () => {
      const response = await request(app)
        .post('/api/v1/itad/settings/reset')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('System Test Endpoints', () => {
    let testGameForSystem: any;

    beforeAll(async () => {
      const testSteamAppId = generateUniqueId();
      const gameResponse = await request(app)
        .post('/api/v1/games')
        .send({
          steam_app_id: testSteamAppId,
          name: 'System Test Game',
          enabled: true,
          alert_enabled: true,
          price_threshold: 1000
        });
      testGameForSystem = gameResponse.body.data;
    });

    it('POST /api/v1/system/test-price-alert - should create price alert test', async () => {
      const response = await request(app)
        .post('/api/v1/system/test-price-alert')
        .send({
          gameId: testGameForSystem.id,
          alertType: 'new_low',
          testPrice: 800,
          sendDiscord: false
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alertId).toBeDefined();
    });
  });

  describe('Batch Operations', () => {
    it('POST /api/v1/games/batch - should export games', async () => {
      const response = await request(app)
        .post('/api/v1/games/batch')
        .send({
          action: 'export'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('POST /api/v1/games/batch - should import games', async () => {
      const testSteamAppIds = [generateUniqueId(), generateUniqueId()];
      const response = await request(app)
        .post('/api/v1/games/batch')
        .send({
          action: 'import',
          steam_app_ids: testSteamAppIds
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Advanced Game Features', () => {
    let testGameId: number;
    let testSteamAppId: number;

    beforeAll(async () => {
      testSteamAppId = generateUniqueId();
      const gameResponse = await request(app)
        .post('/api/v1/games')
        .send({
          steam_app_id: testSteamAppId,
          name: 'Advanced Features Test Game',
          enabled: true,
          alert_enabled: true
        });
      testGameId = gameResponse.body.data.id;
    });

    it('GET /api/v1/games/:id/price-history - should get price history', async () => {
      const response = await request(app)
        .get(`/api/v1/games/${testGameId}/price-history`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/games/high-discount - should get high discount games', async () => {
      const response = await request(app)
        .get('/api/v1/games/high-discount?threshold=50')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('GET /api/v1/games/expenses - should get expense data', async () => {
      const response = await request(app)
        .get('/api/v1/games/expenses')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});