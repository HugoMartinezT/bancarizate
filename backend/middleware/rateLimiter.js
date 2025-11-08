// middleware/rateLimiter.js - Rate limiters SIMPLIFICADOS para BANCARIZATE
const rateLimit = require('express-rate-limit');
const { supabase } = require('../config/supabase');

// ==========================================
// CONFIGURACIÓN Y CACHE
// ==========================================

// Cache para configuraciones
let rateLimitConfig = {};
let lastLoaded = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Configuraciones por defecto (fallback seguro)
const defaultConfigs = {
  login_limit_max: 5,
  login_limit_window_ms: 900000,        // 15 minutos
  transfer_limit_max: 10,
  transfer_limit_window_ms: 300000,     // 5 minutos
  general_limit_max: 100,
  general_limit_window_ms: 900000,      // 15 minutos
  user_search_limit_max: 30,
  user_search_limit_window_ms: 60000,   // 1 minuto
  history_limit_max: 60,
  history_limit_window_ms: 60000,       // 1 minuto
  password_change_limit_max: 3,
  password_change_limit_window_ms: 3600000, // 1 hora
  create_user_limit_max: 10,
  create_user_limit_window_ms: 3600000  // 1 hora
};

// Inicializar con valores por defecto
rateLimitConfig = { ...defaultConfigs };

// ==========================================
// FUNCIONES DE CONFIGURACIÓN
// ==========================================

// Función para cargar configuraciones desde la base de datos
const loadRateLimitConfig = async () => {
  try {
    console.log('🔥 Cargando configuraciones de rate limiting desde BD...');
    
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .like('config_key', '%_limit_%');

    if (error) {
      console.error('❌ Error cargando configuraciones:', error);
      console.log('⚠️ Usando configuraciones por defecto');
      return { ...defaultConfigs };
    }

    // Convertir resultados a objeto
    const configMap = {};
    if (configs && configs.length > 0) {
      configs.forEach(config => {
        const value = parseFloat(config.config_value);
        if (!isNaN(value)) {
          configMap[config.config_key] = value;
        }
      });
    } else {
      console.log('ℹ️ No se encontraron configuraciones personalizadas de rate limiting, usando defaults');
      return { ...defaultConfigs };
    }

    // Mezclar con defaults
    const finalConfig = { ...defaultConfigs, ...configMap };
    
    console.log(`✅ Configuraciones de rate limiting cargadas:`, finalConfig);
    return finalConfig;

  } catch (error) {
    console.error('❌ Error cargando configuración de rate limiting:', error);
    console.log('⚠️ Usando configuraciones por defecto');
    return { ...defaultConfigs };
  }
};

// Función segura para obtener un valor de configuración
const getConfigValue = (key, defaultValue) => {
  if (!rateLimitConfig || typeof rateLimitConfig[key] === 'undefined') {
    return defaultValue;
  }
  
  const value = rateLimitConfig[key];
  if (typeof value !== 'number' || isNaN(value)) {
    return defaultValue;
  }
  
  return value;
};

// Función para refrescar configuraciones (llamada desde admin)
const refreshRateLimiters = async () => {
  try {
    console.log('🔄 Iniciando refresh de rate limiters...');
    
    // Cargar nueva configuración
    const newConfig = await loadRateLimitConfig();
    
    // Actualizar cache global
    rateLimitConfig = newConfig;
    lastLoaded = Date.now();
    
    console.log('✅ Rate limiters refrescados exitosamente');
    console.log('📊 Configuración actual:', rateLimitConfig);

    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      configuration: {
        ...rateLimitConfig,
        lastLoaded: new Date(lastLoaded).toISOString(),
        source: 'database'
      },
      message: 'Rate limiters actualizados desde base de datos'
    };

  } catch (error) {
    console.error('❌ Error refrescando rate limiters:', error);
    throw new Error(`Error refrescando rate limiters: ${error.message}`);
  }
};

// ✅ FUNCIÓN PRINCIPAL: getCurrentConfig
const getCurrentConfig = async () => {
  try {
    const now = Date.now();
    
    // Si no hay cache o está expirado, cargar
    if (!lastLoaded || (now - lastLoaded) > CACHE_DURATION) {
      console.log('🔄 Cache expirado, recargando...');
      rateLimitConfig = await loadRateLimitConfig();
      lastLoaded = now;
    }

    return {
      ...rateLimitConfig,
      lastLoaded: lastLoaded ? new Date(lastLoaded).toISOString() : null,
      source: 'database'
    };
  } catch (error) {
    console.error('❌ Error obteniendo configuración actual:', error);
    
    return {
      ...defaultConfigs,
      lastLoaded: null,
      source: 'default',
      error: error.message
    };
  }
};

// ==========================================
// RATE LIMITERS ESTÁTICOS (Solución Simplificada)
// ==========================================

// Login limiter - MUY estricto
const loginLimiter = rateLimit({
  windowMs: getConfigValue('login_limit_window_ms', 900000),
  max: () => getConfigValue('login_limit_max', 5),
  message: {
    status: 'error',
    message: 'Demasiados intentos de login. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}-${req.get('user-agent')}`,
  handler: (req, res) => {
    console.log(`🚨 Rate limit login excedido - IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Demasiados intentos de inicio de sesión. Por seguridad, espera antes de intentar nuevamente.',
      retryAfter: 900,
      limit: getConfigValue('login_limit_max', 5),
      window: '15 minutos'
    });
  }
});

// Transfer limiter - Estricto (SOLO para POST - crear transferencias)
const transferLimiter = rateLimit({
  windowMs: getConfigValue('transfer_limit_window_ms', 300000),
  max: () => getConfigValue('transfer_limit_max', 10),
  message: {
    status: 'error',
    message: 'Demasiadas transferencias. Intenta en 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    console.log(`⚠️ Rate limit transferencias excedido - Usuario: ${req.user?.id || 'Anónimo'}`);
    res.status(429).json({
      status: 'error',
      message: 'Demasiadas transferencias. Intenta en 5 minutos.',
      retryAfter: Math.ceil(300),
      limitType: 'transfer'
    });
  }
});

// History limiter - PERMISIVO (para consultas de información)
const historyLimiter = rateLimit({
  windowMs: getConfigValue('history_limit_window_ms', 60000),
  max: () => getConfigValue('history_limit_max', 60),
  message: {
    status: 'error',
    message: 'Demasiadas consultas. Intenta en un momento.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    console.log(`ℹ️ Rate limit historial excedido - Usuario: ${req.user?.id || 'Anónimo'}`);
    res.status(429).json({
      status: 'error',
      message: 'Demasiadas consultas a historial. Por favor, espera unos segundos.',
      retryAfter: 60,
      limitType: 'history'
    });
  }
});

// User search limiter - Moderado (para búsquedas de usuarios)
const userSearchLimiter = rateLimit({
  windowMs: getConfigValue('user_search_limit_window_ms', 60000),
  max: () => getConfigValue('user_search_limit_max', 30),
  message: {
    status: 'error',
    message: 'Demasiadas búsquedas. Intenta en un momento.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    console.log(`🔍 Rate limit búsquedas excedido - Usuario: ${req.user?.id || 'Anónimo'}`);
    res.status(429).json({
      status: 'error',
      message: 'Has realizado demasiadas búsquedas en poco tiempo. Espera antes de intentarlo de nuevo.',
      retryAfter: 60,
      limitType: 'user_search'
    });
  }
});

// Password change limiter - Estricto
const passwordChangeLimiter = rateLimit({
  windowMs: getConfigValue('password_change_limit_window_ms', 3600000),
  max: () => getConfigValue('password_change_limit_max', 3),
  message: {
    status: 'error',
    message: 'Demasiados cambios de contraseña. Intenta en una hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    console.log(`🔑 Rate limit cambio de contraseña excedido - Usuario: ${req.user?.id || 'Anónimo'}`);
    res.status(429).json({
      status: 'error',
      message: 'Has intentado cambiar la contraseña demasiadas veces. Por seguridad, espera antes de intentar nuevamente.',
      retryAfter: 3600,
      limitType: 'password_change'
    });
  }
});

// General API limiter - PERMISIVO
const generalApiLimiter = rateLimit({
  windowMs: getConfigValue('general_limit_window_ms', 900000),
  max: () => getConfigValue('general_limit_max', 100),
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Create user limiter - Estricto
const createUserLimiter = rateLimit({
  windowMs: getConfigValue('create_user_limit_window_ms', 3600000),
  max: () => getConfigValue('create_user_limit_max', 10),
  message: {
    status: 'error',
    message: 'Demasiados usuarios creados. Intenta en una hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Alias para uso general
const generalLimiter = generalApiLimiter;

// ==========================================
// INICIALIZACIÓN AUTOMÁTICA
// ==========================================

// Cargar configuración inicial al arrancar
(async () => {
  try {
    console.log('🚀 Inicializando sistema de rate limiters...');
    rateLimitConfig = await loadRateLimitConfig();
    lastLoaded = Date.now();
    console.log('✅ Rate limiters inicializados con configuración:', rateLimitConfig);
  } catch (error) {
    console.error('❌ Error inicializando rate limiters, usando defaults:', error);
    rateLimitConfig = { ...defaultConfigs };
    lastLoaded = Date.now();
  }
})();

// Auto-refresh periódico (opcional)
setInterval(async () => {
  try {
    console.log('🔄 Auto-refresh de rate limiters...');
    await refreshRateLimiters();
  } catch (error) {
    console.error('❌ Error en auto-refresh de rate limiters:', error);
  }
}, CACHE_DURATION);

// ==========================================
// EXPORTS
// ==========================================
module.exports = {
  loginLimiter,
  transferLimiter,
  historyLimiter,
  userSearchLimiter,
  passwordChangeLimiter,
  createUserLimiter,
  generalApiLimiter,
  generalLimiter,
  
  // ✅ Funciones de gestión
  refreshRateLimiters,
  getCurrentConfig,
  loadRateLimitConfig,
  getConfigValue,
  
  // Para debugging
  defaultConfigs,
  getRateLimitConfig: () => rateLimitConfig,
  getLastLoaded: () => lastLoaded
};
