// server.js - Servidor principal actualizado con rutas administrativas
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const winston = require('winston');
const rateLimit = require('express-rate-limit');

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Configurar logger básico
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bancarizate-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiting básico
const basicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting específico para rutas administrativas
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Límite más alto para administradores
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes administrativas desde esta IP.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173'] 
    : process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', basicRateLimiter);
app.use('/api/admin/', adminRateLimiter); // Rate limiting específico para admin

// Importar rutas existentes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const transferRoutes = require('./routes/transferRoutes');
const activityRoutes = require('./routes/activityRoutes');

// ✅ NUEVA IMPORTACIÓN: Rutas administrativas
const adminRoutes = require('./routes/admin/adminRoutes');

// Ruta principal
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '🏦 BANCARIZATE API - Sistema Bancario Educativo',
    version: '2.0.0', // Actualizado a v2.0.0 con funcionalidades administrativas
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    documentation: {
      health: '/api/health',
      test: '/api/test',
      endpoints: '/api',
      admin: '/api/admin' // ✅ NUEVA documentación administrativa
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0', // Actualizado
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    features: {
      administration: 'enabled', // ✅ NUEVA característica
      massUpload: 'enabled',
      backup: 'enabled',
      systemConfig: 'enabled'
    }
  });
});

// API info endpoint - ACTUALIZADO con endpoints administrativos
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'BANCARIZATE API v2.0.0', // Actualizado
    available_endpoints: {
      health: 'GET /api/health',
      test: 'GET /api/test',
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        verify: 'GET /api/auth/verify',
        changePassword: 'POST /api/auth/change-password'
      },
      activity: {
        list: 'GET /api/activity',
        stats: 'GET /api/activity/stats',
        recent: 'GET /api/activity/recent',
        types: 'GET /api/activity/types'
      },
      students: {
        list: 'GET /api/students',
        create: 'POST /api/students',
        getById: 'GET /api/students/:id',
        update: 'PUT /api/students/:id',
        changePassword: 'POST /api/students/:id/change-password',
        delete: 'DELETE /api/students/:id'
      },
      teachers: {
        list: 'GET /api/teachers',
        create: 'POST /api/teachers',
        getById: 'GET /api/teachers/:id',
        update: 'PUT /api/teachers/:id',
        changePassword: 'POST /api/teachers/:id/change-password',
        delete: 'DELETE /api/teachers/:id'
      },
      transfers: {
        create: 'POST /api/transfers',
        history: 'GET /api/transfers/history',
        users: 'GET /api/transfers/users',
        stats: 'GET /api/transfers/stats',
        details: 'GET /api/transfers/:id'
      },
      // ✅ NUEVA SECCIÓN: Endpoints administrativos
      admin: {
        info: 'GET /api/admin',
        institutions: {
          list: 'GET /api/admin/institutions',
          create: 'POST /api/admin/institutions',
          update: 'PUT /api/admin/institutions/:id',
          delete: 'DELETE /api/admin/institutions/:id',
          stats: 'GET /api/admin/institutions/stats'
        },
        courses: {
          list: 'GET /api/admin/courses',
          create: 'POST /api/admin/courses',
          update: 'PUT /api/admin/courses/:id',
          delete: 'DELETE /api/admin/courses/:id',
          byInstitution: 'GET /api/admin/courses/by-institution/:id'
        },
        config: {
          list: 'GET /api/admin/config',
          update: 'PUT /api/admin/config/:key',
          batch: 'PUT /api/admin/config/batch',
          categories: 'GET /api/admin/config/categories'
        },
        massUpload: {
          validate: 'POST /api/admin/mass-upload/validate',
          execute: 'POST /api/admin/mass-upload/execute',
          template: 'GET /api/admin/mass-upload/template/:userType',
          history: 'GET /api/admin/mass-upload/history'
        },
        backup: {
          full: 'GET /api/admin/backup/full',
          table: 'GET /api/admin/backup/table/:tableName',
          stats: 'GET /api/admin/backup/stats',
          history: 'GET /api/admin/backup/history'
        }
      }
    },
    authentication: 'Bearer Token required for protected routes',
    authorization: 'Admin role required for /api/admin/* routes' // ✅ NUEVA información
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  logger.info('Test endpoint accessed');
  res.status(200).json({
    status: 'success',
    message: '✅ API funcionando correctamente',
    timestamp: new Date().toISOString(),
    test_data: {
      user: {
        run: '18108750-1',
        firstName: 'Juan',
        lastName: 'Pérez González',
        email: 'juan.perez@banco.cl',
        balance: 1250000,
        overdraftLimit: 500000,
        role: 'student'
      },
      system: {
        database: 'Supabase (conectado)',
        authentication: 'JWT (configurado)',
        environment: process.env.NODE_ENV || 'development',
        activityLogging: 'Habilitado',
        // ✅ NUEVOS sistemas habilitados
        administration: 'Habilitado',
        massUpload: 'Habilitado',
        backup: 'Habilitado',
        systemConfig: 'Habilitado',
        activityTypes: [
          'login', 'logout', 'transfer', 'transfer_received',
          'student_created', 'teacher_created', 'profile_updated',
          'change_password', 'failed_login',
          // ✅ NUEVOS tipos de actividad administrativa
          'create_institution', 'update_institution', 'delete_institution',
          'create_course', 'update_course', 'delete_course',
          'update_system_config', 'mass_upload', 'create_backup'
        ]
      }
    }
  });
});

// ==========================================
// REGISTRO DE RUTAS DE LA API
// ==========================================

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de actividades
app.use('/api/activity', activityRoutes);

// Rutas de estudiantes
app.use('/api/students', studentRoutes);

// Rutas de docentes
app.use('/api/teachers', teacherRoutes);

// Rutas de transferencias
app.use('/api/transfers', transferRoutes);

// ✅ NUEVA RUTA: Panel administrativo
app.use('/api/admin', adminRoutes);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// 404 handler - ACTUALIZADO con nuevos endpoints administrativos
app.use('*', (req, res) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: `Endpoint no encontrado: ${req.method} ${req.originalUrl}`,
    available_endpoints: [
      'GET /',
      'GET /api',
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/login',
      'GET /api/auth/verify',
      'POST /api/auth/logout',
      'GET /api/activity',
      'GET /api/activity/stats',
      'GET /api/students',
      'POST /api/students',
      'GET /api/teachers',
      'POST /api/teachers',
      'POST /api/transfers',
      'GET /api/transfers/history',
      // ✅ NUEVOS endpoints administrativos
      'GET /api/admin',
      'GET /api/admin/institutions',
      'POST /api/admin/institutions',
      'GET /api/admin/courses',
      'POST /api/admin/courses',
      'GET /api/admin/config',
      'PUT /api/admin/config/:key',
      'POST /api/admin/mass-upload/validate',
      'GET /api/admin/backup/full'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    user: req.user ? req.user.id : 'anonymous'
  });

  // Error de validación de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token de autenticación inválido'
    });
  }

  // Error de token expirado
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token de autenticación expirado'
    });
  }

  // Error de validación
  if (err.type === 'validation') {
    return res.status(400).json({
      status: 'error',
      message: 'Datos de entrada inválidos',
      errors: err.errors
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack
    })
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const PORT = process.env.PORT || 5000;

// Verificar variables de entorno críticas
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Variables de entorno faltantes:', missingEnvVars);
  console.error('❌ Variables de entorno faltantes:', missingEnvVars.join(', '));
  process.exit(1);
}

app.listen(PORT, () => {
  logger.info(`Servidor BANCARIZATE iniciado en puerto ${PORT}`);
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Sistema de actividades: HABILITADO`);
  logger.info(`Panel administrativo: HABILITADO`); // ✅ NUEVO LOG
  
  console.log('\n=====================================');
  console.log('🏦 BANCARIZATE API v2.0 - SERVIDOR ACTIVO');
  console.log('=====================================');
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🔍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log(`📚 API Info: http://localhost:${PORT}/api`);
  console.log(`🔧 Admin Panel: http://localhost:${PORT}/api/admin`); // ✅ NUEVO
  console.log('');
  console.log('📋 Rutas disponibles:');
  console.log(`   🔐 POST /api/auth/login`);
  console.log(`   🔐 GET  /api/auth/verify`);
  console.log(`   🔐 POST /api/auth/logout`);
  console.log(`   📊 GET  /api/activity`);
  console.log(`   📊 GET  /api/activity/stats`);
  console.log(`   👥 GET  /api/students`);
  console.log(`   👥 POST /api/students`);
  console.log(`   🎓 GET  /api/teachers`);
  console.log(`   🎓 POST /api/teachers`);
  console.log(`   💸 POST /api/transfers`);
  console.log(`   💸 GET  /api/transfers/history`);
  // ✅ NUEVOS logs de rutas administrativas
  console.log('');
  console.log('🔧 Rutas administrativas:');
  console.log(`   🏫 GET  /api/admin/institutions`);
  console.log(`   🏫 POST /api/admin/institutions`);
  console.log(`   📚 GET  /api/admin/courses`);
  console.log(`   📚 POST /api/admin/courses`);
  console.log(`   ⚙️  GET  /api/admin/config`);
  console.log(`   ⚙️  PUT  /api/admin/config/:key`);
  console.log(`   📤 POST /api/admin/mass-upload/validate`);
  console.log(`   📤 POST /api/admin/mass-upload/execute`);
  console.log(`   💾 GET  /api/admin/backup/full`);
  console.log(`   💾 GET  /api/admin/backup/stats`);
  console.log('=====================================\n');
});

// Manejo de cierre graceful
process.on('unhandledRejection', (err) => {
  logger.error('Error no manejado:', err);
  console.error('❌ Error no manejado:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  console.log('🔄 SIGTERM recibido, cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  console.log('🔄 SIGINT recibido, cerrando servidor...');
  process.exit(0);
});

module.exports = app;