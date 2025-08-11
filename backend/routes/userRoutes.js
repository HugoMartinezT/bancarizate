// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, authorize } = require('../middleware/auth');
const { 
  validateUpdateProfile, 
  validateIdParam, 
  validatePagination, 
  validateSearch 
} = require('../middleware/validation');

// Todas las rutas requieren autenticación
router.use(auth);

// Rutas de perfil de usuario
router.get('/profile', userController.getProfile);
router.put('/profile', validateUpdateProfile, userController.updateProfile);

// Rutas administrativas
router.get(
  '/', 
  authorize('admin'), 
  validatePagination, 
  validateSearch, 
  userController.getAllUsers
);

router.get(
  '/:id', 
  authorize('admin'), 
  validateIdParam, 
  userController.getUserById
);

module.exports = router;