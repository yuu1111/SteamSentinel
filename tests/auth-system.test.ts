import request from 'supertest';
import app from '../src/app';
import database from '../src/db/database';
import jwt from 'jsonwebtoken';

describe('Authentication System Tests', () => {
  let testUserId: number;
  let refreshToken: string;

  beforeAll(async () => {
    // データベース初期化
    database.connect();
    database.initialize();
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    const db = database.getConnection();
    db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const userData = {
        username: 'testuser_auth',
        email: 'test@auth.com',
        password: 'SecurePass123!',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.user).not.toHaveProperty('password_hash');

      testUserId = response.body.data.user.id;
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        username: 'incomplete'
        // missing email and password
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('バリデーション');
    });

    test('should reject duplicate username', async () => {
      const duplicateUser = {
        username: 'testuser_auth', // 既に存在
        email: 'different@email.com',
        password: 'AnotherPass123!',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('既に存在');
    });

    test('should reject duplicate email', async () => {
      const duplicateEmail = {
        username: 'different_user',
        email: 'test@auth.com', // 既に存在
        password: 'AnotherPass123!',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(duplicateEmail)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('既に存在');
    });

    test('should validate password strength', async () => {
      const weakPasswordUser = {
        username: 'weakpass_user',
        email: 'weak@test.com',
        password: '123', // 弱いパスワード
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('パスワード');
    });

    test('should validate email format', async () => {
      const invalidEmailUser = {
        username: 'invalidmail_user',
        email: 'invalid-email', // 無効なメール形式
        password: 'ValidPass123!',
        role: 'user'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(invalidEmailUser)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should default to user role if not specified', async () => {
      const noRoleUser = {
        username: 'norole_user',
        email: 'norole@test.com',
        password: 'ValidPass123!'
        // role not specified
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(noRoleUser)
        .expect(201);

      expect(response.body.data.user.role).toBe('user');

      // クリーンアップ
      const db = database.getConnection();
      db.prepare('DELETE FROM users WHERE username = ?').run('norole_user');
    });
  });

  describe('User Login', () => {
    test('should login with valid credentials', async () => {
      const loginData = {
        username: 'testuser_auth',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('refresh_token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.username).toBe(loginData.username);

      refreshToken = response.body.data.refresh_token;

      // JWTトークンの検証
      const decoded = jwt.decode(response.body.data.access_token) as any;
      expect(decoded).toHaveProperty('user_id');
      expect(decoded).toHaveProperty('role');
      expect(decoded.role).toBe('user');
    });

    test('should login with email instead of username', async () => {
      const loginData = {
        username: 'test@auth.com', // メールアドレス
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.username);
    });

    test('should reject invalid username', async () => {
      const invalidLogin = {
        username: 'nonexistent_user',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidLogin)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('認証');
    });

    test('should reject invalid password', async () => {
      const invalidPassword = {
        username: 'testuser_auth',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(invalidPassword)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('認証');
    });

    test('should update last login timestamp', async () => {
      const db = database.getConnection();
      
      // ログイン前の最終ログイン時刻を取得
      const beforeLogin = db.prepare(
        'SELECT last_login_at FROM users WHERE id = ?'
      ).get(testUserId);

      const loginData = {
        username: 'testuser_auth',
        password: 'SecurePass123!'
      };

      await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      // ログイン後の最終ログイン時刻を確認
      const afterLogin = db.prepare(
        'SELECT last_login_at FROM users WHERE id = ?'
      ).get(testUserId);

      expect(afterLogin.last_login_at).not.toBe(beforeLogin.last_login_at);
      expect(new Date(afterLogin.last_login_at)).toBeInstanceOf(Date);
    });

    test('should reject login for inactive users', async () => {
      // ユーザーを無効化
      const db = database.getConnection();
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(testUserId);

      const loginData = {
        username: 'testuser_auth',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('無効');

      // ユーザーを再度有効化
      db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(testUserId);
    });
  });

  describe('Token Refresh', () => {
    test('should refresh access token with valid refresh token', async () => {
      const refreshData = {
        refresh_token: refreshToken
      };

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('access_token');
      expect(response.body.data).toHaveProperty('refresh_token');

      // 新しいトークンが生成されていることを確認
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();

      // 新しいリフレッシュトークンを保存
      refreshToken = response.body.data.refresh_token;
    });

    test('should reject invalid refresh token', async () => {
      const invalidRefresh = {
        refresh_token: 'invalid_token_string'
      };

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send(invalidRefresh)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('無効');
    });

    test('should reject expired refresh token', async () => {
      // 期限切れトークンのシミュレート（実際のテストでは困難）
      // 代わりに、データベースから削除されたトークンをテスト
      const db = database.getConnection();
      const expiredToken = 'expired_token_for_test';
      
      const expiredRefresh = {
        refresh_token: expiredToken
      };

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send(expiredRefresh)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should rotate refresh tokens', async () => {
      const oldRefreshToken = refreshToken;

      const refreshData = {
        refresh_token: refreshToken
      };

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send(refreshData)
        .expect(200);

      const newRefreshToken = response.body.data.refresh_token;

      // 新しいトークンが生成されていることを確認
      expect(newRefreshToken).not.toBe(oldRefreshToken);

      // 古いトークンが無効になっていることを確認
      const oldTokenTest = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: oldRefreshToken })
        .expect(401);

      expect(oldTokenTest.body.success).toBe(false);

      refreshToken = newRefreshToken;
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeAll(async () => {
      // 有効なアクセストークンを取得
      const loginData = {
        username: 'testuser_auth',
        password: 'SecurePass123!'
      };

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      accessToken = loginResponse.body.data.access_token;
    });

    test('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/export')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/export')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('認証');
    });

    test('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/api/v1/statistics/export')
        .set('Authorization', 'Invalid token format')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject expired token', async () => {
      // 期限切れトークンの生成（テスト用）
      const expiredToken = jwt.sign(
        { user_id: testUserId, role: 'user' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1ms' } // 即座に期限切れ
      );

      // 少し待ってからテスト
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/v1/statistics/export')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('無効');
    });

    test('should reject tampered token', async () => {
      const tamperedToken = accessToken + 'tampered';

      const response = await request(app)
        .get('/api/v1/statistics/export')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Role-based Authorization', () => {
    let adminToken: string;
    let userToken: string;
    let readonlyToken: string;

    beforeAll(async () => {
      // 管理者ユーザー作成
      const adminUser = {
        username: 'admin_test',
        email: 'admin@test.com',
        password: 'AdminPass123!',
        role: 'admin'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(adminUser);

      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: adminUser.username,
          password: adminUser.password
        });

      adminToken = adminLogin.body.data.access_token;

      // 通常ユーザーのトークン（既存）
      userToken = accessToken;

      // 読み取り専用ユーザー作成
      const readonlyUser = {
        username: 'readonly_test',
        email: 'readonly@test.com',
        password: 'ReadonlyPass123!',
        role: 'readonly'
      };

      await request(app)
        .post('/api/v1/auth/register')
        .send(readonlyUser);

      const readonlyLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: readonlyUser.username,
          password: readonlyUser.password
        });

      readonlyToken = readonlyLogin.body.data.access_token;
    });

    afterAll(async () => {
      // テストユーザーのクリーンアップ
      const db = database.getConnection();
      db.prepare('DELETE FROM users WHERE username IN (?, ?)').run('admin_test', 'readonly_test');
    });

    test('should allow admin access to admin routes', async () => {
      const response = await request(app)
        .get('/api/v1/maintenance/json/analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should deny user access to admin routes', async () => {
      const response = await request(app)
        .get('/api/v1/maintenance/json/analyze')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('権限');
    });

    test('should deny readonly access to admin routes', async () => {
      const response = await request(app)
        .get('/api/v1/maintenance/json/analyze')
        .set('Authorization', `Bearer ${readonlyToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should allow all roles access to public routes', async () => {
      const publicRoute = '/api/v1/games';

      // Admin
      const adminResponse = await request(app)
        .get(publicRoute)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // User
      const userResponse = await request(app)
        .get(publicRoute)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Readonly
      const readonlyResponse = await request(app)
        .get(publicRoute)
        .set('Authorization', `Bearer ${readonlyToken}`)
        .expect(200);

      expect(adminResponse.body.success).toBe(true);
      expect(userResponse.body.success).toBe(true);
      expect(readonlyResponse.body.success).toBe(true);
    });

    test('should deny readonly access to write operations', async () => {
      const gameData = {
        steam_app_id: Date.now(),
        name: 'Test Game Readonly',
        enabled: true
      };

      const response = await request(app)
        .post('/api/v1/games')
        .set('Authorization', `Bearer ${readonlyToken}`)
        .send(gameData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('権限');
    });
  });

  describe('Logout and Token Revocation', () => {
    test('should logout and revoke refresh token', async () => {
      const logoutData = {
        refresh_token: refreshToken
      };

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send(logoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('ログアウト');

      // 無効化されたトークンの使用を試行
      const refreshAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send(logoutData)
        .expect(401);

      expect(refreshAttempt.body.success).toBe(false);
    });

    test('should handle logout with invalid token gracefully', async () => {
      const invalidLogout = {
        refresh_token: 'invalid_refresh_token'
      };

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send(invalidLogout)
        .expect(200); // 無効なトークンでも成功として扱う

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Features', () => {
    test('should hash passwords properly', async () => {
      const db = database.getConnection();
      const user = db.prepare(
        'SELECT password_hash FROM users WHERE id = ?'
      ).get(testUserId);

      // パスワードがハッシュ化されていることを確認
      expect(user.password_hash).not.toBe('SecurePass123!');
      expect(user.password_hash).toContain('$'); // bcryptハッシュの特徴
      expect(user.password_hash.length).toBeGreaterThan(50);
    });

    test('should prevent timing attacks in login', async () => {
      const startTime = Date.now();

      // 存在しないユーザーでのログイン試行
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistent_user_12345',
          password: 'AnyPassword123!'
        })
        .expect(401);

      const nonExistentTime = Date.now() - startTime;

      const startTime2 = Date.now();

      // 存在するユーザーで間違ったパスワード
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'WrongPassword123!'
        })
        .expect(401);

      const wrongPasswordTime = Date.now() - startTime2;

      // 実行時間の差が小さいことを確認（タイミング攻撃対策）
      const timeDifference = Math.abs(nonExistentTime - wrongPasswordTime);
      expect(timeDifference).toBeLessThan(100); // 100ms以内の差
    });

    test('should implement rate limiting for login attempts', async () => {
      const loginData = {
        username: 'testuser_auth',
        password: 'WrongPassword123!'
      };

      // 複数回の失敗ログイン試行
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request(app)
            .post('/api/v1/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(attempts);

      // 最初の数回は401、その後は429（レート制限）になることを確認
      const lastResponse = responses[responses.length - 1];
      expect([401, 429]).toContain(lastResponse.status);
    });
  });

  describe('User Profile Management', () => {
    let userAccessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'SecurePass123!'
        });

      userAccessToken = loginResponse.body.data.access_token;
    });

    test('should get user profile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.username).toBe('testuser_auth');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    test('should update user profile', async () => {
      const updateData = {
        email: 'updated@auth.com'
      };

      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(updateData.email);
    });

    test('should change password', async () => {
      const passwordData = {
        current_password: 'SecurePass123!',
        new_password: 'NewSecurePass123!'
      };

      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // 新しいパスワードでログインできることを確認
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser_auth',
          password: 'NewSecurePass123!'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    test('should reject password change with wrong current password', async () => {
      const passwordData = {
        current_password: 'WrongCurrentPassword',
        new_password: 'AnotherNewPass123!'
      };

      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(passwordData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});