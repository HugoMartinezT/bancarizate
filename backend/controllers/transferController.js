// controllers/transferController.js - VERSIÓN CON FILTRO POR CURSO Y ESTABLECIMIENTO

const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

// ========================================================================
// FUNCIÓN DE HISTORIAL CON FILTROS AVANZADOS Y PAGINACIÓN
// ========================================================================

/**
 * Función formateadora mejorada con traducciones
 */
const formatTransferForUser = (transfer, currentUserId) => {
  const isSent = transfer.from_user_id === currentUserId;
  const direction = isSent ? 'sent' : 'received';

  let userAmount = parseFloat(transfer.amount);
  if (!isSent && transfer.type === 'multiple') {
    const myRecipientInfo = transfer.transfer_recipients?.find(r => r.user_id === currentUserId);
    userAmount = myRecipientInfo ? parseFloat(myRecipientInfo.amount) : 0;
  }

  // Función para traducir roles
  const translateRole = (role) => {
    const translations = {
      'student': 'Estudiante',
      'teacher': 'Docente', 
      'admin': 'Administrador'
    };
    return translations[role] || role;
  };

  return {
    id: transfer.id,
    direction: direction,
    amount: userAmount,
    totalAmount: parseFloat(transfer.amount),
    description: transfer.description,
    status: transfer.status,
    date: transfer.created_at,
    completedAt: transfer.completed_at,
    isMultiple: transfer.type === 'multiple',
    otherPerson: isSent 
      ? (transfer.recipient ? { 
          id: transfer.recipient.id, 
          name: `${transfer.recipient.first_name} ${transfer.recipient.last_name}`, 
          run: transfer.recipient.run, 
          role: transfer.recipient.role,
          displayRole: translateRole(transfer.recipient.role)
        } : null) 
      : (transfer.sender ? { 
          id: transfer.sender.id, 
          name: `${transfer.sender.first_name} ${transfer.sender.last_name}`, 
          run: transfer.sender.run, 
          role: transfer.sender.role,
          displayRole: translateRole(transfer.sender.role)
        } : null),
    recipients: transfer.transfer_recipients?.map(r => ({
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

    // ========================================================================
    // CONSULTAS SEPARADAS CON FILTROS AVANZADOS
    // ========================================================================

    const buildDateFilter = (query) => {
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59.999Z`);
      }
      return query;
    };

    const buildStatusFilter = (query) => {
      if (status !== 'all') {
        query = query.eq('status', status);
      }
      return query;
    };

    if (type === 'sent') {
      // Solo transferencias enviadas
      let query = supabase
        .from('transfers')
        .select(`
          *, 
          sender:from_user_id(*), 
          recipient:to_user_id(*), 
          transfer_recipients(*, recipient:user_id(*))
        `, { count: 'exact' })
        .eq('from_user_id', userId);

      query = buildDateFilter(query);
      query = buildStatusFilter(query);
      
      query = query.order('created_at', { ascending: sortOrder === 'asc' });

      const { data: sentTransfers, error: sentError, count } = await query;
      if (sentError) throw sentError;

      allTransfers = sentTransfers || [];
      totalCount = count || 0;

    } else if (type === 'received') {
      // Transferencias recibidas: consultas separadas para single y multiple
      
      // 1. Transferencias individuales recibidas
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

      // 2. Transferencias múltiples recibidas
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

      // Combinar y ordenar
      const combinedReceived = [
        ...(singleReceived || []),
        ...(multipleReceived || [])
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      allTransfers = combinedReceived;
      totalCount = combinedReceived.length;

    } else {
      // Todas las transferencias
      
      // 1. Transferencias enviadas
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

      // 2. Transferencias individuales recibidas
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

      // 3. Transferencias múltiples recibidas
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

      // Combinar todas las transferencias
      const allCombined = [
        ...(sentTransfers || []),
        ...(singleReceived || []),
        ...(multipleReceived || [])
      ];

      // Eliminar duplicados por ID
      const uniqueTransfers = allCombined
        .filter((transfer, index, self) => 
          index === self.findIndex(t => t.id === transfer.id)
        );

      allTransfers = uniqueTransfers;
      totalCount = uniqueTransfers.length;
    }

    // ========================================================================
    // APLICAR FILTROS POST-CONSULTA
    // ========================================================================

    // Formatear transferencias primero
    let formattedTransfers = allTransfers.map(transfer => 
      formatTransferForUser(transfer, userId)
    );

    // Filtrar por nombre de usuario
    if (search) {
      const searchLower = search.toLowerCase();
      formattedTransfers = formattedTransfers.filter(transfer => {
        if (transfer.otherPerson) {
          return transfer.otherPerson.name.toLowerCase().includes(searchLower) ||
                 transfer.otherPerson.run.includes(searchLower);
        }
        return transfer.description.toLowerCase().includes(searchLower);
      });
    }

    // Filtrar por rol
    if (role !== 'all') {
      formattedTransfers = formattedTransfers.filter(transfer => {
        if (transfer.otherPerson) {
          return transfer.otherPerson.role === role;
        }
        return false;
      });
    }

    // Actualizar total después de filtros
    const filteredTotal = formattedTransfers.length;

    // Ordenar
    formattedTransfers.sort((a, b) => {
      let aValue, bValue;
      
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

    // Aplicar paginación
    const paginatedTransfers = formattedTransfers.slice(offset, offset + parseInt(limit));

    console.log(`✅ Historial cargado: ${paginatedTransfers.length}/${filteredTotal} transferencias (${type})`);
    console.log(`📊 Filtros aplicados: búsqueda="${search}", rol="${role}", fecha="${dateFrom}-${dateTo}"`);

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
          received: formattedTransfers.filter(t => t.direction === 'received').length
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
// NUEVA FUNCIÓN PARA MOVIMIENTOS RECIENTES (DASHBOARD)
// ========================================================================

const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Consulta similar pero solo las más recientes
    let allTransfers = [];

    // 1. Transferencias enviadas
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

    // 2. Transferencias individuales recibidas
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

    // 3. Transferencias múltiples recibidas
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

    // Combinar todas las transferencias
    const allCombined = [
      ...(sentTransfers || []),
      ...(singleReceived || []),
      ...(multipleReceived || [])
    ];

    // Eliminar duplicados y ordenar por fecha
    const uniqueTransfers = allCombined
      .filter((transfer, index, self) => 
        index === self.findIndex(t => t.id === transfer.id)
      )
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, parseInt(limit));

    // Formatear transferencias
    const formattedTransfers = uniqueTransfers.map(transfer => 
      formatTransferForUser(transfer, userId)
    );

    console.log(`✅ Actividad reciente cargada: ${formattedTransfers.length} movimientos`);

    res.status(200).json({
      status: 'success',
      data: {
        transfers: formattedTransfers,
        summary: {
          total: formattedTransfers.length,
          sent: formattedTransfers.filter(t => t.direction === 'sent').length,
          received: formattedTransfers.filter(t => t.direction === 'received').length
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
// CREAR TRANSFERENCIA - VERSIÓN CORREGIDA CON LOGGING DE DESTINATARIOS
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
      return res.status(400).json({ status: 'error', message: 'No puedes transferir dinero a ti mismo' });
    }

    const { data: sender } = await supabase.from('users').select('balance, overdraft_limit, first_name, last_name, run').eq('id', fromUserId).single();
    if (!sender) {
      return res.status(400).json({ status: 'error', message: 'Usuario remitente no encontrado' });
    }

    const availableBalance = parseFloat(sender.balance) + parseFloat(sender.overdraft_limit);
    let totalAmount = 0;
    let recipientDetails = [];

    if (isMultiple) {
      if (distributionMode === 'equal') {
        const amountPerPerson = Math.floor(amount / recipientIds.length);
        totalAmount = amountPerPerson * recipientIds.length;
        recipientDetails = recipientIds.map(id => ({ id, amount: amountPerPerson }));
      } else {
        recipientDetails = recipientIds.map((id, index) => ({ id, amount: parseInt(recipientAmounts[index]) || 0 }));
        totalAmount = recipientDetails.reduce((sum, r) => sum + r.amount, 0);
      }
    } else {
      totalAmount = parseInt(amount);
      recipientDetails = [{ id: recipientIds[0], amount: totalAmount }];
    }

    if (totalAmount <= 0) return res.status(400).json({ status: 'error', message: 'El monto total debe ser mayor a 0' });
    if (totalAmount > 5000000) return res.status(400).json({ status: 'error', message: 'El monto máximo por transferencia es $5.000.000' });
    if (totalAmount > availableBalance) return res.status(400).json({ status: 'error', message: `Saldo insuficiente. Disponible: $${availableBalance.toLocaleString()}, Requerido: $${totalAmount.toLocaleString()}` });

    const today = new Date().toISOString().split('T')[0];
    const { data: todayTransfers } = await supabase.from('transfers').select('amount').eq('from_user_id', fromUserId).gte('created_at', `${today}T00:00:00.000Z`).lt('created_at', `${today}T23:59:59.999Z`).eq('status', 'completed');
    const transferredToday = todayTransfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const dailyLimit = 10000000;

    if (transferredToday + totalAmount > dailyLimit) return res.status(400).json({ status: 'error', message: `Límite diario excedido. Límite: $${dailyLimit.toLocaleString()}, Usado: $${transferredToday.toLocaleString()}` });

    const { data: recipients, error: recipientsError } = await supabase.from('users').select('id, run, first_name, last_name, role, is_active').in('id', recipientIds).eq('is_active', true);
    if (recipientsError || recipients.length !== recipientIds.length) return res.status(400).json({ status: 'error', message: 'Uno o más destinatarios no son válidos o están inactivos' });

    const transferId = uuidv4();
    const { error: transferError } = await supabase.from('transfers').insert({ id: transferId, from_user_id: fromUserId, to_user_id: isMultiple ? null : recipientIds[0], amount: totalAmount, description, type: isMultiple ? 'multiple' : 'single', status: 'pending' });
    if (transferError) throw new Error('Error al crear el registro de transferencia');

    if (isMultiple) {
      const recipientRecords = recipientDetails.map(r => ({ transfer_id: transferId, user_id: r.id, amount: r.amount, status: 'pending' }));
      const { error: recipientsInsertError } = await supabase.from('transfer_recipients').insert(recipientRecords);
      if (recipientsInsertError) throw new Error('Error al registrar destinatarios');
    }

    try {
      const newBalance = parseFloat(sender.balance) - totalAmount;
      await supabase.from('users').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('id', fromUserId);
      for (const recipient of recipientDetails) {
        const { data: recipientUser } = await supabase.from('users').select('balance').eq('id', recipient.id).single();
        const newRecipientBalance = parseFloat(recipientUser.balance) + recipient.amount;
        await supabase.from('users').update({ balance: newRecipientBalance, updated_at: new Date().toISOString() }).eq('id', recipient.id);
        if (isMultiple) {
          await supabase.from('transfer_recipients').update({ status: 'completed' }).eq('transfer_id', transferId).eq('user_id', recipient.id);
        }
      }
      await supabase.from('transfers').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', transferId);
      
      // ========================================================================
      // 🔧 CORRECCIÓN: LOGGING MEJORADO CON INFORMACIÓN DE DESTINATARIOS
      // ========================================================================
      
      // Registrar actividad para el remitente (transfer_sent)
      await supabase.from('activity_logs').insert({ 
        user_id: fromUserId, 
        action: 'transfer_sent', 
        entity_type: 'transfer', 
        entity_id: transferId, 
        metadata: { 
          amount: totalAmount,
          description: description,
          // ✅ NUEVO: Información completa de destinatarios
          recipient: recipients.length === 1 ? `${recipients[0].first_name} ${recipients[0].last_name}` : null,
          recipientName: recipients.length === 1 ? `${recipients[0].first_name} ${recipients[0].last_name}` : null,
          recipientRun: recipients.length === 1 ? recipients[0].run : null,
          recipientCount: recipients.length,
          // Para transferencias múltiples:
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

      // ✅ NUEVO: También registrar actividad para cada destinatario (transfer_received)
      for (const recipient of recipients) {
        const recipientAmount = recipientDetails.find(rd => rd.id === recipient.id).amount;
        await supabase.from('activity_logs').insert({
          user_id: recipient.id,
          action: 'transfer_received',
          entity_type: 'transfer',
          entity_id: transferId,
          metadata: {
            amount: recipientAmount,
            description: description,
            sender: `${sender.first_name} ${sender.last_name}`,
            senderName: `${sender.first_name} ${sender.last_name}`,
            senderRun: sender.run,
            transferType: isMultiple ? 'multiple' : 'single'
          },
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        });
      }

      console.log(`✅ Transferencia completada: ${totalAmount} a ${recipients.length} destinatarios`);
      console.log(`📊 Actividades registradas: 1 transfer_sent + ${recipients.length} transfer_received`);
      
      res.status(201).json({ 
        status: 'success', 
        message: isMultiple ? `Transferencia múltiple realizada exitosamente a ${recipientIds.length} personas` : 'Transferencia realizada exitosamente', 
        data: { 
          transferId, 
          amount: totalAmount, 
          newBalance: newBalance, 
          recipients: recipients.map(r => ({ 
            id: r.id, 
            name: `${r.first_name} ${r.last_name}`, 
            run: r.run, 
            role: r.role, 
            amount: recipientDetails.find(rd => rd.id === r.id).amount 
          })), 
          transferredToday: transferredToday + totalAmount, 
          dailyLimit: dailyLimit 
        } 
      });
    } catch (processError) {
      await supabase.from('transfers').update({ status: 'failed', error_message: processError.message }).eq('id', transferId);
      throw processError;
    }
  } catch (error) {
    console.error('Error en createTransfer:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Error al procesar la transferencia' });
  }
};

// ========================================================================
// 🎯 FUNCIÓN MODIFICADA: getAllUsers - CON FILTRO POR CURSO Y ESTABLECIMIENTO
// ========================================================================

const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    const { search = '', role = 'all', institution = 'all', limit = 100 } = req.query;

    console.log(`🔍 Buscando usuarios para transferencia - Usuario actual: ${req.user.first_name} ${req.user.last_name} (${currentUserRole})`);

    // ===============================================
    // 🎯 NUEVA LÓGICA: FILTRO POR CURSO PARA ESTUDIANTES
    // ===============================================
    
    let userInstitution = null;
    let userCourse = null;
    let availableUserIds = [];

    if (currentUserRole === 'student') {
      // 1. Obtener información del estudiante actual
      const { data: currentStudent, error: studentError } = await supabase
        .from('students')
        .select('institution, course')
        .eq('user_id', currentUserId)
        .single();

      if (studentError || !currentStudent) {
        console.error('❌ Error obteniendo información del estudiante:', studentError);
        return res.status(400).json({ 
          status: 'error', 
          message: 'No se pudo obtener la información del estudiante actual' 
        });
      }

      userInstitution = currentStudent.institution;
      userCourse = currentStudent.course;

      console.log(`📚 Estudiante actual: ${userInstitution} - ${userCourse}`);

      // 2. Buscar estudiantes del mismo establecimiento Y curso
      const { data: sameClassStudents, error: classError } = await supabase
        .from('students')
        .select('user_id')
        .eq('institution', userInstitution)
        .eq('course', userCourse)
        .neq('user_id', currentUserId); // Excluir al usuario actual

      if (classError) {
        console.error('❌ Error buscando compañeros de clase:', classError);
      } else {
        const studentIds = sameClassStudents?.map(s => s.user_id) || [];
        availableUserIds.push(...studentIds);
        console.log(`👥 Compañeros de clase encontrados: ${studentIds.length}`);
      }

      // 3. Buscar profesores del mismo establecimiento QUE enseñen el curso actual
      const { data: sameInstitutionTeachers, error: teacherError } = await supabase
        .from('teachers')
        .select('user_id, courses')
        .eq('institution', userInstitution);

      if (teacherError) {
        console.error('❌ Error buscando profesores:', teacherError);
      } else {
        // Filtrar profesores que enseñen el curso actual
        const relevantTeachers = sameInstitutionTeachers?.filter(teacher => {
          // teacher.courses es un array, verificar si incluye el curso actual
          return teacher.courses && teacher.courses.includes(userCourse);
        }) || [];

        const teacherIds = relevantTeachers.map(t => t.user_id);
        availableUserIds.push(...teacherIds);
        console.log(`👨‍🏫 Profesores del curso encontrados: ${teacherIds.length}`);
      }

      // 4. Buscar administradores del mismo establecimiento (opcional)
      // Para mayor flexibilidad, también incluir admins
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

      console.log(`✅ Total de usuarios disponibles para el estudiante: ${availableUserIds.length}`);

      // Si no hay usuarios disponibles, devolver lista vacía
      if (availableUserIds.length === 0) {
        return res.status(200).json({
          status: 'success',
          data: {
            users: [],
            stats: {
              total: 0,
              students: 0,
              teachers: 0,
              admins: 0,
              institutions: []
            },
            filters: { search, role, institution, limit: parseInt(limit) },
            restriction: {
              applied: true,
              reason: 'student_course_filter',
              institution: userInstitution,
              course: userCourse,
              message: `Solo puedes transferir a compañeros de ${userCourse} en ${userInstitution}`
            }
          }
        });
      }
    }

    // ===============================================
    // CONSULTA PRINCIPAL CON FILTROS
    // ===============================================

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
      .neq('id', currentUserId)
      .limit(parseInt(limit));

    // ✅ APLICAR FILTRO DE USUARIOS DISPONIBLES PARA ESTUDIANTES
    if (currentUserRole === 'student' && availableUserIds.length > 0) {
      query = query.in('id', availableUserIds);
    }

    // Aplicar filtros adicionales
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,run.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role !== 'all') {
      query = query.eq('role', role);
    }

    // Ordenar por nombre
    query = query.order('first_name', { ascending: true });

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ Error en consulta de usuarios:', error);
      throw error;
    }

    // ===============================================
    // FORMATEO DE RESULTADOS
    // ===============================================

    const formattedUsers = users.map(user => {
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
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        institution: institutionInfo,
        course: courseInfo,
        displayRole: {
          'student': 'Estudiante',
          'teacher': 'Docente',
          'admin': 'Administrador'
        }[user.role] || user.role
      };
    });

    // Aplicar filtro de institución si se especifica
    let filteredUsers = formattedUsers;
    if (institution !== 'all') {
      filteredUsers = formattedUsers.filter(user => 
        user.institution.toLowerCase().includes(institution.toLowerCase())
      );
    }

    // Calcular estadísticas
    const stats = {
      total: filteredUsers.length,
      students: filteredUsers.filter(u => u.role === 'student').length,
      teachers: filteredUsers.filter(u => u.role === 'teacher').length,
      admins: filteredUsers.filter(u => u.role === 'admin').length,
      institutions: [...new Set(filteredUsers.map(u => u.institution).filter(Boolean))]
    };

    // ===============================================
    // RESPUESTA FINAL
    // ===============================================

    const response = {
      status: 'success',
      data: {
        users: filteredUsers,
        stats: stats,
        filters: { 
          search, 
          role, 
          institution, 
          limit: parseInt(limit) 
        }
      }
    };

    // Agregar información de restricción para estudiantes
    if (currentUserRole === 'student') {
      response.data.restriction = {
        applied: true,
        reason: 'student_course_filter',
        institution: userInstitution,
        course: userCourse,
        message: `Mostrando solo compañeros de ${userCourse} en ${userInstitution}`
      };
    }

    console.log(`✅ Usuarios encontrados: ${filteredUsers.length} (${stats.students} estudiantes, ${stats.teachers} profesores, ${stats.admins} admins)`);
    
    if (currentUserRole === 'student') {
      console.log(`🔒 Filtro aplicado: Solo ${userInstitution} - ${userCourse}`);
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error obteniendo usuarios para transferencia:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Error al obtener lista de usuarios disponibles para transferencia',
      details: error.message 
    });
  }
};

// ========================================================================
// MANTENER TODAS LAS DEMÁS FUNCIONES IGUAL
// ========================================================================

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data: user } = await supabase.from('users').select('balance, overdraft_limit, first_name, last_name').eq('id', userId).single();
    if (!user) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTransfers } = await supabase.from('transfers').select('amount, type').eq('from_user_id', userId).gte('created_at', `${today}T00:00:00.000Z`).lt('created_at', `${today}T23:59:59.999Z`).eq('status', 'completed');
    const transferredToday = todayTransfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const dailyLimit = 10000000;
    const availableBalance = parseFloat(user.balance) + parseFloat(user.overdraft_limit);
    res.status(200).json({ status: 'success', data: { user: { name: `${user.first_name} ${user.last_name}`, balance: parseFloat(user.balance), overdraftLimit: parseFloat(user.overdraft_limit), availableBalance: availableBalance }, limits: { dailyLimit: dailyLimit, transferredToday: transferredToday, remainingToday: dailyLimit - transferredToday, maxPerTransfer: 5000000, usagePercentage: (transferredToday / dailyLimit) * 100 }, stats: { transfersToday: todayTransfers?.length || 0 } } });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ status: 'error', message: 'Error al obtener estadísticas del usuario' });
  }
};

const getTransferDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { data: transfer, error } = await supabase.from('transfers').select(`*, sender:from_user_id(*), recipient:to_user_id(*), transfer_recipients(*, recipient:user_id(*))`).eq('id', id).single();
    if (error || !transfer) return res.status(404).json({ status: 'error', message: 'Transferencia no encontrada' });
    const hasAccess = transfer.from_user_id === userId || transfer.to_user_id === userId || transfer.transfer_recipients?.some(r => r.user_id === userId);
    if (!hasAccess) return res.status(403).json({ status: 'error', message: 'No tienes acceso a esta transferencia' });
    const formattedTransfer = { id: transfer.id, amount: parseFloat(transfer.amount), description: transfer.description, status: transfer.status, type: transfer.type, createdAt: transfer.created_at, completedAt: transfer.completed_at, errorMessage: transfer.error_message, sender: transfer.sender ? { id: transfer.sender.id, name: `${transfer.sender.first_name} ${transfer.sender.last_name}`, run: transfer.sender.run, role: transfer.sender.role } : null, recipient: transfer.recipient ? { id: transfer.recipient.id, name: `${transfer.recipient.first_name} ${transfer.recipient.last_name}`, run: transfer.recipient.run, role: transfer.recipient.role } : null, recipients: transfer.transfer_recipients?.map(r => ({ id: r.recipient.id, name: `${r.recipient.first_name} ${r.recipient.last_name}`, run: r.recipient.run, role: r.recipient.role, amount: parseFloat(r.amount), status: r.status })) || [] };
    res.status(200).json({ status: 'success', data: { transfer: formattedTransfer } });
  } catch (error) {
    console.error('Error obteniendo detalles:', error);
    res.status(500).json({ status: 'error', message: 'Error al obtener detalles de la transferencia' });
  }
};

const getClassmates = async (req, res) => {
  req.query.role = 'student';
  return getAllUsers(req, res);
};

// Exportamos todas las funciones del controlador
module.exports = {
  createTransfer,
  getAllUsers,
  getTransferHistory,
  getUserStats,
  getTransferDetails,
  getClassmates,
  getRecentActivity,
};