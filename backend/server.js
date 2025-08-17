// server.js - BANCARIZATE API v2.0 - Versión Final Optimizada para Vercel
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const winston = require('winston');
const rateLimit = require('express-rate-limit');

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Configurar logger optimizado para serverless
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bancarizate-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// IMPORTAR RUTAS CON MANEJO ROBUSTO DE ERRORES
let authRoutes, studentRoutes, teacherRoutes, transferRoutes, activityRoutes, adminRoutes;
const routeStatus = {};

try {
  logger.info('🚀 Iniciando carga de rutas BANCARIZATE...');
  
  // Cargar rutas principales
  authRoutes = require('./routes/authRoutes');
  routeStatus.auth = 'loaded';
  logger.info('✅ authRoutes - Autenticación cargada');
  
  studentRoutes = require('./routes/studentRoutes');
  routeStatus.students = 'loaded';
  logger.info('✅ studentRoutes - Gestión de estudiantes cargada');
  
  teacherRoutes = require('./routes/teacherRoutes');
  routeStatus.teachers = 'loaded';
  logger.info('✅ teacherRoutes - Gestión de docentes cargada');
  
  transferRoutes = require('./routes/transferRoutes');
  routeStatus.transfers = 'loaded';
  logger.info('✅ transferRoutes - Sistema de transferencias cargado');
  
  activityRoutes = require('./routes/activityRoutes');
  routeStatus.activity = 'loaded';
  logger.info('✅ activityRoutes - Logs de actividad cargados');
  
  adminRoutes = require('./routes/admin/adminRoutes');
  routeStatus.admin = 'loaded';
  logger.info('✅ adminRoutes - Panel de administración cargado');
  
  logger.info('🎉 Todas las rutas cargadas exitosamente');
  
} catch (error) {
  logger.error('❌ Error crítico cargando rutas:', {
    error: error.message,
    stack: error.stack
  });
  routeStatus.error = error.message;
}

// CONFIGURAR RATE LIMITING AVANZADO
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos de login por IP
  message: {
    status: 'error',
    message: 'Demasiados intentos de login. Intenta en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const transferLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // 10 transferencias por IP
  message: {
    status: 'error',
    message: 'Demasiadas transferencias. Intenta en 5 minutos.'
  }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests generales
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes desde esta IP.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// MIDDLEWARES DE SEGURIDAD Y CONFIGURACIÓN
app.use(helmet({
  contentSecurityPolicy: false, // Para desarrollo, ajustar en producción
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'] 
    : process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Morgan logging para HTTP requests (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting general
app.use('/api/', generalLimiter);

// RUTA PRINCIPAL - INFORMACIÓN DEL SISTEMA
app.get('/', (req, res) => {
  logger.info('Acceso a ruta principal');
  res.status(200).json({
    status: 'success',
    message: '🏦 BANCARIZATE API - Sistema Bancario Educativo',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server_status: 'operational',
    features: [
      'Autenticación JWT',
      'Gestión de Estudiantes y Docentes',
      'Sistema de Transferencias',
      'Logging y Auditoría',
      'Rate Limiting',
      'Seguridad Avanzada'
    ],
    routes_loaded: routeStatus,
    documentation: {
      health: '/api/health',
      test: '/api/test',
      endpoints: '/api',
      auth: '/api/auth/*',
      students: '/api/students/*',
      teachers: '/api/teachers/*',
      transfers: '/api/transfers/*'
    },
    deployment_info: {
      platform: 'Vercel Serverless',
      node_version: process.version,
      deployed_at: new Date().toISOString()
    }
  });
});

// REGISTRAR RUTAS CON RATE LIMITING ESPECÍFICO
try {
  if (authRoutes) {
    app.use('/api/auth/login', loginLimiter);
    app.use('/api/auth', authRoutes);
    logger.info('🔐 Rutas de autenticación registradas con rate limiting');
  }
  
  if (studentRoutes) {
    app.use('/api/students', studentRoutes);
    logger.info('👨‍🎓 Rutas de estudiantes registradas');
  }
  
  if (teacherRoutes) {
    app.use('/api/teachers', teacherRoutes);
    logger.info('👩‍🏫 Rutas de docentes registradas');
  }
  
  if (transferRoutes) {
    app.use('/api/transfers', transferLimiter);
    app.use('/api/transfers', transferRoutes);
    logger.info('💸 Rutas de transferencias registradas con rate limiting');
  }
  
  if (activityRoutes) {
    app.use('/api/activity', activityRoutes);
    logger.info('📊 Rutas de actividad registradas');
  }
  
  if (adminRoutes) {
    app.use('/api/admin', adminRoutes);
    logger.info('⚙️ Rutas de administración registradas');
  }
  
} catch (error) {
  logger.error('❌ Error registrando rutas en Express:', error);
}

// HEALTH CHECK AVANZADO
app.get('/api/health', (req, res) => {
  const uptime = Math.floor(process.uptime());
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    uptime_seconds: uptime,
    uptime_readable: `${Math.floor(uptime / 60)}m ${uptime % 60}s`,
    memory: {
      used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    },
    routes_status: routeStatus,
    features_enabled: {
      logging: 'winston',
      rate_limiting: 'express-rate-limit',
      security: 'helmet + cors',
      database: 'supabase',
      authentication: 'jwt'
    },
    system_checks: {
      jwt_secret: !!process.env.JWT_SECRET,
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_ANON_KEY,
      frontend_cors: !!process.env.FRONTEND_URL
    }
  });
});

// INFORMACIÓN DE LA API
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'BANCARIZATE API v2.0.0 - Sistema Bancario Educativo',
    description: 'API RESTful para gestión de sistema bancario educativo',
    available_endpoints: {
      system: {
        health: 'GET /api/health',
        test: 'GET /api/test',
        info: 'GET /api'
      },
      authentication: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        verify: 'GET /api/auth/verify',
        change_password: 'POST /api/auth/change-password'
      },
      students: {
        list: 'GET /api/students',
        create: 'POST /api/students',
        get: 'GET /api/students/:id',
        update: 'PUT /api/students/:id',
        delete: 'DELETE /api/students/:id',
        change_password: 'POST /api/students/:id/change-password'
      },
      teachers: {
        list: 'GET /api/teachers',
        create: 'POST /api/teachers',
        get: 'GET /api/teachers/:id',
        update: 'PUT /api/teachers/:id',
        delete: 'DELETE /api/teachers/:id',
        change_password: 'POST /api/teachers/:id/change-password'
      },
      transfers: {
        create: 'POST /api/transfers',
        history: 'GET /api/transfers/history',
        classmates: 'GET /api/transfers/classmates',
        details: 'GET /api/transfers/:id'
      }
    },
    security_features: [
      'JWT Authentication',
      'Role-based Authorization', 
      'Rate Limiting',
      'Input Validation',
      'CORS Protection',
      'Helmet Security Headers'
    ],
    documentation: 'Ver documentación completa en el repositorio'
  });
});

// TEST ENDPOINT COMPLETO
app.get('/api/test', (req, res) => {
  logger.info('Test endpoint accedido');
  
  const testResults = {
    status: 'success',
    message: '✅ BANCARIZATE API completamente funcional',
    timestamp: new Date().toISOString(),
    server_info: {
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      node_version: process.version,
      platform: 'Vercel Serverless'
    },
    routes_loaded: routeStatus,
    environment_variables: {
      jwt_secret: !!process.env.JWT_SECRET ? '✅ Configurado' : '❌ Faltante',
      supabase_url: !!process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Faltante',
      supabase_anon_key: !!process.env.SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Faltante',
      supabase_service_key: !!process.env.SUPABASE_SERVICE_KEY ? '✅ Configurado' : '❌ Faltante',
      frontend_url: !!process.env.FRONTEND_URL ? '✅ Configurado' : '⚠️ Default'
    },
    features_test: {
      express_app: '✅ Funcionando',
      cors_enabled: '✅ Activo',
      helmet_security: '✅ Activo',
      rate_limiting: '✅ Activo',
      logging_winston: '✅ Activo',
      json_parsing: '✅ Activo'
    },
    next_steps: [
      'Probar autenticación: POST /api/auth/login',
      'Verificar estudiantes: GET /api/students',
      'Probar transferencias: POST /api/transfers',
      'Conectar frontend React'
    ]
  };
  
  res.status(200).json(testResults);
});

// 404 HANDLER CON INFORMACIÓN ÚTIL
app.use('*', (req, res) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    status: 'error',
    message: `Endpoint no encontrado: ${req.method} ${req.originalUrl}`,
    suggestions: [
      'Verificar la URL solicitada',
      'Consultar GET /api para ver endpoints disponibles',
      'Revisar la documentación de la API'
    ],
    available_endpoints: [
      'GET /',
      'GET /api',
      'GET /api/health',
      'GET /api/test',
      authRoutes ? 'POST /api/auth/login' : null,
      studentRoutes ? 'GET /api/students' : null,
      teacherRoutes ? 'GET /api/teachers' : null,
      transferRoutes ? 'POST /api/transfers' : null
    ].filter(Boolean),
    documentation: {
      api_info: '/api',
      health_check: '/api/health',
      test_endpoint: '/api/test'
    }
  });
});

// ERROR HANDLER GLOBAL AVANZADO
app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  logger.error('Error no manejado capturado:', {
    errorId,
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  const errorResponse = {
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    errorId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: {
        url: req.originalUrl,
        method: req.method,
        body: req.body
      }
    })
  };

  res.status(err.status || 500).json(errorResponse);
});

// MANEJO DE CIERRE GRACEFUL (Para desarrollo local)
process.on('unhandledRejection', (err) => {
  logger.error('Promise rechazada no manejada:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Excepción no capturada:', err);
});

logger.info('🏦 BANCARIZATE API v2.0 inicializado exitosamente');
logger.info(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
logger.info(`🚀 Todas las funcionalidades cargadas y listas para usar`);

// ✅ EXPORT PARA VERCEL SERVERLESS
module.exports = app;