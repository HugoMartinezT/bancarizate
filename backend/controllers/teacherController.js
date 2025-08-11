// controllers/teacherController.js
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Obtener todos los docentes
const getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('teachers')
      .select(`
        *,
        users!inner(
          id,
          run,
          first_name,
          last_name,
          email,
          phone,
          is_active
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`users.first_name.ilike.%${search}%,users.last_name.ilike.%${search}%,users.run.ilike.%${search}%,users.email.ilike.%${search}%`);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: teachers, error, count } = await query;

    if (error) {
      throw error;
    }

    // Formatear respuesta
    const formattedTeachers = teachers.map(teacher => ({
      id: teacher.id,
      userId: teacher.users.id,
      run: teacher.users.run,
      firstName: teacher.users.first_name,
      lastName: teacher.users.last_name,
      email: teacher.users.email,
      phone: teacher.users.phone,
      birthDate: teacher.birth_date,
      institution: teacher.institution,
      courses: teacher.courses || [],
      gender: teacher.gender,
      status: teacher.status,
      isActive: teacher.users.is_active,
      createdAt: teacher.created_at
    }));

    res.status(200).json({
      status: 'success',
      data: {
        teachers: formattedTeachers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo docentes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener docentes'
    });
  }
};

// Obtener docente por ID
const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: teacher, error } = await supabase
      .from('teachers')
      .select(`
        *,
        users!inner(
          id,
          run,
          first_name,
          last_name,
          email,
          phone,
          balance,
          overdraft_limit,
          is_active
        )
      `)
      .eq('id', id)
      .single();

    if (error || !teacher) {
      return res.status(404).json({
        status: 'error',
        message: 'Docente no encontrado'
      });
    }

    const formattedTeacher = {
      id: teacher.id,
      userId: teacher.users.id,
      run: teacher.users.run,
      firstName: teacher.users.first_name,
      lastName: teacher.users.last_name,
      email: teacher.users.email,
      phone: teacher.users.phone,
      balance: parseFloat(teacher.users.balance),
      overdraftLimit: parseFloat(teacher.users.overdraft_limit),
      birthDate: teacher.birth_date,
      institution: teacher.institution,
      courses: teacher.courses || [],
      gender: teacher.gender,
      status: teacher.status,
      isActive: teacher.users.is_active,
      createdAt: teacher.created_at
    };

    res.status(200).json({
      status: 'success',
      data: {
        teacher: formattedTeacher
      }
    });

  } catch (error) {
    console.error('Error obteniendo docente:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener docente'
    });
  }
};

// Crear docente
const createTeacher = async (req, res) => {
  try {
    const {
      run,
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      institution,
      courses,
      gender,
      status = 'active'
    } = req.body;

    // Verificar si el RUN ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('run', run)
      .single();

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya existe un usuario con este RUN'
      });
    }

    // Verificar si el email ya existe
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Ya existe un usuario con este email'
      });
    }

    // Validar cursos
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Debe especificar al menos un curso'
      });
    }

    // Filtrar cursos vacíos
    const validCourses = courses.filter(course => course && course.trim() !== '');
    if (validCourses.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Debe especificar al menos un curso válido'
      });
    }

    // Generar contraseña temporal (últimos 4 dígitos del RUN)
    const runDigits = run.replace(/[^0-9]/g, '');
    const tempPassword = runDigits.slice(-4);
    const passwordHash = await bcrypt.hash(tempPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Crear usuario
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        run,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        role: 'teacher',
        balance: 0,
        overdraft_limit: 0,
        is_active: true
      })
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    // Crear registro de docente
    const { data: newTeacher, error: teacherError } = await supabase
      .from('teachers')
      .insert({
        user_id: newUser.id,
        birth_date: birthDate,
        institution,
        courses: validCourses, // Array de cursos
        gender,
        status
      })
      .select()
      .single();

    if (teacherError) {
      // Revertir creación de usuario
      await supabase.from('users').delete().eq('id', newUser.id);
      throw teacherError;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'create_teacher',
        entity_type: 'teacher',
        entity_id: newTeacher.id,
        metadata: { 
          teacherName: `${firstName} ${lastName}`, 
          run,
          courses: validCourses
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(201).json({
      status: 'success',
      message: 'Docente creado exitosamente',
      data: {
        teacher: {
          id: newTeacher.id,
          userId: newUser.id,
          run: newUser.run,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          email: newUser.email,
          tempPassword: tempPassword // Solo para mostrar al admin
        }
      }
    });

  } catch (error) {
    console.error('Error creando docente:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear docente'
    });
  }
};

// Actualizar docente
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Separar actualizaciones de usuario y docente
    const userUpdates = {};
    const teacherUpdates = {};

    if (updates.firstName) userUpdates.first_name = updates.firstName;
    if (updates.lastName) userUpdates.last_name = updates.lastName;
    if (updates.email) userUpdates.email = updates.email;
    if (updates.phone) userUpdates.phone = updates.phone;
    if (updates.isActive !== undefined) userUpdates.is_active = updates.isActive;
    
    // ✅ NUEVO: Actualizar balance y overdraftLimit
    if (updates.balance !== undefined) userUpdates.balance = parseFloat(updates.balance);
    if (updates.overdraftLimit !== undefined) userUpdates.overdraft_limit = parseFloat(updates.overdraftLimit);

    if (updates.birthDate) teacherUpdates.birth_date = updates.birthDate;
    if (updates.institution) teacherUpdates.institution = updates.institution;
    if (updates.courses) teacherUpdates.courses = updates.courses;
    if (updates.gender) teacherUpdates.gender = updates.gender;
    if (updates.status) teacherUpdates.status = updates.status;

    // Obtener el user_id del docente
    const { data: teacher } = await supabase
      .from('teachers')
      .select('user_id, users(run, first_name, last_name)')
      .eq('id', id)
      .single();

    if (!teacher) {
      return res.status(404).json({
        status: 'error',
        message: 'Docente no encontrado'
      });
    }

    // ✅ NUEVO: Verificar email duplicado si se está actualizando
    if (updates.email) {
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', updates.email)
        .neq('id', teacher.user_id)
        .single();

      if (existingEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe un usuario con este email'
        });
      }
    }

    // Actualizar usuario si hay cambios
    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString();
      
      const { error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', teacher.user_id);

      if (userError) {
        throw userError;
      }
    }

    // Actualizar docente si hay cambios
    if (Object.keys(teacherUpdates).length > 0) {
      teacherUpdates.updated_at = new Date().toISOString();
      
      const { error: teacherError } = await supabase
        .from('teachers')
        .update(teacherUpdates)
        .eq('id', id);

      if (teacherError) {
        throw teacherError;
      }
    }

    // ✅ NUEVO: Registrar actividad más detallada
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'update_teacher',
        entity_type: 'teacher',
        entity_id: id,
        metadata: { 
          teacherName: `${teacher.users.first_name} ${teacher.users.last_name}`,
          run: teacher.users.run,
          updatedFields: Object.keys({...userUpdates, ...teacherUpdates})
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Docente actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando docente:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar docente'
    });
  }
};

// ✅ NUEVO: Cambiar contraseña de docente
const changeTeacherPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener información del docente
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('user_id, users(run, first_name, last_name)')
      .eq('id', id)
      .single();

    if (teacherError || !teacher) {
      return res.status(404).json({
        status: 'error',
        message: 'Docente no encontrado'
      });
    }

    // Encriptar nueva contraseña
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña en la base de datos
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', teacher.user_id);

    if (updateError) {
      throw updateError;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'change_teacher_password',
        entity_type: 'teacher',
        entity_id: id,
        metadata: { 
          teacherName: `${teacher.users.first_name} ${teacher.users.last_name}`,
          run: teacher.users.run
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña de docente:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al cambiar contraseña'
    });
  }
};

// Eliminar docente
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información del docente
    const { data: teacher } = await supabase
      .from('teachers')
      .select('user_id, users(first_name, last_name, run)')
      .eq('id', id)
      .single();

    if (!teacher) {
      return res.status(404).json({
        status: 'error',
        message: 'Docente no encontrado'
      });
    }

    // Eliminar usuario (esto eliminará en cascada el registro de docente)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', teacher.user_id);

    if (error) {
      throw error;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'delete_teacher',
        entity_type: 'teacher',
        entity_id: id,
        metadata: { 
          teacherName: `${teacher.users.first_name} ${teacher.users.last_name}`,
          run: teacher.users.run
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Docente eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando docente:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al eliminar docente'
    });
  }
};

// Obtener cursos de un docente
const getTeacherCourses = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('courses, users(first_name, last_name)')
      .eq('id', id)
      .single();

    if (error || !teacher) {
      return res.status(404).json({
        status: 'error',
        message: 'Docente no encontrado'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        teacherName: `${teacher.users.first_name} ${teacher.users.last_name}`,
        courses: teacher.courses || []
      }
    });

  } catch (error) {
    console.error('Error obteniendo cursos del docente:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener cursos del docente'
    });
  }
};

// Actualizar cursos de un docente
const updateTeacherCourses = async (req, res) => {
  try {
    const { id } = req.params;
    const { courses } = req.body;

    if (!courses || !Array.isArray(courses)) {
      return res.status(400).json({
        status: 'error',
        message: 'Los cursos deben ser un array'
      });
    }

    // Filtrar cursos válidos
    const validCourses = courses.filter(course => course && course.trim() !== '');

    const { error } = await supabase
      .from('teachers')
      .update({ 
        courses: validCourses,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'update_teacher_courses',
        entity_type: 'teacher',
        entity_id: id,
        metadata: { courses: validCourses },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Cursos actualizados exitosamente',
      data: {
        courses: validCourses
      }
    });

  } catch (error) {
    console.error('Error actualizando cursos:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar cursos'
    });
  }
};

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  changeTeacherPassword, // ✅ NUEVA FUNCIÓN
  deleteTeacher,
  getTeacherCourses,
  updateTeacherCourses
};