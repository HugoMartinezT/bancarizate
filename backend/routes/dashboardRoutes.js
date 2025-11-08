// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { historyLimiter } = require('../middleware/rateLimiter');

// Mantenemos tu controlador existente por compatibilidad.
// Asegúrate de que dashboardController.getDashboardStats
// devuelva las métricas globales reales desde BD.
const dashboardController = require('../controllers/dashboardController');

// Todas las rutas requieren autenticación
router.use(auth);

// Estadísticas globales del dashboard (reales desde BD)
// Recomendación: soportar ?range=7d|30d|90d|all y ?groupBy=day|month
router.get('/stats', historyLimiter, dashboardController.getDashboardStats);

// Actividad reciente del sistema (agregado global)
router.get('/recent-activity', historyLimiter, dashboardController.getRecentActivity);

// Evolución de saldos/volumen (serie temporal global)
router.get('/balance-history', historyLimiter, dashboardController.getBalanceHistory);

module.exports = router;
