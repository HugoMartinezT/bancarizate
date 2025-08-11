// controllers/activityController.js - COMPLETO Y FINAL con búsqueda mejorada de destinatarios
const supabaseConfig = require('../config/supabase');
const supabase = supabaseConfig.supabase;

/**
 * Obtener actividades con filtros y paginación
 * GET /api/activity
 * - Usuarios normales: solo sus actividades
 * - Administradores: TODAS las actividades por defecto, con filtros opcionales
 */
const getActivities = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      date, 
      type, 
      search, 
      userId,
      userRun,
      userRole,
      startDate,
      endDate,
      institution
    } = req.query;

    const isAdmin = req.user.role === 'admin';

    console.log(`🔍 Getting activities:`);
    console.log(`   User ID: ${req.user.id}`);
    console.log(`   User Role: ${req.user.role}`);
    console.log(`   Is Admin: ${isAdmin}`);
    console.log(`   Filters:`, { page, limit, date, type, search, userId, userRun, userRole, startDate, endDate });

    // Construir query base con join a usuarios
    let query = supabase
      .from('activity_logs')
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        ip_address,
        metadata,
        created_at,
        users:user_id (
          id,
          run,
          first_name,
          last_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false });

    // 🔥 LÓGICA CORREGIDA: Admin ve TODO por defecto
    if (isAdmin) {
      console.log('👑 Usuario ADMIN - Aplicando filtros de administrador...');
      
      // Solo filtrar por usuario específico SI se especifica un filtro
      if (userId) {
        console.log(`   🎯 Filtrando por usuario específico: ${userId}`);
        query = query.eq('user_id', userId);
      } else if (userRun) {
        console.log(`   🎯 Filtrando por RUN: ${userRun}`);
        // Buscar el usuario por RUN
        const { data: userByRun, error: runError } = await supabase
          .from('users')
          .select('id')
          .eq('run', userRun)
          .single();
        
        if (runError || !userByRun) {
          console.log(`   ❌ Usuario con RUN ${userRun} no encontrado`);
          return res.status(200).json({
            status: 'success',
            data: {
              activities: [],
              pagination: {
                currentPage: parseInt(page),
                totalPages: 0,
                totalItems: 0,
                itemsPerPage: parseInt(limit)
              },
              isAdmin: true
            }
          });
        }
        
        query = query.eq('user_id', userByRun.id);
      }
      // Si no hay filtros específicos de usuario, NO aplicar ningún filtro de user_id
      // Esto significa que verá TODAS las actividades
      else {
        console.log('   🌍 Sin filtros de usuario - Mostrando TODAS las actividades');
      }
      
    } else {
      console.log('👤 Usuario NORMAL - Solo sus actividades');
      // Usuarios normales solo ven sus propias actividades
      query = query.eq('user_id', req.user.id);
    }

    // Filtro por fecha específica
    if (date) {
      console.log(`   📅 Filtrando por fecha: ${date}`);
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      
      query = query
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());
    }

    // Filtro por rango de fechas (solo para admin)
    if (isAdmin && startDate && endDate) {
      console.log(`   📅 Filtrando por rango: ${startDate} - ${endDate}`);
      query = query
        .gte('created_at', new Date(startDate).toISOString())
        .lte('created_at', new Date(endDate).toISOString());
    }

    // Filtro por tipo de actividad
    if (type && type !== 'all') {
      console.log(`   🎯 Filtrando por tipo: ${type}`);
      query = query.eq('action', type);
    }

    // Filtro por búsqueda de texto
    if (search) {
      console.log(`   🔍 Filtrando por búsqueda: ${search}`);
      query = query.ilike('action', `%${search}%`);
    }

    // Ejecutar query con conteo
    console.log('📊 Ejecutando query...');
    
    // Primero obtener el conteo total
    let countQuery = supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true });
    
    // Aplicar los mismos filtros al conteo
    if (!isAdmin) {
      countQuery = countQuery.eq('user_id', req.user.id);
    } else if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    } else if (userRun) {
      const { data: userByRun } = await supabase
        .from('users')
        .select('id')
        .eq('run', userRun)
        .single();
      if (userByRun) {
        countQuery = countQuery.eq('user_id', userByRun.id);
      }
    }
    
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setDate(endOfDay.getDate() + 1);
      countQuery = countQuery
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());
    }
    
    if (isAdmin && startDate && endDate) {
      countQuery = countQuery
        .gte('created_at', new Date(startDate).toISOString())
        .lte('created_at', new Date(endDate).toISOString());
    }
    
    if (type && type !== 'all') {
      countQuery = countQuery.eq('action', type);
    }
    
    if (search) {
      countQuery = countQuery.ilike('action', `%${search}%`);
    }

    // Paginación
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Ejecutar ambas queries
    const [{ count }, { data: activities, error }] = await Promise.all([
      countQuery,
      query
    ]);

    if (error) {
      console.error('❌ Error fetching activities:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error al obtener actividades',
        error: error.message
      });
    }

    console.log(`✅ Query exitosa - Encontradas ${activities.length} actividades de ${count} total`);

    // Filtrar por rol después de obtener los datos (para manejar el join)
    let filteredActivities = activities;
    if (isAdmin && userRole && userRole !== 'all') {
      console.log(`   🎯 Filtrando por rol: ${userRole}`);
      filteredActivities = activities.filter(activity => 
        activity.users && activity.users.role === userRole
      );
    }

    // Mapear actividades a formato esperado por el frontend
    const formattedActivities = filteredActivities.map(activity => ({
      id: activity.id,
      type: activity.action,
      description: generateActivityDescription(activity),
      date: new Date(activity.created_at),
      userId: activity.user_id,
      metadata: activity.metadata,
      user: activity.users ? {
        id: activity.users.id,
        run: activity.users.run,
        first_name: activity.users.first_name,
        last_name: activity.users.last_name,
        email: activity.users.email,
        role: activity.users.role,
        displayName: `${activity.users.first_name} ${activity.users.last_name}`,
        displayRole: getRoleDisplayName(activity.users.role)
      } : null
    }));

    console.log(`📋 Enviando ${formattedActivities.length} actividades formateadas`);

    res.status(200).json({
      status: 'success',
      data: {
        activities: formattedActivities,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        },
        isAdmin: isAdmin,
        debug: {
          userRole: req.user.role,
          isAdmin: isAdmin,
          totalFound: activities.length,
          totalCount: count,
          filtersApplied: {
            userId: !!userId,
            userRun: !!userRun,
            userRole: userRole && userRole !== 'all',
            date: !!date,
            dateRange: !!(startDate && endDate),
            type: type && type !== 'all',
            search: !!search
          }
        }
      }
    });

  } catch (error) {
    console.error('💥 Error in getActivities:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de actividad
 * GET /api/activity/stats
 * - Admin: estadísticas globales de toda la plataforma por defecto
 * - Usuario: solo sus estadísticas
 */
const getActivityStats = async (req, res) => {
  try {
    const { timeframe = '7d', userId, userRole } = req.query;
    const isAdmin = req.user.role === 'admin';

    console.log(`📊 Getting activity stats:`);
    console.log(`   User: ${req.user.id}, Role: ${req.user.role}, Admin: ${isAdmin}`);
    console.log(`   Filters: timeframe=${timeframe}, userId=${userId}, userRole=${userRole}`);

    // Calcular fecha de inicio según timeframe
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    let statsQuery = supabase
      .from('activity_logs')
      .select(`
        action,
        created_at,
        user_id,
        users:user_id (
          role
        )
      `)
      .gte('created_at', startDate.toISOString());

    // 🔥 LÓGICA CORREGIDA para stats también
    if (isAdmin) {
      console.log('👑 Admin stats - Global por defecto');
      // Solo filtrar si se especifica un usuario
      if (userId) {
        console.log(`   🎯 Stats para usuario específico: ${userId}`);
        statsQuery = statsQuery.eq('user_id', userId);
      }
      // Si no se especifica usuario, obtener stats de TODOS
    } else {
      console.log('👤 User stats - Solo propias');
      statsQuery = statsQuery.eq('user_id', req.user.id);
    }

    const { data: totalStats, error: totalError } = await statsQuery;

    if (totalError) {
      throw totalError;
    }

    console.log(`✅ Stats query exitosa - ${totalStats.length} registros`);

    // Filtrar por rol si se especifica (solo admin)
    let filteredStats = totalStats;
    if (isAdmin && userRole && userRole !== 'all') {
      console.log(`   🎯 Filtrando stats por rol: ${userRole}`);
      filteredStats = totalStats.filter(stat => 
        stat.users && stat.users.role === userRole
      );
    }

    // Contar por tipo de actividad
    const activityCounts = filteredStats.reduce((acc, activity) => {
      acc[activity.action] = (acc[activity.action] || 0) + 1;
      return acc;
    }, {});

    // Actividad por día
    const dailyActivity = filteredStats.reduce((acc, activity) => {
      const date = new Date(activity.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Estadísticas adicionales para admin
    let additionalStats = {};
    if (isAdmin && !userId) {
      // Stats por rol (solo para vista global de admin)
      const statsByRole = totalStats.reduce((acc, activity) => {
        if (activity.users && activity.users.role) {
          acc[activity.users.role] = (acc[activity.users.role] || 0) + 1;
        }
        return acc;
      }, {});

      const uniqueUsers = [...new Set(totalStats.map(s => s.user_id))];
      
      additionalStats = {
        byRole: statsByRole,
        uniqueUsers: uniqueUsers.length,
        totalGlobalActivities: totalStats.length
      };
      
      console.log(`📈 Stats adicionales para admin:`, additionalStats);
    }

    res.status(200).json({
      status: 'success',
      data: {
        totalActivities: filteredStats.length,
        activityByType: activityCounts,
        dailyActivity,
        timeframe,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        isAdmin: isAdmin,
        ...additionalStats
      }
    });

  } catch (error) {
    console.error('💥 Error in getActivityStats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

/**
 * Obtener actividades recientes para dashboard
 * GET /api/activity/recent
 */
const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10, userId } = req.query;
    const isAdmin = req.user.role === 'admin';

    console.log(`📋 Getting recent activities:`);
    console.log(`   User: ${req.user.id}, Admin: ${isAdmin}, Limit: ${limit}`);
    
    let recentQuery = supabase
      .from('activity_logs')
      .select(`
        id,
        action,
        entity_type,
        metadata,
        created_at,
        users:user_id (
          id,
          run,
          first_name,
          last_name,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    // 🔥 LÓGICA CORREGIDA para recientes también
    if (isAdmin) {
      console.log('👑 Admin recent - Global por defecto');
      if (userId) {
        console.log(`   🎯 Recent para usuario específico: ${userId}`);
        recentQuery = recentQuery.eq('user_id', userId);
      }
      // Si no se especifica usuario, obtener recientes de TODOS
    } else {
      console.log('👤 User recent - Solo propias');
      recentQuery = recentQuery.eq('user_id', req.user.id);
    }

    const { data: activities, error } = await recentQuery;

    if (error) {
      throw error;
    }

    console.log(`✅ Recent query exitosa - ${activities.length} actividades`);

    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      type: activity.action,
      description: generateActivityDescription(activity),
      date: new Date(activity.created_at),
      user: activity.users ? {
        id: activity.users.id,
        run: activity.users.run,
        first_name: activity.users.first_name,
        last_name: activity.users.last_name,
        role: activity.users.role,
        displayName: `${activity.users.first_name} ${activity.users.last_name}`,
        displayRole: getRoleDisplayName(activity.users.role)
      } : null
    }));

    res.status(200).json({
      status: 'success',
      data: formattedActivities,
      isAdmin: isAdmin
    });

  } catch (error) {
    console.error('💥 Error in getRecentActivity:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener actividad reciente',
      error: error.message
    });
  }
};

/**
 * Obtener usuarios disponibles para filtrar (solo admin)
 * GET /api/activity/users
 */
const getAvailableUsers = async (req, res) => {
  try {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Solo administradores pueden acceder a esta información.'
      });
    }

    const { search, role, limit = 50 } = req.query;

    console.log(`👥 Getting available users - Search: ${search}, Role: ${role}, Limit: ${limit}`);

    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        run,
        first_name,
        last_name,
        email,
        role
      `)
      .eq('is_active', true)
      .order('first_name')
      .limit(parseInt(limit));

    // Filtro por búsqueda
    if (search) {
      usersQuery = usersQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,run.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Filtro por rol
    if (role && role !== 'all') {
      usersQuery = usersQuery.eq('role', role);
    }

    const { data: users, error } = await usersQuery;

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${users.length} users`);

    const formattedUsers = users.map(user => ({
      id: user.id,
      run: user.run,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      role: user.role,
      displayRole: getRoleDisplayName(user.role),
      displayText: `${user.first_name} ${user.last_name} (${user.run}) - ${getRoleDisplayName(user.role)}`
    }));

    res.status(200).json({
      status: 'success',
      data: formattedUsers
    });

  } catch (error) {
    console.error('💥 Error in getAvailableUsers:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

/**
 * Formatear moneda - Función helper
 */
const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '$0';
  
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Generar descripción legible de la actividad - VERSIÓN FINAL MEJORADA PARA DESTINATARIOS
 */
const generateActivityDescription = (activity) => {
  const { action, entity_type, metadata, users } = activity;

  console.log('🔍 Generando descripción para actividad:', {
    action,
    entity_type,
    metadata: metadata ? 'presente' : 'ausente',
    metadataKeys: metadata ? Object.keys(metadata) : [],
    hasUser: !!users
  });

  switch (action) {
    case 'login':
      return 'Inicio de sesión exitoso';
    
    case 'logout':
      return 'Cierre de sesión';
    
    case 'change_password':
      return 'Contraseña cambiada exitosamente';
    
    case 'transfer':
    case 'transfer_sent':
      if (metadata) {
        console.log('📤 Procesando transferencia enviada, metadata completa:', JSON.stringify(metadata, null, 2));
        
        // Intentar TODAS las variaciones posibles para el monto
        const amount = metadata.amount || metadata.totalAmount || metadata.transferAmount || 
                      metadata.value || metadata.money || metadata.sum;
        
        // Intentar TODAS las variaciones posibles para el destinatario
        const recipient = metadata.recipient || metadata.recipientName || metadata.to_user_name || 
                         metadata.toUserName || metadata.targetUser || metadata.destinatario ||
                         metadata.receiver || metadata.receiverName || metadata.to_name ||
                         metadata.to_user || metadata.targetName || metadata.recipientUser ||
                         metadata.transferTo || metadata.sendTo;
        
        // Intentar TODAS las variaciones posibles para el RUN del destinatario
        const recipientRun = metadata.recipientRun || metadata.to_user_run || metadata.toUserRun ||
                            metadata.recipient_run || metadata.targetRun || metadata.receiverRun ||
                            metadata.to_run || metadata.destinatario_run;
        
        // Intentar variaciones para la descripción
        const description = metadata.description || metadata.transferDescription || metadata.memo ||
                           metadata.message || metadata.note || metadata.comment || metadata.reason;
        
        // Intentar variaciones para el conteo de destinatarios
        const recipientCount = metadata.recipientCount || metadata.recipients?.length || 
                             (metadata.recipientIds ? metadata.recipientIds.length : null) ||
                             metadata.targetCount || metadata.receiverCount || 1;

        // Intentar obtener información de arrays de destinatarios
        let recipientInfo = null;
        if (metadata.recipients && Array.isArray(metadata.recipients) && metadata.recipients.length > 0) {
          const firstRecipient = metadata.recipients[0];
          recipientInfo = {
            name: firstRecipient.name || firstRecipient.firstName + ' ' + firstRecipient.lastName ||
                  firstRecipient.displayName || firstRecipient.userName,
            run: firstRecipient.run || firstRecipient.id,
            count: metadata.recipients.length
          };
          console.log('   📋 Info de array recipients:', recipientInfo);
        }

        // Intentar obtener de recipientData si existe
        if (!recipient && metadata.recipientData) {
          console.log('   🔍 Buscando en recipientData:', metadata.recipientData);
          const recipientData = metadata.recipientData;
          if (recipientData.name || recipientData.firstName) {
            recipientInfo = {
              name: recipientData.name || `${recipientData.firstName} ${recipientData.lastName}`.trim(),
              run: recipientData.run,
              count: 1
            };
          }
        }

        console.log('   💰 Amount encontrado:', amount);
        console.log('   👤 Recipient encontrado:', recipient);
        console.log('   🆔 RecipientRun encontrado:', recipientRun);
        console.log('   📝 Description encontrada:', description);
        console.log('   🔢 RecipientCount:', recipientCount);
        console.log('   📋 RecipientInfo de array:', recipientInfo);

        // Construir descripción paso a paso
        let desc = 'Transferencia enviada';
        
        // Agregar destinatario
        const finalRecipient = recipient || recipientInfo?.name;
        const finalRecipientRun = recipientRun || recipientInfo?.run;
        const finalCount = recipientInfo?.count || recipientCount;
        
        if (finalRecipient) {
          desc += ` a ${finalRecipient}`;
          if (finalRecipientRun) {
            desc += ` (${finalRecipientRun})`;
          }
        }
        
        // Agregar monto
        if (amount) {
          desc += ` por ${formatCurrency(amount)}`;
        }
        
        // Agregar información de múltiples destinatarios
        if (finalCount && finalCount > 1) {
          desc += ` y ${finalCount - 1} personas más`;
        }
        
        // Agregar descripción
        if (description) {
          desc += ` - "${description}"`;
        }
        
        console.log('   ✅ Descripción final generada:', desc);
        return desc;
        
      } else {
        console.log('   ❌ No hay metadata para transfer');
      }
      return 'Transferencia enviada';
    
    case 'transfer_received':
      if (metadata) {
        console.log('📥 Procesando transferencia recibida, metadata completa:', JSON.stringify(metadata, null, 2));
        
        // Buscar monto en múltiples campos
        const amount = metadata.amount || metadata.receivedAmount || metadata.transferAmount ||
                      metadata.value || metadata.money;
        
        // Buscar remitente en múltiples campos
        const sender = metadata.sender || metadata.senderName || metadata.from_user_name || 
                      metadata.fromUserName || metadata.sourceUser || metadata.remitente ||
                      metadata.from_name || metadata.from_user || metadata.sourceName ||
                      metadata.transferFrom || metadata.sentBy;
        
        // Buscar RUN del remitente
        const senderRun = metadata.senderRun || metadata.from_user_run || metadata.fromUserRun ||
                         metadata.sender_run || metadata.sourceRun || metadata.from_run ||
                         metadata.remitente_run;
        
        // Buscar descripción
        const description = metadata.description || metadata.transferDescription || metadata.memo ||
                           metadata.message || metadata.note || metadata.comment || metadata.reason;

        console.log('   💰 Amount encontrado:', amount);
        console.log('   👤 Sender encontrado:', sender);
        console.log('   🆔 SenderRun encontrado:', senderRun);
        console.log('   📝 Description encontrada:', description);

        // Construir descripción
        let desc = 'Transferencia recibida';
        
        if (sender) {
          desc += ` de ${sender}`;
          if (senderRun) {
            desc += ` (${senderRun})`;
          }
        }
        
        if (amount) {
          desc += ` por ${formatCurrency(amount)}`;
        }
        
        if (description) {
          desc += ` - "${description}"`;
        }
        
        console.log('   ✅ Descripción final generada:', desc);
        return desc;
        
      } else {
        console.log('   ❌ No hay metadata para transfer_received');
      }
      return 'Transferencia recibida';
    
    case 'student_created':
      if (metadata && metadata.studentName) {
        return `Nuevo estudiante creado: ${metadata.studentName}`;
      }
      return 'Nuevo estudiante creado';
    
    case 'teacher_created':
      if (metadata && metadata.teacherName) {
        return `Nuevo docente creado: ${metadata.teacherName}`;
      }
      return 'Nuevo docente creado';
    
    case 'profile_updated':
      return 'Información de perfil actualizada';
    
    case 'failed_login':
      return 'Intento de login fallido';
    
    default:
      console.log(`   ❓ Acción desconocida: ${action}`);
      return `Actividad: ${action}`;
  }
};

/**
 * Obtener nombre legible del rol
 */
const getRoleDisplayName = (role) => {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'teacher':
      return 'Docente';
    case 'student':
      return 'Estudiante';
    default:
      return role;
  }
};

module.exports = {
  getActivities,
  getActivityStats,
  getRecentActivity,
  getAvailableUsers
};