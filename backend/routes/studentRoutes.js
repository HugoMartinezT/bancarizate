// routes/studentRoutes.js - VERSIÓN COMPLETA OPTIMIZADA
const express = require('express');
const router = express.Router();

// Importar controladores
const studentController = require('../controllers/studentController');

// Importar middlewares
const { auth, authorize } = require('../middleware/auth');
const { 
  validateIdParam, 
  validateStudent, 
  validatePasswordChange,
  validateAdminPasswordChange
} = require('../middleware/validation');

// Aplicar autenticación a todas las rutas
router.use(auth);

// ==========================================
// 🚀 RUTAS OPTIMIZADAS: INSTITUCIONES Y CURSOS
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
router.get('/courses/:institutionId', 
  authorize('admin', 'teacher'),
  async (req, res) => {
    try {
      const { institutionId } = req.params;
      
      console.log('📞 Endpoint /students/courses llamado con institutionId:', institutionId);
      
      // Validación manual más simple
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
// 🚀 NUEVA RUTA OPTIMIZADA - ULTRA RÁPIDA
// ==========================================

// GET /api/students/:id/edit-data - Datos optimizados para edición (UNA SOLA REQUEST)
router.get('/:id/edit-data', 
  validateIdParam,
  authorize('admin', 'teacher'), 
  studentController.getStudentEditDataOptimized
);

// ==========================================
// RUTAS PRINCIPALES DE ESTUDIANTES
// ==========================================

// GET /api/students - Obtener todos los estudiantes
router.get('/', 
  authorize('admin', 'teacher'), 
  studentController.getAllStudents
);

// POST /api/students - Crear estudiante
router.post('/', 
  authorize('admin'), 
  validateStudent,
  studentController.createStudent
);

// GET /api/students/:id - Obtener estudiante por ID (INDIVIDUAL)
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
  validateAdminPasswordChange,
  studentController.changeStudentPassword
);

// DELETE /api/students/:id - Eliminar estudiante
router.delete('/:id', 
  validateIdParam,
  authorize('admin'), 
  studentController.deleteStudent
);

// ==========================================
// 🔍 RUTAS AUXILIARES Y ESTADÍSTICAS
// ==========================================

// GET /api/students/stats/general - Estadísticas generales
router.get('/stats/general',
  authorize('admin', 'teacher'),
  async (req, res) => {
    try {
      const { supabase } = require('../config/supabase');
      
      const [totalResult, activeResult, inactiveResult, graduatedResult] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'inactive'),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'graduated')
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          total: totalResult.count || 0,
          active: activeResult.count || 0,
          inactive: inactiveResult.count || 0,
          graduated: graduatedResult.count || 0
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de estudiantes:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener estadísticas'
      });
    }
  }
);

// GET /api/students/export/csv - Exportar estudiantes a CSV
router.get('/export/csv',
  authorize('admin'),
  async (req, res) => {
    try {
      const { supabase } = require('../config/supabase');
      
      const { data: students, error } = await supabase
        .from('students')
        .select(`
          *,
          users!inner(
            run,
            first_name,
            last_name,
            email,
            phone,
            balance,
            is_active
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generar CSV
      const csvHeader = 'RUN,Nombre,Apellido,Email,Teléfono,Institución,Curso,Género,Estado,Balance,Activo,Fecha Creación\n';
      const csvRows = students.map(student => {
        return [
          student.users.run,
          student.users.first_name,
          student.users.last_name,
          student.users.email,
          student.users.phone || '',
          student.institution,
          student.course,
          student.gender,
          student.status,
          student.users.balance,
          student.users.is_active ? 'Sí' : 'No',
          new Date(student.created_at).toLocaleDateString('es-CL')
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="estudiantes_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csv); // BOM para UTF-8

    } catch (error) {
      console.error('❌ Error exportando estudiantes:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al exportar estudiantes'
      });
    }
  }
);

// ==========================================
// 🔍 MIDDLEWARE DE LOGS Y DEBUGGING
// ==========================================

// Middleware para logging de rutas específicas (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  router.use((req, res, next) => {
    console.log(`📋 [STUDENTS] ${req.method} ${req.originalUrl} - User: ${req.user?.id}`);
    next();
  });
}

module.exports = router;