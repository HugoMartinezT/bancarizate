// controllers/dashboardController.js
// Estadísticas globales del sistema BANCARIZATE

const { supabase } = require('../config/supabase');

// ====================== Helpers generales ======================

const parseRange = (range = '30d') => {
  if (!range) return '30d';
  const r = String(range).toLowerCase();
  if (['7d', '30d', '90d', 'all'].includes(r)) return r;
  return '30d';
};

const getSinceISO = (range) => {
  const resolved = parseRange(range);
  if (resolved === 'all') return null;

  const now = new Date();
  const since = new Date(now);
  const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[resolved] || 30;
  since.setDate(since.getDate() - days);
  return since.toISOString();
};

const groupKey = (dateStr, groupBy = 'day') => {
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  if (groupBy === 'month') {
    // primer día del mes
    return `${yyyy}-${mm}-01`;
  }
  return `${yyyy}-${mm}-${dd}`;
};

const sum = (arr) => arr.reduce((acc, v) => acc + (Number(v) || 0), 0);

// ====================== GET /api/dashboard/stats ======================

const getDashboardStats = async (req, res) => {
  try {
    const range = parseRange(req.query.range || '30d');
    const groupBy = (req.query.groupBy || 'day').toLowerCase() === 'month' ? 'month' : 'day';
    const sinceISO = getSinceISO(range);

    console.log(`📊 [Dashboard] Generando estadísticas. range=${range}, groupBy=${groupBy}`);

    // ---------- USUARIOS ----------
    const roles = ['student', 'teacher', 'admin'];
    const usersByRole = {};

    for (const role of roles) {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', role);

      if (error) {
        console.error(`❌ Error contando usuarios role=${role}`, error);
        usersByRole[role] = 0;
      } else {
        usersByRole[role] = count || 0;
      }
    }

    const { count: activeUsers, error: activeErr } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (activeErr) console.error('❌ Error contando usuarios activos', activeErr);

    const { data: balancesData, error: balanceErr } = await supabase
      .from('users')
      .select('balance, overdraft_limit');

    if (balanceErr) console.error('❌ Error obteniendo balances de usuarios', balanceErr);

    const balances = balancesData || [];
    const totalCirculating = sum(balances.map(u => u.balance));
    const overdraftTotal = sum(balances.map(u => u.overdraft_limit));

    // ---------- TRANSFERENCIAS ----------
    // Traemos TODAS las transferencias en el rango para:
    // - contar por estado
    // - calcular volumen solo con status='completed'
    let tQuery = supabase
      .from('transfers')
      .select('id, from_user_id, to_user_id, amount, type, status, created_at');

    if (sinceISO) {
      tQuery = tQuery.gte('created_at', sinceISO);
    }

    const { data: allTransfers, error: tErr } = await tQuery;
    if (tErr) {
      console.error('❌ Error obteniendo transferencias para stats', tErr);
      return res.status(500).json({
        status: 'error',
        message: 'Error al obtener estadísticas de transferencias'
      });
    }

    const transfers = allTransfers || [];

    // Conteo por estado
    const statusList = ['completed', 'failed', 'cancelled', 'pending'];
    const countByStatus = statusList.reduce((acc, st) => {
      acc[st] = transfers.filter(t => t.status === st).length;
      return acc;
    }, {});

    // Sólo usamos COMPLETED para volumen y series
    const completedTransfers = transfers.filter(t => t.status === 'completed');

    // IDs de múltiples para buscar recipients
    const multiCompleted = completedTransfers.filter(t => t.type === 'multiple');
    const multiIds = multiCompleted.map(t => t.id);

    let recipients = [];
    if (multiIds.length) {
      const { data: rec, error: recErr } = await supabase
        .from('transfer_recipients')
        .select('transfer_id, user_id, amount')
        .in('transfer_id', multiIds);

      if (recErr) {
        console.error('❌ Error obteniendo transfer_recipients', recErr);
      } else {
        recipients = rec || [];
      }
    }

    // Volúmenes
    const sent_total = sum(completedTransfers.map(t => t.amount));
    const received_total_single = sum(
      completedTransfers
        .filter(t => t.to_user_id)
        .map(t => t.amount)
    );
    const received_total_multi = sum(recipients.map(r => r.amount));
    const received_total = received_total_single + received_total_multi;
    const net_flow = received_total - sent_total;

    // Series por fecha
    const seriesMap = new Map();

    const ensureRow = (key) => {
      if (!seriesMap.has(key)) {
        seriesMap.set(key, {
          date: key,
          sent_count: 0,
          received_count: 0,
          sent_amount: 0,
          received_amount: 0,
          unique_senders: new Set(),
          unique_receivers: new Set()
        });
      }
      return seriesMap.get(key);
    };

    // SINGLE completadas
    completedTransfers
      .filter(t => t.type === 'single')
      .forEach(t => {
        const key = groupKey(t.created_at, groupBy);
        const row = ensureRow(key);

        // enviados
        row.sent_amount += Number(t.amount || 0);
        row.sent_count += 1;
        row.unique_senders.add(t.from_user_id);

        // recibidos si tiene to_user_id
        if (t.to_user_id) {
          row.received_amount += Number(t.amount || 0);
          row.received_count += 1;
          row.unique_receivers.add(t.to_user_id);
        }
      });

    // MÚLTIPLES completadas
    const multiMap = new Map(multiCompleted.map(t => [t.id, t]));
    multiCompleted.forEach(t => {
      const key = groupKey(t.created_at, groupBy);
      const row = ensureRow(key);

      row.sent_amount += Number(t.amount || 0);
      row.sent_count += 1;
      row.unique_senders.add(t.from_user_id);
    });

    recipients.forEach(r => {
      const t = multiMap.get(r.transfer_id);
      if (!t) return;
      const key = groupKey(t.created_at, groupBy);
      const row = ensureRow(key);

      row.received_amount += Number(r.amount || 0);
      row.received_count += 1;
      row.unique_receivers.add(r.user_id);
    });

    const series = Array.from(seriesMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(row => ({
        date: row.date,
        sent_count: row.sent_count,
        received_count: row.received_count,
        sent_amount: row.sent_amount,
        received_amount: row.received_amount,
        unique_senders: row.unique_senders.size,
        unique_receivers: row.unique_receivers.size
      }));

    // Top emisores y receptores
    const topSendersMap = new Map();   // from_user_id → {amount, count}
    const topReceiversMap = new Map(); // to_user_id/user_id → {amount, count}

    completedTransfers.forEach(t => {
      // emisores
      const s = t.from_user_id;
      if (s) {
        const prev = topSendersMap.get(s) || { amount: 0, count: 0 };
        prev.amount += Number(t.amount || 0);
        prev.count += 1;
        topSendersMap.set(s, prev);
      }

      // receptores single
      if (t.to_user_id) {
        const r = t.to_user_id;
        const prevR = topReceiversMap.get(r) || { amount: 0, count: 0 };
        prevR.amount += Number(t.amount || 0);
        prevR.count += 1;
        topReceiversMap.set(r, prevR);
      }
    });

    recipients.forEach(r => {
      const to = r.user_id;
      const prevR = topReceiversMap.get(to) || { amount: 0, count: 0 };
      prevR.amount += Number(r.amount || 0);
      prevR.count += 1;
      topReceiversMap.set(to, prevR);
    });

    const topN = (map) =>
      Array.from(map.entries())
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 5)
        .map(([user_id, stats]) => ({ user_id, ...stats }));

    const rawTopSenders = topN(topSendersMap);
    const rawTopReceivers = topN(topReceiversMap);

    const topUserIds = [
      ...new Set([
        ...rawTopSenders.map(t => t.user_id),
        ...rawTopReceivers.map(t => t.user_id)
      ])
    ];

    let usersInfoMap = {};
    if (topUserIds.length) {
      const { data: uinfo, error: uErr } = await supabase
        .from('users')
        .select('id, run, first_name, last_name')
        .in('id', topUserIds);

      if (uErr) {
        console.error('❌ Error obteniendo info de usuarios top', uErr);
      } else {
        (uinfo || []).forEach(u => {
          usersInfoMap[u.id] = {
            name: `${u.first_name} ${u.last_name}`.trim(),
            run: u.run
          };
        });
      }
    }

    const decorateTop = (arr) =>
      arr.map(t => ({
        ...t,
        name: usersInfoMap[t.user_id]?.name || 'Usuario',
        run: usersInfoMap[t.user_id]?.run || 'N/A'
      }));

    // ---------- ACTIVITY LOGS ----------
    const now = new Date();

    const since24h = new Date(now);
    since24h.setDate(since24h.getDate() - 1);

    const since7d = new Date(now);
    since7d.setDate(since7d.getDate() - 7);

    // logins últimas 24h
    const { data: login24, error: login24Err } = await supabase
      .from('activity_logs')
      .select('id')
      .eq('action', 'login')
      .gte('created_at', since24h.toISOString());

    if (login24Err) console.error('❌ Error logins 24h', login24Err);

    const logins_24h = (login24 || []).length;

    // usuarios activos 7d (login)
    const { data: login7d, error: login7Err } = await supabase
      .from('activity_logs')
      .select('user_id')
      .eq('action', 'login')
      .gte('created_at', since7d.toISOString());

    if (login7Err) console.error('❌ Error logins 7d', login7Err);

    const active_users_7d = new Set(
      (login7d || []).map(r => r.user_id)
    ).size;

    // total de acciones 7d
    const { count: total_activities_7d, error: act7Err } = await supabase
      .from('activity_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since7d.toISOString());

    if (act7Err) console.error('❌ Error contando activity_logs 7d', act7Err);

    // ---------- RESPUESTA ----------
    const response = {
      status: 'success',
      data: {
        users: {
          total: (usersByRole.student || 0) + (usersByRole.teacher || 0) + (usersByRole.admin || 0),
          byRole: usersByRole,
          active: activeUsers || 0,
          circulating: totalCirculating,
          overdraft_total: overdraftTotal
        },
        transfers: {
          count: countByStatus,
          volume: {
            sent_total,
            received_total,
            net_flow
          },
          series,
          top_senders: decorateTop(rawTopSenders),
          top_receivers: decorateTop(rawTopReceivers)
        },
        activity: {
          logins_24h,
          active_users_7d,
          total_activities_7d: total_activities_7d || 0
        }
      }
    };

    console.log('✅ [Dashboard] Estadísticas generadas correctamente');
    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ [Dashboard] Error en getDashboardStats:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener estadísticas del dashboard',
      error: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined
    });
  }
};

// ====================== GET /api/dashboard/recent-activity ======================
// Actividad global muy simple (últimas transferencias completadas)

const getRecentActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .from('transfers')
      .select(
        `
        id,
        from_user_id,
        to_user_id,
        amount,
        type,
        status,
        created_at,
        sender:from_user_id(id, first_name, last_name, run, role),
        recipient:to_user_id(id, first_name, last_name, run, role)
      `
      )
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit, 10));

    if (error) {
      console.error('❌ Error en getRecentActivity', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error al obtener actividad reciente'
      });
    }

    const items = (data || []).map(t => ({
      id: t.id,
      amount: Number(t.amount || 0),
      type: t.type,
      status: t.status,
      date: t.created_at,
      sender: t.sender
        ? {
            id: t.sender.id,
            name: `${t.sender.first_name} ${t.sender.last_name}`,
            run: t.sender.run,
            role: t.sender.role
          }
        : null,
      recipient: t.recipient
        ? {
            id: t.recipient.id,
            name: `${t.recipient.first_name} ${t.recipient.last_name}`,
            run: t.recipient.run,
            role: t.recipient.role
          }
        : null
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        items
      }
    });
  } catch (error) {
    console.error('❌ [Dashboard] Error en getRecentActivity:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al obtener actividad reciente del dashboard'
    });
  }
};

// ====================== GET /api/dashboard/balance-history ======================
// Serie temporal de volumen global (solo completadas)

const getBalanceHistory = async (req, res) => {
  try {
    const range = parseRange(req.query.range || '30d');
    const groupBy = (req.query.groupBy || 'day').toLowerCase() === 'month' ? 'month' : 'day';
    const sinceISO = getSinceISO(range);

    let q = supabase
      .from('transfers')
      .select('id, amount, status, created_at')
      .eq('status', 'completed');

    if (sinceISO) {
      q = q.gte('created_at', sinceISO);
    }

    const { data, error } = await q;
    if (error) {
      console.error('❌ Error en getBalanceHistory', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error al obtener historial de balance'
      });
    }

    const seriesMap = new Map();

    (data || []).forEach(t => {
      const key = groupKey(t.created_at, groupBy);
      if (!seriesMap.has(key)) {
        seriesMap.set(key, {
          date: key,
          volume: 0,
          count: 0
        });
      }
      const row = seriesMap.get(key);
      row.volume += Number(t.amount || 0);
      row.count += 1;
    });

    const series = Array.from(seriesMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return res.status(200).json({
      status: 'success',
      data: {
        series,
        range,
        groupBy
      }
    });
  } catch (error) {
    console.error('❌ [Dashboard] Error en getBalanceHistory:', error);
    return res.status(500).json({
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
