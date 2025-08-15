// routes/teacherRoutes.js - CORREGIDO con middleware apropiado
const express = require('express');
const router = express.Router();

// Importar controladores
const teacherController = require('../controllers/teacherController');

// Importar middlewares
const { auth, authorize } = require('../middleware/auth');
const { 
  validateIdParam, 
  validateCreateTeacher, 
  validatePasswordChange,
  validateAdminPasswordChange // ✅ NUEVO MIDDLEWARE IMPORTADO
} = require('../middleware/validation');

// Aplicar autenticación a todas las rutas
router.use(auth);

// ==========================================
// RUTAS DE DOCENTES
// ==========================================

// GET /api/teachers - Obtener todos los docentes
router.get('/', authorize('admin', 'teacher'), teacherController.getAllTeachers);

// POST /api/teachers - Crear docente
router.post('/', 
  authorize('admin'), 
  validateCreateTeacher,
  teacherController.createTeacher
);

// GET /api/teachers/:id - Obtener docente por ID
router.get('/:id', 
  validateIdParam,
  authorize('admin', 'teacher'), 
  teacherController.getTeacherById
);

// PUT /api/teachers/:id - Actualizar docente
router.put('/:id', 
  validateIdParam,
  authorize('admin'),
  teacherController.updateTeacher
);

// ✅ RUTA CORREGIDA: Cambiar contraseña de docente
router.post('/:id/change-password',
  validateIdParam,
  authorize('admin'),
  validateAdminPasswordChange, // ✅ CAMBIO: Usa el nuevo middleware que NO requiere currentPassword
  teacherController.changeTeacherPassword
);

// DELETE /api/teachers/:id - Eliminar docente
router.delete('/:id', 
  validateIdParam,
  authorize('admin'), 
  teacherController.deleteTeacher
);

// GET /api/teachers/:id/courses - Obtener cursos del docente
router.get('/:id/courses', 
  validateIdParam,
  auth, 
  teacherController.getTeacherCourses
);

// PUT /api/teachers/:id/courses - Actualizar cursos del docente
router.put('/:id/courses', 
  validateIdParam,
  authorize('admin'), 
  teacherController.updateTeacherCourses
);

module.exports = router;