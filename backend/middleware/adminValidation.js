// middleware/adminValidation.js
// Validaciones específicas para funcionalidades administrativas

const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
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

// ==========================================
// VALIDACIONES PARA INSTITUCIONES
// ==========================================

const validateInstitution = [
  body('name')
    .notEmpty()
    .withMessage('El nombre de la institución es requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
  
  body('type')
    .optional()
    .isIn(['universidad', 'instituto', 'colegio', 'escuela', 'centro_formacion'])
    .withMessage('Tipo de institución no válido'),
  
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[0-9\s\-\(\)]+$/)
    .withMessage('Formato de teléfono no válido'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Formato de email no válido'),
  
  body('website')
    .optional()
    .isURL()
    .withMessage('Formato de sitio web no válido'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser verdadero o falso'),
  
  handleValidationErrors
];

// ==========================================
// VALIDACIONES PARA CURSOS
// ==========================================

const validateCourse = [
  body('institutionId')
    .notEmpty()
    .withMessage('ID de institución es requerido')
    .isUUID()
    .withMessage('ID de institución debe ser un UUID válido'),
  
  body('name')
    .notEmpty()
    .withMessage('El nombre del curso es requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
  
  body('code')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('El código debe tener entre 2 y 50 caracteres'),
  
  body('level')
    .optional()
    .isIn(['basico', 'medio', 'superior', 'postgrado', 'tecnico', 'profesional'])
    .withMessage('Nivel de curso no válido'),
  
  body('durationMonths')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('La duración debe ser entre 1 y 120 meses'),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive debe ser verdadero o falso'),
  
  handleValidationErrors
];

// ==========================================
// VALIDACIONES PARA CONFIGURACIONES DEL SISTEMA
// ==========================================

const validateSystemConfig = [
  body('value')
    .notEmpty()
    .withMessage('El valor de configuración es requerido'),
  
  handleValidationErrors
];

const validateMultipleConfigs = [
  body('configurations')
    .isArray({ min: 1 })
    .withMessage('Se requiere un array de configuraciones')
    .custom((configurations) => {
      for (const config of configurations) {
        if (!config.key || !config.hasOwnProperty('value')) {
          throw new Error('Cada configuración debe tener "key" y "value"');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

// ==========================================
// VALIDACIONES PARA CARGA MASIVA
// ==========================================

const validateMassUpload = [
  body('data')
    .isArray({ min: 1 })
    .withMessage('Se requiere un array de datos')
    .custom((data) => {
      if (data.length > 1000) {
        throw new Error('Máximo 1000 registros por carga');
      }
      return true;
    }),
  
  body('userType')
    .isIn(['student', 'teacher'])
    .withMessage('Tipo de usuario debe ser "student" o "teacher"'),
  
  handleValidationErrors
];

const validateMassUploadExecution = [
  body('validData')
    .isArray({ min: 1 })
    .withMessage('Se requieren datos válidos para procesar'),
  
  body('userType')
    .isIn(['student', 'teacher'])
    .withMessage('Tipo de usuario debe ser "student" o "teacher"'),
  
  body('skipDuplicates')
    .optional()
    .isBoolean()
    .withMessage('skipDuplicates debe ser verdadero o falso'),
  
  handleValidationErrors
];

// ==========================================
// VALIDACIONES PARA BACKUP
// ==========================================

const validateTableName = [
  param('tableName')
    .isIn([
      'users', 'students', 'teachers', 'transfers', 'transfer_recipients',
      'activity_logs', 'institutions', 'courses', 'system_config'
    ])
    .withMessage('Nombre de tabla no válido para backup'),
  
  handleValidationErrors
];

const validateBackupFile = [
  body('sqlContent')
    .notEmpty()
    .withMessage('Contenido SQL es requerido')
    .isLength({ min: 100 })
    .withMessage('El archivo parece estar vacío o es demasiado pequeño'),
  
  handleValidationErrors
];

// ==========================================
// VALIDACIONES DE USER TYPE PARA PLANTILLAS
// ==========================================

const validateUserType = [
  param('userType')
    .isIn(['student', 'teacher'])
    .withMessage('Tipo de usuario debe ser "student" o "teacher"'),
  
  handleValidationErrors
];

// ==========================================
// VALIDACIONES DE PARÁMETROS COMUNES
// ==========================================

const validateAdminPagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  
  handleValidationErrors
];

const validateAdminSearch = [
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La búsqueda no puede exceder 100 caracteres'),
  
  handleValidationErrors
];

const validateCategoryParam = [
  param('category')
    .isIn(['transfers', 'users', 'security', 'general'])
    .withMessage('Categoría no válida'),
  
  handleValidationErrors
];

const validateConfigKey = [
  param('key')
    .matches(/^[a-z_]+$/)
    .withMessage('La clave de configuración solo puede contener letras minúsculas y guiones bajos')
    .isLength({ min: 2, max: 100 })
    .withMessage('La clave debe tener entre 2 y 100 caracteres'),
  
  handleValidationErrors
];

// ==========================================
// VALIDACIONES ESPECÍFICAS PARA FILTROS
// ==========================================

const validateInstitutionFilters = [
  query('type')
    .optional()
    .isIn(['all', 'universidad', 'instituto', 'colegio', 'escuela', 'centro_formacion'])
    .withMessage('Tipo de filtro no válido'),
  
  query('active')
    .optional()
    .isIn(['all', 'true', 'false'])
    .withMessage('Filtro de activo debe ser "all", "true" o "false"'),
  
  handleValidationErrors
];

const validateCourseFilters = [
  query('institutionId')
    .optional()
    .custom((value) => {
      if (value !== 'all' && !value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        throw new Error('ID de institución debe ser "all" o un UUID válido');
      }
      return true;
    }),
  
  query('level')
    .optional()
    .isIn(['all', 'basico', 'medio', 'superior', 'postgrado', 'tecnico', 'profesional'])
    .withMessage('Nivel de filtro no válido'),
  
  query('active')
    .optional()
    .isIn(['all', 'true', 'false'])
    .withMessage('Filtro de activo debe ser "all", "true" o "false"'),
  
  handleValidationErrors
];

// ==========================================
// MIDDLEWARE DE VERIFICACIÓN DE ROLES ESPECÍFICOS
// ==========================================

const requireSuperAdmin = (req, res, next) => {
  // Para funcionalidades críticas como backup completo
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Se requieren permisos de super administrador'
    });
  }
  
  // Aquí podrías agregar verificaciones adicionales
  // como verificar si el usuario tiene permisos específicos de super admin
  
  next();
};

const logAdminAction = (action) => {
  return (req, res, next) => {
    // Log de la acción administrativa
    console.log(`🔧 Admin Action: ${action} by ${req.user.run} (${req.user.first_name} ${req.user.last_name})`);
    req.adminAction = action;
    next();
  };
};

module.exports = {
  // Validaciones principales
  validateInstitution,
  validateCourse,
  validateSystemConfig,
  validateMultipleConfigs,
  validateMassUpload,
  validateMassUploadExecution,
  validateTableName,
  validateBackupFile,
  validateUserType,
  
  // Validaciones de parámetros
  validateAdminPagination,
  validateAdminSearch,
  validateCategoryParam,
  validateConfigKey,
  
  // Validaciones de filtros
  validateInstitutionFilters,
  validateCourseFilters,
  
  // Middlewares específicos
  requireSuperAdmin,
  logAdminAction,
  
  // Utility
  handleValidationErrors
};