// middleware/rateLimiter.js - Rate limiters específicos para diferentes operaciones
const rateLimit = require('express-rate-limit');

// Rate limiter para transferencias - más estricto
const transferLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // Máximo 10 transferencias por ventana de 5 minutos
  message: {
    status: 'error',
    message: 'Demasiadas transferencias en poco tiempo. Intenta de nuevo en unos minutos.',
    retryAfter: '5 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar el ID del usuario para el rate limiting
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    console.log(`Rate limit excedido para transferencias - Usuario: ${req.user?.id || 'Anónimo'}, IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Has realizado demasiadas transferencias en poco tiempo. Por seguridad, espera 5 minutos antes de intentar nuevamente.',
      retryAfter: 300, // 5 minutos en segundos
      limit: 10,
      window: '5 minutos'
    });
  }
});

// Rate limiter para consultas de usuarios - más permisivo
const userSearchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 30, // Máximo 30 búsquedas por minuto
  message: {
    status: 'error',
    message: 'Demasiadas búsquedas en poco tiempo. Intenta de nuevo en un minuto.',
    retryAfter: '1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Permitir búsquedas simples sin rate limit
    return !req.query.search || req.query.search.length < 3;
  }
});

// Rate limiter para historial - permisivo
const historyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // Máximo 60 consultas de historial por minuto
  message: {
    status: 'error',
    message: 'Demasiadas consultas de historial. Intenta de nuevo en un minuto.',
    retryAfter: '1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Rate limiter para login - muy estricto
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos de login por IP en 15 minutos
  message: {
    status: 'error',
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
  skipFailedRequests: false, // Sí contar requests fallidos
  keyGenerator: (req) => {
    // Para login, usar IP + user agent para mejor seguridad
    return `${req.ip}-${req.get('user-agent')}`;
  },
  handler: (req, res) => {
    console.log(`Rate limit excedido para login - IP: ${req.ip}, User-Agent: ${req.get('user-agent')}`);
    res.status(429).json({
      status: 'error',
      message: 'Demasiados intentos de inicio de sesión fallidos. Por seguridad, espera 15 minutos antes de intentar nuevamente.',
      retryAfter: 900, // 15 minutos en segundos
      limit: 5,
      window: '15 minutos'
    });
  }
});

// Rate limiter para cambio de contraseña - estricto
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 cambios de contraseña por hora
  message: {
    status: 'error',
    message: 'Demasiados cambios de contraseña. Intenta de nuevo en una hora.',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Rate limiter para creación de usuarios - muy estricto
const createUserLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // Máximo 10 usuarios creados por hora
  message: {
    status: 'error',
    message: 'Demasiados usuarios creados. Intenta de nuevo en una hora.',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Rate limiter general para APIs - permisivo
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // Máximo 500 requests por 15 minutos
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes desde esta conexión. Intenta de nuevo más tarde.',
    retryAfter: 'Unos minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Rate limiter para desarrollo - muy permisivo
const developmentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 1000, // Máximo 1000 requests por minuto
  message: {
    status: 'error',
    message: 'Rate limit en desarrollo (muy permisivo)',
    retryAfter: '1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development' // Saltar en desarrollo
});

// Función helper para crear limiters dinámicos
const createDynamicLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message,
      retryAfter: `${Math.ceil(windowMs / 60000)} minutos`
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    }
  });
};

// Función para obtener información de rate limiting
const getRateLimitInfo = (req) => {
  return {
    limit: req.rateLimit?.limit || 'No disponible',
    remaining: req.rateLimit?.remaining || 'No disponible',
    reset: req.rateLimit?.reset || 'No disponible',
    used: req.rateLimit?.used || 'No disponible'
  };
};

module.exports = {
  transferLimiter,
  userSearchLimiter,
  historyLimiter,
  loginLimiter,
  passwordChangeLimiter,
  createUserLimiter,
  generalApiLimiter,
  developmentLimiter,
  createDynamicLimiter,
  getRateLimitInfo
};