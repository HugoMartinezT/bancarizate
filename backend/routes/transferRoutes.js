// routes/transferRoutes.js - Orden de rutas optimizado y endpoints de estadísticas individuales
const express = require('express');
const router = express.Router();

// Controlador y middlewares
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

// Autenticación para todas
router.use(auth);

// ============ POST (creación) ============
router.post('/', transferLimiter, validateTransfer, transferController.createTransfer);

// ============ GET específicos (antes de :id) ============
router.get('/history', historyLimiter, validateTransferHistory, transferController.getTransferHistory);
router.get('/recent-activity', historyLimiter, transferController.getRecentActivity);
router.get('/users', userSearchLimiter, validateGetUsers, transferController.getAllUsers);

// ✅ Estadísticas individuales (usuario autenticado)
// Soporta ?range=7d|30d|90d|all
router.get('/stats', historyLimiter, transferController.getUserStats);

// Alias heredado (compañeros de clase)
router.get('/classmates', userSearchLimiter, transferController.getClassmates);

// ============ GET dinámico (al final) ============
router.get('/:id', historyLimiter, validateIdParam, transferController.getTransferDetails);

module.exports = router;
