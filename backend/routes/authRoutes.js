// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

// Importamos las validaciones. Ahora nos aseguramos de que no sean undefined.
const { validateLogin, validatePasswordChange } = require('../middleware/validation');

// ========= Verificación de Middlewares (Defensivo) =========
// Este bloque previene el crash si un middleware no se carga correctamente.
if (!validateLogin || !validatePasswordChange) {
    throw new Error('Uno de los middlewares de validación no se pudo cargar. Revisa middleware/validation.js');
}
// =============================================================

// --- Rutas Públicas ---
// URL: POST /api/auth/login
// Aplica rate limiting, luego valida los datos y finalmente ejecuta el login.
router.post('/login', loginLimiter, validateLogin, authController.login);


// --- Rutas Protegidas (Requieren Token JWT) ---

// URL: POST /api/auth/logout
// Requiere un token válido para cerrar la sesión.
router.post('/logout', auth, authController.logout);

// URL: GET /api/auth/verify
// Verifica si el token del usuario sigue siendo válido y devuelve sus datos.
router.get('/verify', auth, authController.verifyToken);

// URL: POST /api/auth/change-password
// Permite al usuario cambiar su contraseña. Requiere token y valida los datos.
router.post('/change-password', auth, validatePasswordChange, authController.changePassword);

module.exports = router;
