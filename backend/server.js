// server-minimal.js - Para diagnosticar el crash
const express = require('express');

const app = express();

// Test básico sin dependencias externas
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: '🎉 BANCARIZATE Backend funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Health check exitoso',
    uptime: Math.floor(process.uptime())
  });
});

// Test de variables de entorno
app.get('/api/test-env', (req, res) => {
  res.json({
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV
  });
});

// Error handler básico
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: err.message
  });
});

// No usar app.listen() en Vercel - Export the app
module.exports = app;