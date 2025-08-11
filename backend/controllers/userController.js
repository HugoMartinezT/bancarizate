// controllers/userController.js
const { supabase } = require('../config/supabase');
const { sanitizeString } = require('../utils/helpers');

// Obtener perfil del usuario actual
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let profile = {
      id: req.user.id,
      run: req.user.run,
      firstName: req.user.first_name,
      lastName: req.user.last_name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      balance: parseFloat(req.user.balance),
      overdraftLimit: parseFloat(req.user.overdraft_limit),
      isActive: req.user.is_active
    };

    // Obtener información adicional según el rol
    if (userRole === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (studentData) {
        profile.student = {
          birthDate: studentData.birth_date,
          institution: studentData.institution,
          course: studentData.course,
          gender: studentData.gender,
          status: studentData.status
        };
      }
    } else if (userRole === 'teacher') {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (teacherData) {
        profile.teacher = {
          birthDate: teacherData.birth_date,
          institution: teacherData.institution,
          courses: teacherData.courses,
          gender: teacherData.gender,
          status: teacherData.status
        };
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile
      }
    });

  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener perfil'
    });
  }
};

// Actualizar perfil del usuario actual
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Solo permitir actualización de ciertos campos
    const allowedFields = ['phone', 'email'];
    const userUpdates = {};

    for (const field of allowedFields) {
      if (updates[field]) {
        if (field === 'email') {
          // Verificar que el nuevo email no esté en uso
          const { data: existingEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', updates[field])
            .neq('id', userId)
            .single();

          if (existingEmail) {
            return res.status(400).json({
              status: 'error',
              message: 'El email ya está en uso'
            });
          }
        }

        userUpdates[field] = sanitizeString(updates[field]);
      }
    }

    if (Object.keys(userUpdates).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No hay campos válidos para actualizar'
      });
    }

    userUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('users')
      .update(userUpdates)
      .eq('id', userId);

    if (error) {
      throw error;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action: 'update_profile',
        metadata: { fieldsUpdated: Object.keys(userUpdates) },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar perfil'
    });
  }
};

// Obtener todos los usuarios (admin)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,run.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role !== 'all') {
      query = query.eq('role', role);
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      throw error;
    }

    // Formatear respuesta (sin incluir password_hash)
    const formattedUsers = users.map(user => {
      const { password_hash, ...userData } = user;
      return {
        ...userData,
        balance: parseFloat(userData.balance),
        overdraftLimit: parseFloat(userData.overdraft_limit)
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener usuarios'
    });
  }
};

// Obtener usuario por ID (admin)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado'
      });
    }

    // No incluir password_hash
    const { password_hash, ...userData } = user;

    // Obtener información adicional según el rol
    let additionalData = {};

    if (user.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', id)
        .single();

      if (studentData) {
        additionalData.student = studentData;
      }
    } else if (user.role === 'teacher') {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', id)
        .single();

      if (teacherData) {
        additionalData.teacher = teacherData;
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          ...userData,
          balance: parseFloat(userData.balance),
          overdraftLimit: parseFloat(userData.overdraft_limit),
          ...additionalData
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener usuario'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById
};