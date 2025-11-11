const express = require('express');
const router = express.Router();

// Importar middlewares
const { auth, authorize } = require('../../middleware/auth');
const { 
  validateIdParam, 
  validateInstitution,
  validateCourse,
  validateConfigUpdate
} = require('../../middleware/validation');
const { 
  createUserLimiter, 
  generalApiLimiter,
  refreshRateLimiters,
  getCurrentConfig
} = require('../../middleware/rateLimiter');

// ✅ NUEVO: Importar controlador de backup
const {
  createFullBackup,
  createTableBackup, 
  getBackupHistory,
  getTablePreview,
  validateBackupFile
} = require('../../controllers/admin/backupController');

// Aplicar autenticación a todas las rutas admin
router.use(auth);
router.use(authorize('admin')); // Solo administradores

// ==========================================
// 🏛️ RUTAS DE INSTITUCIONES
// ==========================================

// GET /api/admin/institutions - Listar instituciones
router.get('/institutions', 
  generalApiLimiter,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, search = '', type = '', active = '' } = req.query;
      
      console.log('📋 Admin consultando instituciones:', {
        page, limit, search, type, active,
        userId: req.user.id
      });

      const { supabase } = require('../../config/supabase');
      
      let query = supabase
        .from('institutions')
        .select('*', { count: 'exact' });

      // Filtros
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      if (type) {
        query = query.eq('type', type);
      }
      
      if (active !== '') {
        query = query.eq('is_active', active === 'true');
      }

      // Paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query
        .range(offset, offset + parseInt(limit) - 1)
        .order('name', { ascending: true });

      const { data: institutions, error, count } = await query;

      if (error) {
        console.error('❌ Error obteniendo instituciones:', error);
        throw error;
      }

      res.status(200).json({
        status: 'success',
        data: {
          institutions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en GET instituciones:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener instituciones'
      });
    }
  }
);

// GET /api/admin/institutions/stats - Estadísticas de instituciones
router.get('/institutions/stats',
  async (req, res) => {
    try {
      console.log('📊 Admin consultando estadísticas de instituciones');
      
      const { supabase } = require('../../config/supabase');
      
      const [
        { count: totalInstitutions },
        { count: activeInstitutions },
        { data: institutionTypes }
      ] = await Promise.all([
        supabase.from('institutions').select('*', { count: 'exact', head: true }),
        supabase.from('institutions').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('institutions').select('type').not('type', 'is', null)
      ]);

      // Contar por tipo
      const typeStats = institutionTypes.reduce((acc, inst) => {
        acc[inst.type] = (acc[inst.type] || 0) + 1;
        return acc;
      }, {});

      res.status(200).json({
        status: 'success',
        data: {
          totalInstitutions: totalInstitutions || 0,
          activeInstitutions: activeInstitutions || 0,
          inactiveInstitutions: (totalInstitutions || 0) - (activeInstitutions || 0),
          byType: typeStats
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo stats instituciones:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener estadísticas'
      });
    }
  }
);

// POST /api/admin/institutions - Crear institución
router.post('/institutions',
  createUserLimiter,
  async (req, res) => {
    try {
      const { name, type, address, phone, email, website } = req.body;
      
      // Validación básica
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'El nombre de la institución es requerido (mínimo 2 caracteres)'
        });
      }
      
      console.log('➕ Admin creando institución:', {
        name, type,
        userId: req.user.id
      });

      const { supabase } = require('../../config/supabase');
      
      const { data: institution, error } = await supabase
        .from('institutions')
        .insert({
          name: name.trim(),
          type,
          address,
          phone,
          email,
          website,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          return res.status(400).json({
            status: 'error',
            message: 'Ya existe una institución con ese nombre'
          });
        }
        throw error;
      }

      // Log de actividad
      await supabase
        .from('activity_logs')
        .insert({
          user_id: req.user.id,
          action: 'create_institution',
          entity_type: 'institution',
          entity_id: institution.id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          metadata: {
            institution_name: name,
            institution_type: type
          }
        });

      res.status(201).json({
        status: 'success',
        message: 'Institución creada exitosamente',
        data: { institution }
      });

    } catch (error) {
      console.error('❌ Error creando institución:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al crear institución'
      });
    }
  }
);

// PUT /api/admin/institutions/:id - Actualizar institución
router.put('/institutions/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, address, phone, email, website, is_active } = req.body;
      
      // Validación básica
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'El nombre de la institución es requerido (mínimo 2 caracteres)'
        });
      }
      
      console.log('✏️ Admin actualizando institución:', {
        id, name,
        userId: req.user.id
      });

      const { supabase } = require('../../config/supabase');
      
      const { data: institution, error } = await supabase
        .from('institutions')
        .update({
          name: name.trim(),
          type,
          address,
          phone,
          email,
          website,
          is_active
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            status: 'error',
            message: 'Institución no encontrada'
          });
        }
        throw error;
      }

      // Log de actividad
      await supabase
        .from('activity_logs')
        .insert({
          user_id: req.user.id,
          action: 'update_institution',
          entity_type: 'institution',
          entity_id: id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          metadata: {
            institution_name: name,
            changes: req.body
          }
        });

      res.status(200).json({
        status: 'success',
        message: 'Institución actualizada exitosamente',
        data: { institution }
      });

    } catch (error) {
      console.error('❌ Error actualizando institución:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al actualizar institución'
      });
    }
  }
);

// DELETE /api/admin/institutions/:id - Eliminar institución
router.delete('/institutions/:id',
  async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('🗑️ Admin eliminando institución:', {
        id,
        userId: req.user.id
      });

      const { supabase } = require('../../config/supabase');
      
      // Verificar si tiene cursos asociados
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('institution_id', id)
        .limit(1);

      if (courses && courses.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'No se puede eliminar la institución porque tiene cursos asociados'
        });
      }

      const { error } = await supabase
        .from('institutions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Log de actividad
      await supabase
        .from('activity_logs')
        .insert({
          user_id: req.user.id,
          action: 'delete_institution',
          entity_type: 'institution',
          entity_id: id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          metadata: {
            institution_id: id
          }
        });

      res.status(200).json({
        status: 'success',
        message: 'Institución eliminada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando institución:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al eliminar institución'
      });
    }
  }
);

// ==========================================
// 📚 RUTAS DE CURSOS
// ==========================================

// GET /api/admin/courses - Listar cursos
router.get('/courses',
  generalApiLimiter,
  async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        institution = '', 
        level = '', 
        active = '' 
      } = req.query;
      
      console.log('📚 Admin consultando cursos:', {
        page, limit, search, institution, level, active,
        userId: req.user.id
      });

      const { supabase } = require('../../config/supabase');
      
      let query = supabase
        .from('courses')
        .select(`
          *,
          institutions!inner(
            id,
            name,
            type
          )
        `, { count: 'exact' });

      // Filtros
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      
      if (institution) {
        query = query.eq('institution_id', institution);
      }
      
      if (level) {
        query = query.eq('level', level);
      }
      
      if (active !== '') {
        query = query.eq('is_active', active === 'true');
      }

      // Paginación
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query
        .range(offset, offset + parseInt(limit) - 1)
        .order('name', { ascending: true });

      const { data: courses, error, count } = await query;

      if (error) {
        console.error('❌ Error obteniendo cursos:', error);
        throw error;
      }

      res.status(200).json({
        status: 'success',
        data: {
          courses,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en GET cursos:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener cursos'
      });
    }
  }
);

// GET /api/admin/courses/stats - Estadísticas de cursos
router.get('/courses/stats',
  async (req, res) => {
    try {
      console.log('📊 Admin consultando estadísticas de cursos');
    
      const { supabase } = require('../../config/supabase');
    
      const [
        { count: totalCourses },
        { count: activeCourses },
        { data: courseLevels },
        { data: coursesByInstitution }
      ] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('courses').select('level').not('level', 'is', null),
        supabase.from('courses').select(`
          institution_id,
          institutions!inner(name)
        `).not('institution_id', 'is', null)
      ]);
      // Contar por nivel
      const levelStats = courseLevels.reduce((acc, course) => {
        if (course.level) {
          acc[course.level] = (acc[course.level] || 0) + 1;
        }
        return acc;
      }, {});
      // Contar por institución
      const institutionStats = coursesByInstitution.reduce((acc, course) => {
        const institutionName = course.institutions?.name || 'Sin institución';
        acc[institutionName] = (acc[institutionName] || 0) + 1;
        return acc;
      }, {});
      res.status(200).json({
        status: 'success',
        data: {
          totalCourses: totalCourses || 0,
          activeCourses: activeCourses || 0,
          inactiveCourses: (totalCourses || 0) - (activeCourses || 0),
          byLevel: levelStats,
          byInstitution: institutionStats,
          totalInstitutionsWithCourses: Object.keys(institutionStats).length
        }
      });
    } catch (error) {
      console.error('❌ Error obteniendo stats de cursos:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener estadísticas de cursos'
      });
    }
  }
);

// ==========================================
// ⚙️ RUTAS DE CONFIGURACIÓN DEL SISTEMA
// ==========================================

// GET /api/admin/config - Obtener todas las configuraciones
router.get('/config',
  async (req, res) => {
    try {
      console.log('⚙️ Admin consultando configuraciones del sistema');

      const { supabase } = require('../../config/supabase');
      
      const { data: rawConfigurations, error } = await supabase
        .from('system_config')
        .select('*')
        .order('category', { ascending: true })
        .order('config_key', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo configuraciones:', error);
        throw error;
      }

      // ✅ CORRECCIÓN: Convertir tipos correctamente
      const configurations = rawConfigurations.map(config => ({
        ...config,
        // Convertir string 'true'/'false' a boolean real
        isEditable: config.is_editable === 'true' || config.is_editable === true,
        // Mapear nombres de campos para consistencia con frontend
        configKey: config.config_key,
        configValue: config.config_value,
        dataType: config.data_type,
        minValue: config.min_value ? parseFloat(config.min_value) : null,
        maxValue: config.max_value ? parseFloat(config.max_value) : null,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
        updatedBy: config.updated_by
      }));

      console.log(`📋 ${configurations.length} configuraciones procesadas`);
      console.log(`✅ Editables: ${configurations.filter(c => c.isEditable).length}`);

      // Agrupar por categoría
      const grouped = configurations.reduce((acc, config) => {
        if (!acc[config.category]) {
          acc[config.category] = [];
        }
        acc[config.category].push(config);
        return acc;
      }, {});

      // Obtener categorías únicas
      const categories = [...new Set(configurations.map(c => c.category))];

      res.status(200).json({
        status: 'success',
        data: {
          configurations,
          grouped,
          categories
        }
      });

    } catch (error) {
      console.error('❌ Error en GET configuraciones:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener configuraciones del sistema'
      });
    }
  }
);

// PATCH /api/admin/config/multiple - Actualizar múltiples configuraciones
router.patch('/config/multiple',
  async (req, res) => {
    try {
      const updates = req.body; // Array de { key, value }
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Se requiere un array de actualizaciones'
        });
      }

      console.log('🔧 Admin actualizando múltiples configuraciones:', {
        count: updates.length,
        keys: updates.map(u => u.key),
        userId: req.user.id
      });

      const { supabase } = require('../../config/supabase');
      
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { key, value } = update;
          
          // Obtener configuración actual
          const { data: currentConfig } = await supabase
            .from('system_config')
            .select('*')
            .eq('config_key', key)
            .single();

          if (!currentConfig || !currentConfig.is_editable) {
            errors.push({ key, error: 'Configuración no encontrada o no editable' });
            continue;
          }

          // Validar y actualizar
          let validatedValue = value;
          if (currentConfig.data_type === 'number') {
            validatedValue = parseFloat(value);
            if (isNaN(validatedValue)) {
              errors.push({ key, error: 'Valor no es un número válido' });
              continue;
            }
          }

          const { data: updatedConfig, error: updateError } = await supabase
            .from('system_config')
            .update({
              config_value: validatedValue.toString(),
              updated_by: req.user.id
            })
            .eq('config_key', key)
            .select()
            .single();

          if (updateError) {
            errors.push({ key, error: updateError.message });
            continue;
          }

          results.push(updatedConfig);

          // ✅ CORRECCIÓN: Log de actividad con metadatos en camelCase
          await supabase
            .from('activity_logs')
            .insert({
              user_id: req.user.id,
              action: 'update_system_config',
              entity_type: 'system_config',
              entity_id: updatedConfig.id,
              ip_address: req.ip,
              user_agent: req.get('User-Agent'),
              metadata: {
                config_key: key,
                oldValue: currentConfig.config_value,           // ✅ Cambiar de old_value
                newValue: validatedValue.toString(),            // ✅ Cambiar de new_value
                configDescription: currentConfig.description || '',
                dataType: currentConfig.data_type,
                category: currentConfig.category,
                adminName: `${req.user.firstName} ${req.user.lastName}`,
                adminEmail: req.user.email,
                batch_update: true,
                timestamp: new Date().toISOString()
              }
            });

        } catch (error) {
          errors.push({ key: update.key, error: error.message });
        }
      }

      res.status(200).json({
        status: errors.length === 0 ? 'success' : 'partial_success',
        message: `${results.length} configuraciones actualizadas exitosamente${errors.length > 0 ? `, ${errors.length} errores` : ''}`,
        data: {
          updated: results,
          errors: errors
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando múltiples configuraciones:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al actualizar configuraciones'
      });
    }
  }
);

// GET /api/admin/config/:key/history - Historial de una configuración
router.get('/config/:key/history',
  async (req, res) => {
    try {
      const { key } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      console.log('📋 Admin consultando historial de configuración:', {
        key, page, limit,
        userId: req.user.id
      });

      const { supabase } = require('../../config/supabase');
      
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const { data: history, error, count } = await supabase
        .from('activity_logs')
        .select(`
          *,
          users(
            run,
            first_name,
            last_name,
            email
          )
        `, { count: 'exact' })
        .eq('action', 'update_system_config')
        .eq('metadata->>config_key', key)
        .range(offset, offset + parseInt(limit) - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.status(200).json({
        status: 'success',
        data: {
          history,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            totalPages: Math.ceil(count / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener historial de configuración'
      });
    }
  }
);

// ==========================================
// 🛡️ RUTAS DE RATE LIMITERS
// ==========================================

// POST /api/admin/config/rate-limiters/refresh - Refrescar rate limiters
router.post('/config/rate-limiters/refresh',
  async (req, res) => {
    try {
      console.log('🔄 Admin solicitó refresh de rate limiters:', {
        userId: req.user.id,
        userEmail: req.user.email,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      // Ejecutar refresh de rate limiters
      const refreshResult = await refreshRateLimiters();

      // Registrar actividad en logs
      try {
        const { supabase } = require('../../config/supabase');
        
        await supabase
          .from('activity_logs')
          .insert({
            user_id: req.user.id,
            action: 'refresh_rate_limiters',
            entity_type: 'system_config',
            entity_id: null,
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            metadata: {
              refresh_result: refreshResult,
              admin_name: `${req.user.firstName} ${req.user.lastName}`,
              admin_email: req.user.email,
              success: refreshResult.status === 'success'
            }
          });
      } catch (logError) {
        console.error('⚠️ Error registrando actividad de refresh:', logError);
      }

      res.status(200).json({
        status: 'success',
        message: 'Rate limiters actualizados exitosamente',
        data: {
          refreshResult,
          appliedAt: new Date().toISOString(),
          adminUser: {
            id: req.user.id,
            name: `${req.user.firstName} ${req.user.lastName}`,
            email: req.user.email
          }
        }
      });

      console.log('✅ Rate limiters refrescados exitosamente por admin:', req.user.email);

    } catch (error) {
      console.error('❌ Error refrescando rate limiters:', error);

      res.status(500).json({
        status: 'error',
        message: 'Error al actualizar rate limiters',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
      });
    }
  }
);

// GET /api/admin/config/rate-limiters/status - Estado de rate limiters
router.get('/config/rate-limiters/status',
  async (req, res) => {
    try {
      console.log('📊 Admin consultó estado de rate limiters:', req.user.email);

      const currentConfig = getCurrentConfig();
      
      res.status(200).json({
        status: 'success',
        message: 'Estado actual de rate limiters',
        data: {
          configuration: currentConfig,
          timestamp: new Date().toISOString(),
          requestedBy: {
            id: req.user.id,
            name: `${req.user.firstName} ${req.user.lastName}`,
            email: req.user.email
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo estado de rate limiters:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener estado de rate limiters',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
      });
    }
  }
);

// GET /api/admin/config/rate-limiters/test - Test de rate limiters
router.get('/config/rate-limiters/test',
  // Aplicar rate limiter de transferencias como test
  require('../../middleware/rateLimiter').transferLimiter,
  async (req, res) => {
    try {
      const { getRateLimitInfo } = require('../../middleware/rateLimiter');
      const rateLimitInfo = getRateLimitInfo(req);

      res.status(200).json({
        status: 'success',
        message: 'Rate limiter funcionando correctamente',
        data: {
          rateLimitInfo,
          testType: 'transfer_limiter',
          timestamp: new Date().toISOString(),
          message: 'Si ves este mensaje, el rate limiter está aplicándose correctamente'
        }
      });

    } catch (error) {
      console.error('❌ Error en test de rate limiters:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Error en test de rate limiters'
      });
    }
  }
);

// ==========================================
// 💾 RUTAS DE BACKUP - ✅ NUEVAS RUTAS AGREGADAS
// ==========================================

// GET /api/admin/backup/stats - Estadísticas de backup (YA EXISTE)
router.get('/backup/stats',
  async (req, res) => {
    try {
      const { supabase } = require('../../config/supabase');
      
      // Stats básicas de las tablas principales
      const [
        { count: usersCount },
        { count: studentsCount },
        { count: teachersCount },
        { count: transfersCount },
        { count: institutionsCount },
        { count: coursesCount }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('transfers').select('*', { count: 'exact', head: true }),
        supabase.from('institutions').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true })
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          totalUsers: usersCount || 0,
          totalStudents: studentsCount || 0,
          totalTeachers: teachersCount || 0,
          totalTransfers: transfersCount || 0,
          totalInstitutions: institutionsCount || 0,
          totalCourses: coursesCount || 0,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo stats de backup:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al obtener estadísticas de backup'
      });
    }
  }
);

// ✅ NUEVO: GET /api/admin/backup/history - Historial de backups
router.get('/backup/history',
  async (req, res) => {
    console.log('📋 Admin solicitó historial de backups');
    await getBackupHistory(req, res);
  }
);

// ✅ NUEVO: GET /api/admin/backup/table/:tableName/preview - Vista previa de tabla
router.get('/backup/table/:tableName/preview',
  async (req, res) => {
    console.log(`👁️ Admin solicitó vista previa de tabla: ${req.params.tableName}`);
    await getTablePreview(req, res);
  }
);

// ✅ NUEVO: GET /api/admin/backup/full - Crear y descargar backup completo
router.get('/backup/full',
  async (req, res) => {
    console.log('📦 Admin solicitó backup completo');
    await createFullBackup(req, res);
  }
);

// ✅ NUEVO: GET /api/admin/backup/table/:tableName - Crear y descargar backup de tabla
router.get('/backup/table/:tableName',
  async (req, res) => {
    console.log(`📦 Admin solicitó backup de tabla: ${req.params.tableName}`);
    await createTableBackup(req, res);
  }
);

// ✅ NUEVO: POST /api/admin/backup/validate - Validar archivo de backup
router.post('/backup/validate',
  async (req, res) => {
    console.log('🔍 Admin solicitó validación de archivo backup');
    await validateBackupFile(req, res);
  }
);

// ==========================================
// 📤 RUTAS DE TEMPLATES
// ==========================================

// GET /api/admin/templates/:type - Descargar template CSV
router.get('/templates/:type',
  async (req, res) => {
    try {
      const { type } = req.params;
      
      if (!['student', 'teacher'].includes(type)) {
        return res.status(400).json({
          status: 'error',
          message: 'Tipo de template inválido'
        });
      }

      // Headers para CSV básico
      const headers = type === 'student' 
        ? 'run,firstName,lastName,email,phone,birthDate,institution,course,gender,balance,overdraftLimit'
        : 'run,firstName,lastName,email,phone,birthDate,institution,courses,gender,balance';

      const exampleRow = type === 'student'
        ? '12345678-9,Juan,Pérez,juan@email.com,+56912345678,2000-01-15,Universidad de Chile,Ingeniería,Masculino,100000,50000'
        : '98765432-1,María,González,maria@email.com,+56987654321,1985-03-20,Universidad de Chile,"Matemáticas,Física",Femenino,0';

      const csvContent = `${headers}\n${exampleRow}`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_template.csv"`);
      res.status(200).send(csvContent);

    } catch (error) {
      console.error('❌ Error generando template:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error al generar template'
      });
    }
  }
);

// ==========================================
// 🔔 RUTAS DE CONFIGURACIÓN DE NOTIFICACIONES
// ==========================================
const notificationRoutes = require('./notificationRoutes');
router.use('/notifications', notificationRoutes);

module.exports = router;