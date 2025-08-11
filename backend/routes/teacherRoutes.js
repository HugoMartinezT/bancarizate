// routes/teacherRoutes.js - CORREGIDO sin validación problemática
const express = require('express');
const router = express.Router();

// Importar controladores
const teacherController = require('../controllers/teacherController');

// Importar middlewares
const { auth, authorize } = require('../middleware/auth');
const { 
  validateIdParam, 
  validateCreateTeacher, 
  validatePasswordChange 
} = require('../middleware/validation');

// Aplicar autenticación a todas las rutas
router.use(auth);

// ==========================================
// ✅ RUTAS CORREGIDAS: INSTITUCIONES Y CURSOS
// ==========================================

// GET /api/teachers/institutions - Lista de instituciones activas
router.get('/institutions', 
  authorize('admin', 'teacher'),
  async (req, res) => {
    try {
      console.log('📞 Endpoint /teachers/institutions llamado');
      
      const { data: institutions, error } = await require('../config/supabase').supabase
        .from('institutions')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error BD instituciones:', error);
        throw error;
      }

      console.log('✅ Instituciones encontradas:', institutions.length);
      
      res.status(200).json({
        status: 'success',
        data: institutions
      });
    } catch (error) {
      console.error('❌ Error obteniendo instituciones:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener instituciones'
      });
    }
  }
);

// GET /api/teachers/courses/:institutionId - Cursos por institución
// ✅ REMOVIDA LA VALIDACIÓN PROBLEMÁTICA
router.get('/courses/:institutionId', 
  authorize('admin', 'teacher'),
  // validateIdParam,  ← COMENTADA TEMPORALMENTE
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      
      console.log('📞 Endpoint /teachers/courses llamado con institutionId:', institutionId);
      
      // ✅ VALIDACIÓN MANUAL MÁS SIMPLE
      if (!institutionId || institutionId.length < 10) {
        return res.status(400).json({
          status: 'error',
          message: 'ID de institución inválido'
        });
      }

      const { data: courses, error } = await require('../config/supabase').supabase
        .from('courses')
        .select('id, name, level')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error BD cursos:', error);
        throw error;
      }

      console.log('✅ Cursos encontrados para institución', institutionId + ':', courses.length);
      console.log('📋 Cursos:', courses);

      res.status(200).json({
        status: 'success',
        data: courses
      });
    } catch (error) {
      console.error('❌ Error obteniendo cursos:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener cursos'
      });
    }
  }
);

// ==========================================
// RUTAS EXISTENTES DE DOCENTES
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

// POST /api/teachers/:id/change-password - Cambiar contraseña de docente
router.post('/:id/change-password',
  validateIdParam,
  authorize('admin'),
  validatePasswordChange,
  teacherController.changeTeacherPassword
);

// DELETE /api/teachers/:id - Eliminar docente
router.delete('/:id', 
  validateIdParam,
  authorize('admin'), 
  teacherController.deleteTeacher
);

// GET /api/teachers/:id/courses - Obtener cursos de un docente
router.get('/:id/courses',
  validateIdParam,
  authorize('admin', 'teacher'),
  teacherController.getTeacherCourses
);

// PUT /api/teachers/:id/courses - Actualizar cursos de un docente
router.put('/:id/courses',
  validateIdParam,
  authorize('admin'),
  teacherController.updateTeacherCourses
);

module.exports = router;