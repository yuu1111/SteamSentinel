import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { BaseController, ApiResponseHelper } from '../utils/apiResponse';
import database from '../db/database';
import { 
    generateToken, 
    generateRefreshToken, 
    verifyRefreshToken,
    revokeRefreshToken,
    AuthRequest 
} from '../middleware/auth';
import logger from '../utils/logger';

export class AuthController extends BaseController {
    // POST /api/v1/auth/register
    async register(req: Request, res: Response): Promise<Response> {
        try {
            const { username, email, password } = req.body;
            
            // パスワードハッシュ化
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);
            
            const db = database.getConnection();
            
            try {
                const result = db.prepare(`
                    INSERT INTO users (username, email, password_hash)
                    VALUES (?, ?, ?)
                `).run(username, email, passwordHash);
                
                const userId = result.lastInsertRowid as number;
                
                // デフォルト権限を付与
                db.prepare(`
                    INSERT INTO user_permissions (user_id, permission)
                    VALUES (?, 'read'), (?, 'create_game')
                `).run(userId, userId);
                
                return ApiResponseHelper.success(res, {
                    id: userId,
                    username,
                    email,
                    role: 'user'
                }, 'ユーザー登録が完了しました', 201);
                
            } catch (error: any) {
                if (error.message.includes('UNIQUE constraint failed')) {
                    const field = error.message.includes('username') ? 'ユーザー名' : 'メールアドレス';
                    return ApiResponseHelper.badRequest(res, `この${field}は既に使用されています`);
                } else {
                    throw error;
                }
            }
        } catch (error) {
            logger.error('Failed to register user:', error);
            return ApiResponseHelper.error(res, 'ユーザー登録に失敗しました', 500, error);
        }
    }

    // POST /api/v1/auth/login
    async login(req: Request, res: Response): Promise<Response> {
        try {
            const { username, password } = req.body;
            
            const db = database.getConnection();
            const user = db.prepare(`
                SELECT id, username, email, password_hash, role, is_active
                FROM users
                WHERE username = ? OR email = ?
            `).get(username, username) as any;
            
            if (!user) {
                return ApiResponseHelper.unauthorized(res, 'ユーザー名またはパスワードが正しくありません');
            }
            
            if (!user.is_active) {
                return ApiResponseHelper.forbidden(res, 'このアカウントは無効化されています');
            }
            
            // パスワード検証
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (!passwordMatch) {
                return ApiResponseHelper.unauthorized(res, 'ユーザー名またはパスワードが正しくありません');
            }
            
            // 最終ログイン時刻を更新
            db.prepare(`
                UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(user.id);
            
            // トークン生成
            const accessToken = generateToken({
                id: user.id,
                username: user.username,
                role: user.role
            });
            const refreshToken = generateRefreshToken(user.id);
            
            return ApiResponseHelper.success(res, {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }, 'ログインに成功しました');
            
        } catch (error) {
            logger.error('Failed to login:', error);
            return ApiResponseHelper.error(res, 'ログインに失敗しました', 500, error);
        }
    }

    // POST /api/v1/auth/refresh
    async refreshToken(req: Request, res: Response): Promise<Response> {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return ApiResponseHelper.badRequest(res, 'リフレッシュトークンが必要です');
            }
            
            const userId = await verifyRefreshToken(refreshToken);
            if (!userId) {
                return ApiResponseHelper.unauthorized(res, '無効なリフレッシュトークンです');
            }
            
            const db = database.getConnection();
            const user = db.prepare(`
                SELECT id, username, role FROM users WHERE id = ? AND is_active = 1
            `).get(userId) as any;
            
            if (!user) {
                return ApiResponseHelper.unauthorized(res, 'ユーザーが見つかりません');
            }
            
            // 古いリフレッシュトークンを無効化
            revokeRefreshToken(refreshToken);
            
            // 新しいトークンを生成
            const accessToken = generateToken({
                id: user.id,
                username: user.username,
                role: user.role
            });
            const newRefreshToken = generateRefreshToken(user.id);
            
            return ApiResponseHelper.success(res, {
                accessToken,
                refreshToken: newRefreshToken
            }, 'トークンを更新しました');
            
        } catch (error) {
            logger.error('Failed to refresh token:', error);
            return ApiResponseHelper.error(res, 'トークン更新に失敗しました', 500, error);
        }
    }

    // POST /api/v1/auth/logout
    async logout(req: AuthRequest, res: Response): Promise<Response> {
        try {
            const { refreshToken } = req.body;
            
            if (refreshToken) {
                revokeRefreshToken(refreshToken);
            }
            
            return ApiResponseHelper.success(res, null, 'ログアウトしました');
            
        } catch (error) {
            logger.error('Failed to logout:', error);
            return ApiResponseHelper.error(res, 'ログアウトに失敗しました', 500, error);
        }
    }

    // GET /api/v1/auth/me
    async getProfile(req: AuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.user) {
                return ApiResponseHelper.unauthorized(res);
            }
            
            const db = database.getConnection();
            const user = db.prepare(`
                SELECT id, username, email, role, created_at, last_login_at
                FROM users
                WHERE id = ?
            `).get(req.user.id) as any;
            
            if (!user) {
                return ApiResponseHelper.notFound(res, 'ユーザー');
            }
            
            return ApiResponseHelper.success(res, {
                ...user,
                permissions: req.user.permissions
            });
            
        } catch (error) {
            logger.error('Failed to get profile:', error);
            return ApiResponseHelper.error(res, 'プロフィール取得に失敗しました', 500, error);
        }
    }

    // PUT /api/v1/auth/password
    async changePassword(req: AuthRequest, res: Response): Promise<Response> {
        try {
            if (!req.user) {
                return ApiResponseHelper.unauthorized(res);
            }
            
            const { currentPassword, newPassword } = req.body;
            
            const db = database.getConnection();
            const user = db.prepare(`
                SELECT password_hash FROM users WHERE id = ?
            `).get(req.user.id) as any;
            
            // 現在のパスワードを確認
            const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!passwordMatch) {
                return ApiResponseHelper.badRequest(res, '現在のパスワードが正しくありません');
            }
            
            // 新しいパスワードをハッシュ化
            const saltRounds = 10;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
            
            db.prepare(`
                UPDATE users 
                SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(newPasswordHash, req.user.id);
            
            return ApiResponseHelper.success(res, null, 'パスワードを変更しました');
            
        } catch (error) {
            logger.error('Failed to change password:', error);
            return ApiResponseHelper.error(res, 'パスワード変更に失敗しました', 500, error);
        }
    }
}