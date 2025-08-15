// middleware/validation.js
// Versión corregida con validación para cambio de contraseña por admin

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

// ✅ VALIDACIÓN PARA USUARIOS NORMALES (requiere contraseña actual)
const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('La contraseña actual es requerida.'),
  body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
  handleValidationErrors
];

// ✅ NUEVA VALIDACIÓN PARA ADMINS (solo requiere nueva contraseña)
const validateAdminPasswordChange = [
  body('newPassword')
    .notEmpty()
    .withMessage('La nueva contraseña es requerida.')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres.'),
  handleValidationErrors
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

// ✅ EXPORTAR TODAS LAS FUNCIONES INCLUYENDO LA NUEVA
module.exports = {
  validateLogin,
  validatePasswordChange,
  validateAdminPasswordChange, // ✅ NUEVA VALIDACIÓN
  validateIdParam,
  validatePagination,
  validateSearch,
  validateStudent,
  validateCreateTeacher,
  validateTransfer,
  validateTransferHistory,
  validateGetUsers
};