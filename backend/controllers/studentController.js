// controllers/studentController.js - BANCARIZATE v2.0
// Controlador completo para gestión de estudiantes con funcionalidades de edición optimizada

const { supabase } = require('../config/supabase');
const bcrypt = require('bcryptjs');
const { validateRUN } = require('../utils/rutValidator');
const logger = require('../utils/logger');

// 📊 Obtener todos los estudiantes con paginación y filtros
const getAllStudents = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      institution = '', 
      status = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Construir query base
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
          balance,
          overdraft_limit,
          is_active,
          created_at
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (search) {
      query = query.or(`users.first_name.ilike.%${search}%,users.last_name.ilike.%${search}%,users.run.ilike.%${search}%,users.email.ilike.%${search}%`);
    }

    if (institution) {
      query = query.ilike('institution', `%${institution}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Aplicar ordenamiento
    if (sortBy.includes('users.')) {
      query = query.order(sortBy.replace('users.', ''), { 
        ascending: sortOrder === 'asc',
        foreignTable: 'users'
      });
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // Aplicar paginación
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: students, error, count } = await query;

    if (error) {
      throw new Error('Error obteniendo estudiantes: ' + error.message);
    }

    // Formatear datos
    const formattedStudents = students.map(student => ({
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
    }));

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user?.id,
        action: 'view_students',
        entity_type: 'students',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          page: parseInt(page),
          limit: parseInt(limit),
          search,
          institution,
          status,
          totalResults: count
        }
      });

    res.status(200).json({
      status: 'success',
      data: {
        students: formattedStudents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNext: (parseInt(page) * parseInt(limit)) < count,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error en getAllStudents:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estudiantes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔍 Obtener estudiante por ID
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
          is_active,
          created_at
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
      data: { student: formattedStudent }
    });

  } catch (error) {
    logger.error('Error en getStudentById:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estudiante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ➕ Crear nuevo estudiante
const createStudent = async (req, res) => {
  try {
    const {
      run,
      firstName,
      lastName,
      email,
      phone,
      password,
      birthDate,
      institution,
      course,
      gender,
      balance = 0,
      overdraftLimit = 0
    } = req.body;

    // Validar RUN
    if (!validateRUN(run)) {
      return res.status(400).json({
        status: 'error',
        message: 'RUN inválido'
      });
    }

    // Verificar si el RUN ya existe
    const { data: existingRUN } = await supabase
      .from('users')
      .select('id')
      .eq('run', run)
      .single();

    if (existingRUN) {
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

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

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
        balance: parseFloat(balance),
        overdraft_limit: parseFloat(overdraftLimit),
        is_active: true
      })
      .select()
      .single();

    if (userError) {
      throw new Error('Error creando usuario: ' + userError.message);
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
        status: 'active'
      })
      .select()
      .single();

    if (studentError) {
      // Si falla, eliminar el usuario creado
      await supabase.from('users').delete().eq('id', newUser.id);
      throw new Error('Error creando estudiante: ' + studentError.message);
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user?.id,
        action: 'create_student',
        entity_type: 'students',
        entity_id: newStudent.id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          studentName: `${firstName} ${lastName}`,
          run,
          email,
          institution,
          course
        }
      });

    logger.info(`Estudiante creado: ${firstName} ${lastName} (${run})`, {
      studentId: newStudent.id,
      userId: newUser.id,
      createdBy: req.user?.id
    });

    res.status(201).json({
      status: 'success',
      message: 'Estudiante creado exitosamente',
      data: {
        student: {
          id: newStudent.id,
          userId: newUser.id,
          run,
          firstName,
          lastName,
          email,
          institution,
          course
        }
      }
    });

  } catch (error) {
    logger.error('Error en createStudent:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al crear estudiante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✏️ Actualizar estudiante
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Obtener estudiante actual
    const { data: currentStudent, error: fetchError } = await supabase
      .from('students')
      .select(`
        *,
        users!inner(*)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !currentStudent) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
      });
    }

    // Separar actualizaciones de user y student
    const userUpdates = {};
    const studentUpdates = {};

    const userFields = ['firstName', 'lastName', 'email', 'phone', 'balance', 'overdraftLimit', 'isActive'];
    const studentFields = ['birthDate', 'institution', 'course', 'gender', 'status'];

    // Validaciones
    if (updates.email && updates.email !== currentStudent.users.email) {
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', updates.email)
        .neq('id', currentStudent.users.id)
        .single();

      if (existingEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Ya existe un usuario con este email'
        });
      }
    }

    // Mapear campos de usuario
    Object.keys(updates).forEach(key => {
      if (userFields.includes(key)) {
        switch (key) {
          case 'firstName':
            userUpdates.first_name = updates[key];
            break;
          case 'lastName':
            userUpdates.last_name = updates[key];
            break;
          case 'overdraftLimit':
            userUpdates.overdraft_limit = parseFloat(updates[key]);
            break;
          case 'isActive':
            userUpdates.is_active = updates[key];
            break;
          case 'balance':
            userUpdates.balance = parseFloat(updates[key]);
            break;
          default:
            userUpdates[key] = updates[key];
        }
      }
    });

    // Mapear campos de estudiante
    Object.keys(updates).forEach(key => {
      if (studentFields.includes(key)) {
        switch (key) {
          case 'birthDate':
            studentUpdates.birth_date = updates[key];
            break;
          default:
            studentUpdates[key] = updates[key];
        }
      }
    });

    // Actualizar usuario si hay cambios
    if (Object.keys(userUpdates).length > 0) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', currentStudent.users.id);

      if (userUpdateError) {
        throw new Error('Error actualizando usuario: ' + userUpdateError.message);
      }
    }

    // Actualizar estudiante si hay cambios
    if (Object.keys(studentUpdates).length > 0) {
      const { error: studentUpdateError } = await supabase
        .from('students')
        .update(studentUpdates)
        .eq('id', id);

      if (studentUpdateError) {
        throw new Error('Error actualizando estudiante: ' + studentUpdateError.message);
      }
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user?.id,
        action: 'update_student',
        entity_type: 'students',
        entity_id: id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          studentName: `${currentStudent.users.first_name} ${currentStudent.users.last_name}`,
          run: currentStudent.users.run,
          updatedFields: Object.keys(updates),
          oldValues: {},
          newValues: updates
        }
      });

    logger.info(`Estudiante actualizado: ${id}`, {
      updatedBy: req.user?.id,
      updates: Object.keys(updates)
    });

    res.status(200).json({
      status: 'success',
      message: 'Estudiante actualizado exitosamente'
    });

  } catch (error) {
    logger.error('Error en updateStudent:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al actualizar estudiante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔒 Cambiar contraseña de estudiante
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

    // Verificar que el estudiante existe
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select(`
        id,
        users!inner(id, first_name, last_name, run)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !student) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
      });
    }

    // Hash de la nueva contraseña
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        failed_login_attempts: 0,
        locked_until: null
      })
      .eq('id', student.users.id);

    if (updateError) {
      throw new Error('Error actualizando contraseña: ' + updateError.message);
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user?.id,
        action: 'change_student_password',
        entity_type: 'students',
        entity_id: id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          studentName: `${student.users.first_name} ${student.users.last_name}`,
          run: student.users.run,
          changedBy: req.user?.run || req.user?.email
        }
      });

    logger.info(`Contraseña cambiada para estudiante: ${student.users.run}`, {
      studentId: id,
      changedBy: req.user?.id
    });

    res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    logger.error('Error en changeStudentPassword:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al cambiar contraseña',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🗑️ Eliminar estudiante
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el estudiante existe
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select(`
        id,
        users!inner(id, first_name, last_name, run)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !student) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
      });
    }

    // Verificar si tiene transferencias pendientes
    const { data: pendingTransfers } = await supabase
      .from('transfers')
      .select('id')
      .or(`from_user_id.eq.${student.users.id},to_user_id.eq.${student.users.id}`)
      .eq('status', 'pending');

    if (pendingTransfers && pendingTransfers.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No se puede eliminar el estudiante porque tiene transferencias pendientes'
      });
    }

    // Eliminar estudiante (CASCADE eliminará el usuario)
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error('Error eliminando estudiante: ' + deleteError.message);
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user?.id,
        action: 'delete_student',
        entity_type: 'students',
        entity_id: id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          studentName: `${student.users.first_name} ${student.users.last_name}`,
          run: student.users.run,
          deletedBy: req.user?.run || req.user?.email
        }
      });

    logger.info(`Estudiante eliminado: ${student.users.run}`, {
      studentId: id,
      deletedBy: req.user?.id
    });

    res.status(200).json({
      status: 'success',
      message: 'Estudiante eliminado exitosamente'
    });

  } catch (error) {
    logger.error('Error en deleteStudent:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al eliminar estudiante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🚀 NUEVO: Obtener datos optimizados para edición de estudiante
const getStudentEditDataOptimized = async (req, res) => {
  try {
    const { id } = req.params;
    const startTime = Date.now();
    
    console.log('⚡ [OPTIMIZED] Iniciando carga optimizada para estudiante:', id);

    // 🔥 EJECUTAR TODAS LAS QUERIES EN PARALELO
    const [
      studentResult,
      institutionsResult,
      coursesResult
    ] = await Promise.all([
      // Query 1: Datos del estudiante
      supabase
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
        .single(),

      // Query 2: Todas las instituciones activas
      supabase
        .from('institutions')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name', { ascending: true }),

      // Query 3: Todos los cursos activos (para cache completo)
      supabase
        .from('courses')
        .select('id, name, level, institution_id')
        .eq('is_active', true)
        .order('name', { ascending: true })
    ]);

    // Validar estudiante
    if (studentResult.error || !studentResult.data) {
      return res.status(404).json({
        status: 'error',
        message: 'Estudiante no encontrado'
      });
    }

    // Validar instituciones
    if (institutionsResult.error) {
      throw new Error('Error cargando instituciones: ' + institutionsResult.error.message);
    }

    // Validar cursos (no es crítico si falla)
    if (coursesResult.error) {
      console.warn('⚠️ Advertencia cargando cursos:', coursesResult.error.message);
    }

    const student = studentResult.data;
    const institutions = institutionsResult.data || [];
    const allCourses = coursesResult.data || [];

    // 🎯 FORMATEAR DATOS DEL ESTUDIANTE
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

    // 🎯 FORMATEAR INSTITUCIONES PARA SELECT
    const institutionOptions = institutions.map(inst => ({
      value: inst.id,
      label: inst.name,
      type: inst.type
    }));

    // 🎯 BUSCAR INSTITUCIÓN ACTUAL DEL ESTUDIANTE
    let currentInstitutionId = null;
    let institutionMatch = false;
    
    const matchedInstitution = institutions.find(inst => 
      inst.name.toLowerCase().trim() === student.institution.toLowerCase().trim()
    );
    
    if (matchedInstitution) {
      currentInstitutionId = matchedInstitution.id;
      institutionMatch = true;
      console.log('✅ Institución encontrada:', matchedInstitution.name);
    } else {
      console.log('⚠️ Institución no encontrada:', student.institution);
      // Agregar institución actual como opción custom
      const customInstitutionId = `custom_${Date.now()}`;
      institutionOptions.unshift({
        value: customInstitutionId,
        label: student.institution,
        type: 'custom'
      });
      currentInstitutionId = customInstitutionId;
    }

    // 🎯 AGRUPAR CURSOS POR INSTITUCIÓN
    const coursesByInstitution = {};
    institutions.forEach(inst => {
      coursesByInstitution[inst.id] = allCourses
        .filter(course => course.institution_id === inst.id)
        .map(course => ({
          value: course.id,
          label: course.name,
          level: course.level
        }));
    });

    // 🎯 BUSCAR CURSO ACTUAL DEL ESTUDIANTE
    let currentCourseId = null;
    let courseMatch = false;

    if (currentInstitutionId && !currentInstitutionId.startsWith('custom_')) {
      const institutionCourses = coursesByInstitution[currentInstitutionId] || [];
      const matchedCourse = institutionCourses.find(course =>
        course.label.toLowerCase().trim() === student.course.toLowerCase().trim()
      );

      if (matchedCourse) {
        currentCourseId = matchedCourse.value;
        courseMatch = true;
        console.log('✅ Curso encontrado:', matchedCourse.label);
      } else {
        console.log('⚠️ Curso no encontrado:', student.course);
        // Agregar curso actual como opción custom
        const customCourseId = `custom_${Date.now()}`;
        if (!coursesByInstitution[currentInstitutionId]) {
          coursesByInstitution[currentInstitutionId] = [];
        }
        coursesByInstitution[currentInstitutionId].unshift({
          value: customCourseId,
          label: student.course,
          level: 'custom'
        });
        currentCourseId = customCourseId;
      }
    }

    // 🎯 AGREGAR INSTITUCION_ID AL ESTUDIANTE FORMATEADO
    formattedStudent.institutionId = currentInstitutionId;
    formattedStudent.courseId = currentCourseId;

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    console.log(`🎉 [OPTIMIZED] Carga completada en ${loadTime}ms`);
    console.log(`📊 Instituciones: ${institutions.length}, Cursos: ${allCourses.length}`);

    // 🚀 RESPUESTA OPTIMIZADA COMPLETA
    res.status(200).json({
      status: 'success',
      data: {
        student: formattedStudent,
        institutions: institutionOptions,
        coursesByInstitution,
        metadata: {
          loadTime,
          totalInstitutions: institutions.length,
          totalCourses: allCourses.length,
          institutionMatch,
          courseMatch,
          currentInstitutionId,
          currentCourseId,
          timestamp: new Date().toISOString()
        }
      },
      loadTime // Para el frontend
    });

  } catch (error) {
    console.error('💥 [OPTIMIZED] Error en carga optimizada:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al cargar datos del estudiante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ EXPORTAR TODAS LAS FUNCIONES
module.exports = {
  getAllStudents,
  getStudentById,
  getStudentEditDataOptimized, // 🚀 NUEVA FUNCIÓN
  createStudent,
  updateStudent,
  changeStudentPassword,
  deleteStudent
};