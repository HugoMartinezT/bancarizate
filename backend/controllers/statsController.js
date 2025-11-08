// controllers/statsController.js
const { supabase } = require('../config/supabase');

// Utilidades comunes
const parseRange = (range = '30d') => {
  if (range === 'all') return null;
  const now = new Date();
  const since = new Date(now);
  const map = { '7d': 7, '30d': 30, '90d': 90 };
  const days = map[range] || 30;
  since.setDate(since.getDate() - days);
  return since.toISOString();
};

const groupKey = (dateStr, groupBy) => {
  const d = new Date(dateStr);
  if (groupBy === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-01`;
  }
  // default: day
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const sum = arr => arr.reduce((a,b)=>a+(+b||0), 0);

exports.getGlobalStats = async (req, res) => {
  try {
    const range = (req.query.range || '30d').toLowerCase();
    const groupBy = (req.query.groupBy || 'day').toLowerCase();
    const sinceISO = parseRange(range);

    // ------- USERS -------
    const roles = ['student','teacher','admin'];
    const usersByRole = {};
    for (const role of roles) {
      const { count } = await supabase.from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', role);
      usersByRole[role] = count || 0;
    }
    const { count: activeUsers } = await supabase.from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Saldos (circulante y sobregiro)
    const { data: usersBalances } = await supabase.from('users')
      .select('balance, overdraft_limit');
    const totalCirculating = sum((usersBalances||[]).map(u=>Number(u.balance||0)));
    const overdraftTotal  = sum((usersBalances||[]).map(u=>Number(u.overdraft_limit||0)));

    // ------- TRANSFERS -------
    // SINGLE completadas
    let singleFilters = supabase.from('transfers')
      .select('id, from_user_id, to_user_id, amount, created_at')
      .eq('status','completed')
      .eq('type','single');
    if (sinceISO) singleFilters = singleFilters.gte('created_at', sinceISO);
    const { data: single } = await singleFilters;

    // MULTIPLE (ids) → recipients
    let multiFilters = supabase.from('transfers')
      .select('id, from_user_id, created_at')
      .eq('status','completed')
      .eq('type','multiple');
    if (sinceISO) multiFilters = multiFilters.gte('created_at', sinceISO);
    const { data: multipleTransfers } = await multiFilters;
    const multiIds = (multipleTransfers||[]).map(t=>t.id);

    let recipients = [];
    if (multiIds.length) {
      const { data: rec } = await supabase.from('transfer_recipients')
        .select('transfer_id, user_id, amount')
        .in('transfer_id', multiIds);
      recipients = rec || [];
    }

    // Conteos por estado (completadas ya las tenemos)
    const statusList = ['completed','failed','cancelled','pending'];
    const countByStatus = {};
    for (const st of statusList) {
      let q = supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('status', st);
      if (sinceISO) q = q.gte('created_at', sinceISO);
      const { count } = await q;
      countByStatus[st] = count || 0;
    }

    // Totales enviados/recibidos globales
    const sent_total_single     = sum((single||[]).map(t=>Number(t.amount||0)));
    const sent_total_multiple   = sum((recipients||[]).map(r=>Number(r.amount||0)));
    const sent_total            = sent_total_single + sent_total_multiple;

    // Para "recibido" global contamos:
    //  - single recibidas: to_user_id != null
    const received_total_single = sum((single||[])
                                    .filter(t=>t.to_user_id)
                                    .map(t=>Number(t.amount||0)));
    //  - multiple recibidas: recipients.amount (ya sumado arriba es lo mismo)
    const received_total_multiple = sent_total_multiple; // es el mismo universo
    const received_total          = received_total_single + received_total_multiple;

    const net_flow = received_total - sent_total;

    // Series por día/mes
    const seriesMap = new Map();
    const bump = (k, fld, v) => {
      if (!seriesMap.has(k)) seriesMap.set(k, { date: k, 
        sent_count:0, received_count:0, sent_amount:0, received_amount:0,
        unique_senders: new Set(), unique_receivers: new Set()
      });
      const obj = seriesMap.get(k);
      obj[fld] += v;
    };
    const markSet = (k, key, id) => {
      const obj = seriesMap.get(k);
      (obj[key]).add(id);
    };

    // SINGLE
    (single||[]).forEach(t=>{
      const k = groupKey(t.created_at, groupBy);
      // enviados (from_user_id)
      bump(k, 'sent_count', 1);
      bump(k, 'sent_amount', Number(t.amount||0));
      markSet(k, 'unique_senders', t.from_user_id);
      // recibidos si tiene to_user_id
      if (t.to_user_id) {
        bump(k, 'received_count', 1);
        bump(k, 'received_amount', Number(t.amount||0));
        markSet(k, 'unique_receivers', t.to_user_id);
      }
    });
    // MULTIPLE (usar recipients como "recibidos"; y contar envío del remitente por cada transfer_id)
    const multiById = new Map((multipleTransfers||[]).map(t=>[t.id, t]));
    (recipients||[]).forEach(r=>{
      const t = multiById.get(r.transfer_id);
      if (!t) return;
      const k = groupKey(t.created_at, groupBy);
      // recibido (cada destinatario)
      bump(k, 'received_count', 1);
      bump(k, 'received_amount', Number(r.amount||0));
      markSet(k, 'unique_receivers', r.user_id);
      // enviado (por el remitente, contar como 1 por transfer en esa fecha)
      bump(k, 'sent_amount', Number(r.amount||0));
      markSet(k, 'unique_senders', t.from_user_id);
    });

    const series = Array.from(seriesMap.values())
      .sort((a,b)=>a.date.localeCompare(b.date))
      .map(row => ({
        ...row,
        unique_senders: row.unique_senders.size,
        unique_receivers: row.unique_receivers.size
      }));

    // TOPs
    const topSendersMap = new Map();     // from_user_id → {amount, count}
    const topReceiversMap = new Map();   // to_user_id/user_id → {amount, count}

    (single||[]).forEach(t=>{
      // senders
      const s = t.from_user_id;
      topSendersMap.set(s, {
        amount: (topSendersMap.get(s)?.amount||0) + Number(t.amount||0),
        count:  (topSendersMap.get(s)?.count||0) + 1
      });
      // receivers
      if (t.to_user_id) {
        const rcv = t.to_user_id;
        topReceiversMap.set(rcv, {
          amount: (topReceiversMap.get(rcv)?.amount||0) + Number(t.amount||0),
          count:  (topReceiversMap.get(rcv)?.count||0) + 1
        });
      }
    });
    (recipients||[]).forEach(r=>{
      // receivers (multiple)
      topReceiversMap.set(r.user_id, {
        amount: (topReceiversMap.get(r.user_id)?.amount||0) + Number(r.amount||0),
        count:  (topReceiversMap.get(r.user_id)?.count||0) + 1
      });
      // sender amounts ya sumados arriba (como enviados)
      const t = multiById.get(r.transfer_id);
      if (t) {
        topSendersMap.set(t.from_user_id, {
          amount: (topSendersMap.get(t.from_user_id)?.amount||0) + Number(r.amount||0),
          count:  (topSendersMap.get(t.from_user_id)?.count||0) + 1
        });
      }
    });

    // Obtener nombres/RUN para los TOPs
    const topN = (map) => Array.from(map.entries())
      .sort((a,b)=>b[1].amount - a[1].amount)
      .slice(0,5)
      .map(([user_id, stats]) => ({ user_id, ...stats }));

    const topSenders = topN(topSendersMap);
    const topReceivers = topN(topReceiversMap);
    const userIds = [...new Set([...topSenders.map(t=>t.user_id), ...topReceivers.map(r=>r.user_id)])];

    let userInfo = {};
    if (userIds.length) {
      const { data: usersInfo } = await supabase.from('users')
        .select('id, run, first_name, last_name')
        .in('id', userIds);
      (usersInfo||[]).forEach(u => {
        userInfo[u.id] = {
          name: `${u.first_name} ${u.last_name}`.trim(),
          run: u.run
        };
      });
    }

    const decorate = arr => arr.map(it => ({
      ...it,
      name: userInfo[it.user_id]?.name || 'Usuario',
      run: userInfo[it.user_id]?.run || 'N/A'
    }));

    // ------- ACTIVITY -------
    // logins últimas 24h
    const since24h = new Date(); since24h.setDate(since24h.getDate()-1);
    const { data: logins24 } = await supabase.from('activity_logs')
      .select('user_id, created_at')
      .eq('action','login')
      .gte('created_at', since24h.toISOString());
    const logins_24h = (logins24||[]).length;
    const active_users_7d = (await supabase.from('activity_logs')
      .select('user_id')
      .eq('action','login')
      .gte('created_at', (d=>{d.setDate(d.getDate()-7); return d})(new Date()).toISOString())
    ).data?.reduce((set, r)=>set.add(r.user_id), new Set()).size || 0;
    const total_activities_7d = (await supabase.from('activity_logs')
      .select('id', { count:'exact', head:true })
      .gte('created_at', (d=>{d.setDate(d.getDate()-7); return d})(new Date()).toISOString())
    ).count || 0;

    return res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: (usersByRole.student + usersByRole.teacher + usersByRole.admin),
          byRole: usersByRole,
          active: activeUsers || 0,
          circulating: totalCirculating,
          overdraft_total: overdraftTotal
        },
        transfers: {
          count: countByStatus,
          volume: { sent_total, received_total, net_flow },
          series,
          top_senders: decorate(topSenders),
          top_receivers: decorate(topReceivers)
        },
        activity: {
          logins_24h,
          active_users_7d,
          total_activities_7d
        }
      }
    });

  } catch (err) {
    console.error('getGlobalStats error', err);
    return res.status(500).json({ status:'error', message:'Error obteniendo estadísticas', error: String(err?.message||err) });
  }
};
