// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

// Generar JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Login
const login = async (req, res) => {
  try {
    const { run, password } = req.body;

    // Buscar usuario por RUN
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('run', run)
      .single();

    if (error || !user) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si la cuenta está bloqueada
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(403).json({
        status: 'error',
        message: `Cuenta bloqueada. Intente nuevamente en ${minutesLeft} minutos`
      });
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Incrementar intentos fallidos
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      let updateData = { failed_login_attempts: failedAttempts };

      // Bloquear cuenta si supera el límite
      if (failedAttempts >= process.env.MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + parseInt(process.env.LOCK_TIME));
        updateData.locked_until = lockUntil.toISOString();
      }

      await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      return res.status(401).json({
        status: 'error',
        message: 'Credenciales inválidas'
      });
    }

    // Login exitoso - resetear intentos fallidos
    await supabase
      .from('users')
      .update({ 
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', user.id);

    // Generar token
    const token = generateToken(user.id);

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'login',
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    // Obtener datos adicionales según el rol
    let additionalData = {};
    
    if (user.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (studentData) {
        additionalData = { student: studentData };
      }
    } else if (user.role === 'teacher') {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (teacherData) {
        additionalData = { teacher: teacherData };
      }
    }

    // Preparar respuesta
    const userData = {
      id: user.id,
      run: user.run,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      balance: parseFloat(user.balance),
      overdraftLimit: parseFloat(user.overdraft_limit),
      role: user.role,
      ...additionalData
    };

    res.status(200).json({
      status: 'success',
      message: 'Inicio de sesión exitoso',
      data: {
        user: userData,
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al iniciar sesión'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'logout',
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al cerrar sesión'
    });
  }
};

// Verificar token
const verifyToken = async (req, res) => {
  try {
    // El middleware auth ya verificó el token
    const user = req.user;

    // Obtener datos adicionales según el rol
    let additionalData = {};

    if (user.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (studentData) {
        additionalData = {
          phone: studentData.phone,
          birthDate: studentData.birth_date,
          institution: studentData.institution,
          course: studentData.course,
          gender: studentData.gender,
          status: studentData.status,
          isActive: studentData.is_active
        };
      }
    } else if (user.role === 'teacher') {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (teacherData) {
        additionalData = {
          phone: teacherData.phone,
          birthDate: teacherData.birth_date,
          institution: teacherData.institution,
          courses: teacherData.courses,
          gender: teacherData.gender,
          status: teacherData.status,
          isActive: teacherData.is_active
        };
      }
    }

    const userData = {
      id: user.id,
      run: user.run,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      balance: parseFloat(user.balance),
      overdraftLimit: parseFloat(user.overdraft_limit),
      role: user.role,
      ...additionalData
    };

    res.status(200).json({
      status: 'success',
      data: {
        user: userData,
        token: req.token
      }
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al verificar token'
    });
  }
};

// Cambiar contraseña
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Verificar contraseña actual
    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Contraseña actual incorrecta'
      });
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS));

    // Actualizar contraseña
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action: 'change_password',
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al cambiar contraseña'
    });
  }
};

module.exports = {
  login,
  logout,
  verifyToken,
  changePassword
};