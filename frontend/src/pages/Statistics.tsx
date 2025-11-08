import { useEffect, useMemo, useState } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, Users, 
  Calendar, ArrowUpRight, ArrowDownLeft, Shield, User,
  Activity as ActivityIcon, Clock, Loader2, RefreshCw, ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiService } from '../services/api';

type RangeOpt = '7d'|'30d'|'90d'|'all';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount||0);

// ==========================
// Utilidades visuales
// ==========================
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 ${className}`} />
);

// ==========================
// Componente de gráfico de barras minimalista
// ==========================
interface BarChartProps {
  data: Array<{
    label: string;
    sent: number;
    received: number;
  }>;
  maxSent: number;
  maxRecv: number;
}

const MinimalBarChart = ({ data, maxSent, maxRecv }: BarChartProps) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Sin datos en el rango seleccionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const sentPct = Math.min(100, ((item.sent || 0) / maxSent) * 100);
        const recvPct = Math.min(100, ((item.received || 0) / maxRecv) * 100);
        const netFlow = (item.received || 0) - (item.sent || 0);

        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className={`font-semibold ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
              </span>
            </div>
            
            {/* Barra dual mejorada */}
            <div className="relative h-10 flex items-center gap-2">
              {/* Barra de recibido */}
              <div className="relative flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#193cb8] to-[#2563eb] rounded-lg transition-all duration-500 shadow-sm"
                  style={{ width: `${recvPct}%` }}
                >
                  {item.received > 0 && (
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-xs font-semibold text-white drop-shadow">
                        {formatCurrency(item.received)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de enviado */}
              <div className="relative flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-gray-400 to-gray-500 rounded-lg transition-all duration-500 shadow-sm"
                  style={{ width: `${sentPct}%` }}
                >
                  {item.sent > 0 && (
                    <div className="absolute inset-0 flex items-center justify-end pr-2">
                      <span className="text-xs font-semibold text-white drop-shadow">
                        {formatCurrency(item.sent)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Leyenda */}
      <div className="flex justify-center items-center gap-6 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-[#193cb8] to-[#2563eb]"></div>
          <span className="text-xs font-medium text-gray-600">Recibido</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-gray-400 to-gray-500"></div>
          <span className="text-xs font-medium text-gray-600">Enviado</span>
        </div>
      </div>
    </div>
  );
};

// ==========================
// Tarjeta de estadística mejorada y compacta
// ==========================
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | React.ReactNode;
  subtitle: string;
  trend?: number;
  iconBgColor: string;
  iconColor: string;
  valueColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  iconBgColor,
  iconColor,
  valueColor,
}) => (
  <button 
    type="button" 
    className="w-full text-left bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md hover:border-gray-200 transition-all duration-300 group relative overflow-hidden active:scale-[.97]"
  >
    {/* Fondo decorativo sutil */}
    <div className={`absolute top-0 right-0 w-20 h-20 ${iconBgColor} opacity-5 rounded-full -translate-y-6 translate-x-6 group-hover:scale-110 transition-transform duration-300`} />

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${iconBgColor} group-hover:scale-105 transition-all duration-200 shadow-sm`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {typeof trend === 'number' && trend !== 0 && (
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
            trend > 0
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">{title}</p>
        <div className={`text-lg font-bold ${valueColor || 'text-gray-900'} mb-0.5`}>
          {value}
        </div>
        <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
      </div>
    </div>
  </button>
); // <-- CORREGIDO: Se eliminó el ); extra de aquí

// ==========================
// Componente principal
// ==========================
const Statistics = () => {
  const [tab, setTab] = useState<'global'|'mine'>('global');
  const [range, setRange] = useState<RangeOpt>('30d');
  const [groupBy, setGroupBy] = useState<'day'|'month'>('day');
  const [loading, setLoading] = useState(true);
  const [g, setG] = useState<any>(null);   // global stats
  const [me, setMe] = useState<any>(null); // my stats
  const [error, setError] = useState<string|null>(null);
  
  // Estados para paginación del gráfico
  const [chartPage, setChartPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const load = async () => {
    try {
      setLoading(true); 
      setError(null);
      const [globalRes, meRes] = await Promise.all([
        apiService.request(`/dashboard/stats?range=${range}&groupBy=${groupBy}`),
        apiService.request(`/transfers/stats?range=${range}`)
      ]);
      setG(globalRes?.data || globalRes);
      setMe(meRes?.data || meRes);
    } catch (e:any) {
      setError(e?.message || 'Error cargando estadísticas');
      console.error('Statistics load error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [range, groupBy]);

  const series = useMemo(()=>{
    const s = (tab==='global' ? g?.transfers?.series : me?.series) || [];
    return Array.isArray(s) ? s : [];
  }, [tab, g, me]);

  // Calcular máximos para barras
  const maxSent = useMemo(()=> Math.max(1, ...series.map((d:any)=>+d.sent_amount||0)), [series]);
  const maxRecv = useMemo(()=> Math.max(1, ...series.map((d:any)=>+d.received_amount||0)), [series]);

  // Formatear datos para el gráfico con paginación
  const allChartData = useMemo(() => {
    return series.map((d: any) => ({
      label: d.date,
      sent: +d.sent_amount || 0,
      received: +d.received_amount || 0,
    }));
  }, [series]);

  // Datos paginados
  const chartData = useMemo(() => {
    const start = chartPage * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return allChartData.slice(start, end);
  }, [allChartData, chartPage]);

  const totalPages = Math.ceil(allChartData.length / ITEMS_PER_PAGE);
  
  // Reset page cuando cambia el rango o agrupación
  useEffect(() => {
    setChartPage(0);
  }, [range, groupBy, tab]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <Loader2 className="w-8 h-8 text-[#193cb8] animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Estadísticas</h1>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={load}
            className="btn-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const users = g?.users || {};
  const transfers = g?.transfers || {};
  const activity = g?.activity || {};
  const mine = me || {};

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header compacto con fondo azul */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Estadísticas</h1>
              <p className="text-blue-200 text-xs">
                Análisis detallado de la actividad {tab === 'global' ? 'de la plataforma' : 'de tu cuenta'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tabs compactos */}
            <div className="flex rounded-md overflow-hidden border border-white/20 shadow-sm">
              <button 
                onClick={()=>setTab('global')}
                className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  tab==='global'
                    ?'bg-white text-[#193cb8] shadow-sm'
                    :'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Global
              </button>
              <button 
                onClick={()=>setTab('mine')}
                className={`px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  tab==='mine'
                    ?'bg-white text-[#193cb8] shadow-sm'
                    :'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Mi cuenta
              </button>
            </div>

            {/* Range selector compacto */}
            <select 
              className="px-3 py-1.5 text-xs font-medium border border-white/20 rounded-md bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200" 
              value={range} 
              onChange={e=>setRange(e.target.value as RangeOpt)}
            >
              <option value="7d" className="text-gray-900">Últimos 7 días</option>
              <option value="30d" className="text-gray-900">Últimos 30 días</option>
              <option value="90d" className="text-gray-900">Últimos 90 días</option>
              <option value="all" className="text-gray-900">Todo el período</option>
            </select>

            {/* Group by button compacto */}
            <button 
              className="px-3 py-1.5 text-xs font-medium border border-white/20 rounded-md bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200 inline-flex items-center gap-1.5" 
              onClick={()=>setGroupBy(p=>p==='day'?'month':'day')}
            >
              <Calendar className="w-3.5 h-3.5" />
              {groupBy==='day' ? 'Por mes' : 'Por día'}
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen más compactas */}
      {tab==='global' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard
              icon={ArrowDownLeft}
              title="Total Recibido"
              value={formatCurrency(transfers?.volume?.received_total || 0)}
              subtitle="Ingresos del período"
              iconBgColor="bg-blue-100"
              iconColor="text-[#193cb8]"
              valueColor="text-gray-900"
            />

            <StatCard
              icon={ArrowUpRight}
              title="Total Enviado"
              value={formatCurrency(transfers?.volume?.sent_total || 0)}
              subtitle="Egresos del período"
              iconBgColor="bg-gray-100"
              iconColor="text-gray-600"
              valueColor="text-gray-900"
            />

            <StatCard
              icon={DollarSign}
              title="Flujo Neto"
              value={formatCurrency(transfers?.volume?.net_flow || 0)}
              subtitle="Balance del período"
              iconBgColor="bg-blue-50"
              iconColor="text-[#193cb8]"
              valueColor={(transfers?.volume?.net_flow||0)>=0 ? 'text-blue-600' : 'text-gray-600'}
            />

            <StatCard
              icon={Users}
              title="Usuarios Activos"
              value={users?.active ?? 0}
              subtitle="Total activos"
              iconBgColor="bg-blue-50"
              iconColor="text-[#193cb8]"
              valueColor="text-gray-900"
            />
          </div>

          {/* Información adicional en tarjetas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Usuarios por rol */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#193cb8]" />
                Usuarios por rol
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#193cb8]"></div>
                    <span className="text-xs font-medium text-gray-700">Estudiantes</span>
                  </div>
                  <span className="text-sm font-bold text-[#193cb8]">{users?.by_role?.student ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                    <span className="text-xs font-medium text-gray-700">Docentes</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{users?.by_role?.teacher ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                    <span className="text-xs font-medium text-gray-700">Administradores</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{users?.by_role?.admin ?? 0}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Circulante</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(users?.circulating || 0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Sobregiro</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(users?.overdraft_total || 0)}</span>
                </div>
              </div>
            </div>

            {/* Actividad */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <ActivityIcon className="w-4 h-4 text-[#193cb8]" />
                Actividad reciente
              </h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-1.5">
                    <ActivityIcon className="w-3.5 h-3.5 text-[#193cb8]" />
                    <span className="text-xs font-medium text-gray-700">Logins 24h</span>
                  </div>
                  <span className="text-sm font-bold text-[#193cb8]">{activity?.logins_24h ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">Activos 7d</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{activity?.active_users_7d ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-xs font-medium text-gray-700">Acciones 7d</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{activity?.total_activities_7d ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Estados de transferencias */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#193cb8]" />
                Estados de transferencias
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'completed', label: 'Completadas', color: 'bg-blue-50 border-blue-100 text-blue-700' },
                  { key: 'failed', label: 'Fallidas', color: 'bg-gray-50 border-gray-100 text-gray-700' },
                  { key: 'cancelled', label: 'Canceladas', color: 'bg-gray-50 border-gray-100 text-gray-600' },
                  { key: 'pending', label: 'Pendientes', color: 'bg-gray-50 border-gray-100 text-gray-600' }
                ].map(({key, label, color})=>(
                  <div key={key} className={`p-2 rounded-lg border ${color} text-center`}>
                    <div className="text-xs font-medium capitalize mb-0.5">{label}</div>
                    <div className="text-lg font-bold">{transfers?.count?.[key] ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        // MI CUENTA
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={ArrowDownLeft}
              title="Recibido"
              value={formatCurrency(mine?.received?.total_amount||0)}
              subtitle="Total recibido en el período"
              iconBgColor="bg-blue-100"
              iconColor="text-[#193cb8]"
              valueColor="text-gray-900"
            />

            <StatCard
              icon={ArrowUpRight}
              title="Enviado"
              value={formatCurrency(mine?.sent?.total_amount||0)}
              subtitle="Total enviado en el período"
              iconBgColor="bg-gray-100"
              iconColor="text-gray-600"
              valueColor="text-gray-900"
            />

            <StatCard
              icon={DollarSign}
              title="Flujo Neto"
              value={formatCurrency((mine?.net_flow)||0)}
              subtitle="Balance del período"
              iconBgColor="bg-blue-50"
              iconColor="text-[#193cb8]"
              valueColor={(mine?.net_flow||0)>=0 ? 'text-blue-600' : 'text-gray-600'}
            />

            <StatCard
              icon={User}
              title="Balance Actual"
              value={formatCurrency(mine?.user?.balance||0)}
              subtitle="Saldo disponible"
              iconBgColor="bg-blue-50"
              iconColor="text-[#193cb8]"
              valueColor="text-gray-900"
            />
          </div>
        </>
      )}

      {/* Gráfico principal mejorado */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mt-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {tab==='global' ? 'Flujo de transferencias' : 'Mi actividad de transferencias'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparación entre ingresos y egresos
            </p>
          </div>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        
        <MinimalBarChart 
          data={chartData}
          maxSent={maxSent}
          maxRecv={maxRecv}
        />
      </div>

      {/* Tops - Rediseñados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top emisores */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-gray-600" />
            {tab==='global' ? 'Top 5 emisores' : 'A quienes más envié'}
          </h2>
          <div className="space-y-2">
            {(tab==='global' ? (transfers?.top_senders||[]) : (me?.top_counterparties?.sent||[])).map((u:any, idx: number)=>(
              <div key={u.user_id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  idx === 0 ? 'bg-gradient-to-br from-[#193cb8] to-[#0e2167] text-white' :
                  idx === 1 ? 'bg-gray-200 text-gray-700' :
                  idx === 2 ? 'bg-gray-100 text-gray-600' :
                  'bg-white text-gray-500 border border-gray-200'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 truncate">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.run}</div>
                </div>
                <div className="text-xs font-bold text-gray-900">{formatCurrency(u.amount)}</div>
              </div>
            ))}
            {((tab==='global' ? (transfers?.top_senders||[]) : (me?.top_counterparties?.sent||[])).length===0) && (
              <div className="text-center py-6">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Sin datos para mostrar</p>
              </div>
            )}
          </div>
        </div>

        {/* Top receptores */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <ArrowDownLeft className="w-4 h-4 text-[#193cb8]" />
            {tab==='global' ? 'Top 5 receptores' : 'Quienes más me enviaron'}
          </h2>
          <div className="space-y-2">
            {(tab==='global' ? (transfers?.top_receivers||[]) : (me?.top_counterparties?.received||[])).map((u:any, idx: number)=>(
              <div key={u.user_id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  idx === 0 ? 'bg-gradient-to-br from-[#193cb8] to-[#0e2167] text-white' :
                  idx === 1 ? 'bg-gray-200 text-gray-700' :
                  idx === 2 ? 'bg-gray-100 text-gray-600' :
                  'bg-white text-gray-500 border border-gray-200'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 truncate">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.run}</div>
                </div>
                <div className="text-xs font-bold text-gray-900">{formatCurrency(u.amount)}</div>
              </div>
            ))}
            {((tab==='global' ? (transfers?.top_receivers||[]) : (me?.top_counterparties?.received||[])).length===0) && (
              <div className="text-center py-6">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-500">Sin datos para mostrar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;