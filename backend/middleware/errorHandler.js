// middleware/errorHandler.js - MANEJO MEJORADO DE ERRORES JSON

const logger = require('../utils/logger');

// Middleware para manejar errores de parsing JSON
const jsonErrorHandler = (error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('❌ Error de JSON parsing:', {
      error: error.message,
      body: req.body,
      rawBody: req.rawBody,
      headers: req.headers,
      url: req.url
    });

    return res.status(400).json({
      status: 'error',
      message: 'JSON inválido enviado al servidor',
      details: 'Verifica que los datos estén en formato JSON correcto',
      received: error.message
    });
  }

  next(error);
};

// Middleware principal de manejo de errores
const errorHandler = (err, req, res, next) => {
  // Log del error completo
  logger.error('Error no manejado:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Respuesta según el tipo de error
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Errores específicos
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Datos de entrada inválidos';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token de autenticación inválido';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = 'Error al procesar archivo';
  }

  // Respuesta
  const errorResponse = {
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : message,
    ...(process.env.NODE_ENV !== 'production' && {
      details: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    })
  };

  res.status(statusCode).json(errorResponse);
};

// Middleware para capturar raw body (útil para debug)
const captureRawBody = (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      req.rawBody = data;
      next();
    });
  } else {
    next();
  }
};

module.exports = {
  errorHandler,
  jsonErrorHandler,
  captureRawBody
};