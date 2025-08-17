// controllers/studentController.js - VERSIÓN FINAL CORREGIDA
const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { validateRUT } = require('../utils/rutValidator');

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

    // Validar RUN antes de crear
    if (!validateRUT(run)) {
      return res.status(400).json({
        status: 'error',
        message: 'RUN inválido'
      });
    }

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

    // Crear usuario - Guardar RUN tal como viene (con guión)
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        run, // Se guarda con el formato que viene del frontend
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

// ✅ ACTUALIZAR ESTUDIANTE - COMPLETAMENTE CORREGIDO
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('🚀 updateStudent iniciado para ID:', id);
    console.log('📋 Datos recibidos:', JSON.stringify(updates, null, 2));

    // Separar actualizaciones de usuario y estudiante
    const userUpdates = {};
    const studentUpdates = {};

    // ✅ MANEJAR ACTUALIZACIÓN DE RUN
    if (updates.run) {
      console.log('🆔 Campo run detectado:', updates.run);
      // Validar el nuevo RUN
      if (!validateRUT(updates.run)) {
        console.log('❌ RUN inválido:', updates.run);
        return res.status(400).json({
          status: 'error',
          message: 'RUN inválido'
        });
      }
      userUpdates.run = updates.run;
      console.log('✅ RUN agregado a userUpdates:', updates.run);
    }

    // Mapear campos de usuario
    if (updates.firstName) {
      console.log('✅ firstName:', updates.firstName);
      userUpdates.first_name = updates.firstName;
    }
    if (updates.lastName) {
      console.log('✅ lastName:', updates.lastName);
      userUpdates.last_name = updates.lastName;
    }
    if (updates.email) {
      console.log('✅ email:', updates.email);
      userUpdates.email = updates.email;
    }
    if (updates.phone) {
      console.log('✅ phone:', updates.phone);
      userUpdates.phone = updates.phone;
    }
    if (updates.isActive !== undefined) {
      console.log('✅ isActive:', updates.isActive);
      userUpdates.is_active = updates.isActive;
    }
    
    // Actualizar balance y overdraftLimit
    if (updates.balance !== undefined) {
      console.log('✅ balance:', updates.balance);
      userUpdates.balance = parseFloat(updates.balance);
    }
    if (updates.overdraftLimit !== undefined) {
      console.log('✅ overdraftLimit:', updates.overdraftLimit);
      userUpdates.overdraft_limit = parseFloat(updates.overdraftLimit);
    }

    // ✅ MAPEAR CAMPOS DE ESTUDIANTE CON NOMBRES CORRECTOS
    if (updates.birthDate) {
      console.log('✅ birthDate:', updates.birthDate);
      studentUpdates.birth_date = updates.birthDate;
    }
    if (updates.institution) {
      console.log('✅ institution:', updates.institution);
      studentUpdates.institution = updates.institution;
    }
    if (updates.course) {
      console.log('✅ course:', updates.course);
      studentUpdates.course = updates.course;
    }
    if (updates.gender) {
      console.log('✅ gender:', updates.gender);
      studentUpdates.gender = updates.gender;
    }
    if (updates.status) {
      console.log('✅ status:', updates.status);
      studentUpdates.status = updates.status;
    }

    console.log('📊 userUpdates preparado:', JSON.stringify(userUpdates, null, 2));
    console.log('📊 studentUpdates preparado:', JSON.stringify(studentUpdates, null, 2));

    // Obtener el user_id del estudiante
    const { data: student } = await supabase
      .from('students')
      .select('user_id, users(id, run, first_name, last_name)')
      .eq('id', id)
      .single();

    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
      });
    }

    console.log('📋 Estudiante encontrado:', {
      userId: student.user_id,
      currentRUN: student.users.run,
      currentName: `${student.users.first_name} ${student.users.last_name}`
    });

    // Verificar RUN duplicado si se está actualizando
    if (updates.run && updates.run !== student.users.run) {
      console.log('🔍 Verificando RUN duplicado...');
      const { data: existingRUN } = await supabase
        .from('users')
        .select('id')
        .eq('run', updates.run)
        .neq('id', student.user_id)
        .single();

      if (existingRUN) {
        console.log('❌ RUN duplicado encontrado:', updates.run);
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe un usuario con este RUN'
        });
      }
      console.log('✅ RUN único, no hay duplicados');
    }

    // Verificar email duplicado si se está actualizando
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

    // ✅ ACTUALIZAR USUARIO si hay cambios
    if (Object.keys(userUpdates).length > 0) {
      console.log('🔄 EJECUTANDO ACTUALIZACIÓN DE USUARIO...');
      userUpdates.updated_at = new Date().toISOString();
      
      console.log('📤 Enviando a Supabase userUpdates:', JSON.stringify(userUpdates, null, 2));
      
      const { data: updateResult, error: userError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', student.user_id)
        .select();

      if (userError) {
        console.log('❌ ERROR EN ACTUALIZACIÓN DE USUARIO:', userError);
        throw userError;
      }
      
      console.log('✅ USUARIO ACTUALIZADO EXITOSAMENTE');
      console.log('📋 Resultado:', JSON.stringify(updateResult, null, 2));
    } else {
      console.log('⚠️ NO HAY CAMBIOS EN USUARIO - userUpdates está vacío');
    }

    // ✅ ACTUALIZAR ESTUDIANTE si hay cambios
    if (Object.keys(studentUpdates).length > 0) {
      console.log('🔄 EJECUTANDO ACTUALIZACIÓN DE ESTUDIANTE...');
      studentUpdates.updated_at = new Date().toISOString();
      
      console.log('📤 Enviando a Supabase studentUpdates:', JSON.stringify(studentUpdates, null, 2));
      
      const { data: studentUpdateResult, error: studentError } = await supabase
        .from('students')
        .update(studentUpdates)
        .eq('id', id)
        .select();

      if (studentError) {
        console.log('❌ ERROR EN ACTUALIZACIÓN DE ESTUDIANTE:', studentError);
        throw studentError;
      }
      
      console.log('✅ ESTUDIANTE ACTUALIZADO EXITOSAMENTE');
      console.log('📋 Resultado:', JSON.stringify(studentUpdateResult, null, 2));
    } else {
      console.log('⚠️ NO HAY CAMBIOS EN ESTUDIANTE - studentUpdates está vacío');
    }

    // Registrar actividad
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
          updatedFields: Object.keys({...userUpdates, ...studentUpdates}),
          newRUN: updates.run
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    console.log('🎉 updateStudent COMPLETADO EXITOSAMENTE');

    res.status(200).json({
      status: 'success',
      message: 'Estudiante actualizado exitosamente'
    });

  } catch (error) {
    console.error('💥 ERROR EN updateStudent:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar estudiante'
    });
  }
};

// Cambiar contraseña de estudiante
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
  updateStudent, // ✅ FUNCIÓN COMPLETAMENTE CORREGIDA
  changeStudentPassword,
  deleteStudent
};