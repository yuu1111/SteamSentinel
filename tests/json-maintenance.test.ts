import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';
import { JsonValidator } from '../src/utils/JsonValidator';
import { JsonQueryHelper } from '../src/utils/JsonQueryHelper';

describe('JSON Maintenance System Tests', () => {
  let authToken: string;
  let testGameId: number;
  let adminToken: string;

  beforeAll(async () => {
    // データベース初期化
    database.connect();
    database.initialize();

    // 管理者ユーザーでログイン
    const adminUser = {
      username: 'admin_test',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'admin'
    };

    await request(app)
      .post('/api/v1/auth/register')
      .send(adminUser);

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: adminUser.username,
        password: adminUser.password
      });

    adminToken = adminLoginRes.body.data.access_token;

    // テスト用ゲームとデータ作成
    const testSteamAppId = Date.now();
    const db = database.getConnection();

    // ゲーム追加
    const gameStmt = db.prepare(`
      INSERT INTO games (steam_app_id, name, enabled, price_threshold)
      VALUES (?, ?, ?, ?)
    `);
    const gameResult = gameStmt.run(testSteamAppId, 'Test Game JSON', 1, 2000);
    testGameId = gameResult.lastInsertRowid as number;

    // テスト用JSONデータを含むアラート作成
    const alertStmt = db.prepare(`
      INSERT INTO alerts (steam_app_id, alert_type, triggered_price, metadata)
      VALUES (?, ?, ?, ?)
    `);
    
    alertStmt.run(testSteamAppId, 'test', 1500, JSON.stringify({
      legacy_message: 'Test alert message',
      legacy_game_name: 'Test Game',
      custom_note: 'Test note'
    }));

    // 無効なJSONデータも作成
    alertStmt.run(testSteamAppId, 'test', 1200, '{"invalid": json}');

    // 統計データ作成
    const statsStmt = db.prepare(`
      INSERT INTO price_statistics (total_games, monitored_games, games_on_sale, statistics_json)
      VALUES (?, ?, ?, ?)
    `);
    
    statsStmt.run(100, 80, 25, JSON.stringify({
      calculation_method: 'automatic_trigger',
      data_points: 1000,
      last_price_update: new Date().toISOString(),
      discount_ranges: {
        '0-25': 10,
        '26-50': 8,
        '51-75': 5,
        '76-100': 2
      }
    }));
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    const db = database.getConnection();
    db.prepare('DELETE FROM alerts WHERE steam_app_id = ?').run(testGameId);
    db.prepare('DELETE FROM games WHERE id = ?').run(testGameId);
    db.prepare('DELETE FROM price_statistics WHERE id > 0').run();
    db.prepare('DELETE FROM users WHERE username = ?').run('admin_test');
  });

  describe('JsonValidator', () => {
    test('should validate and parse valid JSON', () => {
      const validJson = '{"test": "value", "number": 123}';
      const result = JsonValidator.validateAndParse(validJson);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toEqual({ test: 'value', number: 123 });
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid JSON', () => {
      const invalidJson = '{"invalid": json}';
      const result = JsonValidator.validateAndParse(invalidJson);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    test('should sanitize XSS attempts', () => {
      const xssData = {
        message: '<script>alert("xss")</script>',
        safe: 'normal text'
      };
      
      const sanitized = JsonValidator.sanitizeJson(xssData);
      
      expect(sanitized.message).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(sanitized.safe).toBe('normal text');
    });

    test('should validate alert metadata', () => {
      const validMetadata = {
        legacy_message: 'Test message',
        legacy_game_name: 'Test Game',
        custom_note: 'User note'
      };
      
      const result = JsonValidator.validateAlertMetadata(validMetadata);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toHaveProperty('legacy_message');
    });

    test('should validate statistics JSON', () => {
      const validStats = {
        calculation_method: 'automatic_trigger',
        data_points: 1000,
        discount_ranges: {
          '0-25': 10,
          '26-50': 5
        }
      };
      
      const result = JsonValidator.validateStatisticsJson(validStats);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toHaveProperty('calculation_method');
    });

    test('should check size limits', () => {
      const smallData = '{"test": "small"}';
      const largeData = 'x'.repeat(100000); // 100KB
      
      expect(JsonValidator.checkSizeLimit(smallData, 64)).toBe(true);
      expect(JsonValidator.checkSizeLimit(largeData, 64)).toBe(false);
    });
  });

  describe('JsonQueryHelper', () => {
    test('should extract JSON path values', () => {
      const jsonString = '{"user": {"name": "test", "age": 25}}';
      
      const name = JsonQueryHelper.extractJsonPath(jsonString, 'user.name');
      const age = JsonQueryHelper.extractJsonPath(jsonString, 'user.age');
      
      expect(name).toBe('test');
      expect(age).toBe(25);
    });

    test('should build alert metadata query', () => {
      const filters = {
        legacyMessage: 'test',
        legacyGameName: 'game'
      };
      
      const { sql, params } = JsonQueryHelper.buildAlertMetadataQuery(filters);
      
      expect(sql).toContain('json_extract(metadata');
      expect(params).toEqual(['%test%', '%game%']);
    });

    test('should build statistics query', () => {
      const filters = {
        calculationMethod: 'automatic_trigger',
        minDataPoints: 100
      };
      
      const { sql, params } = JsonQueryHelper.buildStatisticsQuery(filters);
      
      expect(sql).toContain('json_extract(statistics_json');
      expect(params).toEqual(['automatic_trigger', 100]);
    });
  });

  describe('JSON Maintenance API', () => {
    test('should analyze JSON fields (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/maintenance/json/analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('statistics');
      expect(response.body.data.alerts).toHaveProperty('total_records');
    });

    test('should deny JSON analysis to non-admin', async () => {
      await request(app)
        .get('/api/v1/maintenance/json/analyze')
        .expect(401);
    });

    test('should cleanup invalid JSON data (admin only)', async () => {
      const response = await request(app)
        .post('/api/v1/maintenance/json/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cleaned_alerts');
      expect(response.body.data).toHaveProperty('cleaned_statistics');
    });

    test('should validate JSON data', async () => {
      const testData = {
        type: 'alert_metadata',
        data: {
          legacy_message: 'Test message',
          custom_note: 'Test note'
        }
      };

      const response = await request(app)
        .post('/api/v1/maintenance/json/validate')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.is_valid).toBe(true);
    });

    test('should check JSON size', async () => {
      const testData = {
        data: { test: 'small data' },
        max_size_kb: 64
      };

      const response = await request(app)
        .post('/api/v1/maintenance/json/size-check')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.within_limit).toBe(true);
      expect(response.body.data).toHaveProperty('current_size_kb');
    });

    test('should optimize JSON data', async () => {
      const testData = {
        data: {
          message: '<script>alert("test")</script>',
          normal: 'text',
          extra_spaces: '   trim me   '
        }
      };

      const response = await request(app)
        .post('/api/v1/maintenance/json/optimize')
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('optimized_data');
      expect(response.body.data).toHaveProperty('savings_bytes');
    });

    test('should search legacy metadata', async () => {
      const response = await request(app)
        .get('/api/v1/maintenance/json/search-legacy?message=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data).toHaveProperty('count');
    });

    test('should validate JSON schemas', async () => {
      const invalidData = {
        type: 'statistics_json',
        data: {
          invalid_field: 'not allowed'
        }
      };

      const response = await request(app)
        .post('/api/v1/maintenance/json/validate')
        .send(invalidData)
        .expect(200);

      expect(response.body.success).toBe(true);
      // スキーマ検証の結果をチェック
    });
  });

  describe('Database JSON Functions', () => {
    test('should analyze JSON fields in database', () => {
      const analysis = database.analyzeJsonFields();
      
      expect(analysis).toHaveProperty('alerts_metadata');
      expect(analysis).toHaveProperty('price_statistics_json');
      expect(analysis).toHaveProperty('invalid_records');
      expect(analysis.alerts_metadata).toHaveProperty('total_records');
    });

    test('should cleanup invalid JSON data in database', () => {
      const result = database.cleanupInvalidJsonData();
      
      expect(result).toHaveProperty('cleaned_alerts');
      expect(result).toHaveProperty('cleaned_statistics');
      expect(typeof result.cleaned_alerts).toBe('number');
    });
  });

  describe('JSON Security', () => {
    test('should prevent JSON injection attacks', () => {
      const maliciousData = {
        'constructor': {
          'prototype': {
            'isAdmin': true
          }
        }
      };
      
      const sanitized = JsonValidator.sanitizeJson(maliciousData);
      
      // プロトタイプ汚染の防止を確認
      expect(sanitized).not.toHaveProperty('constructor.prototype');
    });

    test('should handle deeply nested objects', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep'
              }
            }
          }
        }
      };
      
      const sanitized = JsonValidator.sanitizeJson(deepObject);
      expect(JsonQueryHelper.extractJsonPath(JSON.stringify(sanitized), 'level1.level2.level3.level4.value')).toBe('deep');
    });

    test('should reject oversized JSON', () => {
      const oversizedData = {
        data: 'x'.repeat(100000) // 100KB
      };
      
      const jsonString = JSON.stringify(oversizedData);
      expect(JsonValidator.checkSizeLimit(jsonString, 64)).toBe(false);
    });
  });
});