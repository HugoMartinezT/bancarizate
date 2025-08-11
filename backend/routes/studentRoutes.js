// routes/studentRoutes.js - CORREGIDO sin validación problemática
const express = require('express');
const router = express.Router();

// Importar controladores
const studentController = require('../controllers/studentController');

// Importar middlewares
const { auth, authorize } = require('../middleware/auth');
const { 
  validateIdParam, 
  validateStudent, 
  validatePasswordChange 
} = require('../middleware/validation');

// Aplicar autenticación a todas las rutas
router.use(auth);

// ==========================================
// ✅ RUTAS CORREGIDAS: INSTITUCIONES Y CURSOS
// ==========================================

// GET /api/students/institutions - Lista de instituciones activas
router.get('/institutions', 
  authorize('admin', 'teacher'),
  async (req, res) => {
    try {
      console.log('📞 Endpoint /students/institutions llamado');
      
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

// GET /api/students/courses/:institutionId - Cursos por institución
// ✅ REMOVIDA LA VALIDACIÓN PROBLEMÁTICA
router.get('/courses/:institutionId', 
  authorize('admin', 'teacher'),
  // validateIdParam,  ← COMENTADA TEMPORALMENTE
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      
      console.log('📞 Endpoint /students/courses llamado con institutionId:', institutionId);
      
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
// RUTAS EXISTENTES DE ESTUDIANTES
// ==========================================

// GET /api/students - Obtener todos los estudiantes
router.get('/', authorize('admin', 'teacher'), studentController.getAllStudents);

// POST /api/students - Crear estudiante
router.post('/', 
  authorize('admin'), 
  validateStudent,
  studentController.createStudent
);

// GET /api/students/:id - Obtener estudiante por ID
router.get('/:id', 
  validateIdParam,
  authorize('admin', 'teacher'), 
  studentController.getStudentById
);

// PUT /api/students/:id - Actualizar estudiante
router.put('/:id', 
  validateIdParam,
  authorize('admin'),
  studentController.updateStudent
);

// POST /api/students/:id/change-password - Cambiar contraseña de estudiante
router.post('/:id/change-password',
  validateIdParam,
  authorize('admin'),
  validatePasswordChange,
  studentController.changeStudentPassword
);

// DELETE /api/students/:id - Eliminar estudiante
router.delete('/:id', 
  validateIdParam,
  authorize('admin'), 
  studentController.deleteStudent
);

module.exports = router;