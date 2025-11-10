// server.js - BANCARIZATE API v2.0 - VersiÃ³n Final Optimizada para Vercel + Localhost
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const winston = require('winston');

dotenv.config();

const { loginLimiter, generalLimiter } = require('./middleware/rateLimiter');
const app = express();

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

// IMPORTAR RUTAS
let authRoutes, studentRoutes, teacherRoutes, transferRoutes, activityRoutes, adminRoutes, dashboardRoutes, userRoutes;
const routeStatus = {};

try {
  logger.info('ðŸš€ Iniciando carga de rutas BANCARIZATE...');

  authRoutes = require('./routes/authRoutes');            routeStatus.auth = 'loaded';
  studentRoutes = require('./routes/studentRoutes');      routeStatus.students = 'loaded';
  teacherRoutes = require('./routes/teacherRoutes');      routeStatus.teachers = 'loaded';
  transferRoutes = require('./routes/transferRoutes');    routeStatus.transfers = 'loaded';
  activityRoutes = require('./routes/activityRoutes');    routeStatus.activity = 'loaded';
  adminRoutes = require('./routes/admin/adminRoutes');    routeStatus.admin = 'loaded';
  userRoutes = require('./routes/userRoutes');            routeStatus.users = 'loaded';

  // âœ… Nuevo: dashboard (estadÃ­sticas globales)
  dashboardRoutes = require('./routes/dashboardRoutes');  routeStatus.dashboard = 'loaded';

  logger.info('ðŸŽ‰ Todas las rutas cargadas exitosamente');

} catch (error) {
  logger.error('âŒ Error crÃ­tico cargando rutas:', { error: error.message, stack: error.stack });
  routeStatus.error = error.message;
}

// Seguridad y CORS
app.use(helmet({ contentSecurityPolicy: false }));
const isLocalDevelopment = require.main === module;
const corsOrigins = isLocalDevelopment
  ? ['http://localhost:3000','http://localhost:5173','http://localhost:5174','http://127.0.0.1:3000','http://127.0.0.1:5173']
  : process.env.FRONTEND_URL || '*';

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

logger.info(`ðŸŒ CORS configurado para: ${JSON.stringify(corsOrigins)}`);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// âœ… Rate limiting general dinÃ¡mico
app.use('/api/', generalLimiter);

// Root
app.get('/', (req, res) => {
  logger.info('Acceso a ruta principal');
  res.status(200).json({
    status: 'success',
    message: 'ðŸ¦ BANCARIZATE API - Sistema Bancario Educativo',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server_status: 'operational',
    features: [
      'AutenticaciÃ³n JWT',
      'GestiÃ³n de Estudiantes y Docentes',
      'Sistema de Transferencias',
      'Logging y AuditorÃ­a',
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
      transfers: '/api/transfers/*',
      dashboard: '/api/dashboard/*'
    },
    deployment_info: {
      platform: 'Dual: Vercel Serverless + Local Development',
      node_version: process.version,
      deployed_at: new Date().toISOString()
    }
  });
});

// Registro de rutas
try {
  if (authRoutes) {
    app.use('/api/auth/login', loginLimiter);
    app.use('/api/auth', authRoutes);
    logger.info('ðŸ” Rutas de autenticaciÃ³n registradas con rate limiting');
  }

  if (studentRoutes) {
    app.use('/api/students', studentRoutes);
    logger.info('ðŸ‘¨â€ðŸŽ“ Rutas de estudiantes registradas');
  }

  if (teacherRoutes) {
    app.use('/api/teachers', teacherRoutes);
    logger.info('ðŸ‘©â€ðŸ« Rutas de docentes registradas');
  }

  if (transferRoutes) {
    app.use('/api/transfers', transferRoutes);
    logger.info('ðŸ’¸ Rutas de transferencias registradas (rate limiting por ruta)');
  }

  if (activityRoutes) {
    app.use('/api/activity', activityRoutes);
    logger.info('ðŸ“Š Rutas de actividad registradas');
  }

  if (adminRoutes) {
    app.use('/api/admin', adminRoutes);
    logger.info('âš™ï¸ Rutas de administraciÃ³n registradas');
  }

  if (userRoutes) {
    app.use('/api/users', userRoutes);
    logger.info('👤 Rutas de usuarios registradas');
  }

  // âœ… Nuevo: Dashboard
  if (dashboardRoutes) {
    app.use('/api/dashboard', dashboardRoutes);
    logger.info('ðŸ“ˆ Rutas de dashboard/estadÃ­sticas registradas');
  }

} catch (error) {
  logger.error('âŒ Error registrando rutas en Express:', error);
}

// Health y API info (igual que antes)
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

app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'BANCARIZATE API v2.0.0 - Sistema Bancario Educativo',
    description: 'API RESTful para gestiÃ³n del sistema',
    available_endpoints: {
      system: { health: 'GET /api/health', test: 'GET /api/test', info: 'GET /api' },
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
        details: 'GET /api/transfers/:id',
        stats: 'GET /api/transfers/stats'
      },
      dashboard: {
        stats: 'GET /api/dashboard/stats',
        recent: 'GET /api/dashboard/recent-activity',
        balance_history: 'GET /api/dashboard/balance-history'
      }
    }
  });
});

// 404, error handler y arranque local (sin cambios sustanciales)
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint no encontrado: ${req.method} ${req.originalUrl}`,
    suggestions: ['Verificar la URL', 'Consultar GET /api']
  });
});

app.use((err, req, res, next) => {
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  logger.error('Error no manejado:', { errorId, error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    errorId,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`ðŸš€ Servidor escuchando en http://localhost:${PORT}`);
  });
  process.on('SIGINT', () => server.close(()=>process.exit(0)));
  process.on('SIGTERM', () => server.close(()=>process.exit(0)));
}