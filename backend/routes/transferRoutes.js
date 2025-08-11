// routes/transferRoutes.js - CON NUEVAS RUTAS PARA FILTROS Y DASHBOARD

const express = require('express');
const router = express.Router();

// Importamos el controlador y los middlewares
const transferController = require('../controllers/transferController');
const { auth } = require('../middleware/auth');
const { 
    validateTransfer, 
    validateTransferHistory, 
    validateGetUsers, 
    validateIdParam 
} = require('../middleware/validation');
const { 
    transferLimiter, 
    historyLimiter, 
    userSearchLimiter 
} = require('../middleware/rateLimiter');

// Aplicamos autenticación a todas las rutas de este archivo
router.use(auth);

// ==========================================
// RUTAS DE TRANSFERENCIAS
// ==========================================

// Crear una nueva transferencia
router.post(
  '/', 
  transferLimiter, // Límite de velocidad estricto
  validateTransfer, 
  transferController.createTransfer
);

// Obtener el historial de transferencias del usuario CON FILTROS AVANZADOS
router.get(
  '/history', 
  historyLimiter,
  validateTransferHistory, 
  transferController.getTransferHistory
);

// NUEVA RUTA: Obtener actividad reciente para el dashboard
router.get(
  '/recent-activity',
  historyLimiter,
  transferController.getRecentActivity
);

// Obtener la lista de usuarios a los que se puede transferir
router.get(
  '/users', 
  userSearchLimiter,
  validateGetUsers, 
  transferController.getAllUsers
);

// Obtener estadísticas de transferencias del usuario
router.get(
  '/stats',
  transferController.getUserStats
);

// Obtener los detalles de una transferencia específica por su ID
router.get(
  '/:id', 
  validateIdParam, 
  transferController.getTransferDetails
);

// Ruta heredada para obtener compañeros de clase (redirige a /users)
router.get(
  '/classmates',
  transferController.getClassmates
);

module.exports = router;