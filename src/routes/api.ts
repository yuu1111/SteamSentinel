import { Router } from 'express';
import { GameController } from '../controllers/GameController';
import { MonitoringController } from '../controllers/MonitoringController';
import { validateSteamAppId, apiLimiter } from '../middleware/security';

const router = Router();

// APIレート制限を適用
router.use(apiLimiter);

// ゲーム関連のルート
const gameRoutes = Router();

gameRoutes.get('/', (req, res) => GameController.getAllGames(req, res));
gameRoutes.get('/dashboard', (req, res) => GameController.getDashboardData(req, res));
gameRoutes.get('/:id', (req, res) => GameController.getGameById(req, res));
gameRoutes.post('/', (req, res) => GameController.addGame(req, res));
gameRoutes.put('/:id', (req, res) => GameController.updateGame(req, res));
gameRoutes.delete('/:id', (req, res) => GameController.deleteGame(req, res));
gameRoutes.get('/:appId/price-history', validateSteamAppId, (req, res) => GameController.getGamePriceHistory(req, res));

router.use('/games', gameRoutes);

// 監視関連のルート
const monitoringRoutes = Router();

monitoringRoutes.get('/status', (req, res) => MonitoringController.getStatus(req, res));
monitoringRoutes.get('/progress', (req, res) => MonitoringController.getProgress(req, res));
monitoringRoutes.post('/run', (req, res) => MonitoringController.runManualMonitoring(req, res));
monitoringRoutes.post('/run/:appId', validateSteamAppId, (req, res) => MonitoringController.runManualGameMonitoring(req, res));
monitoringRoutes.put('/interval', (req, res) => MonitoringController.updateMonitoringInterval(req, res));
monitoringRoutes.get('/health', (req, res) => MonitoringController.healthCheck(req, res));
monitoringRoutes.get('/logs', (req, res) => MonitoringController.getLogs(req, res));
monitoringRoutes.get('/system', (req, res) => MonitoringController.getSystemInfo(req, res));

router.use('/monitoring', monitoringRoutes);

export default router;