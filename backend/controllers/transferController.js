// controllers/transferController.js - VERSIÓN CORREGIDA PARA DEBUGGING

const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

// ========================================================================
// FUNCIÓN PRINCIPAL: getAllUsers - CORREGIDA CON DEBUG
// ========================================================================

const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const { search = '', role = 'all', institution = 'all', limit = 100 } = req.query;

    console.log(`🔍 [getAllUsers] Iniciando carga de usuarios`);
    console.log(`👤 Usuario actual: ${req.user.first_name} ${req.user.last_name} (${currentUserRole})`);
    console.log(`🔎 Parámetros: search="${search}", role="${role}", limit=${limit}`);

    // ===============================================
    // PASO 1: OBTENER INFORMACIÓN DEL USUARIO ACTUAL
    // ===============================================
    
    let userInstitution = null;
    let userCourse = null;
    let availableUserIds = [];
    let restrictionApplied = false;

    if (currentUserRole === 'student') {
      console.log(`📚 Procesando filtros para estudiante...`);
      
      // Obtener información del estudiante actual
      const { data: currentStudent, error: studentError } = await supabase
        .from('students')
        .select('institution, course')
        .eq('user_id', currentUserId)
        .single();

      if (studentError || !currentStudent) {
        console.error('❌ Error obteniendo información del estudiante:', studentError);
        // NO BLOQUEAR - Permitir ver a todos los usuarios como fallback
        console.log('⚠️ Continuando sin restricciones como fallback');
      } else {
        userInstitution = currentStudent.institution;
        userCourse = currentStudent.course;
        restrictionApplied = true;

        console.log(`🏫 Institución del estudiante: ${userInstitution}`);
        console.log(`📖 Curso del estudiante: ${userCourse}`);

        // Buscar compañeros de clase (mismo establecimiento Y curso)
        const { data: sameClassStudents, error: classError } = await supabase
          .from('students')
          .select('user_id')
          .eq('institution', userInstitution)
          .eq('course', userCourse)
          .neq('user_id', currentUserId);

        if (!classError && sameClassStudents) {
          const studentIds = sameClassStudents.map(s => s.user_id);
          availableUserIds.push(...studentIds);
          console.log(`👥 Compañeros de clase encontrados: ${studentIds.length}`);
        }

        // Buscar profesores del mismo establecimiento que enseñen el curso
        const { data: sameInstitutionTeachers, error: teacherError } = await supabase
          .from('teachers')
          .select('user_id, courses')
          .eq('institution', userInstitution);

        if (!teacherError && sameInstitutionTeachers) {
          const relevantTeachers = sameInstitutionTeachers.filter(teacher => {
            return teacher.courses && teacher.courses.includes(userCourse);
          });

          const teacherIds = relevantTeachers.map(t => t.user_id);
          availableUserIds.push(...teacherIds);
          console.log(`👨‍🏫 Profesores del curso encontrados: ${teacherIds.length}`);
        }

        // Incluir todos los administradores
        const { data: admins, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .eq('is_active', true);

        if (!adminError && admins) {
          const adminIds = admins.map(a => a.id);
          availableUserIds.push(...adminIds);
          console.log(`👑 Administradores incluidos: ${adminIds.length}`);
        }

        console.log(`✅ Total usuarios disponibles para estudiante: ${availableUserIds.length}`);
        
        // Si no hay usuarios, desactivar restricción
        if (availableUserIds.length === 0) {
          console.log('⚠️ No se encontraron usuarios con restricción - removiendo filtros');
          restrictionApplied = false;
        }
      }
    } else {
      console.log(`🔓 Usuario ${currentUserRole} - Sin restricciones de acceso`);
    }

    // ===============================================
    // PASO 2: CONSULTA PRINCIPAL CON DEBUG
    // ===============================================

    console.log(`📊 Construyendo consulta principal...`);

    let query = supabase
      .from('users')
      .select(`
        id, 
        run, 
        first_name, 
        last_name, 
        email, 
        role, 
        is_active,
        students(institution, course),
        teachers(institution, courses)
      `)
      .eq('is_active', true)
      .neq('id', currentUserId);

    // Aplicar filtro de usuarios disponibles SOLO si hay restricción efectiva
    if (restrictionApplied && availableUserIds.length > 0) {
      console.log(`🔒 Aplicando filtro de restricción: ${availableUserIds.length} IDs permitidos`);
      query = query.in('id', availableUserIds);
    }

    // Aplicar otros filtros
    if (search) {
      console.log(`🔍 Aplicando filtro de búsqueda: "${search}"`);
      query = query.or(
        `first_name.ilike.%${search}%,` +
        `last_name.ilike.%${search}%,` +
        `run.ilike.%${search}%,` +
        `email.ilike.%${search}%`
      );
    }

    if (role !== 'all') {
      console.log(`👔 Aplicando filtro de rol: "${role}"`);
      query = query.eq('role', role);
    }

    // Aplicar límite
    query = query.limit(parseInt(limit));
    query = query.order('first_name', { ascending: true });

    console.log(`⏳ Ejecutando consulta en Supabase...`);

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ Error en consulta de usuarios:', error);
      throw error;
    }

    console.log(`📈 Usuarios encontrados en BD: ${users?.length || 0}`);

    // ===============================================
    // PASO 3: FORMATEO Y RESPUESTA
    // ===============================================

    const formattedUsers = (users || []).map(user => {
      let institutionInfo = '';
      let courseInfo = '';

      if (user.role === 'student' && user.students?.length > 0) {
        institutionInfo = user.students[0].institution;
        courseInfo = user.students[0].course;
      } else if (user.role === 'teacher' && user.teachers?.length > 0) {
        institutionInfo = user.teachers[0].institution;
        courseInfo = user.teachers[0].courses?.join(', ') || '';
      }

      return {
        id: user.id,
        run: user.run,
        name: `${user.first_name} ${user.last_name}`, // ✅ CAMPO PRINCIPAL
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        institution: institutionInfo,
        course: courseInfo,
        displayRole: {
          student: 'Estudiante',
          teacher: 'Docente',
          admin: 'Administrador'
        }[user.role] || user.role
      };
    });

    // Filtro adicional de institución (si se especifica)
    let filteredUsers = formattedUsers;
    if (institution !== 'all') {
      filteredUsers = formattedUsers.filter(user =>
        user.institution.toLowerCase().includes(institution.toLowerCase())
      );
    }

    // ===============================================
    // PASO 4: ESTADÍSTICAS Y RESPUESTA FINAL
    // ===============================================

    const stats = {
      total: filteredUsers.length,
      students: filteredUsers.filter(u => u.role === 'student').length,
      teachers: filteredUsers.filter(u => u.role === 'teacher').length,
      admins: filteredUsers.filter(u => u.role === 'admin').length,
      institutions: [
        ...new Set(filteredUsers.map(u => u.institution).filter(Boolean))
      ]
    };

    console.log(`📊 Estadísticas finales:`);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Estudiantes: ${stats.students}`);
    console.log(`   Profesores: ${stats.teachers}`);
    console.log(`   Administradores: ${stats.admins}`);

    const response = {
      status: 'success',
      data: {
        users: filteredUsers,
        stats,
        filters: {
          search,
          role,
          institution,
          limit: parseInt(limit)
        }
      }
    };

    // Agregar información de restricción si aplica
    if (restrictionApplied) {
      response.data.restriction = {
        applied: true,
        reason: 'student_course_filter',
        institution: userInstitution,
        course: userCourse,
        message: `Mostrando solo compañeros de ${userCourse} en ${userInstitution}`,
        availableCount: availableUserIds.length
      };
      console.log(`🔒 Restricción aplicada: ${userInstitution} - ${userCourse}`);
    }

    console.log(`✅ [getAllUsers] Completado exitosamente - ${filteredUsers.length} usuarios devueltos`);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ [getAllUsers] Error crítico:', error);
    console.error('🔍 Stack trace:', error.stack);
    
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener lista de usuarios disponibles para transferencia',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
      debug: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      } : undefined
    });
  }
};

// ========================================================================
// FUNCIÓN DE HISTORIAL CON FILTROS AVANZADOS Y PAGINACIÓN
// ========================================================================

const formatTransferForUser = (transfer, currentUserId) => {
  const isSent = transfer.from_user_id === currentUserId;
  const direction = isSent ? 'sent' : 'received';

  let userAmount = parseFloat(transfer.amount);
  if (!isSent && transfer.type === 'multiple') {
    const myRecipientInfo = transfer.transfer_recipients?.find(
      r => r.user_id === currentUserId
    );
    userAmount = myRecipientInfo ? parseFloat(myRecipientInfo.amount) : 0;
  }

  const translateRole = role => {
    const translations = {
      student: 'Estudiante',
      teacher: 'Docente',
      admin: 'Administrador'
    };
    return translations[role] || role;
  };

  return {
    id: transfer.id,
    direction,
    amount: userAmount,
    totalAmount: parseFloat(transfer.amount),
    description: transfer.description,
    status: transfer.status,
    date: transfer.created_at,
    completedAt: transfer.completed_at,
    isMultiple: transfer.type === 'multiple',
    otherPerson: isSent
      ? (transfer.recipient
          ? {
              id: transfer.recipient.id,
              name: `${transfer.recipient.first_name} ${transfer.recipient.last_name}`,
              run: transfer.recipient.run,
              role: transfer.recipient.role,
              displayRole: translateRole(transfer.recipient.role)
            }
          : null)
      : (transfer.sender
          ? {
              id: transfer.sender.id,
              name: `${transfer.sender.first_name} ${transfer.sender.last_name}`,
              run: transfer.sender.run,
              role: transfer.sender.role,
              displayRole: translateRole(transfer.sender.role)
            }
          : null),
    recipients:
      transfer.transfer_recipients?.map(r => ({
        id: r.recipient.id,
        name: `${r.recipient.first_name} ${r.recipient.last_name}`,
        run: r.recipient.run,
        role: r.recipient.role,
        displayRole: translateRole(r.recipient.role),
        amount: parseFloat(r.amount),
        status: r.status
      })) || [],
    recipientCount: transfer.transfer_recipients?.length || 0
  };
};

const getTransferHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      type = 'all',
      status = 'all',
      search = '',
      role = 'all',
      dateFrom = '',
      dateTo = '',
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;
    
    const offset = (page - 1) * limit;

    let allTransfers = [];
    let totalCount = 0;

    const buildDateFilter = query => {
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59.999Z`);
      }
      return query;
    };

    const buildStatusFilter = query => {
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      return query;
    };

    if (type === 'sent') {
      let query = supabase
        .from('transfers')
        .select(
          `
          *, 
          sender:from_user_id(*), 
          recipient:to_user_id(*), 
          transfer_recipients(*, recipient:user_id(*))
        `,
          { count: 'exact' }
        )
        .eq('from_user_id', userId);

      query = buildDateFilter(query);
      query = buildStatusFilter(query);
      query = query.order('created_at', { ascending: sortOrder === 'asc' });

      const { data: sentTransfers, error: sentError, count } = await query;
      if (sentError) throw sentError;

      allTransfers = sentTransfers || [];
      totalCount = count || 0;

    } else if (type === 'received') {
      // Recibidas simples
      let singleQuery = supabase
        .from('transfers')
        .select(`
          *, 
          sender:from_user_id(*), 
          recipient:to_user_id(*), 
          transfer_recipients(*, recipient:user_id(*))
        `)
        .eq('to_user_id', userId)
        .eq('type', 'single');

      singleQuery = buildDateFilter(singleQuery);
      singleQuery = buildStatusFilter(singleQuery);
      singleQuery = singleQuery.order('created_at', { ascending: false });

      const { data: singleReceived, error: singleError } = await singleQuery;
      if (singleError) throw singleError;

      // Recibidas múltiples
      let multipleQuery = supabase
        .from('transfers')
        .select(`
          *, 
          sender:from_user_id(*), 
          recipient:to_user_id(*), 
          transfer_recipients!inner(*, recipient:user_id(*))
        `)
        .eq('transfer_recipients.user_id', userId)
        .eq('type', 'multiple');

      multipleQuery = buildDateFilter(multipleQuery);
      multipleQuery = buildStatusFilter(multipleQuery);
      multipleQuery = multipleQuery.order('created_at', { ascending: false });

      const { data: multipleReceived, error: multipleError } = await multipleQuery;
      if (multipleError) throw multipleError;

      const combinedReceived = [
        ...(singleReceived || []),
        ...(multipleReceived || [])
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      allTransfers = combinedReceived;
      totalCount = combinedReceived.length;

    } else {
      // Todas: enviadas + recibidas (simples y múltiples)
      let sentQuery = supabase
        .from('transfers')
        .select(`
          *, 
          sender:from_user_id(*), 
          recipient:to_user_id(*), 
          transfer_recipients(*, recipient:user_id(*))
        `)
        .eq('from_user_id', userId);

      sentQuery = buildDateFilter(sentQuery);
      sentQuery = buildStatusFilter(sentQuery);

      const { data: sentTransfers, error: sentError } = await sentQuery;
      if (sentError) throw sentError;

      let singleQuery = supabase
        .from('transfers')
        .select(`
          *, 
          sender:from_user_id(*), 
          recipient:to_user_id(*), 
          transfer_recipients(*, recipient:user_id(*))
        `)
        .eq('to_user_id', userId)
        .eq('type', 'single');

      singleQuery = buildDateFilter(singleQuery);
      singleQuery = buildStatusFilter(singleQuery);

      const { data: singleReceived, error: singleError } = await singleQuery;
      if (singleError) throw singleError;

      let multipleQuery = supabase
        .from('transfers')
        .select(`
          *, 
          sender:from_user_id(*), 
          recipient:to_user_id(*), 
          transfer_recipients!inner(*, recipient:user_id(*))
        `)
        .eq('transfer_recipients.user_id', userId)
        .eq('type', 'multiple');

      multipleQuery = buildDateFilter(multipleQuery);
      multipleQuery = buildStatusFilter(multipleQuery);

      const { data: multipleReceived, error: multipleError } = await multipleQuery;
      if (multipleError) throw multipleError;

      const allCombined = [
        ...(sentTransfers || []),
        ...(singleReceived || []),
        ...(multipleReceived || [])
      ];

      const uniqueTransfers = allCombined.filter(
        (transfer, index, self) =>
          index === self.findIndex(t => t.id === transfer.id)
      );

      allTransfers = uniqueTransfers;
      totalCount = uniqueTransfers.length;
    }

    let formattedTransfers = allTransfers.map(transfer =>
      formatTransferForUser(transfer, userId)
    );

    if (search) {
      const searchLower = search.toLowerCase();
      formattedTransfers = formattedTransfers.filter(transfer => {
        if (transfer.otherPerson) {
          return (
            transfer.otherPerson.name.toLowerCase().includes(searchLower) ||
            transfer.otherPerson.run.includes(searchLower)
          );
        }
        return transfer.description.toLowerCase().includes(searchLower);
      });
    }

    if (role !== 'all') {
      formattedTransfers = formattedTransfers.filter(transfer => {
        if (transfer.otherPerson) {
          return transfer.otherPerson.role === role;
        }
        return false;
      });
    }

    const filteredTotal = formattedTransfers.length;

    // Ordenamiento en memoria
    formattedTransfers.sort((a, b) => {
      let aValue;
      let bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'name':
          aValue = a.otherPerson?.name || '';
          bValue = b.otherPerson?.name || '';
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    const paginatedTransfers = formattedTransfers.slice(
      offset,
      offset + parseInt(limit)
    );

    console.log(
      `✅ Historial cargado: ${paginatedTransfers.length}/${filteredTotal} transferencias (${type})`
    );

    res.status(200).json({
      status: 'success',
      data: {
        transfers: paginatedTransfers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredTotal,
          totalPages: Math.ceil(filteredTotal / parseInt(limit)),
          hasNextPage: parseInt(page) < Math.ceil(filteredTotal / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          type,
          status,
          search,
          role,
          dateFrom,
          dateTo,
          sortBy,
          sortOrder
        },
        summary: {
          totalTransfers: filteredTotal,
          sent: formattedTransfers.filter(t => t.direction === 'sent').length,
          received: formattedTransfers.filter(
            t => t.direction === 'received'
          ).length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener historial de transferencias',
      details: error.message
    });
  }
};

// ========================================================================
// ACTIVIDAD RECIENTE PARA DASHBOARD
// ========================================================================

const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    let allTransfers = [];

    const { data: sentTransfers, error: sentError } = await supabase
      .from('transfers')
      .select(`
        *, 
        sender:from_user_id(*), 
        recipient:to_user_id(*), 
        transfer_recipients(*, recipient:user_id(*))
      `)
      .eq('from_user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (sentError) throw sentError;

    const { data: singleReceived, error: singleError } = await supabase
      .from('transfers')
      .select(`
        *, 
        sender:from_user_id(*), 
        recipient:to_user_id(*), 
        transfer_recipients(*, recipient:user_id(*))
      `)
      .eq('to_user_id', userId)
      .eq('type', 'single')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (singleError) throw singleError;

    const { data: multipleReceived, error: multipleError } = await supabase
      .from('transfers')
      .select(`
        *, 
        sender:from_user_id(*), 
        recipient:to_user_id(*), 
        transfer_recipients!inner(*, recipient:user_id(*))
      `)
      .eq('transfer_recipients.user_id', userId)
      .eq('type', 'multiple')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (multipleError) throw multipleError;

    const allCombined = [
      ...(sentTransfers || []),
      ...(singleReceived || []),
      ...(multipleReceived || [])
    ];

    const uniqueTransfers = allCombined
      .filter(
        (transfer, index, self) =>
          index === self.findIndex(t => t.id === transfer.id)
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit));

    const formattedTransfers = uniqueTransfers.map(transfer =>
      formatTransferForUser(transfer, userId)
    );

    console.log(
      `✅ Actividad reciente cargada: ${formattedTransfers.length} movimientos`
    );

    res.status(200).json({
      status: 'success',
      data: {
        transfers: formattedTransfers,
        summary: {
          total: formattedTransfers.length,
          sent: formattedTransfers.filter(t => t.direction === 'sent').length,
          received: formattedTransfers.filter(
            t => t.direction === 'received'
          ).length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo actividad reciente:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener actividad reciente',
      details: error.message
    });
  }
};

// ========================================================================
// CREAR TRANSFERENCIA
// ========================================================================

const createTransfer = async (req, res) => {
  try {
    const {
      recipientIds,
      amount,
      description,
      distributionMode = 'equal',
      recipientAmounts = []
    } = req.body;
    
    const fromUserId = req.user.id;
    const isMultiple = recipientIds.length > 1;

    if (recipientIds.includes(fromUserId)) {
      return res.status(400).json({
        status: 'error',
        message: 'No puedes transferir dinero a ti mismo'
      });
    }

    const { data: sender } = await supabase
      .from('users')
      .select('balance, overdraft_limit, first_name, last_name, run')
      .eq('id', fromUserId)
      .single();

    if (!sender) {
      return res.status(400).json({
        status: 'error',
        message: 'Usuario remitente no encontrado'
      });
    }

    const availableBalance =
      parseFloat(sender.balance) + parseFloat(sender.overdraft_limit);
    let totalAmount = 0;
    let recipientDetails = [];

    if (isMultiple) {
      if (distributionMode === 'equal') {
        const amountPerPerson = Math.floor(amount / recipientIds.length);
        totalAmount = amountPerPerson * recipientIds.length;
        recipientDetails = recipientIds.map(id => ({
          id,
          amount: amountPerPerson
        }));
      } else {
        recipientDetails = recipientIds.map((id, index) => ({
          id,
          amount: parseInt(recipientAmounts[index]) || 0
        }));
        totalAmount = recipientDetails.reduce((sum, r) => sum + r.amount, 0);
      }
    } else {
      totalAmount = parseInt(amount);
      recipientDetails = [{ id: recipientIds[0], amount: totalAmount }];
    }

    if (totalAmount <= 0)
      return res.status(400).json({
        status: 'error',
        message: 'El monto total debe ser mayor a 0'
      });
    if (totalAmount > 5000000)
      return res.status(400).json({
        status: 'error',
        message: 'El monto máximo por transferencia es $5.000.000'
      });
    if (totalAmount > availableBalance)
      return res.status(400).json({
        status: 'error',
        message: `Saldo insuficiente. Disponible: $${availableBalance.toLocaleString()}, Requerido: $${totalAmount.toLocaleString()}`
      });

    const today = new Date().toISOString().split('T')[0];

    const { data: todayTransfers } = await supabase
      .from('transfers')
      .select('amount')
      .eq('from_user_id', fromUserId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .eq('status', 'completed');

    const transferredToday =
      todayTransfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const dailyLimit = 10000000;

    if (transferredToday + totalAmount > dailyLimit)
      return res.status(400).json({
        status: 'error',
        message: `Límite diario excedido. Límite: $${dailyLimit.toLocaleString()}, Usado: $${transferredToday.toLocaleString()}`
      });

    const { data: recipients, error: recipientsError } = await supabase
      .from('users')
      .select('id, run, first_name, last_name, role, is_active')
      .in('id', recipientIds)
      .eq('is_active', true);

    if (recipientsError || recipients.length !== recipientIds.length)
      return res.status(400).json({
        status: 'error',
        message: 'Uno o más destinatarios no son válidos o están inactivos'
      });

    const transferId = uuidv4();

    const { error: transferError } = await supabase
      .from('transfers')
      .insert({
        id: transferId,
        from_user_id: fromUserId,
        to_user_id: isMultiple ? null : recipientIds[0],
        amount: totalAmount,
        description,
        type: isMultiple ? 'multiple' : 'single',
        status: 'pending'
      });

    if (transferError)
      throw new Error('Error al crear el registro de transferencia');

    if (isMultiple) {
      const recipientRecords = recipientDetails.map(r => ({
        transfer_id: transferId,
        user_id: r.id,
        amount: r.amount,
        status: 'pending'
      }));
      const { error: recipientsInsertError } = await supabase
        .from('transfer_recipients')
        .insert(recipientRecords);
      if (recipientsInsertError)
        throw new Error('Error al registrar destinatarios');
    }

    try {
      const newBalance = parseFloat(sender.balance) - totalAmount;

      await supabase
        .from('users')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', fromUserId);

      for (const recipient of recipientDetails) {
        const { data: recipientUser } = await supabase
          .from('users')
          .select('balance')
          .eq('id', recipient.id)
          .single();

        const newRecipientBalance =
          parseFloat(recipientUser.balance) + recipient.amount;

        await supabase
          .from('users')
          .update({
            balance: newRecipientBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', recipient.id);

        if (isMultiple) {
          await supabase
            .from('transfer_recipients')
            .update({ status: 'completed' })
            .eq('transfer_id', transferId)
            .eq('user_id', recipient.id);
        }
      }

      await supabase
        .from('transfers')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', transferId);

      // Logging mejorado
      await supabase.from('activity_logs').insert({
        user_id: fromUserId,
        action: 'transfer_sent',
        entity_type: 'transfer',
        entity_id: transferId,
        metadata: {
          amount: totalAmount,
          description,
          recipient:
            recipients.length === 1
              ? `${recipients[0].first_name} ${recipients[0].last_name}`
              : null,
          recipientName:
            recipients.length === 1
              ? `${recipients[0].first_name} ${recipients[0].last_name}`
              : null,
          recipientRun: recipients.length === 1 ? recipients[0].run : null,
          recipientCount: recipients.length,
          recipients: recipients.map(r => ({
            name: `${r.first_name} ${r.last_name}`,
            run: r.run,
            role: r.role,
            amount: recipientDetails.find(rd => rd.id === r.id).amount
          })),
          transferType: isMultiple ? 'multiple' : 'single',
          distributionMode: isMultiple ? distributionMode : 'single'
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });

      for (const recipient of recipients) {
        const recipientAmount = recipientDetails.find(
          rd => rd.id === recipient.id
        ).amount;
        await supabase.from('activity_logs').insert({
          user_id: recipient.id,
          action: 'transfer_received',
          entity_type: 'transfer',
          entity_id: transferId,
          metadata: {
            amount: recipientAmount,
            description,
            sender: `${sender.first_name} ${sender.last_name}`,
            senderName: `${sender.first_name} ${sender.last_name}`,
            senderRun: sender.run,
            transferType: isMultiple ? 'multiple' : 'single'
          },
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      }

      console.log(
        `✅ Transferencia completada: ${totalAmount} a ${recipients.length} destinatarios`
      );

      res.status(201).json({
        status: 'success',
        message: isMultiple
          ? `Transferencia múltiple realizada exitosamente a ${recipientIds.length} personas`
          : 'Transferencia realizada exitosamente',
        data: {
          transferId,
          amount: totalAmount,
          newBalance,
          recipients: recipients.map(r => ({
            id: r.id,
            name: `${r.first_name} ${r.last_name}`,
            run: r.run,
            role: r.role,
            amount: recipientDetails.find(rd => rd.id === r.id).amount
          })),
          transferredToday: transferredToday + totalAmount,
          dailyLimit
        }
      });
    } catch (processError) {
      await supabase
        .from('transfers')
        .update({ status: 'failed', error_message: processError.message })
        .eq('id', transferId);
      throw processError;
    }
  } catch (error) {
    console.error('Error en createTransfer:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error al procesar la transferencia'
    });
  }
};

// ========================================================================
// FUNCIONES AUXILIARES
// ========================================================================

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user } = await supabase
      .from('users')
      .select('balance, overdraft_limit, first_name, last_name')
      .eq('id', userId)
      .single();

    if (!user)
      return res
        .status(404)
        .json({ status: 'error', message: 'Usuario no encontrado' });

    const today = new Date().toISOString().split('T')[0];

    const { data: todayTransfers } = await supabase
      .from('transfers')
      .select('amount, type')
      .eq('from_user_id', userId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .eq('status', 'completed');

    const transferredToday =
      todayTransfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const dailyLimit = 10000000;
    const availableBalance =
      parseFloat(user.balance) + parseFloat(user.overdraft_limit);

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          name: `${user.first_name} ${user.last_name}`,
          balance: parseFloat(user.balance),
          overdraftLimit: parseFloat(user.overdraft_limit),
          availableBalance
        },
        limits: {
          dailyLimit,
          transferredToday,
          remainingToday: dailyLimit - transferredToday,
          maxPerTransfer: 5000000,
          usagePercentage: (transferredToday / dailyLimit) * 100
        },
        stats: {
          transfersToday: todayTransfers?.length || 0
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estadísticas del usuario'
    });
  }
};

const getTransferDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const logger = req.logger || console;

    // 1. OBTENER LA TRANSFERENCIA
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .select('*')
      .eq('id', id)
      .single();

    if (transferError || !transfer) {
      return res.status(404).json({
        status: 'error',
        message: 'Transferencia no encontrada'
      });
    }

    // 2. VERIFICAR ACCESO
    const isRemitente = transfer.from_user_id === userId;
    const isDestinatario = transfer.to_user_id === userId;
    
    if (!isRemitente && !isDestinatario && transfer.type === 'multiple') {
      // Para múltiples, verificar en transfer_recipients
      const { data: recipientCheck } = await supabase
        .from('transfer_recipients')
        .select('id')
        .eq('transfer_id', id)
        .eq('user_id', userId)
        .single();
      
      if (!recipientCheck) {
        return res.status(403).json({
          status: 'error',
          message: 'No tienes acceso a esta transferencia'
        });
      }
    } else if (!isRemitente && !isDestinatario) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes acceso a esta transferencia'
      });
    }

    // 3. CONSTRUIR RESPUESTA BASE
    const responseData = {
      id: transfer.id,
      status: transfer.status,
      date: transfer.created_at
    };

    // 4. SEGÚN TIPO DE TRANSFERENCIA
    if (transfer.type === 'multiple') {
      // 4A. TRANSFERENCIA MÚLTIPLE
      const { data: recipients, error: recipientsError } = await supabase
        .from('transfer_recipients')
        .select(`
          id,
          user_id,
          amount,
          users:user_id (
            id,
            first_name,
            last_name,
            run,
            role
          )
        `)
        .eq('transfer_id', id);

      if (recipientsError) {
        logger.error('Error obteniendo recipients:', recipientsError);
        return res.status(500).json({
          status: 'error',
          message: 'Error al obtener detalles de destinatarios'
        });
      }

      if (recipients && recipients.length > 0) {
        responseData.recipients = recipients.map(r => ({
          id: r.user_id,
          name: `${r.users.first_name} ${r.users.last_name}`,
          run: r.users.run,
          role: r.users.role,
          amount: parseFloat(r.amount)
        }));

        // Calcular total correcto
        responseData.totalAmount = recipients.reduce(
          (sum, r) => sum + parseFloat(r.amount),
          0
        );
      } else {
        responseData.recipients = [];
        responseData.totalAmount = 0;
      }
    } else {
      // 4B. TRANSFERENCIA SIMPLE
      if (transfer.to_user_id) {
        const { data: toUser, error: userError } = await supabase
          .from('users')
          .select('id, first_name, last_name, run, role')
          .eq('id', transfer.to_user_id)
          .single();

        if (userError) {
          logger.error('Error obteniendo usuario destino:', userError);
          return res.status(500).json({
            status: 'error',
            message: 'Error al obtener información del destinatario'
          });
        }

        if (toUser) {
          responseData.otherPerson = {
            id: toUser.id,
            name: `${toUser.first_name} ${toUser.last_name}`,
            run: toUser.run,
            role: toUser.role
          };
        }

        responseData.totalAmount = parseFloat(transfer.amount);
      }
    }

    // 5. DEVOLVER RESPUESTA
    logger.info(`Detalles de transferencia ${id} obtenidos exitosamente`);
    
    res.status(200).json({
      status: 'success',
      data: responseData
    });

  } catch (error) {
    const logger = req.logger || console;
    logger.error('Error en getTransferDetails:', {
      error: error.message,
      stack: error.stack,
      transferId: req.params.id
    });

    res.status(500).json({
      status: 'error',
      message: 'Error al obtener detalles de la transferencia',
      ...(process.env.NODE_ENV === 'development' && { 
        debug: error.message 
      })
    });
  }
};

const getClassmates = async (req, res) => {
  // Forzamos role=student y usamos la misma lógica de getAllUsers
  req.query.role = 'student';
  return getAllUsers(req, res);
};

// Exportar todas las funciones
module.exports = {
  createTransfer,
  getAllUsers,
  getTransferHistory,
  getUserStats,
  getTransferDetails,
  getClassmates,
  getRecentActivity
};
