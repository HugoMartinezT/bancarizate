// routes/activityRoutes.js - Rutas de Actividades (VERSIÓN CORREGIDA CON ROLES)
const express = require('express');
const rateLimit = require('express-rate-limit');
const { query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');

// Importar controladores
const activityController = require('../controllers/activityController');

const router = express.Router();

// Rate limiting específico para actividades
const activityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por ventana (más generoso para consultas)
  message: {
    status: 'error',
    message: 'Demasiadas consultas de actividad desde esta IP, intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware de validación de errores
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de entrada inválidos',
      errors: errors.array()
    });
  }
  next();
};

// Todas las rutas requieren autenticación
router.use(authMiddleware.auth);

/**
 * GET /api/activity
 * Obtener actividades con filtros y paginación
 */
router.get('/', 
  activityLimiter,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número entero positivo'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe estar entre 1 y 100'),
    query('date')
      .optional()
      .isISO8601()
      .withMessage('La fecha debe tener formato válido YYYY-MM-DD'),
    query('type')
      .optional()
      .isIn(['all', 'login', 'logout', 'transfer', 'transfer_received', 'student_created', 'teacher_created', 'profile_updated', 'change_password', 'failed_login'])
      .withMessage('Tipo de actividad no válido'),
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('La búsqueda no puede exceder 100 caracteres')
  ],
  handleValidationErrors,
  activityController.getActivities
);

/**
 * GET /api/activity/stats
 * Obtener estadísticas de actividad
 */
router.get('/stats',
  activityLimiter,
  [
    query('timeframe')
      .optional()
      .isIn(['1d', '7d', '30d'])
      .withMessage('Timeframe debe ser 1d, 7d o 30d')
  ],
  handleValidationErrors,
  activityController.getActivityStats
);

/**
 * GET /api/activity/recent
 * Obtener actividades recientes para dashboard
 */
router.get('/recent',
  activityLimiter,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El límite debe estar entre 1 y 50')
  ],
  handleValidationErrors,
  activityController.getRecentActivity
);

/**
 * GET /api/activity/types
 * Obtener tipos de actividad disponibles
 */
router.get('/types', 
  activityLimiter,
  (req, res) => {
    const activityTypes = [
      { value: 'all', label: 'Toda la actividad', icon: 'activity' },
      { value: 'login', label: 'Inicios de sesión', icon: 'log-in' },
      { value: 'logout', label: 'Cierres de sesión', icon: 'log-out' },
      { value: 'transfer', label: 'Transferencias enviadas', icon: 'send' },
      { value: 'transfer_received', label: 'Transferencias recibidas', icon: 'inbox' },
      { value: 'student_created', label: 'Estudiantes creados', icon: 'user-plus' },
      { value: 'teacher_created', label: 'Docentes creados', icon: 'user-plus' },
      { value: 'profile_updated', label: 'Actualizaciones de perfil', icon: 'settings' },
      { value: 'change_password', label: 'Cambios de contraseña', icon: 'key' },
      { value: 'failed_login', label: 'Intentos fallidos', icon: 'x-circle' }
    ];

    res.status(200).json({
      status: 'success',
      data: activityTypes
    });
  }
);

/**
 * GET /api/activity/roles
 * Obtener roles disponibles para filtrar (NUEVO ENDPOINT)
 */
router.get('/roles', 
  activityLimiter,
  (req, res) => {
    const activityRoles = [
      { value: 'all', label: 'Todos los roles', icon: 'users' },
      { value: 'admin', label: 'Administradores', icon: 'shield' },
      { value: 'teacher', label: 'Docentes', icon: 'graduation-cap' },
      { value: 'student', label: 'Estudiantes', icon: 'user' }
    ];

    res.status(200).json({
      status: 'success',
      data: activityRoles
    });
  }
);

/**
 * GET /api/activity/users
 * Obtener usuarios disponibles para filtrar (solo admin)
 */
router.get('/users',
  activityLimiter,
  [
    query('search')
      .optional()
      .isLength({ max: 100 })
      .withMessage('La búsqueda no puede exceder 100 caracteres'),
    query('role')
      .optional()
      .isIn(['all', 'admin', 'teacher', 'student'])
      .withMessage('Rol no válido'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe estar entre 1 y 100')
  ],
  handleValidationErrors,
  activityController.getAvailableUsers
);

module.exports = router;