import { useEffect, useMemo, useState, useCallback } from 'react';
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
    total: number;
  }>;
  maxTotal: number;
}

const MinimalBarChart = ({ data, maxTotal }: BarChartProps) => {
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
        const totalPct = Math.min(100, ((item.total || 0) / maxTotal) * 100);

        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{item.label}</span>
              <span className="font-semibold text-[#193cb8]">
                {formatCurrency(item.total)}
              </span>
            </div>

            {/* Barra de volumen total */}
            <div className="relative h-8">
              <div className="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#193cb8] to-[#2563eb] rounded-lg transition-all duration-500 shadow-sm"
                  style={{ width: `${totalPct}%` }}
                >
                  {item.total > 0 && totalPct > 15 && (
                    <div className="absolute inset-0 flex items-center justify-end pr-3">
                      <span className="text-xs font-semibold text-white drop-shadow">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
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
);

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

  // Estados para controlar la expansión de cada casillero
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Función para toggle de panel
  const togglePanel = useCallback((panelId: string) => {
    setExpandedPanel((prev) => prev === panelId ? null : panelId);
  }, []);

  // Manejador para cerrar el panel expandido al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (expandedPanel && !target.closest('.expandable-card')) {
        togglePanel(expandedPanel);
      }
    };

    if (expandedPanel) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [expandedPanel, togglePanel]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [gResp, meResp] = await Promise.all([
          apiService.getDashboardStats(range, groupBy),
          apiService.getTransferStats(range)
        ]);
        setG(gResp?.data ?? null);
        setMe(meResp?.data ?? null);
      } catch (err: any) {
        console.error('Error loading stats:', err);
        setError(err?.message || 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range, groupBy]);

  const users = tab==='global' ? g?.users : null;
  const transfers = tab==='global' ? g?.transfers : null;
  const activity = tab==='global' ? g?.activity : null;
  const mine = tab==='mine' ? me : null;

  const seriesData = useMemo(() => {
    if (tab==='global') {
      return (transfers?.series || []).map((s: any) => ({
        label: s.date,
        total: (s.sent_amount || 0) + (s.received_amount || 0)
      }));
    } else {
      return (mine?.series || []).map((s: any) => ({
        label: s.date,
        total: (s.sent_amount || 0) + (s.received_amount || 0)
      }));
    }
  }, [tab, transfers, mine]);

  const chartData = seriesData;
  const maxTotal = Math.max(...chartData.map((d: any) => d.total || 0), 1);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar estadísticas</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Backdrop difuminado */}
      {expandedPanel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
      )}

      <div className="mx-auto px-3 py-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md relative z-30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Estadísticas</h1>
              <p className="text-blue-200 text-xs">Análisis de la actividad financiera</p>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className={expandedPanel ? 'opacity-0 pointer-events-none' : ''}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Tabs */}
            <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setTab('global')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  tab === 'global'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Global
              </button>
              <button
                onClick={() => setTab('mine')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  tab === 'mine'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mi Cuenta
              </button>
            </div>

            {/* Selector de rango */}
            <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
              {[
                {val:'7d', label:'7 días'},
                {val:'30d', label:'30 días'},
                {val:'90d', label:'90 días'},
                {val:'all', label:'Todo'}
              ].map(({val, label}) => (
                <button
                  key={val}
                  onClick={() => setRange(val as RangeOpt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    range === val
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Agrupación */}
            <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setGroupBy('day')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  groupBy === 'day'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Por día
              </button>
              <button
                onClick={() => setGroupBy('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  groupBy === 'month'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Por mes
              </button>
            </div>

            {/* Botón refrescar */}
            <button
              onClick={() => {
                setLoading(true);
                window.location.reload();
              }}
              className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
              title="Actualizar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="space-y-4">
        {tab === 'global' ? (
          // GLOBAL
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${expandedPanel ? 'opacity-0' : ''}`}>
              <StatCard
                icon={ArrowDownLeft}
                title="Total Recibido"
                value={formatCurrency(transfers?.volume?.received_total||0)}
                subtitle="Total recibido en el período"
                iconBgColor="bg-blue-100"
                iconColor="text-[#193cb8]"
                valueColor="text-gray-900"
              />

              <StatCard
                icon={ArrowUpRight}
                title="Total Enviado"
                value={formatCurrency(transfers?.volume?.sent_total||0)}
                subtitle="Total enviado en el período"
                iconBgColor="bg-gray-100"
                iconColor="text-gray-600"
                valueColor="text-gray-900"
              />

              <StatCard
                icon={DollarSign}
                title="Flujo Neto"
                value={formatCurrency(transfers?.volume?.net_flow||0)}
                subtitle="Diferencia recibido - enviado"
                iconBgColor="bg-blue-50"
                iconColor="text-[#193cb8]"
                valueColor={(transfers?.volume?.net_flow||0)>=0 ? 'text-blue-600' : 'text-gray-600'}
              />

              <StatCard
                icon={Users}
                title="Usuarios Activos"
                value={users?.active || 0}
                subtitle="Con saldo disponible"
                iconBgColor="bg-blue-50"
                iconColor="text-[#193cb8]"
                valueColor="text-gray-900"
              />
            </div>

            {/* Bloques secundarios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Usuarios por rol */}
              <div
                className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all ${
                  expandedPanel === 'users-role'
                    ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-3xl max-h-[80vh] overflow-auto shadow-2xl'
                    : expandedPanel
                    ? 'opacity-0 pointer-events-none'
                    : 'relative z-10'
                }`}
                onClick={() => togglePanel('users-role')}
              >
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#193cb8]" />
                  Usuarios por rol
                </h2>
                <div className={expandedPanel === 'users-role' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
                  <div className={`flex ${expandedPanel === 'users-role' ? 'flex-col' : 'flex-row'} items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 ${expandedPanel === 'users-role' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                    <span className={`${expandedPanel === 'users-role' ? 'text-sm mb-2' : 'text-xs'} font-medium text-gray-700`}>Estudiantes</span>
                    <span className={`${expandedPanel === 'users-role' ? 'text-3xl' : 'text-sm'} font-bold text-[#193cb8]`}>{users?.byRole?.student ?? 0}</span>
                  </div>
                  <div className={`flex ${expandedPanel === 'users-role' ? 'flex-col' : 'flex-row'} items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 ${expandedPanel === 'users-role' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                    <span className={`${expandedPanel === 'users-role' ? 'text-sm mb-2' : 'text-xs'} font-medium text-gray-700`}>Docentes</span>
                    <span className={`${expandedPanel === 'users-role' ? 'text-3xl' : 'text-sm'} font-bold text-gray-900`}>{users?.byRole?.teacher ?? 0}</span>
                  </div>
                  <div className={`flex ${expandedPanel === 'users-role' ? 'flex-col' : 'flex-row'} items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 ${expandedPanel === 'users-role' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                    <span className={`${expandedPanel === 'users-role' ? 'text-sm mb-2' : 'text-xs'} font-medium text-gray-700`}>Admins</span>
                    <span className={`${expandedPanel === 'users-role' ? 'text-3xl' : 'text-sm'} font-bold text-gray-900`}>{users?.byRole?.admin ?? 0}</span>
                  </div>
                  <div className={`flex ${expandedPanel === 'users-role' ? 'flex-col' : 'flex-row'} items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 ${expandedPanel === 'users-role' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                    <span className={`${expandedPanel === 'users-role' ? 'text-sm mb-2' : 'text-xs'} font-medium text-gray-700`}>Circulante</span>
                    <span className={`${expandedPanel === 'users-role' ? 'text-2xl' : 'text-sm'} font-bold text-gray-900`}>{formatCurrency(users?.circulating||0)}</span>
                  </div>
                  <div className={`flex ${expandedPanel === 'users-role' ? 'flex-col' : 'flex-row'} items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 ${expandedPanel === 'users-role' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                    <span className={`${expandedPanel === 'users-role' ? 'text-sm mb-2' : 'text-xs'} font-medium text-gray-700`}>Sobregiro</span>
                    <span className={`${expandedPanel === 'users-role' ? 'text-2xl' : 'text-sm'} font-bold text-gray-900`}>{formatCurrency(users?.overdraft_total||0)}</span>
                  </div>
                </div>
              </div>

              {/* Actividad */}
              <div
                className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all ${
                  expandedPanel === 'activity'
                    ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-3xl max-h-[80vh] overflow-auto shadow-2xl'
                    : expandedPanel
                    ? 'opacity-0 pointer-events-none'
                    : 'relative z-10'
                }`}
                onClick={() => togglePanel('activity')}
              >
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <ActivityIcon className="w-4 h-4 text-[#193cb8]" />
                  Actividad
                </h2>
                <div className={expandedPanel === 'activity' ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'space-y-2'}>
                  <div className={`flex ${expandedPanel === 'activity' ? 'flex-col items-start' : 'items-center'} justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 ${expandedPanel === 'activity' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                    <div className={`flex items-center gap-2 ${expandedPanel === 'activity' ? 'mb-2' : ''}`}>
                      <div className={`${expandedPanel === 'activity' ? 'p-2 bg-white rounded-lg shadow-sm' : ''}`}>
                        <Shield className={`${expandedPanel === 'activity' ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-[#193cb8]`} />
                      </div>
                      <span className={`${expandedPanel === 'activity' ? 'text-sm' : 'text-xs'} font-medium text-gray-700`}>Logins 24h</span>
                    </div>
                    <span className={`${expandedPanel === 'activity' ? 'text-2xl' : 'text-sm'} font-bold text-[#193cb8]`}>{activity?.logins_24h ?? 0}</span>
                    {expandedPanel === 'activity' && (
                      <p className="text-xs text-gray-500 mt-1">Usuarios que iniciaron sesión en las últimas 24 horas</p>
                    )}
                  </div>
                  <div className={`flex ${expandedPanel === 'activity' ? 'flex-col items-start' : 'items-center'} justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 ${expandedPanel === 'activity' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                    <div className={`flex items-center gap-2 ${expandedPanel === 'activity' ? 'mb-2' : ''}`}>
                      <div className={`${expandedPanel === 'activity' ? 'p-2 bg-white rounded-lg shadow-sm' : ''}`}>
                        <Users className={`${expandedPanel === 'activity' ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-gray-600`} />
                      </div>
                      <span className={`${expandedPanel === 'activity' ? 'text-sm' : 'text-xs'} font-medium text-gray-700`}>Activos 7d</span>
                    </div>
                    <span className={`${expandedPanel === 'activity' ? 'text-2xl' : 'text-sm'} font-bold text-gray-900`}>{activity?.active_users_7d ?? 0}</span>
                    {expandedPanel === 'activity' && (
                      <p className="text-xs text-gray-500 mt-1">Usuarios activos en los últimos 7 días</p>
                    )}
                  </div>
                  <div className={`flex ${expandedPanel === 'activity' ? 'flex-col items-start' : 'items-center'} justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 ${expandedPanel === 'activity' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                    <div className={`flex items-center gap-2 ${expandedPanel === 'activity' ? 'mb-2' : ''}`}>
                      <div className={`${expandedPanel === 'activity' ? 'p-2 bg-white rounded-lg shadow-sm' : ''}`}>
                        <Clock className={`${expandedPanel === 'activity' ? 'w-5 h-5' : 'w-3.5 h-3.5'} text-gray-600`} />
                      </div>
                      <span className={`${expandedPanel === 'activity' ? 'text-sm' : 'text-xs'} font-medium text-gray-700`}>Acciones 7d</span>
                    </div>
                    <span className={`${expandedPanel === 'activity' ? 'text-2xl' : 'text-sm'} font-bold text-gray-900`}>{activity?.total_activities_7d ?? 0}</span>
                    {expandedPanel === 'activity' && (
                      <p className="text-xs text-gray-500 mt-1">Total de acciones realizadas en 7 días</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Estados de transferencias */}
              <div
                className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all ${
                  expandedPanel === 'transfer-status'
                    ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-3xl max-h-[80vh] overflow-auto shadow-2xl'
                    : expandedPanel
                    ? 'opacity-0 pointer-events-none'
                    : 'relative z-10'
                }`}
                onClick={() => togglePanel('transfer-status')}
              >
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#193cb8]" />
                  Estados de transferencias
                </h2>
                <div className={expandedPanel === 'transfer-status' ? 'grid grid-cols-2 md:grid-cols-4 gap-4' : 'grid grid-cols-2 gap-2'}>
                  {[
                    { key: 'completed', label: 'Completadas', color: 'bg-blue-50 border-blue-100 text-blue-700' },
                    { key: 'failed', label: 'Fallidas', color: 'bg-gray-50 border-gray-100 text-gray-700' },
                    { key: 'cancelled', label: 'Canceladas', color: 'bg-gray-50 border-gray-100 text-gray-600' },
                    { key: 'pending', label: 'Pendientes', color: 'bg-gray-50 border-gray-100 text-gray-600' }
                  ].map(({key, label, color})=>(
                    <div key={key} className={`${expandedPanel === 'transfer-status' ? 'p-4' : 'p-2'} rounded-lg border ${color} text-center ${expandedPanel === 'transfer-status' ? 'hover:shadow-sm transition-shadow' : ''}`}>
                      <div className={`${expandedPanel === 'transfer-status' ? 'text-sm' : 'text-xs'} font-medium capitalize mb-1`}>{label}</div>
                      <div className={`${expandedPanel === 'transfer-status' ? 'text-4xl' : 'text-lg'} font-bold`}>{transfers?.count?.[key] ?? 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          // MI CUENTA
          <>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${expandedPanel ? 'opacity-0' : ''}`}>
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
        <div
          className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 mt-4 mb-4 cursor-pointer hover:shadow-md transition-all ${
            expandedPanel === 'chart'
              ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-4xl max-h-[80vh] overflow-auto shadow-2xl'
              : expandedPanel
              ? 'opacity-0 pointer-events-none'
              : 'relative z-10'
          }`}
          onClick={() => togglePanel('chart')}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {tab==='global' ? 'Volumen de transferencias' : 'Mi volumen de transferencias'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Total de dinero transferido por período
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>

          <MinimalBarChart
            data={chartData}
            maxTotal={maxTotal}
          />
        </div>

        {/* Tops - Rediseñados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top emisores */}
          <div
            className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all ${
              expandedPanel === 'top-senders'
                ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-3xl max-h-[80vh] overflow-auto shadow-2xl'
                : expandedPanel
                ? 'opacity-0 pointer-events-none'
                : 'relative z-10'
            }`}
            onClick={() => togglePanel('top-senders')}
          >
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4 text-gray-600" />
              {tab==='global' ? 'Top 5 emisores' : 'A quienes más envié'}
            </h2>
            <div className={expandedPanel === 'top-senders' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'}>
              {(tab==='global' ? (transfers?.top_senders||[]) : (me?.top_counterparties?.sent||[])).map((u:any, idx: number)=>(
                <div key={u.user_id} className={`flex items-center gap-3 ${expandedPanel === 'top-senders' ? 'p-4' : 'p-2.5'} bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100 ${expandedPanel === 'top-senders' ? 'hover:shadow-sm' : ''}`}>
                  <div className={`${expandedPanel === 'top-senders' ? 'w-10 h-10' : 'w-7 h-7'} rounded-full flex items-center justify-center font-bold ${expandedPanel === 'top-senders' ? 'text-sm' : 'text-xs'} ${
                    idx === 0 ? 'bg-gradient-to-br from-[#193cb8] to-[#0e2167] text-white' :
                    idx === 1 ? 'bg-gray-200 text-gray-700' :
                    idx === 2 ? 'bg-gray-100 text-gray-600' :
                    'bg-white text-gray-500 border border-gray-200'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`${expandedPanel === 'top-senders' ? 'text-sm' : 'text-xs'} font-semibold text-gray-900 truncate`}>{u.name}</div>
                    <div className="text-xs text-gray-500">{u.run}</div>
                  </div>
                  <div className={`${expandedPanel === 'top-senders' ? 'text-base' : 'text-xs'} font-bold text-gray-900`}>{formatCurrency(u.amount)}</div>
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
          <div
            className={`bg-white rounded-lg shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all ${
              expandedPanel === 'top-receivers'
                ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-3xl max-h-[80vh] overflow-auto shadow-2xl'
                : expandedPanel
                ? 'opacity-0 pointer-events-none'
                : 'relative z-10'
            }`}
            onClick={() => togglePanel('top-receivers')}
          >
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4 text-[#193cb8]" />
              {tab==='global' ? 'Top 5 receptores' : 'Quienes más me enviaron'}
            </h2>
            <div className={expandedPanel === 'top-receivers' ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-2'}>
              {(tab==='global' ? (transfers?.top_receivers||[]) : (me?.top_counterparties?.received||[])).map((u:any, idx: number)=>(
                <div key={u.user_id} className={`flex items-center gap-3 ${expandedPanel === 'top-receivers' ? 'p-4' : 'p-2.5'} bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100 ${expandedPanel === 'top-receivers' ? 'hover:shadow-sm' : ''}`}>
                  <div className={`${expandedPanel === 'top-receivers' ? 'w-10 h-10' : 'w-7 h-7'} rounded-full flex items-center justify-center font-bold ${expandedPanel === 'top-receivers' ? 'text-sm' : 'text-xs'} ${
                    idx === 0 ? 'bg-gradient-to-br from-[#193cb8] to-[#0e2167] text-white' :
                    idx === 1 ? 'bg-gray-200 text-gray-700' :
                    idx === 2 ? 'bg-gray-100 text-gray-600' :
                    'bg-white text-gray-500 border border-gray-200'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`${expandedPanel === 'top-receivers' ? 'text-sm' : 'text-xs'} font-semibold text-gray-900 truncate`}>{u.name}</div>
                    <div className="text-xs text-gray-500">{u.run}</div>
                  </div>
                  <div className={`${expandedPanel === 'top-receivers' ? 'text-base' : 'text-xs'} font-bold text-gray-900`}>{formatCurrency(u.amount)}</div>
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
    </div>
    </div>
  );
};

export default Statistics;