import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Home,
  Clock,
  Send,
  Users,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Transfer, UserStats } from '../services/api';
import type { User } from '../types/types';

// ==========================
// Detección de entorno (evita usar `process` directamente en front)
// ==========================
const isProduction = (() => {
  try {
    // Vite / ESM
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE) {
      return (import.meta as any).env.MODE === 'production';
    }
    // CRA / Webpack (fallback sin tipos de Node)
    return ((globalThis as any).process?.env?.NODE_ENV) === 'production';
  } catch {
    return false;
  }
})();

// ==========================
// Tipos & Props
// ==========================
interface DashboardProps {
  user: User;
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | React.ReactNode;
  subtitle: string;
  trend?: number;
  iconBgColor: string;
  iconColor: string;
  valueColor?: string;
  onClick?: () => void;
  children?: React.ReactNode; // zona extra para barras / sparklines
}

// ==========================
// Utilidades visuales
// ==========================
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 ${className}`} />
);

const ProgressBar = ({ value, max }: { value: number; max: number }) => {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden" aria-label="Progreso">
      <div
        className="h-2 rounded-full bg-[#193cb8] transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const Sparkline = ({
  data,
  className = '',
  title,
}: {
  data: number[];
  className?: string;
  title?: string;
}) => {
  const w = 84;
  const h = 32;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const sx = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * w : 0);
  const sy = (v: number) => (max - min === 0 ? h / 2 : h - ((v - min) / (max - min)) * h);
  const path = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(2)} ${sy(v).toFixed(2)}`)
    .join(' ');
  const area = `M 0 ${h} ${data
    .map((v, i) => `L ${sx(i).toFixed(2)} ${sy(v).toFixed(2)}`)
    .join(' ')} L ${w} ${h} Z`;
  return (
    <svg
      className={className}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={title || 'Tendencia últimos 7 días'}
    >
      <path d={area} fill="currentColor" opacity="0.1" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
};

// ==========================
// Tarjeta de estadística
// ==========================
const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  iconBgColor,
  iconColor,
  valueColor,
  onClick,
  children,
}) => (
  <div
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300 group relative overflow-hidden"
    onClick={onClick}
    style={{ viewTransitionName: `stat-${title.replace(/\s+/g, '-').toLowerCase()}` }}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : -1}
  >
    {/* Fondo decorativo sutil */}
    <div
      className={`absolute top-0 right-0 w-24 h-24 ${iconBgColor} opacity-5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300`}
    />

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconBgColor} group-hover:scale-105 transition-all duration-200 shadow-sm`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {typeof trend === 'number' && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              trend > 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : trend < 0
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            {trend !== 0 ? `${Math.abs(trend)}%` : 'Sin cambios'}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          <div className={`text-2xl font-bold ${valueColor || 'text-gray-900'} mb-1 group-hover:text-gray-800 transition-colors`}>
            {value}
          </div>
          <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>

    {/* Efecto brillo hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
  </div>
);

// ==========================
// Dashboard
// ==========================
const Dashboard = ({ user }: DashboardProps) => {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'sent' | 'received'>('all');

  // Datos
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [userStats, setUserStats] = useState<UserStats['data'] | null>(null);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [expandedTransfers, setExpandedTransfers] = useState<Set<string>>(new Set());

  const handleTransition = (callback: () => void) => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(callback);
    } else {
      callback();
    }
  };

  // Carga de estadísticas
  const loadUserStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await apiService.getUserStats();
      setUserStats(response.data);
    } catch (error: any) {
      if (!isProduction) {
        console.error('Error cargando estadísticas:', error);
      }
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Carga de actividad reciente
  const loadRecentActivity = useCallback(async () => {
    setIsLoadingTransfers(true);
    try {
      const response = await apiService.getTransferHistory({ limit: 5, type: 'all' });
      setRecentTransfers(response.data.transfers);
    } catch (error: any) {
      if (!isProduction) {
        console.error('Error cargando actividad reciente:', error);
      }
    } finally {
      setIsLoadingTransfers(false);
    }
  }, []);

  // Toggle expand/collapse de transferencias múltiples
  const toggleTransferExpanded = (transferId: string) => {
    const next = new Set(expandedTransfers);
    if (next.has(transferId)) {
      next.delete(transferId);
    } else {
      next.add(transferId);
    }
    setExpandedTransfers(next);
  };

  useEffect(() => {
    loadUserStats();
    loadRecentActivity();
  }, [loadUserStats, loadRecentActivity]);

  const refreshData = () => {
    loadUserStats();
    loadRecentActivity();
  };

  // Helpers de formato
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));

  const formatDateShort = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(d);
  };

  const dateLabel = (date: string | Date) => {
    const transferDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const diffTime = today.getTime() - transferDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return formatDateShort(transferDate);
  };

  const getAvatarColors = (name: string) => {
    const colors = [
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getRoleBadgeColor = (role: string) =>
    ({ student: 'bg-blue-100 text-blue-700', teacher: 'bg-green-100 text-green-700', admin: 'bg-purple-100 text-purple-700' }[role] ||
      'bg-gray-100 text-gray-700');

  // Normalización + demo si aplica
  const processedTransfers = recentTransfers.length > 0 ? recentTransfers : [];
  // Normalización (sin DEMO)
  const mixedTransfers: Transfer[] = useMemo(
    () => processedTransfers.filter((t: any) => !String(t.id).toLowerCase().includes('demo')),
    [processedTransfers]
  );

  // Filtros
  const filteredTransfers = mixedTransfers.filter((transfer: any) => {
    if (transactionFilter === 'all') return true;
    return transfer.direction === transactionFilter;
  });

  // ==========================
  // Series de últimos 7 días
  // ==========================
  const now = new Date();
  const start7 = new Date(now);
  start7.setDate(now.getDate() - 6); // incluye hoy

  const makeSeries = (dir: 'received' | 'sent') => {
    const arr = Array.from({ length: 7 }, () => 0);
    mixedTransfers.forEach((t: any) => {
      const d = new Date(t.date);
      if (t.direction === dir) {
        // normalizar a medianoche para cálculo de índice
        const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const idx = Math.floor(
          (dd.getTime() -
            new Date(start7.getFullYear(), start7.getMonth(), start7.getDate()).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (idx >= 0 && idx < 7) arr[idx] += t.amount;
      }
    });
    return arr;
  };

  const incomeSeries7 = makeSeries('received');
  const expenseSeries7 = makeSeries('sent');

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const getPrev7Sum = (dir: 'received' | 'sent') => {
    const startPrev = new Date(now);
    startPrev.setDate(now.getDate() - 13);
    const endPrev = new Date(now);
    endPrev.setDate(now.getDate() - 7);
    let total = 0;
    mixedTransfers.forEach((t: any) => {
      const d = new Date(t.date);
      if (
        t.direction === dir &&
        d >= new Date(startPrev.getFullYear(), startPrev.getMonth(), startPrev.getDate()) &&
        d < new Date(endPrev.getFullYear(), endPrev.getMonth(), endPrev.getDate() + 1)
      ) {
        total += t.amount;
      }
    });
    return total;
  };

  const recentIncome = sum(incomeSeries7);
  const recentExpenses = sum(expenseSeries7);

  const incomePrev = getPrev7Sum('received');
  const expensePrev = getPrev7Sum('sent');
  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

  // ==========================
  // Sobregiro: % usado (si balance < 0)
  // ==========================
  const balance = userStats?.user.balance ?? user.balance;
  const overdraftLimit = userStats?.user.overdraftLimit ?? user.overdraftLimit ?? 0;
  const overdraftUsed = Math.max(0, -1 * (balance || 0));

  // ==========================
  // Agrupar movimientos por fecha (Hoy/Ayer/Fecha corta)
  // ==========================
  const groups = useMemo(() => {
    const map = new Map<string, Transfer[]>();
    filteredTransfers.forEach((t: any) => {
      const d = new Date(t.date);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .map(([k, items]) => ({ key: k, items }));
  }, [filteredTransfers]);

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header (se mantiene color y estilo) */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <Home className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Bienvenido, {user.firstName}</h1>
              <p className="text-blue-200 text-xs">Tu resumen financiero de hoy</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Última actualización</p>
            <p className="text-sm font-bold">
              {isLoadingStats || isLoadingTransfers ? 'Cargando...' : 'Hace 2 min'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tarjetas de estadísticas mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* SALDO */}
          <StatCard
            icon={showBalance ? Eye : EyeOff}
            title="Saldo Disponible"
            value={
              isLoadingStats ? (
                <Skeleton className="h-6 w-24" />
              ) : showBalance ? (
                <span aria-live="polite">{formatCurrency(balance || user.balance)}</span>
              ) : (
                <span className="select-none tracking-widest" aria-label="Saldo oculto">
                  ••••••
                </span>
              )
            }
            subtitle="Cuenta corriente"
            trend={pctChange(recentIncome - recentExpenses, incomePrev - expensePrev)}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            onClick={() => handleTransition(() => setShowBalance((v) => !v))}
          >
            {/* chip accesible para alternar */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTransition(() => setShowBalance((v) => !v));
              }}
              title={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 self-start"
            >
              {showBalance ? 'Ocultar' : 'Mostrar'}
            </button>
          </StatCard>

          {/* SOBREGIRO */}
          <StatCard
            icon={CreditCard}
            title="Línea Sobregiro"
            value={isLoadingStats ? <Skeleton className="h-6 w-28" /> : formatCurrency(overdraftLimit)}
            subtitle={overdraftUsed > 0 ? `${formatCurrency(overdraftUsed)} usados` : 'Sin uso'}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          >
            <div className="min-w-[84px] mt-1">
              <ProgressBar value={overdraftUsed} max={overdraftLimit || 1} />
              <p className="text-[10px] text-gray-400 mt-1">
                {Math.round(Math.min(100, (overdraftUsed / (overdraftLimit || 1)) * 100))}% utilizado
              </p>
            </div>
          </StatCard>

          {/* INGRESOS 7D */}
          <StatCard
            icon={TrendingUp}
            title="Ingresos 7d"
            value={isLoadingTransfers ? <Skeleton className="h-6 w-24" /> : formatCurrency(recentIncome)}
            subtitle="Últimos 7 días"
            trend={pctChange(recentIncome, incomePrev)}
            iconBgColor="bg-emerald-100"
            iconColor="text-emerald-600"
          >
            <div className="text-emerald-600 mt-1">
              <Sparkline data={incomeSeries7} title="Tendencia ingresos 7 días" />
            </div>
          </StatCard>

          {/* GASTOS 7D */}
          <StatCard
            icon={TrendingDown}
            title="Gastos 7d"
            value={isLoadingTransfers ? <Skeleton className="h-6 w-24" /> : formatCurrency(recentExpenses)}
            subtitle="Últimos 7 días"
            trend={-1 * pctChange(recentExpenses, expensePrev)}
            iconBgColor="bg-red-100"
            iconColor="text-red-600"
          >
            <div className="text-red-600 mt-1">
              <Sparkline data={expenseSeries7} title="Tendencia gastos 7 días" />
            </div>
          </StatCard>
        </div>

        {/* Últimos movimientos */}
        <div className="bg-white rounded-lg shadow border border-gray-100">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#193cb8]" />
                <h2 className="text-sm font-bold text-gray-800">Últimos Movimientos</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshData}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500"
                  disabled={isLoadingTransfers}
                  title="Refrescar"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isLoadingTransfers ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  onClick={() => navigate('/transfers')}
                  className="text-xs text-[#193cb8] hover:text-[#0e2167] font-medium"
                >
                  Ver historial completo
                </button>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'received', label: 'Recibidos' },
                { key: 'sent', label: 'Enviados' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => handleTransition(() => setTransactionFilter(filter.key as any))}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    transactionFilter === (filter.key as any)
                      ? 'bg-[#193cb8] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-pressed={transactionFilter === (filter.key as any)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-gray-100" style={{ viewTransitionName: 'transactions-list' }}>
            {isLoadingTransfers ? (
              <div className="p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2 gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-3 w-40 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="p-6 text-center">
                <Send className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-500 font-medium">No hay movimientos recientes</p>
                <p className="text-xs text-gray-400 mt-1">
                  {transactionFilter === 'all'
                    ? 'Realiza tu primera transferencia'
                    : transactionFilter === 'sent'
                    ? 'No has enviado transferencias'
                    : 'No has recibido transferencias'}
                </p>
              </div>
            ) : (
              <div>
                {groups.map(({ key, items }) => {
                  const headerLabel = dateLabel(new Date(key));
                  return (
                    <div key={key} className="">
                      <div className="px-3 py-2 bg-gray-50 text-[11px] font-semibold text-gray-600 sticky top-0 z-[1]">
                        {headerLabel}
                      </div>
                      {items.map((transfer: any) => {
                        const isIncoming = transfer.direction === 'received';
                        const otherPerson = transfer.otherPerson;
                        const colors = otherPerson
                          ? getAvatarColors(otherPerson.name)
                          : getAvatarColors('Múltiple');
                        const isExpanded = expandedTransfers.has(transfer.id);
                        const hasRecipients =
                          transfer.isMultiple &&
                          transfer.recipients &&
                          transfer.recipients.length > 0;

                        return (
                          <div key={transfer.id}>
                            <div
                              className={`px-3 py-3 hover:bg-gray-50 transition-colors ${
                                hasRecipients ? 'cursor-pointer' : ''
                              }`}
                              onClick={() =>
                                hasRecipients && toggleTransferExpanded(transfer.id)
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {hasRecipients && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTransferExpanded(transfer.id);
                                      }}
                                      className="p-1 rounded hover:bg-gray-100 -ml-2"
                                      aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
                                    >
                                      {isExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      )}
                                    </button>
                                  )}
                                  <div
                                    className={`p-1.5 rounded-full ${
                                      isIncoming ? 'bg-green-100' : 'bg-red-100'
                                    }`}
                                  >
                                    {isIncoming ? (
                                      <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />
                                    ) : (
                                      <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {otherPerson ? (
                                      <div
                                        className={`w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center shadow-sm`}
                                      >
                                        <span
                                          className={`text-xs font-bold ${colors.text}`}
                                        >
                                          {getInitials(otherPerson.name)}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
                                        <Users className="w-3.5 h-3.5 text-gray-400" />
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-semibold text-gray-900">
                                          {otherPerson
                                            ? otherPerson.name
                                            : 'Transferencia múltiple'}
                                        </p>
                                        {transfer.isMultiple && (
                                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                            {transfer.recipientCount} personas
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                        <span>{transfer.description || 'Movimiento'}</span>
                                        {otherPerson && (
                                          <>
                                            <span>•</span>
                                            <span
                                              className={`px-1 py-0.5 rounded text-[10px] font-medium ${getRoleBadgeColor(
                                                otherPerson.role
                                              )}`}
                                            >
                                              {otherPerson.role === 'student'
                                                ? 'Estudiante'
                                                : otherPerson.role === 'teacher'
                                                ? 'Docente'
                                                : 'Admin'}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p
                                    className={`text-sm font-bold ${
                                      isIncoming ? 'text-green-600' : 'text-red-600'
                                    }`}
                                  >
                                    {isIncoming ? '+' : '-'}
                                    {formatCurrency(transfer.amount)}
                                  </p>
                                  {transfer.amount !== transfer.totalAmount && (
                                    <p className="text-xs text-gray-500">
                                      Total: {formatCurrency(transfer.totalAmount)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isExpanded && hasRecipients && (
                              <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                                <p className="text-xs font-semibold text-gray-700 mb-2">
                                  Destinatarios:
                                </p>
                                <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
                                  {transfer.recipients!.map((r: any) => {
                                    const recipientColors = getAvatarColors(r.name);
                                    return (
                                      <div
                                        key={r.id}
                                        className="flex items-center justify-between p-2"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div
                                            className={`w-6 h-6 ${recipientColors.bg} rounded-full flex items-center justify-center`}
                                          >
                                            <span
                                              className={`text-xs font-bold ${recipientColors.text}`}
                                            >
                                              {r.name
                                                .split(' ')
                                                .map((n: string) => n[0])
                                                .join('')
                                                .toUpperCase()
                                                .slice(0, 2)}
                                            </span>
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 truncate">
                                              {r.name}
                                            </p>
                                            <span className="text-xxs text-gray-500">
                                              {r.run}
                                            </span>
                                          </div>
                                        </div>
                                        <p className="text-xs font-bold text-gray-800">
                                          {formatCurrency(r.amount)}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {/* CTA ver más */}
                <div className="p-3 text-center border-t border-gray-100">
                  <button
                    onClick={() => navigate('/transfers')}
                    className="text-xs text-[#193cb8] hover:text-[#0e2167] font-medium inline-flex items-center gap-1"
                  >
                    Ver historial completo
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Transitions & extras */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        ::view-transition-old([style*="stat-"]),
        ::view-transition-new([style*="stat-"]) {
          animation-duration: 0.4s;
          animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        ::view-transition-old([style*="stat-"]) { animation-name: card-flip-out; }
        ::view-transition-new([style*="stat-"]) { animation-name: card-flip-in; }

        ::view-transition-old(transactions-list),
        ::view-transition-new(transactions-list) {
          animation-duration: 0.4s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        ::view-transition-old(transactions-list) { animation-name: fade-scale-out; }
        ::view-transition-new(transactions-list) { animation-name: fade-scale-in; }

        @keyframes card-flip-out { from { transform: rotateY(0) scale(1); opacity: 1; } to { transform: rotateY(90deg) scale(0.95); opacity: 0; } }
        @keyframes card-flip-in { from { transform: rotateY(-90deg) scale(1.05); opacity: 0; } 50% { transform: rotateY(-45deg) scale(1.02); opacity: .5; } to { transform: rotateY(0) scale(1); opacity: 1; } }
        @keyframes fade-scale-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.95); opacity: 0; } }
        @keyframes fade-scale-in { from { transform: scale(1.05); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .group:hover .absolute.inset-0 { animation: shimmer 0.7s ease-out; }
        @keyframes shimmer { 0% { transform: translateX(-100%) skewX(-12deg); opacity: 0; } 50% { opacity: .2; } 100% { transform: translateX(100%) skewX(-12deg); opacity: 0; } }

        @media (prefers-reduced-motion: reduce) {
          ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
          .group:hover .absolute.inset-0 { animation: none !important; }
        }

        [style*="view-transition-name"] { contain: layout style paint; }

        .overflow-y-auto::-webkit-scrollbar { width: 4px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: #f1f5f9; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `,
        }}
      />
    </div>
  );
};

export default Dashboard;
