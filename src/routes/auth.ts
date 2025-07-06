import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validateBody } from '../middleware/validation';
import { 
    registerSchema, 
    loginSchema, 
    changePasswordSchema, 
    refreshTokenSchema 
} from '../validation/schemas';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/security';

const router = Router();
const authController = new AuthController();

// 公開エンドポイント（認証レート制限付き）
router.post('/register', 
    authLimiter,
    validateBody(registerSchema), 
    (req, res) => authController.register(req, res)
);

router.post('/login', 
    authLimiter,
    validateBody(loginSchema), 
    (req, res) => authController.login(req, res)
);

router.post('/refresh', 
    validateBody(refreshTokenSchema), 
    (req, res) => authController.refreshToken(req, res)
);

// 認証が必要なエンドポイント
router.post('/logout', 
    authenticateToken, 
    (req, res) => authController.logout(req as any, res)
);

router.get('/me', 
    authenticateToken, 
    (req, res) => authController.getProfile(req as any, res)
);

router.put('/password', 
    authenticateToken,
    validateBody(changePasswordSchema), 
    (req, res) => authController.changePassword(req as any, res)
);

export default router;