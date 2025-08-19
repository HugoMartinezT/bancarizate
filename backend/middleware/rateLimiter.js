// middleware/rateLimiter.js - Rate limiters dinámicos para BANCARIZATE
const rateLimit = require('express-rate-limit');
const { supabase } = require('../config/supabase');

// ==========================================
// CONFIGURACIÓN Y CACHE
// ==========================================

// Cache para configuraciones
let rateLimitCache = {};
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

// ==========================================
// FUNCIONES DE CONFIGURACIÓN DINÁMICA
// ==========================================

// Función para cargar configuraciones desde la base de datos
const loadRateLimitConfig = async () => {
  try {
    console.log('📥 Cargando configuraciones de rate limiting desde BD...');
    
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
    }

    // Merge con defaults para asegurar que todas las claves existan
    const finalConfig = { ...defaultConfigs, ...configMap };
    
    console.log(`✅ Rate limit config cargada: ${Object.keys(finalConfig).length} configuraciones`);
    console.log('📊 Configuraciones:', finalConfig);

    return finalConfig;

  } catch (error) {
    console.error('❌ Error cargando rate limit config:', error);
    console.log('⚠️ Fallback a configuraciones por defecto');
    return { ...defaultConfigs };
  }
};

// Función para obtener configuración con cache
const getConfig = async (key) => {
  const now = Date.now();
  
  // Si el cache está expirado o vacío, recargar
  if (!lastLoaded || (now - lastLoaded) > CACHE_DURATION || Object.keys(rateLimitCache).length === 0) {
    console.log('🔄 Cache expirado, recargando configuraciones...');
    rateLimitCache = await loadRateLimitConfig();
    lastLoaded = now;
  }
  
  const value = rateLimitCache[key] || defaultConfigs[key];
  console.log(`📖 getConfig(${key}) = ${value}`);
  return value;
};

// ✅ FUNCIÓN PRINCIPAL: refreshRateLimiters
const refreshRateLimiters = async () => {
  try {
    console.log('🔄 Iniciando refresh de rate limiters...');
    
    // Forzar recarga de configuración
    rateLimitCache = await loadRateLimitConfig();
    lastLoaded = Date.now();
    
    console.log('✅ Rate limiters refrescados exitosamente');

    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      configuration: {
        ...rateLimitCache,
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
    if (!lastLoaded || (now - lastLoaded) > CACHE_DURATION || Object.keys(rateLimitCache).length === 0) {
      console.log('🔄 Cargando configuración actual...');
      rateLimitCache = await loadRateLimitConfig();
      lastLoaded = now;
    }

    return {
      ...rateLimitCache,
      lastLoaded: lastLoaded ? new Date(lastLoaded).toISOString() : null,
      source: 'database',
      cacheAge: lastLoaded ? Math.floor((now - lastLoaded) / 1000) : null
    };

  } catch (error) {
    console.error('❌ Error obteniendo configuración actual:', error);
    
    return {
      ...defaultConfigs,
      lastLoaded: null,
      source: 'fallback',
      error: error.message
    };
  }
};

// ==========================================
// RATE LIMITERS DINÁMICOS
// ==========================================

// Función helper para crear limiters dinámicos
const createDynamicLimiter = (keyPrefix) => {
  return rateLimit({
    windowMs: async (req) => {
      try {
        return await getConfig(`${keyPrefix}_limit_window_ms`);
      } catch (error) {
        console.error(`Error obteniendo windowMs para ${keyPrefix}:`, error);
        return defaultConfigs[`${keyPrefix}_limit_window_ms`] || 900000; // 15 min default
      }
    },
    max: async (req) => {
      try {
        return await getConfig(`${keyPrefix}_limit_max`);
      } catch (error) {
        console.error(`Error obteniendo max para ${keyPrefix}:`, error);
        return defaultConfigs[`${keyPrefix}_limit_max`] || 100; // 100 default
      }
    },
    message: {
      status: 'error',
      message: `Demasiadas solicitudes. Límite de ${keyPrefix} excedido.`
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return req.user?.id || req.ip;
    },
    handler: (req, res) => {
      console.log(`⚠️ Rate limit excedido para ${keyPrefix} - Usuario: ${req.user?.id || 'Anónimo'}, IP: ${req.ip}`);
      
      res.status(429).json({
        status: 'error',
        message: `Demasiadas solicitudes. Límite de ${keyPrefix} excedido.`,
        retryAfter: Math.ceil(res.getHeader('Retry-After') || 60),
        limitType: keyPrefix
      });
    }
  });
};

// ==========================================
// LIMITERS ESPECÍFICOS
// ==========================================

// Login limiter - muy estricto
const loginLimiter = rateLimit({
  windowMs: async () => await getConfig('login_limit_window_ms'),
  max: async () => await getConfig('login_limit_max'),
  message: {
    status: 'error',
    message: 'Demasiados intentos de login. Intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => `${req.ip}-${req.get('user-agent')}`,
  handler: (req, res) => {
    console.log(`🚨 Rate limit login excedido - IP: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Demasiados intentos de inicio de sesión. Por seguridad, espera antes de intentar nuevamente.',
      retryAfter: 900,
      limit: 5,
      window: '15 minutos'
    });
  }
});

// Transfer limiter - estricto  
const transferLimiter = createDynamicLimiter('transfer');

// User search limiter - permisivo
const userSearchLimiter = createDynamicLimiter('user_search');

// History limiter - permisivo
const historyLimiter = createDynamicLimiter('history');

// Password change limiter - estricto
const passwordChangeLimiter = createDynamicLimiter('password_change');

// Create user limiter - estricto
const createUserLimiter = createDynamicLimiter('create_user');

// General API limiter - permisivo (ALIAS para compatibilidad)
const generalApiLimiter = createDynamicLimiter('general');
const generalLimiter = generalApiLimiter; // Alias

// ==========================================
// FUNCIONES UTILITY
// ==========================================

// Función para obtener información de rate limiting
const getRateLimitInfo = (req) => {
  return {
    limit: req.rateLimit?.limit || 'No disponible',
    remaining: req.rateLimit?.remaining || 'No disponible', 
    reset: req.rateLimit?.reset || 'No disponible',
    used: req.rateLimit?.used || 'No disponible'
  };
};

// ==========================================
// INICIALIZACIÓN
// ==========================================

// Inicialización al arrancar el servidor
const initializeRateLimiters = async () => {
  try {
    console.log('🚀 Inicializando sistema de rate limiters dinámicos...');
    rateLimitCache = await loadRateLimitConfig();
    lastLoaded = Date.now();
    console.log('✅ Rate limiters inicializados correctamente');
  } catch (error) {
    console.error('❌ Error inicializando rate limiters:', error);
    console.log('⚠️ Usando configuraciones por defecto');
    rateLimitCache = { ...defaultConfigs };
    lastLoaded = Date.now();
  }
};

// Auto-inicialización
initializeRateLimiters();

// Auto-refresh cada 5 minutos
setInterval(async () => {
  try {
    console.log('🔄 Auto-refresh de rate limiters...');
    await refreshRateLimiters();
  } catch (error) {
    console.error('❌ Error en auto-refresh:', error);
  }
}, CACHE_DURATION);

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  // ✅ Limiters principales
  loginLimiter,
  transferLimiter,
  userSearchLimiter,
  historyLimiter,
  passwordChangeLimiter,
  createUserLimiter,
  generalApiLimiter,  // ✅ AÑADIDO para adminRoutes.js
  generalLimiter,
  
  // ✅ Funciones de gestión (CRÍTICAS para adminRoutes.js)
  refreshRateLimiters,  // ✅ AÑADIDO
  getCurrentConfig,     // ✅ AÑADIDO
  getConfig,
  loadRateLimitConfig,
  
  // Utilidades
  createDynamicLimiter,
  getRateLimitInfo,
  defaultConfigs,
  
  // Para debugging
  rateLimitCache: () => rateLimitCache,
  lastLoaded: () => lastLoaded
};