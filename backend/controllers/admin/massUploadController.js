// controllers/admin/massUploadController.js
const { supabase } = require('../../config/supabase');
const bcrypt = require('bcryptjs');
const { validateRUT, formatRUT } = require('../../utils/rutValidator');

// Función para validar email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Función para generar contraseña temporal desde RUN
const generateTempPassword = (run) => {
  const runDigits = run.replace(/[^0-9]/g, '');
  return runDigits.slice(-4).padStart(4, '0');
};

// Función para validar fecha de nacimiento y calcular edad
const validateBirthDate = (dateStr, userType = 'student') => {
  if (!dateStr) return { valid: false, error: 'Fecha de nacimiento requerida' };
  
  const birthDate = new Date(dateStr);
  if (isNaN(birthDate.getTime())) return { valid: false, error: 'Fecha de nacimiento inválida' };
  
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  
  if (userType === 'student') {
    if (age < 15 || age > 70) return { valid: false, error: 'Edad debe estar entre 15 y 70 años' };
  } else if (userType === 'teacher') {
    if (age < 22 || age > 70) return { valid: false, error: 'Edad debe estar entre 22 y 70 años' };
  }
  
  return { valid: true, birthDate };
};

// Procesar datos de estudiantes
const processStudentData = (data) => {
  const processedData = [];
  const errors = [];

  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 porque el índice inicia en 0 y la primera fila son headers
    const studentData = {};
    const rowErrors = [];

    // RUN (requerido)
    if (!row.run) {
      rowErrors.push('RUN es requerido');
    } else {
      const formattedRun = formatRUT(row.run);
      if (!validateRUT(formattedRun)) {
        rowErrors.push('RUN inválido');
      } else {
        studentData.run = formattedRun;
      }
    }

    // Nombre (requerido)
    if (!row.firstName || row.firstName.trim().length < 2) {
      rowErrors.push('Nombre es requerido (mín. 2 caracteres)');
    } else {
      studentData.firstName = row.firstName.trim();
    }

    // Apellido (requerido)
    if (!row.lastName || row.lastName.trim().length < 2) {
      rowErrors.push('Apellido es requerido (mín. 2 caracteres)');
    } else {
      studentData.lastName = row.lastName.trim();
    }

    // Email (requerido)
    if (!row.email) {
      rowErrors.push('Email es requerido');
    } else if (!isValidEmail(row.email)) {
      rowErrors.push('Email inválido');
    } else {
      studentData.email = row.email.trim().toLowerCase();
    }

    // Teléfono (opcional)
    if (row.phone) {
      studentData.phone = row.phone.trim();
    }

    // Fecha de nacimiento (requerida)
    const birthDateValidation = validateBirthDate(row.birthDate, 'student');
    if (!birthDateValidation.valid) {
      rowErrors.push(birthDateValidation.error);
    } else {
      studentData.birthDate = birthDateValidation.birthDate.toISOString().split('T')[0];
    }

    // Institución (requerida)
    if (!row.institution || row.institution.trim().length < 2) {
      rowErrors.push('Institución es requerida');
    } else {
      studentData.institution = row.institution.trim();
    }

    // Curso (requerido)
    if (!row.course || row.course.trim().length < 2) {
      rowErrors.push('Curso es requerido');
    } else {
      studentData.course = row.course.trim();
    }

    // Género (requerido)
    const validGenders = ['Masculino', 'Femenino', 'Otro'];
    if (!row.gender || !validGenders.includes(row.gender)) {
      rowErrors.push('Género debe ser: Masculino, Femenino, u Otro');
    } else {
      studentData.gender = row.gender;
    }

    // Status (opcional, default: active)
    const validStatuses = ['active', 'inactive', 'graduated'];
    studentData.status = validStatuses.includes(row.status) ? row.status : 'active';

    // Balance inicial (opcional, default: 0)
    studentData.initialBalance = parseFloat(row.initialBalance) || 0;
    studentData.overdraftLimit = parseFloat(row.overdraftLimit) || 0;

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, errors: rowErrors, data: row });
    } else {
      studentData.tempPassword = generateTempPassword(studentData.run);
      processedData.push({ ...studentData, rowNum });
    }
  });

  return { processedData, errors };
};

// Procesar datos de docentes
const processTeacherData = (data) => {
  const processedData = [];
  const errors = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;
    const teacherData = {};
    const rowErrors = [];

    // RUN (requerido)
    if (!row.run) {
      rowErrors.push('RUN es requerido');
    } else {
      const formattedRun = formatRUT(row.run);
      if (!validateRUT(formattedRun)) {
        rowErrors.push('RUN inválido');
      } else {
        teacherData.run = formattedRun;
      }
    }

    // Nombre (requerido)
    if (!row.firstName || row.firstName.trim().length < 2) {
      rowErrors.push('Nombre es requerido (mín. 2 caracteres)');
    } else {
      teacherData.firstName = row.firstName.trim();
    }

    // Apellido (requerido)
    if (!row.lastName || row.lastName.trim().length < 2) {
      rowErrors.push('Apellido es requerido (mín. 2 caracteres)');
    } else {
      teacherData.lastName = row.lastName.trim();
    }

    // Email (requerido)
    if (!row.email) {
      rowErrors.push('Email es requerido');
    } else if (!isValidEmail(row.email)) {
      rowErrors.push('Email inválido');
    } else {
      teacherData.email = row.email.trim().toLowerCase();
    }

    // Teléfono (opcional)
    if (row.phone) {
      teacherData.phone = row.phone.trim();
    }

    // Fecha de nacimiento (requerida)
    const birthDateValidation = validateBirthDate(row.birthDate, 'teacher');
    if (!birthDateValidation.valid) {
      rowErrors.push(birthDateValidation.error);
    } else {
      teacherData.birthDate = birthDateValidation.birthDate.toISOString().split('T')[0];
    }

    // Institución (requerida)
    if (!row.institution || row.institution.trim().length < 2) {
      rowErrors.push('Institución es requerida');
    } else {
      teacherData.institution = row.institution.trim();
    }

    // Cursos (requerido, puede ser separado por comas)
    if (!row.courses || row.courses.trim().length < 2) {
      rowErrors.push('Al menos un curso es requerido');
    } else {
      const courses = row.courses.split(',').map(c => c.trim()).filter(c => c.length > 0);
      if (courses.length === 0) {
        rowErrors.push('Al menos un curso es requerido');
      } else if (courses.length > 10) {
        rowErrors.push('Máximo 10 cursos permitidos');
      } else {
        teacherData.courses = courses;
      }
    }

    // Género (requerido)
    const validGenders = ['Masculino', 'Femenino', 'Otro'];
    if (!row.gender || !validGenders.includes(row.gender)) {
      rowErrors.push('Género debe ser: Masculino, Femenino, u Otro');
    } else {
      teacherData.gender = row.gender;
    }

    // Status (opcional, default: active)
    const validStatuses = ['active', 'inactive', 'retired'];
    teacherData.status = validStatuses.includes(row.status) ? row.status : 'active';

    // Balance inicial (opcional, default: 0)
    teacherData.initialBalance = parseFloat(row.initialBalance) || 0;
    teacherData.overdraftLimit = parseFloat(row.overdraftLimit) || 0;

    if (rowErrors.length > 0) {
      errors.push({ row: rowNum, errors: rowErrors, data: row });
    } else {
      teacherData.tempPassword = generateTempPassword(teacherData.run);
      processedData.push({ ...teacherData, rowNum });
    }
  });

  return { processedData, errors };
};

// Validar datos de carga masiva
const validateMassUpload = async (req, res) => {
  try {
    const { data, userType } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Se requieren datos para procesar'
      });
    }

    if (!userType || !['student', 'teacher'].includes(userType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tipo de usuario debe ser "student" o "teacher"'
      });
    }

    let processedResult;
    
    if (userType === 'student') {
      processedResult = processStudentData(data);
    } else {
      processedResult = processTeacherData(data);
    }

    const { processedData, errors } = processedResult;

    // Verificar duplicados en el archivo
    const runDuplicates = [];
    const emailDuplicates = [];
    const runSet = new Set();
    const emailSet = new Set();

    processedData.forEach(item => {
      if (runSet.has(item.run)) {
        runDuplicates.push(item.run);
      } else {
        runSet.add(item.run);
      }

      if (emailSet.has(item.email)) {
        emailDuplicates.push(item.email);
      } else {
        emailSet.add(item.email);
      }
    });

    // Verificar duplicados en la base de datos
    const runs = processedData.map(item => item.run);
    const emails = processedData.map(item => item.email);

    const { data: existingUsers } = await supabase
      .from('users')
      .select('run, email')
      .or(`run.in.(${runs.join(',')}),email.in.(${emails.join(',')})`);

    const existingRuns = existingUsers ? existingUsers.map(u => u.run) : [];
    const existingEmails = existingUsers ? existingUsers.map(u => u.email) : [];

    res.status(200).json({
      status: 'success',
      data: {
        valid: processedData.length,
        errors: errors.length,
        validData: processedData,
        validationErrors: errors,
        duplicates: {
          inFile: {
            runs: [...new Set(runDuplicates)],
            emails: [...new Set(emailDuplicates)]
          },
          inDatabase: {
            runs: existingRuns,
            emails: existingEmails
          }
        },
        summary: {
          totalRows: data.length,
          validRows: processedData.length,
          errorRows: errors.length,
          duplicateRuns: runDuplicates.length,
          duplicateEmails: emailDuplicates.length,
          existingRuns: existingRuns.length,
          existingEmails: existingEmails.length
        }
      }
    });

  } catch (error) {
    console.error('Error validando carga masiva:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al validar datos'
    });
  }
};

// Ejecutar carga masiva
const executeMassUpload = async (req, res) => {
  try {
    const { validData, userType, skipDuplicates = true } = req.body;

    if (!validData || !Array.isArray(validData) || validData.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No hay datos válidos para procesar'
      });
    }

    if (!userType || !['student', 'teacher'].includes(userType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tipo de usuario debe ser "student" o "teacher"'
      });
    }

    const createdUsers = [];
    const failedUsers = [];
    const skippedUsers = [];

    // Procesar cada usuario
    for (const userData of validData) {
      try {
        // Verificar si ya existe
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .or(`run.eq.${userData.run},email.eq.${userData.email}`)
          .single();

        if (existingUser) {
          if (skipDuplicates) {
            skippedUsers.push({
              ...userData,
              reason: 'Usuario ya existe'
            });
            continue;
          } else {
            failedUsers.push({
              ...userData,
              error: 'Usuario ya existe'
            });
            continue;
          }
        }

        // Hash de contraseña temporal
        const passwordHash = await bcrypt.hash(userData.tempPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

        // Crear usuario
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            run: userData.run,
            password_hash: passwordHash,
            first_name: userData.firstName,
            last_name: userData.lastName,
            email: userData.email,
            phone: userData.phone || null,
            role: userType,
            balance: userData.initialBalance || 0,
            overdraft_limit: userData.overdraftLimit || 0,
            is_active: true
          })
          .select()
          .single();

        if (userError) {
          failedUsers.push({
            ...userData,
            error: userError.message
          });
          continue;
        }

        // Crear registro específico (student o teacher)
        let specificError = null;

        if (userType === 'student') {
          const { error: studentError } = await supabase
            .from('students')
            .insert({
              user_id: newUser.id,
              birth_date: userData.birthDate,
              institution: userData.institution,
              course: userData.course,
              gender: userData.gender,
              status: userData.status || 'active'
            });

          specificError = studentError;
        } else if (userType === 'teacher') {
          const { error: teacherError } = await supabase
            .from('teachers')
            .insert({
              user_id: newUser.id,
              birth_date: userData.birthDate,
              institution: userData.institution,
              courses: userData.courses,
              gender: userData.gender,
              status: userData.status || 'active'
            });

          specificError = teacherError;
        }

        if (specificError) {
          // Revertir creación de usuario
          await supabase.from('users').delete().eq('id', newUser.id);
          failedUsers.push({
            ...userData,
            error: specificError.message
          });
          continue;
        }

        createdUsers.push({
          ...userData,
          userId: newUser.id,
          tempPassword: userData.tempPassword
        });

      } catch (error) {
        failedUsers.push({
          ...userData,
          error: error.message
        });
      }
    }

    // Registrar actividad
    await supabase
      .from('activity_logs')
      .insert({
        user_id: req.user.id,
        action: 'mass_upload',
        entity_type: userType,
        metadata: { 
          userType,
          totalProcessed: validData.length,
          created: createdUsers.length,
          failed: failedUsers.length,
          skipped: skippedUsers.length
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

    res.status(200).json({
      status: 'success',
      message: `Carga masiva completada: ${createdUsers.length} usuarios creados`,
      data: {
        created: createdUsers,
        failed: failedUsers,
        skipped: skippedUsers,
        summary: {
          totalProcessed: validData.length,
          created: createdUsers.length,
          failed: failedUsers.length,
          skipped: skippedUsers.length,
          successRate: `${((createdUsers.length / validData.length) * 100).toFixed(1)}%`
        }
      }
    });

  } catch (error) {
    console.error('Error ejecutando carga masiva:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al ejecutar carga masiva'
    });
  }
};

// Obtener plantilla CSV
const getCSVTemplate = async (req, res) => {
  try {
    const { userType } = req.params;

    if (!userType || !['student', 'teacher'].includes(userType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Tipo de usuario debe ser "student" o "teacher"'
      });
    }

    let headers, exampleData;

    if (userType === 'student') {
      headers = [
        'run', 'firstName', 'lastName', 'email', 'phone', 
        'birthDate', 'institution', 'course', 'gender', 
        'status', 'initialBalance', 'overdraftLimit'
      ];
      
      exampleData = [
        '12345678-9', 'Juan', 'Pérez', 'juan.perez@email.com', '+56912345678',
        '2000-01-15', 'Universidad de Chile', 'Ingeniería Informática', 'Masculino',
        'active', '0', '0'
      ];
    } else {
      headers = [
        'run', 'firstName', 'lastName', 'email', 'phone',
        'birthDate', 'institution', 'courses', 'gender',
        'status', 'initialBalance', 'overdraftLimit'
      ];
      
      exampleData = [
        '98765432-1', 'María', 'González', 'maria.gonzalez@email.com', '+56987654321',
        '1980-05-20', 'Universidad de Chile', 'Matemáticas,Educación Financiera', 'Femenino',
        'active', '0', '0'
      ];
    }

    // Crear CSV
    const csvContent = [
      headers.join(','),
      exampleData.join(',')
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="plantilla_${userType}s.csv"`);
    res.status(200).send(csvContent);

  } catch (error) {
    console.error('Error generando plantilla CSV:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al generar plantilla'
    });
  }
};

// Obtener historial de cargas masivas
const getMassUploadHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, userType = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        users!inner(
          run,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .eq('action', 'mass_upload');

    if (userType !== 'all') {
      query = query.contains('metadata', { userType });
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: history, error, count } = await query;

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'success',
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial de cargas masivas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener historial'
    });
  }
};

module.exports = {
  validateMassUpload,
  executeMassUpload,
  getCSVTemplate,
  getMassUploadHistory
};