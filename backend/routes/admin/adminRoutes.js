// routes/admin/adminRoutes.js
// Conecta todos los controladores administrativos siguiendo el patrón establecido

const express = require('express');
const router = express.Router();

// Importar controladores administrativos
const institutionController = require('../../controllers/admin/institutionController');
const courseController = require('../../controllers/admin/courseController');
const systemConfigController = require('../../controllers/admin/systemConfigController');
const massUploadController = require('../../controllers/admin/massUploadController');
const backupController = require('../../controllers/admin/backupController');

// Importar middlewares
const { auth, authorize } = require('../../middleware/auth');
const { validateIdParam } = require('../../middleware/validation');

// Verificar que los controladores se cargaron correctamente
if (!institutionController || !courseController || !systemConfigController || 
    !massUploadController || !backupController) {
    throw new Error('Uno o más controladores administrativos no se pudieron cargar');
}

// Aplicar autenticación a TODAS las rutas administrativas
// Solo los administradores pueden acceder a estas funcionalidades
router.use(auth);
router.use(authorize('admin'));

// ==========================================
// RUTAS DE INSTITUCIONES (/api/admin/institutions)
// ==========================================

// GET /api/admin/institutions - Listar instituciones con filtros
router.get('/institutions', institutionController.getAllInstitutions);

// POST /api/admin/institutions - Crear nueva institución
router.post('/institutions', institutionController.createInstitution);

// GET /api/admin/institutions/types - Obtener tipos de institución disponibles
router.get('/institutions/types', institutionController.getInstitutionTypes);

// GET /api/admin/institutions/stats - Obtener estadísticas de instituciones
router.get('/institutions/stats', institutionController.getInstitutionStats);

// GET /api/admin/institutions/:id - Obtener institución específica
router.get('/institutions/:id', validateIdParam, institutionController.getInstitutionById);

// PUT /api/admin/institutions/:id - Actualizar institución
router.put('/institutions/:id', validateIdParam, institutionController.updateInstitution);

// DELETE /api/admin/institutions/:id - Eliminar institución
router.delete('/institutions/:id', validateIdParam, institutionController.deleteInstitution);

// ==========================================
// RUTAS DE CURSOS (/api/admin/courses)  
// ==========================================

// GET /api/admin/courses - Listar cursos con filtros
router.get('/courses', courseController.getAllCourses);

// POST /api/admin/courses - Crear nuevo curso
router.post('/courses', courseController.createCourse);

// GET /api/admin/courses/levels - Obtener niveles de curso disponibles
router.get('/courses/levels', courseController.getCourseLevels);

// GET /api/admin/courses/stats - Obtener estadísticas de cursos
router.get('/courses/stats', courseController.getCourseStats);

// GET /api/admin/courses/by-institution/:institutionId - Cursos por institución
router.get('/courses/by-institution/:institutionId', 
    validateIdParam, 
    courseController.getCoursesByInstitution
);

// GET /api/admin/courses/:id - Obtener curso específico
router.get('/courses/:id', validateIdParam, courseController.getCourseById);

// PUT /api/admin/courses/:id - Actualizar curso
router.put('/courses/:id', validateIdParam, courseController.updateCourse);

// DELETE /api/admin/courses/:id - Eliminar curso
router.delete('/courses/:id', validateIdParam, courseController.deleteCourse);

// ==========================================
// RUTAS DE CONFIGURACIONES DEL SISTEMA (/api/admin/config)
// ==========================================

// GET /api/admin/config - Obtener todas las configuraciones
router.get('/config', systemConfigController.getAllConfigurations);

// PUT /api/admin/config/batch - Actualizar múltiples configuraciones
router.put('/config/batch', systemConfigController.updateMultipleConfigurations);

// GET /api/admin/config/categories - Obtener categorías disponibles
router.get('/config/categories', systemConfigController.getCategories);

// GET /api/admin/config/category/:category - Configuraciones por categoría
router.get('/config/category/:category', systemConfigController.getConfigurationsByCategory);

// GET /api/admin/config/:key - Obtener configuración específica
router.get('/config/:key', systemConfigController.getConfigurationByKey);

// PUT /api/admin/config/:key - Actualizar configuración específica
router.put('/config/:key', systemConfigController.updateConfiguration);

// POST /api/admin/config/:key/reset - Resetear configuración a valor por defecto
router.post('/config/:key/reset', systemConfigController.resetConfiguration);

// GET /api/admin/config/:key/history - Historial de cambios de configuración
router.get('/config/:key/history', systemConfigController.getConfigurationHistory);

// ==========================================
// RUTAS DE CARGA MASIVA (/api/admin/mass-upload)
// ==========================================

// POST /api/admin/mass-upload/validate - Validar archivo antes de cargar
router.post('/mass-upload/validate', massUploadController.validateMassUpload);

// POST /api/admin/mass-upload/execute - Ejecutar carga masiva
router.post('/mass-upload/execute', massUploadController.executeMassUpload);

// GET /api/admin/mass-upload/template/:userType - Descargar plantilla CSV
router.get('/mass-upload/template/:userType', massUploadController.getCSVTemplate);

// GET /api/admin/mass-upload/history - Historial de cargas masivas
router.get('/mass-upload/history', massUploadController.getMassUploadHistory);

// ==========================================
// RUTAS DE BACKUP (/api/admin/backup)
// ==========================================

// GET /api/admin/backup/full - Crear backup completo
router.get('/backup/full', backupController.createFullBackup);

// GET /api/admin/backup/table/:tableName - Backup de tabla específica
router.get('/backup/table/:tableName', backupController.createTableBackup);

// GET /api/admin/backup/table/:tableName/preview - Vista previa de tabla
router.get('/backup/table/:tableName/preview', backupController.getTablePreview);

// GET /api/admin/backup/stats - Estadísticas de backup
router.get('/backup/stats', backupController.getBackupStats);

// GET /api/admin/backup/history - Historial de backups
router.get('/backup/history', backupController.getBackupHistory);

// POST /api/admin/backup/validate - Validar archivo de backup
router.post('/backup/validate', backupController.validateBackupFile);

// ==========================================
// RUTA DE INFORMACIÓN GENERAL
// ==========================================

// GET /api/admin - Información general del panel administrativo
router.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: '🔧 Panel Administrativo BANCARIZATE',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        user: {
            name: `${req.user.first_name} ${req.user.last_name}`,
            run: req.user.run,
            role: req.user.role
        },
        available_modules: {
            institutions: {
                description: 'Gestión de establecimientos educacionales',
                endpoints: [
                    'GET /api/admin/institutions',
                    'POST /api/admin/institutions',
                    'PUT /api/admin/institutions/:id',
                    'DELETE /api/admin/institutions/:id'
                ]
            },
            courses: {
                description: 'Gestión de cursos y carreras',
                endpoints: [
                    'GET /api/admin/courses',
                    'POST /api/admin/courses',
                    'PUT /api/admin/courses/:id',
                    'DELETE /api/admin/courses/:id'
                ]
            },
            system_config: {
                description: 'Configuraciones del sistema',
                endpoints: [
                    'GET /api/admin/config',
                    'PUT /api/admin/config/:key',
                    'PUT /api/admin/config/batch'
                ]
            },
            mass_upload: {
                description: 'Carga masiva de usuarios',
                endpoints: [
                    'POST /api/admin/mass-upload/validate',
                    'POST /api/admin/mass-upload/execute',
                    'GET /api/admin/mass-upload/template/:userType'
                ]
            },
            backup: {
                description: 'Sistema de backup y restauración',
                endpoints: [
                    'GET /api/admin/backup/full',
                    'GET /api/admin/backup/table/:tableName',
                    'GET /api/admin/backup/stats'
                ]
            }
        }
    });
});

module.exports = router;