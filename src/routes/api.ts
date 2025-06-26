import { Router } from 'express';
import { GameController } from '../controllers/GameController';
import { MonitoringController } from '../controllers/MonitoringController';
import { validateSteamAppId, apiLimiter } from '../middleware/security';

const router = Router();

// APIレート制限を適用
router.use(apiLimiter);

// ゲーム関連のルート
const gameRoutes = Router();

gameRoutes.get('/', GameController.getAllGames);
gameRoutes.get('/dashboard', GameController.getDashboardData);
gameRoutes.get('/:id', GameController.getGameById);
gameRoutes.post('/', GameController.addGame);
gameRoutes.put('/:id', GameController.updateGame);
gameRoutes.delete('/:id', GameController.deleteGame);
gameRoutes.get('/:appId/price-history', validateSteamAppId, GameController.getGamePriceHistory);

router.use('/games', gameRoutes);

// 監視関連のルート
const monitoringRoutes = Router();

monitoringRoutes.get('/status', MonitoringController.getStatus);
monitoringRoutes.post('/run', MonitoringController.runManualMonitoring);
monitoringRoutes.post('/run/:appId', validateSteamAppId, MonitoringController.runManualGameMonitoring);
monitoringRoutes.put('/interval', MonitoringController.updateMonitoringInterval);
monitoringRoutes.get('/health', MonitoringController.healthCheck);
monitoringRoutes.get('/logs', MonitoringController.getLogs);
monitoringRoutes.get('/system', MonitoringController.getSystemInfo);

router.use('/monitoring', monitoringRoutes);

export default router;