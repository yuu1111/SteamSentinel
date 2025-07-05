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

const router = Router();
const authController = new AuthController();

// 公開エンドポイント
router.post('/register', 
    validateBody(registerSchema), 
    (req, res) => authController.register(req, res)
);

router.post('/login', 
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