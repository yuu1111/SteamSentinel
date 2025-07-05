import jwt, { SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import database from '../db/database';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: 'admin' | 'user' | 'readonly';
        permissions: string[];
    };
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * JWT認証ミドルウェア
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({
            success: false,
            error: '認証トークンが必要です'
        });
        return;
    }

    jwt.verify(token, JWT_SECRET as jwt.Secret, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                res.status(401).json({
                    success: false,
                    error: 'トークンの有効期限が切れています'
                });
            } else {
                res.status(403).json({
                    success: false,
                    error: '無効なトークンです'
                });
            }
            return;
        }

        const user = decoded as AuthRequest['user'];
        
        // ユーザーの権限を取得
        const db = database.getConnection();
        const permissions = db.prepare(`
            SELECT permission FROM user_permissions WHERE user_id = ?
        `).all(user!.id).map((row: any) => row.permission);
        
        req.user = {
            ...user!,
            permissions
        };
        
        next();
    });
};

/**
 * オプショナル認証ミドルウェア（認証があれば使用、なくても続行）
 */
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, JWT_SECRET as jwt.Secret, (err, decoded) => {
        if (!err) {
            const user = decoded as AuthRequest['user'];
            const db = database.getConnection();
            const permissions = db.prepare(`
                SELECT permission FROM user_permissions WHERE user_id = ?
            `).all(user!.id).map((row: any) => row.permission);
            
            req.user = {
                ...user!,
                permissions
            };
        }
        next();
    });
};

/**
 * ロールベース認可ミドルウェア
 */
export const authorizeRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'この操作を行う権限がありません'
            });
            return;
        }
        next();
    };
};

/**
 * 権限ベース認可ミドルウェア
 */
export const authorizePermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !req.user.permissions.includes(permission)) {
            res.status(403).json({
                success: false,
                error: `${permission} 権限が必要です`
            });
            return;
        }
        next();
    };
};

/**
 * JWTトークン生成
 */
export const generateToken = (user: { id: number; username: string; role: string }): string => {
    return jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role 
        },
        JWT_SECRET as jwt.Secret,
        { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );
};

/**
 * リフレッシュトークン生成
 */
export const generateRefreshToken = (userId: number): string => {
    const token = jwt.sign(
        { userId, type: 'refresh' },
        JWT_SECRET as jwt.Secret,
        { expiresIn: JWT_REFRESH_EXPIRES_IN } as SignOptions
    );
    
    // トークンをデータベースに保存
    const db = database.getConnection();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7日後
    
    db.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `).run(userId, token, expiresAt.toISOString());
    
    return token;
};

/**
 * リフレッシュトークン検証
 */
export const verifyRefreshToken = async (token: string): Promise<number | null> => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as any;
        
        if (decoded.type !== 'refresh') {
            return null;
        }
        
        // データベースでトークンを確認
        const db = database.getConnection();
        const tokenRecord = db.prepare(`
            SELECT user_id, expires_at, revoked_at
            FROM refresh_tokens
            WHERE token = ?
        `).get(token) as any;
        
        if (!tokenRecord || tokenRecord.revoked_at || new Date(tokenRecord.expires_at) < new Date()) {
            return null;
        }
        
        return tokenRecord.user_id;
    } catch {
        return null;
    }
};

/**
 * リフレッシュトークン無効化
 */
export const revokeRefreshToken = (token: string): void => {
    const db = database.getConnection();
    db.prepare(`
        UPDATE refresh_tokens
        SET revoked_at = CURRENT_TIMESTAMP
        WHERE token = ?
    `).run(token);
};