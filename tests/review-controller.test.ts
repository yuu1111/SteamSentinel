import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';

describe('ReviewController Tests', () => {
  let testGameIds: number[] = [];
  let authToken: string;

  beforeAll(async () => {
    // データベース初期化
    database.connect();
    database.initialize();

    // テスト用ユーザー作成
    const testUser = {
      username: 'review_test_user',
      email: 'review@test.com',
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
    const db = database.getConnection();

    // テストゲーム作成
    const gameStmt = db.prepare(`
      INSERT INTO games (steam_app_id, name, enabled, price_threshold)
      VALUES (?, ?, ?, ?)
    `);

    for (let i = 0; i < 3; i++) {
      const steamAppId = Date.now() + i;
      gameStmt.run(steamAppId, `Review Test Game ${i + 1}`, 1, 2000);
      testGameIds.push(steamAppId);
    }

    // レビューデータ作成
    const reviewStmt = db.prepare(`
      INSERT INTO review_scores (steam_app_id, source, score, max_score, review_count, description, url, weight, created_at, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const currentTime = new Date().toISOString();

    testGameIds.forEach((steamAppId, index) => {
      // Steam レビュー
      reviewStmt.run(
        steamAppId,
        'steam',
        85 - (index * 5), // 85, 80, 75
        100,
        1500 + (index * 300),
        ['Very Positive', 'Mostly Positive', 'Mixed'][index],
        null,
        1.0,
        currentTime,
        currentTime
      );

      // Metacritic レビュー
      reviewStmt.run(
        steamAppId,
        'metacritic',
        80 - (index * 4), // 80, 76, 72
        100,
        null,
        ['Universal Acclaim', 'Generally Favorable', 'Mixed Reviews'][index],
        `https://metacritic.com/game/${steamAppId}`,
        1.0,
        currentTime,
        currentTime
      );

      // IGDB レビュー
      reviewStmt.run(
        steamAppId,
        'igdb',
        78 - (index * 3), // 78, 75, 72
        100,
        500 + (index * 100),
        ['Outstanding', 'Great', 'Good'][index],
        `https://igdb.com/games/${steamAppId}`,
        0.8,
        currentTime,
        currentTime
      );
    });
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    const db = database.getConnection();
    testGameIds.forEach(steamAppId => {
      db.prepare('DELETE FROM review_scores WHERE steam_app_id = ?').run(steamAppId);
      db.prepare('DELETE FROM games WHERE steam_app_id = ?').run(steamAppId);
    });
    db.prepare('DELETE FROM users WHERE username = ?').run('review_test_user');
  });

  describe('GET /api/v1/games/:appId/reviews', () => {
    test('should get reviews for a specific game', async () => {
      const appId = testGameIds[0];
      const response = await request(app)
        .get(`/api/v1/games/${appId}/reviews`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('reviews');
      expect(response.body.data).toHaveProperty('integrated_score');
      expect(response.body.data.reviews).toBeInstanceOf(Array);
      expect(response.body.data.reviews.length).toBeGreaterThan(0);
      
      // レビューの構造確認
      const review = response.body.data.reviews[0];
      expect(review).toHaveProperty('source');
      expect(review).toHaveProperty('score');
      expect(review).toHaveProperty('max_score');
      expect(review).toHaveProperty('description');
    });

    test('should include integrated score calculation', async () => {
      const appId = testGameIds[0];
      const response = await request(app)
        .get(`/api/v1/games/${appId}/reviews`)
        .expect(200);

      expect(response.body.data.integrated_score).toHaveProperty('score');
      expect(response.body.data.integrated_score).toHaveProperty('confidence');
      expect(response.body.data.integrated_score).toHaveProperty('source_count');
      expect(response.body.data.integrated_score.source_count).toBe(3);
    });

    test('should get detailed reviews when requested', async () => {
      const appId = testGameIds[0];
      const response = await request(app)
        .get(`/api/v1/games/${appId}/reviews?details=true`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews[0]).toHaveProperty('weight');
      expect(response.body.data.reviews[0]).toHaveProperty('created_at');
      expect(response.body.data.reviews[0]).toHaveProperty('last_updated');
    });

    test('should return 404 for non-existent game', async () => {
      const nonExistentId = 999999999;
      const response = await request(app)
        .get(`/api/v1/games/${nonExistentId}/reviews`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('レビューが見つかりません');
    });

    test('should validate appId parameter', async () => {
      await request(app)
        .get('/api/v1/games/invalid/reviews')
        .expect(400);
    });

    test('should include performance metadata', async () => {
      const appId = testGameIds[0];
      const response = await request(app)
        .get(`/api/v1/games/${appId}/reviews`)
        .expect(200);

      expect(response.body.meta).toHaveProperty('performance');
      expect(response.body.meta.performance).toHaveProperty('query_time_ms');
      expect(response.body.meta.performance).toHaveProperty('cache_hit');
    });
  });

  describe('POST /api/v1/batch/games/reviews', () => {
    test('should get reviews for multiple games', async () => {
      const requestData = {
        steamAppIds: testGameIds.slice(0, 2)
      };

      const response = await request(app)
        .post('/api/v1/batch/games/reviews')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);
      
      response.body.data.forEach((gameReview: any) => {
        expect(gameReview).toHaveProperty('steam_app_id');
        expect(gameReview).toHaveProperty('reviews');
        expect(gameReview).toHaveProperty('integrated_score');
      });
    });

    test('should limit batch size', async () => {
      const largeRequest = {
        steamAppIds: Array.from({ length: 11 }, (_, i) => Date.now() + i)
      };

      await request(app)
        .post('/api/v1/batch/games/reviews')
        .send(largeRequest)
        .expect(400);
    });

    test('should validate steamAppIds array', async () => {
      const invalidRequest = {
        steamAppIds: ['invalid', 'ids']
      };

      await request(app)
        .post('/api/v1/batch/games/reviews')
        .send(invalidRequest)
        .expect(400);
    });

    test('should handle empty results gracefully', async () => {
      const requestData = {
        steamAppIds: [999999999, 999999998] // 存在しないID
      };

      const response = await request(app)
        .post('/api/v1/batch/games/reviews')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    test('should optimize N+1 queries', async () => {
      const requestData = {
        steamAppIds: testGameIds
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/batch/games/reviews')
        .send(requestData)
        .expect(200);
      const queryTime = Date.now() - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.meta.performance.query_time_ms).toBeLessThan(1000);
      // バッチ処理により効率的にクエリが実行されることを確認
    });
  });

  describe('GET /api/v1/reviews/sources', () => {
    test('should get available review sources', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/sources')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sources');
      expect(response.body.data.sources).toBeInstanceOf(Array);
      expect(response.body.data.sources).toContain('steam');
      expect(response.body.data.sources).toContain('metacritic');
      expect(response.body.data.sources).toContain('igdb');
    });

    test('should include source statistics', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/sources')
        .expect(200);

      expect(response.body.data).toHaveProperty('source_stats');
      expect(response.body.data.source_stats).toBeInstanceOf(Object);
      
      Object.values(response.body.data.source_stats).forEach((stat: any) => {
        expect(stat).toHaveProperty('count');
        expect(stat).toHaveProperty('avg_score');
      });
    });
  });

  describe('GET /api/v1/reviews/top-rated', () => {
    test('should get top-rated games', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/top-rated')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const topGame = response.body.data[0];
        expect(topGame).toHaveProperty('steam_app_id');
        expect(topGame).toHaveProperty('integrated_score');
        expect(topGame).toHaveProperty('source_count');
      }
    });

    test('should limit results', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/top-rated?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    test('should filter by minimum score', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/top-rated?min_score=80')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((game: any) => {
        expect(game.integrated_score).toBeGreaterThanOrEqual(80);
      });
    });

    test('should sort by score descending', async () => {
      const response = await request(app)
        .get('/api/v1/reviews/top-rated')
        .expect(200);

      const scores = response.body.data.map((game: any) => game.integrated_score);
      const sortedScores = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sortedScores);
    });
  });

  describe('PUT /api/v1/reviews/:id/weight', () => {
    test('should update review weight (authenticated)', async () => {
      // まず、レビューIDを取得
      const db = database.getConnection();
      const review = db.prepare(
        'SELECT id FROM review_scores WHERE steam_app_id = ? LIMIT 1'
      ).get(testGameIds[0]) as any;

      const updateData = {
        weight: 1.5
      };

      const response = await request(app)
        .put(`/api/v1/reviews/${review.id}/weight`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('更新');

      // 更新されたことを確認
      const updatedReview = db.prepare(
        'SELECT weight FROM review_scores WHERE id = ?'
      ).get(review.id) as any;
      expect(updatedReview.weight).toBe(1.5);
    });

    test('should require authentication for weight update', async () => {
      const updateData = {
        weight: 1.2
      };

      await request(app)
        .put('/api/v1/reviews/1/weight')
        .send(updateData)
        .expect(401);
    });

    test('should validate weight range', async () => {
      const db = database.getConnection();
      const review = db.prepare(
        'SELECT id FROM review_scores WHERE steam_app_id = ? LIMIT 1'
      ).get(testGameIds[0]) as any;

      const invalidData = {
        weight: 5.0 // 範囲外
      };

      await request(app)
        .put(`/api/v1/reviews/${review.id}/weight`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should return 404 for non-existent review', async () => {
      const updateData = {
        weight: 1.0
      };

      await request(app)
        .put('/api/v1/reviews/999999/weight')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('POST /api/v1/reviews/sync', () => {
    test('should sync review data (authenticated)', async () => {
      const syncData = {
        steam_app_ids: testGameIds.slice(0, 1),
        sources: ['steam', 'metacritic']
      };

      const response = await request(app)
        .post('/api/v1/reviews/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('synced_count');
      expect(response.body.data).toHaveProperty('updated_count');
      expect(response.body.data).toHaveProperty('errors');
    });

    test('should require authentication for sync', async () => {
      const syncData = {
        steam_app_ids: testGameIds.slice(0, 1)
      };

      await request(app)
        .post('/api/v1/reviews/sync')
        .send(syncData)
        .expect(401);
    });

    test('should validate sync request data', async () => {
      const invalidData = {
        steam_app_ids: 'invalid'
      };

      await request(app)
        .post('/api/v1/reviews/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    test('should limit sync batch size', async () => {
      const largeSync = {
        steam_app_ids: Array.from({ length: 21 }, (_, i) => Date.now() + i)
      };

      await request(app)
        .post('/api/v1/reviews/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeSync)
        .expect(400);
    });
  });

  describe('Caching and Performance', () => {
    test('should cache review data', async () => {
      const appId = testGameIds[0];

      // 最初のリクエスト
      const response1 = await request(app)
        .get(`/api/v1/games/${appId}/reviews`)
        .expect(200);

      // 2回目のリクエスト（キャッシュから）
      const response2 = await request(app)
        .get(`/api/v1/games/${appId}/reviews`)
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      expect(response2.body.meta.performance.cache_hit).toBe(true);
    });

    test('should track query performance', async () => {
      const requestData = {
        steamAppIds: testGameIds
      };

      const response = await request(app)
        .post('/api/v1/batch/games/reviews')
        .send(requestData)
        .expect(200);

      expect(response.body.meta.performance).toHaveProperty('query_time_ms');
      expect(typeof response.body.meta.performance.query_time_ms).toBe('number');
    });
  });

  describe('Integration Score Calculation', () => {
    test('should calculate weighted integrated score', async () => {
      const appId = testGameIds[0];
      const response = await request(app)
        .get(`/api/v1/games/${appId}/reviews`)
        .expect(200);

      const integratedScore = response.body.data.integrated_score;
      expect(integratedScore.score).toBeGreaterThan(0);
      expect(integratedScore.score).toBeLessThanOrEqual(100);
      expect(integratedScore.confidence).toMatch(/^(high|medium|low)$/);
    });

    test('should handle games with single review source', async () => {
      // 単一ソースのレビューを持つゲームを作成
      const db = database.getConnection();
      const singleSourceGameId = Date.now() + 1000;
      
      db.prepare(`
        INSERT INTO games (steam_app_id, name, enabled, price_threshold)
        VALUES (?, ?, ?, ?)
      `).run(singleSourceGameId, 'Single Source Game', 1, 1000);

      db.prepare(`
        INSERT INTO review_scores (steam_app_id, source, score, max_score, review_count, description, weight)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(singleSourceGameId, 'steam', 90, 100, 1000, 'Very Positive', 1.0);

      const response = await request(app)
        .get(`/api/v1/games/${singleSourceGameId}/reviews`)
        .expect(200);

      expect(response.body.data.integrated_score.confidence).toBe('low');
      expect(response.body.data.integrated_score.source_count).toBe(1);

      // クリーンアップ
      db.prepare('DELETE FROM review_scores WHERE steam_app_id = ?').run(singleSourceGameId);
      db.prepare('DELETE FROM games WHERE steam_app_id = ?').run(singleSourceGameId);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid review ID', async () => {
      await request(app)
        .get('/api/v1/games/invalid/reviews')
        .expect(400);
    });

    test('should handle missing required fields', async () => {
      await request(app)
        .post('/api/v1/batch/games/reviews')
        .send({})
        .expect(400);
    });

    test('should provide meaningful error messages', async () => {
      const response = await request(app)
        .get('/api/v1/games/999999999/reviews')
        .expect(404);

      expect(response.body.error).toContain('レビューが見つかりません');
    });
  });
});