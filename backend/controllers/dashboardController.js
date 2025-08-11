// controllers/dashboardController.js
const { supabase } = require('../config/supabase');

// Obtener estadísticas del dashboard
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Estadísticas básicas del usuario
    const stats = {
      balance: parseFloat(req.user.balance),
      overdraftLimit: parseFloat(req.user.overdraft_limit),
      availableBalance: parseFloat(req.user.balance) + parseFloat(req.user.overdraft_limit)
    };

    // Obtener estadísticas de transferencias del último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Transferencias enviadas
    const { data: sentTransfers } = await supabase
      .from('transfers')
      .select('amount')
      .eq('from_user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', lastMonth.toISOString());

    // Transferencias recibidas
    const { data: receivedTransfers } = await supabase
      .from('transfers')
      .select('amount')
      .eq('to_user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', lastMonth.toISOString());

    // Calcular totales
    stats.totalSent = sentTransfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    stats.totalReceived = receivedTransfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    stats.monthlyFlow = stats.totalReceived - stats.totalSent;

    // Estadísticas adicionales según el rol
    if (userRole === 'admin') {
      // Total de usuarios
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Total de estudiantes activos
      const { count: activeStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Total de docentes activos
      const { count: activeTeachers } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Volumen total de transferencias del mes
      const { data: monthlyVolume } = await supabase
        .from('transfers')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', lastMonth.toISOString());

      stats.admin = {
        totalUsers,
        activeStudents,
        activeTeachers,
        monthlyTransactionVolume: monthlyVolume?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0,
        monthlyTransactionCount: monthlyVolume?.length || 0
      };
    }

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener estadísticas del dashboard'
    });
  }
};

// Obtener actividad reciente
const getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Obtener transferencias recientes
    const { data: recentTransfers, error } = await supabase
      .from('transfers')
      .select(`
        id,
        from_user_id,
        to_user_id,
        amount,
        description,
        status,
        type,
        created_at,
        sender:from_user_id(first_name, last_name, run),
        recipient:to_user_id(first_name, last_name, run)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Formatear actividades
    const activities = recentTransfers.map(transfer => {
      const isIncoming = transfer.to_user_id === userId;
      
      return {
        id: transfer.id,
        type: isIncoming ? 'income' : 'expense',
        description: transfer.description,
        amount: parseFloat(transfer.amount),
        date: transfer.created_at,
        status: transfer.status,
        person: isIncoming ? 
          (transfer.sender ? `${transfer.sender.first_name} ${transfer.sender.last_name}` : 'Desconocido') :
          (transfer.recipient ? `${transfer.recipient.first_name} ${transfer.recipient.last_name}` : 'Múltiples'),
        personRun: isIncoming ? transfer.sender?.run : transfer.recipient?.run
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        activities
      }
    });

  } catch (error) {
    console.error('Error obteniendo actividad reciente:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener actividad reciente'
    });
  }
};

// Obtener historial de balance
const getBalanceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Obtener todas las transferencias del período
    const { data: transfers, error } = await supabase
      .from('transfers')
      .select('from_user_id, to_user_id, amount, created_at')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Construir historial de balance
    let currentBalance = parseFloat(req.user.balance);
    const history = [];

    // Agregar punto inicial
    history.push({
      date: new Date().toISOString(),
      balance: currentBalance
    });

    // Recorrer transferencias en orden inverso para reconstruir el historial
    for (let i = transfers.length - 1; i >= 0; i--) {
      const transfer = transfers[i];
      const amount = parseFloat(transfer.amount);
      
      if (transfer.from_user_id === userId) {
        currentBalance += amount; // Revertir gasto
      } else {
        currentBalance -= amount; // Revertir ingreso
      }
      
      history.unshift({
        date: transfer.created_at,
        balance: currentBalance
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        history
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial de balance:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener historial de balance'
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentActivity,
  getBalanceHistory
};