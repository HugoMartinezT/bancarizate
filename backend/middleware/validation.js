// middleware/validation.js
// Versión actualizada con nuevas validaciones para instituciones, cursos y configuración

const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar los errores de validación de forma centralizada
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

// --- VALIDACIONES DE AUTENTICACIÓN ---
const validateLogin = [
  body('run').notEmpty().withMessage('El RUN es requerido.'),
  body('password').notEmpty().withMessage('La contraseña es requerida.'),
  handleValidationErrors
];

// VALIDACIÓN PARA USUARIOS NORMALES (requiere contraseña actual)
const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida.'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
  handleValidationErrors
];

// VALIDACIÓN PARA ADMINS (solo requiere nueva contraseña)
const validateAdminPasswordChange = [
  body('newPassword')
    .notEmpty()
    .withMessage('La nueva contraseña es requerida.')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Nueva contraseña inválida',
        errors: errors.array()
      });
    }
    next();
  }
];

// --- VALIDACIONES GENERALES Y DE PARÁMETROS ---
const validateIdParam = [
  param('id').isUUID().withMessage('El ID proporcionado no es un UUID válido.'),
  handleValidationErrors
];

const validatePagination = [
    query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('El límite debe ser un número entre 1 y 100.'),
    handleValidationErrors
];

const validateSearch = [
    query('search').optional().isString().trim(),
    handleValidationErrors
];

// --- VALIDACIONES DE ENTIDADES ---
const validateStudent = [
    body('run').notEmpty().withMessage('El RUN es requerido.'),
    body('firstName').notEmpty().withMessage('El nombre es requerido.'),
    body('lastName').notEmpty().withMessage('El apellido es requerido.'),
    body('email').isEmail().withMessage('Debe proporcionar un email válido.'),
    body('birthDate').isISO8601().toDate().withMessage('La fecha de nacimiento debe ser una fecha válida.'),
    body('institution').notEmpty().withMessage('La institución es requerida.'),
    body('course').notEmpty().withMessage('El curso es requerido.'),
    handleValidationErrors
];

const validateCreateTeacher = [
    body('run').notEmpty().withMessage('El RUN es requerido.'),
    body('firstName').notEmpty().withMessage('El nombre es requerido.'),
    body('lastName').notEmpty().withMessage('El apellido es requerido.'),
    body('email').isEmail().withMessage('Debe proporcionar un email válido.'),
    body('birthDate').isISO8601().toDate().withMessage('La fecha de nacimiento debe ser una fecha válida.'),
    body('institution').notEmpty().withMessage('La institución es requerida.'),
    body('courses').isArray({ min: 1 }).withMessage('Debe proporcionar al menos un curso en un arreglo.'),
    handleValidationErrors
];

// --- VALIDACIONES PARA INSTITUCIONES ---
const validateInstitution = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/)
    .withMessage('El nombre contiene caracteres no válidos'),
   
  body('type')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El tipo no puede exceder 50 caracteres'),
   
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
   
  body('phone')
    .optional()
    .trim()
    .matches(/^(\+56)?[0-9\s\-\(\)]+$/)
    .withMessage('Formato de teléfono inválido'),
   
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Formato de email inválido')
    .normalizeEmail(),
   
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Formato de sitio web inválido'),
   
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active debe ser verdadero o falso'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de institución inválidos',
        errors: errors.array()
      });
    }
    next();
  }
];

// --- VALIDACIONES PARA CURSOS ---
const validateCourse = [
  body('institution_id')
    .isUUID()
    .withMessage('ID de institución inválido'),
   
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre del curso debe tener entre 2 y 255 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.]+$/)
    .withMessage('El nombre contiene caracteres no válidos'),
   
  body('code')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El código no puede exceder 50 caracteres')
    .matches(/^[A-Z0-9\-]+$/)
    .withMessage('El código solo puede contener letras mayúsculas, números y guiones'),
   
  body('level')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El nivel no puede exceder 50 caracteres'),
   
  body('duration_months')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('La duración debe ser entre 1 y 120 meses'),
   
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
   
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active debe ser verdadero o falso'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de curso inválidos',
        errors: errors.array()
      });
    }
    next();
  }
];

// --- VALIDACIONES PARA CONFIGURACIÓN DEL SISTEMA ---
const validateConfigUpdate = [
  param('key')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Clave de configuración inválida')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('La clave solo puede contener letras minúsculas, números y guiones bajos'),
   
  body('value')
    .exists()
    .withMessage('El valor es requerido')
    .custom((value) => {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new Error('El valor debe ser texto, número o booleano');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de configuración inválidos',
        errors: errors.array()
      });
    }
    next();
  }
];

// --- VALIDACIONES DE TRANSFERENCIAS ---
const validateTransfer = [
    body('recipientIds').isArray({ min: 1 }).withMessage('Debe haber al menos un destinatario.'),
    body('recipientIds.*').isUUID().withMessage('Cada ID de destinatario debe ser un UUID válido.'),
    body('amount').isInt({ min: 1 }).withMessage('El monto debe ser un número entero mayor que cero.'),
    body('description').notEmpty().withMessage('La descripción es requerida.'),
    handleValidationErrors
];

const validateTransferHistory = [
    query('type').optional().isIn(['sent', 'received', 'all']).withMessage("El tipo debe ser 'sent', 'received' o 'all'."),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'all']).withMessage("El estado debe ser 'pending', 'completed', 'failed' o 'all'."),
    validatePagination,
    handleValidationErrors
];

const validateGetUsers = [
    validateSearch,
    validatePagination,
    query('role').optional().isIn(['student', 'teacher', 'all']).withMessage("El rol debe ser 'student', 'teacher' o 'all'."),
    handleValidationErrors
];

// --- EXPORTAR TODAS LAS FUNCIONES ---
module.exports = {
  validateLogin,
  validatePasswordChange,
  validateAdminPasswordChange,
  validateIdParam,
  validatePagination,
  validateSearch,
  validateStudent,
  validateCreateTeacher,
  validateInstitution,
  validateCourse,
  validateConfigUpdate,
  validateTransfer,
  validateTransferHistory,
  validateGetUsers
};