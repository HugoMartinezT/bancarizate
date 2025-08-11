// controllers/studentController.js
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Obtener todos los estudiantes
const getAllStudents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('students')
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

    const { data: students, error, count } = await query;

    if (error) {
      throw error;
    }

    // Formatear respuesta
    const formattedStudents = students.map(student => ({
      id: student.id,
      userId: student.users.id,
      run: student.users.run,
      firstName: student.users.first_name,
      lastName: student.users.last_name,
      email: student.users.email,
      phone: student.users.phone,
      birthDate: student.birth_date,
      institution: student.institution,
      course: student.course,
      gender: student.gender,
      status: student.status,
      isActive: student.users.is_active,
      createdAt: student.created_at
    }));

    res.status(200).json({
      status: 'success',
      data: {
        students: formattedStudents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estudiantes'
    });
  }
};

// Obtener estudiante por ID
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: student, error } = await supabase
      .from('students')
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

    if (error || !student) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
      });
    }

    const formattedStudent = {
      id: student.id,
      userId: student.users.id,
      run: student.users.run,
      firstName: student.users.first_name,
      lastName: student.users.last_name,
      email: student.users.email,
      phone: student.users.phone,
      balance: parseFloat(student.users.balance),
      overdraftLimit: parseFloat(student.users.overdraft_limit),
      birthDate: student.birth_date,
      institution: student.institution,
      course: student.course,
      gender: student.gender,
      status: student.status,
      isActive: student.users.is_active,
      createdAt: student.created_at
    };

    res.status(200).json({
      status: 'success',
      data: {
        student: formattedStudent
      }
    });

  } catch (error) {
    console.error('Error obteniendo estudiante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estudiante'
    });
  }
};

// Crear estudiante
const createStudent = async (req, res) => {
  try {
    const {
      run,
      firstName,
      lastName,
      email,
      phone,
      birthDate,
      institution,
      course,
      gender,
      status = 'active',
      initialBalance = 0,
      overdraftLimit = 0
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

    // Generar contraseña temporal (últimos 4 dígitos del RUN)
    const runDigits = run.replace(/[^0-9]/g, '');
    const tempPassword = runDigits.slice(-4);
    const passwordHash = await bcrypt.hash(tempPassword, parseInt(process.env.BCRYPT_ROUNDS));

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
        role: 'student',
        balance: initialBalance,
        overdraft_limit: overdraftLimit,
        is_active: true
      })
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    // Crear registro de estudiante
    const { data: newStudent, error: studentError } = await supabase
      .from('students')
      .insert({
        user_id: newUser.id,
        birth_date: birthDate,
        institution,
        course,
        gender,
        status
      })
      .select()
      .single();

    if (studentError) {
      // Revertir creación de usuario
      await supabase.from('users').delete().eq('id', newUser.id);
      throw studentError;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'create_student',
        entity_type: 'student',
        entity_id: newStudent.id,
        metadata: { studentName: `${firstName} ${lastName}`, run },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(201).json({
      status: 'success',
      message: 'Estudiante creado exitosamente',
      data: {
        student: {
          id: newStudent.id,
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
    console.error('Error creando estudiante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear estudiante'
    });
  }
};

// Actualizar estudiante
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Separar actualizaciones de usuario y estudiante
    const userUpdates = {};
    const studentUpdates = {};

    if (updates.firstName) userUpdates.first_name = updates.firstName;
    if (updates.lastName) userUpdates.last_name = updates.lastName;
    if (updates.email) userUpdates.email = updates.email;
    if (updates.phone) userUpdates.phone = updates.phone;
    if (updates.isActive !== undefined) userUpdates.is_active = updates.isActive;
    
    // ✅ NUEVO: Actualizar balance y overdraftLimit
    if (updates.balance !== undefined) userUpdates.balance = parseFloat(updates.balance);
    if (updates.overdraftLimit !== undefined) userUpdates.overdraft_limit = parseFloat(updates.overdraftLimit);

    if (updates.birthDate) studentUpdates.birth_date = updates.birthDate;
    if (updates.institution) studentUpdates.institution = updates.institution;
    if (updates.course) studentUpdates.course = updates.course;
    if (updates.gender) studentUpdates.gender = updates.gender;
    if (updates.status) studentUpdates.status = updates.status;

    // Obtener el user_id del estudiante
    const { data: student } = await supabase
      .from('students')
      .select('user_id, users(run, first_name, last_name)')
      .eq('id', id)
      .single();

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
      });
    }

    // ✅ NUEVO: Verificar email duplicado si se está actualizando
    if (updates.email) {
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', updates.email)
        .neq('id', student.user_id)
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
        .eq('id', student.user_id);

      if (userError) {
        throw userError;
      }
    }

    // Actualizar estudiante si hay cambios
    if (Object.keys(studentUpdates).length > 0) {
      studentUpdates.updated_at = new Date().toISOString();
      
      const { error: studentError } = await supabase
        .from('students')
        .update(studentUpdates)
        .eq('id', id);

      if (studentError) {
        throw studentError;
      }
    }

    // ✅ NUEVO: Registrar actividad más detallada
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'update_student',
        entity_type: 'student',
        entity_id: id,
        metadata: { 
          studentName: `${student.users.first_name} ${student.users.last_name}`,
          run: student.users.run,
          updatedFields: Object.keys({...userUpdates, ...studentUpdates})
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Estudiante actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando estudiante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar estudiante'
    });
  }
};

// ✅ NUEVO: Cambiar contraseña de estudiante
const changeStudentPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
      });
    }

    // Obtener información del estudiante
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('user_id, users(run, first_name, last_name)')
      .eq('id', id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
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
      .eq('id', student.user_id);

    if (updateError) {
      throw updateError;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'change_student_password',
        entity_type: 'student',
        entity_id: id,
        metadata: { 
          studentName: `${student.users.first_name} ${student.users.last_name}`,
          run: student.users.run
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error cambiando contraseña de estudiante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al cambiar contraseña'
    });
  }
};

// Eliminar estudiante
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información del estudiante
    const { data: student } = await supabase
      .from('students')
      .select('user_id, users(first_name, last_name, run)')
      .eq('id', id)
      .single();

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
      });
    }

    // Eliminar usuario (esto eliminará en cascada el registro de estudiante)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', student.user_id);

    if (error) {
      throw error;
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'delete_student',
        entity_type: 'student',
        entity_id: id,
        metadata: { 
          studentName: `${student.users.first_name} ${student.users.last_name}`,
          run: student.users.run
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: 'Estudiante eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando estudiante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al eliminar estudiante'
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  changeStudentPassword, // ✅ NUEVA FUNCIÓN
  deleteStudent
};