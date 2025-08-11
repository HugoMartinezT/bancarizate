// server.js - Agregando rutas (posible punto de crash)
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

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bancarizate-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// IMPORTAR RUTAS CON MANEJO DE ERRORES
let authRoutes, studentRoutes, teacherRoutes, transferRoutes, activityRoutes, adminRoutes;

try {
  logger.info('Importando rutas...');
  
  authRoutes = require('./routes/authRoutes');
  logger.info('✅ authRoutes importado correctamente');
  
  studentRoutes = require('./routes/studentRoutes');
  logger.info('✅ studentRoutes importado correctamente');
  
  teacherRoutes = require('./routes/teacherRoutes');
  logger.info('✅ teacherRoutes importado correctamente');
  
  transferRoutes = require('./routes/transferRoutes');
  logger.info('✅ transferRoutes importado correctamente');
  
  activityRoutes = require('./routes/activityRoutes');
  logger.info('✅ activityRoutes importado correctamente');
  
  adminRoutes = require('./routes/admin/adminRoutes');
  logger.info('✅ adminRoutes importado correctamente');
  
  logger.info('🎉 Todas las rutas importadas exitosamente');
  
} catch (error) {
  logger.error('❌ Error importando rutas:', {
    error: error.message,
    stack: error.stack
  });
  
  // No crashear el servidor, continuar sin las rutas problemáticas
  console.error('ERROR CRÍTICO AL IMPORTAR RUTAS:', error.message);
}

// Rate limiting básico
const basicRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
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
app.use('/api/', basicRateLimiter);

// Ruta principal
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '🏦 BANCARIZATE API - Sistema Bancario Educativo',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    routes_loaded: {
      auth: !!authRoutes,
      students: !!studentRoutes,
      teachers: !!teacherRoutes,
      transfers: !!transferRoutes,
      activity: !!activityRoutes,
      admin: !!adminRoutes
    },
    documentation: {
      health: '/api/health',
      test: '/api/test',
      endpoints: '/api'
    }
  });
});

// USAR RUTAS SI FUERON CARGADAS CORRECTAMENTE
try {
  if (authRoutes) {
    app.use('/api/auth', authRoutes);
    logger.info('✅ Rutas auth registradas');
  }
  
  if (studentRoutes) {
    app.use('/api/students', studentRoutes);
    logger.info('✅ Rutas students registradas');
  }
  
  if (teacherRoutes) {
    app.use('/api/teachers', teacherRoutes);
    logger.info('✅ Rutas teachers registradas');
  }
  
  if (transferRoutes) {
    app.use('/api/transfers', transferRoutes);
    logger.info('✅ Rutas transfers registradas');
  }
  
  if (activityRoutes) {
    app.use('/api/activity', activityRoutes);
    logger.info('✅ Rutas activity registradas');
  }
  
  if (adminRoutes) {
    app.use('/api/admin', adminRoutes);
    logger.info('✅ Rutas admin registradas');
  }
  
} catch (error) {
  logger.error('❌ Error registrando rutas:', error);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    routes_status: {
      auth: !!authRoutes ? 'loaded' : 'failed',
      students: !!studentRoutes ? 'loaded' : 'failed',
      teachers: !!teacherRoutes ? 'loaded' : 'failed',
      transfers: !!transferRoutes ? 'loaded' : 'failed',
      activity: !!activityRoutes ? 'loaded' : 'failed',
      admin: !!adminRoutes ? 'loaded' : 'failed'
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: '✅ API funcionando con rutas',
    timestamp: new Date().toISOString(),
    available_routes: {
      auth: !!authRoutes,
      students: !!studentRoutes,
      teachers: !!teacherRoutes,
      transfers: !!transferRoutes,
      activity: !!activityRoutes,
      admin: !!adminRoutes
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: `Endpoint no encontrado: ${req.method} ${req.originalUrl}`,
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/test',
      authRoutes ? 'POST /api/auth/login' : 'auth routes: failed',
      studentRoutes ? 'GET /api/students' : 'student routes: failed'
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
    ip: req.ip
  });

  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    error_details: err.message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack
    })
  });
});

logger.info('BANCARIZATE API con rutas inicializado');

// Export para serverless
module.exports = app;