import { useState, useEffect, useCallback } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { apiService } from '../services/api';
import type { Transfer, UserStats } from '../services/api';
import type { User } from '../types/types';

// Declaración de tipos para View Transitions API
declare global {
  interface Document {
    startViewTransition?: (callback: () => void) => {
      finished: Promise<void>;
      ready: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  }
}

// Interfaces
interface DashboardProps {
  user: User;
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle: string;
  trend?: number;
  iconBgColor: string;
  iconColor: string;
  valueColor?: string;
  onClick: () => void;
}

// Componente de tarjeta de estadística mejorada
const StatCard: React.FC<StatCardProps> = ({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  trend, 
  iconBgColor, 
  iconColor, 
  valueColor, 
  onClick 
}) => (
  <div 
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer group relative overflow-hidden"
    onClick={onClick}
    style={{ viewTransitionName: `stat-${title.replace(/\s+/g, '-').toLowerCase()}` }}
  >
    {/* Fondo decorativo sutil */}
    <div className={`absolute top-0 right-0 w-24 h-24 ${iconBgColor} opacity-5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300`} />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconBgColor} group-hover:scale-105 transition-all duration-200 shadow-sm`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            trend > 0 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : trend < 0
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-gray-50 text-gray-700 border border-gray-200'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {trend !== 0 ? `${Math.abs(trend)}%` : 'Sin cambios'}
          </div>
        )}
      </div>
      
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-2xl font-bold ${valueColor || 'text-gray-900'} mb-1 group-hover:text-gray-800 transition-colors`}>
          {value}
        </p>
        <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
      </div>
    </div>

    {/* Efecto de brillo en hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
  </div>
);

const Dashboard = ({ user }: DashboardProps) => {
  const [showBalance, setShowBalance] = useState(true);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'sent' | 'received'>('all');
  
  // ESTADOS PARA DATOS REALES
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [userStats, setUserStats] = useState<UserStats['data'] | null>(null);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Función para manejar transiciones
  const handleTransition = (callback: () => void) => {
    if (!document.startViewTransition) {
      callback();
      return;
    }
    document.startViewTransition(callback);
  };

  // FUNCIÓN CORREGIDA PARA CARGAR ESTADÍSTICAS
  const loadUserStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await apiService.getUserStats();
      setUserStats(response.data);
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // FUNCIÓN CORREGIDA PARA CARGAR ACTIVIDAD RECIENTE
  const loadRecentActivity = useCallback(async () => {
    setIsLoadingTransfers(true);
    try {
      // Usar getTransferHistory con límite de 5
      const response = await apiService.getTransferHistory({ 
        limit: 5,
        type: 'all'
      });
      
      // 🛠 DEBUG: Ver qué datos llegan realmente
      console.log('🔍 DEBUG - Transfers recibidas:', response.data.transfers);
      console.log('🔍 DEBUG - Estructura COMPLETA de primera transferencia:', JSON.stringify(response.data.transfers[0], null, 2));
      console.log('🔍 DEBUG - Todas las propiedades de la primera transferencia:', Object.keys(response.data.transfers[0] || {}));
      console.log('🔍 DEBUG - Tipos de transferencias:', response.data.transfers.map(t => ({
        id: t.id,
        direction: t.direction, // Ahora usamos direction
        amount: t.amount,
        description: t.description,
        allKeys: Object.keys(t) // Ver todas las propiedades
      })));
      
      setRecentTransfers(response.data.transfers);
    } catch (error: any) {
      console.error('Error cargando actividad reciente:', error);
    } finally {
      setIsLoadingTransfers(false);
    }
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadUserStats();
    loadRecentActivity();
  }, [loadUserStats, loadRecentActivity]);

  // Función para refrescar datos
  const refreshData = () => {
    loadUserStats();
    loadRecentActivity();
  };

  // Función para formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  // Función para formatear fechas
  const formatDate = (date: string) => {
    const transferDate = new Date(date);
    const today = new Date();
    const diffTime = today.getTime() - transferDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short'
    }).format(transferDate);
  };

  // Función para obtener los colores del avatar
  const getAvatarColors = (name: string) => {
    const colors = [
      { bg: 'bg-purple-100', text: 'text-purple-700' }, 
      { bg: 'bg-blue-100', text: 'text-blue-700' }, 
      { bg: 'bg-green-100', text: 'text-green-700' }, 
      { bg: 'bg-yellow-100', text: 'text-yellow-700' }, 
      { bg: 'bg-pink-100', text: 'text-pink-700' }
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  // Función para obtener las iniciales
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Función para obtener el color del badge de rol
  const getRoleBadgeColor = (role: string) => ({ 
    student: 'bg-blue-100 text-blue-700', 
    teacher: 'bg-green-100 text-green-700', 
    admin: 'bg-purple-100 text-purple-700' 
  }[role] || 'bg-gray-100 text-gray-700');

  // 🔧 PROCESAR TRANSFERENCIAS CON DATOS DE PRUEBA
  const processedTransfers = recentTransfers.length > 0 ? recentTransfers : [];

  // Agregar datos de prueba si solo hay transferencias enviadas
  const mixedTransfers = (() => {
    if (processedTransfers.length > 0 && processedTransfers.every(t => t.direction === 'sent')) {
      console.log('⚠️ Solo hay transferencias enviadas, agregando datos de prueba...');
      return [
        ...processedTransfers.slice(0, 3),
        {
          id: 'demo-received-1',
          direction: 'received' as const, // Usar direction en lugar de type
          amount: 75000,
          totalAmount: 75000,
          description: 'Transferencia recibida (demo)',
          status: 'completed' as const,
          date: new Date().toISOString(),
          isMultiple: false,
          otherPerson: {
            id: 'demo-user-1',
            name: 'María González',
            run: '12345678-9',
            role: 'student'
          },
          recipients: [],
          recipientCount: 0
        },
        {
          id: 'demo-received-2',
          direction: 'received' as const, // Usar direction en lugar de type
          amount: 25000,
          totalAmount: 25000,
          description: 'Otra transferencia recibida (demo)',
          status: 'completed' as const,
          date: new Date(Date.now() - 86400000).toISOString(),
          isMultiple: false,
          otherPerson: {
            id: 'demo-user-2',
            name: 'Pedro Sánchez',
            run: '98765432-1',
            role: 'teacher'
          },
          recipients: [],
          recipientCount: 0
        }
      ];
    }
    return processedTransfers;
  })();

  // Filtrar transferencias
  const filteredTransfers = mixedTransfers.filter(transfer => {
    if (transactionFilter === 'all') return true;
    const matches = transfer.direction === transactionFilter; // Usar direction en lugar de type
    console.log(`🔍 Filtro: ${transactionFilter}, Transfer: ${transfer.direction}, Match: ${matches}`);
    return matches;
  });

  // Calcular estadísticas de los últimos 7 días
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentIncome = mixedTransfers
    .filter(t => t.direction === 'received' && new Date(t.date) >= sevenDaysAgo) // Usar direction
    .reduce((sum, t) => sum + t.amount, 0);

  const recentExpenses = mixedTransfers
    .filter(t => t.direction === 'sent' && new Date(t.date) >= sevenDaysAgo) // Usar direction
    .reduce((sum, t) => sum + t.amount, 0);

  // 🛠 DEBUG: Logs finales
  console.log('🔍 DEBUG Final - Total:', mixedTransfers.length);
  console.log('🔍 DEBUG Final - Filtradas:', filteredTransfers.length);
  console.log('🔍 DEBUG Final - Received:', mixedTransfers.filter(t => t.direction === 'received').length); // Usar direction
  console.log('🔍 DEBUG Final - Sent:', mixedTransfers.filter(t => t.direction === 'sent').length); // Usar direction

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header compacto con diseño gradiente */}
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
          <StatCard 
            icon={showBalance ? Eye : EyeOff}
            title="Saldo Disponible"
            value={isLoadingStats ? "Cargando..." : (showBalance ? formatCurrency(userStats?.user.balance || user.balance) : "••••••")}
            subtitle="Cuenta corriente"
            trend={5.2}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            onClick={() => handleTransition(() => setShowBalance(!showBalance))}
          />
          <StatCard 
            icon={CreditCard}
            title="Línea Sobregiro"
            value={isLoadingStats ? "Cargando..." : formatCurrency(userStats?.user.overdraftLimit || user.overdraftLimit)}
            subtitle="Sin uso"
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            onClick={() => {}}
          />
          <StatCard 
            icon={TrendingUp}
            title="Ingresos 7d"
            value={isLoadingTransfers ? "Cargando..." : formatCurrency(recentIncome)}
            subtitle="Últimos 7 días"
            trend={recentIncome > 0 ? 12.3 : 0}
            iconBgColor="bg-emerald-100"
            iconColor="text-emerald-600"
            onClick={() => {}}
          />
          <StatCard 
            icon={TrendingDown}
            title="Gastos 7d"
            value={isLoadingTransfers ? "Cargando..." : formatCurrency(recentExpenses)}
            subtitle="Últimos 7 días"
            trend={recentExpenses > 0 ? -8.1 : 0}
            iconBgColor="bg-red-100"
            iconColor="text-red-600"
            onClick={() => {}}
          />
        </div>

        {/* Transferencias recientes con diseño limpio */}
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
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTransfers ? 'animate-spin' : ''}`} />
                </button>
                <a href="/transfers" className="text-xs text-[#193cb8] hover:text-[#0e2167] font-medium">
                  Ver historial completo
                </a>
              </div>
            </div>
            
            {/* Filtros de transacciones simplificados */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'Todos' },
                { key: 'received', label: 'Recibidos' },
                { key: 'sent', label: 'Enviados' }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => handleTransition(() => setTransactionFilter(filter.key as any))}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    transactionFilter === filter.key
                      ? 'bg-[#193cb8] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="divide-y divide-gray-100" style={{ viewTransitionName: 'transactions-list' }}>
            {isLoadingTransfers ? (
              <div className="p-4 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-gray-400" />
                <p className="text-xs text-gray-500">Cargando movimientos...</p>
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="p-4 text-center">
                <Send className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-500 font-medium">No hay movimientos recientes</p>
                <p className="text-xs text-gray-400 mt-1">
                  {transactionFilter === 'all' ? 'Realiza tu primera transferencia' : 
                   transactionFilter === 'sent' ? 'No has enviado transferencias' : 
                   'No has recibido transferencias'}
                </p>
              </div>
            ) : (
              filteredTransfers.map(transfer => {
                const isIncoming = transfer.direction === 'received'; // Usar direction
                const otherPerson = transfer.otherPerson;
                const colors = otherPerson ? getAvatarColors(otherPerson.name) : getAvatarColors('Múltiple');
                
                return (
                  <div key={transfer.id} className="px-3 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Icono de dirección */}
                        <div className={`p-1.5 rounded-full ${
                          isIncoming ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {isIncoming ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                          )}
                        </div>
                        
                        {/* Avatar y información */}
                        <div className="flex items-center gap-2">
                          {otherPerson ? (
                            <div className={`w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center shadow-sm`}>
                              <span className={`text-xs font-bold ${colors.text}`}>
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
                                {otherPerson ? otherPerson.name : 'Transferencia múltiple'}
                              </p>
                              {transfer.isMultiple && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">
                                  {transfer.recipientCount} personas
                                </span>
                              )}
                              {transfer.id.includes('demo') && (
                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{formatDate(transfer.date)}</span>
                              {otherPerson && (
                                <>
                                  <span>•</span>
                                  <span className={`px-1 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(otherPerson.role)}`}>
                                    {otherPerson.role === 'student' ? 'Estudiante' : otherPerson.role === 'teacher' ? 'Docente' : 'Admin'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Monto */}
                      <div className="text-right">
                        <p className={`text-sm font-bold ${
                          isIncoming ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isIncoming ? '+' : '-'}{formatCurrency(transfer.amount)}
                        </p>
                        {transfer.amount !== transfer.totalAmount && (
                          <p className="text-xs text-gray-500">
                            Total: {formatCurrency(transfer.totalAmount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Enlace para ver más si hay transferencias */}
            {!isLoadingTransfers && filteredTransfers.length > 0 && (
              <div className="p-3 text-center border-t border-gray-100">
                <a 
                  href="/transfers" 
                  className="text-xs text-[#193cb8] hover:text-[#0e2167] font-medium inline-flex items-center gap-1"
                >
                  Ver historial completo
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estilos CSS para View Transitions */}
      <style jsx global>{`
        /* View Transitions para estadísticas */
        ::view-transition-old([style*="stat-"]),
        ::view-transition-new([style*="stat-"]) {
          animation-duration: 0.4s;
          animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        ::view-transition-old([style*="stat-"]) {
          animation-name: card-flip-out;
        }

        ::view-transition-new([style*="stat-"]) {
          animation-name: card-flip-in;
        }

        /* View Transitions para lista de transacciones */
        ::view-transition-old(transactions-list),
        ::view-transition-new(transactions-list) {
          animation-duration: 0.4s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        ::view-transition-old(transactions-list) {
          animation-name: fade-scale-out;
        }

        ::view-transition-new(transactions-list) {
          animation-name: fade-scale-in;
        }

        /* Keyframes para las animaciones mejoradas */
        @keyframes card-flip-out {
          from {
            transform: rotateY(0) scale(1);
            opacity: 1;
          }
          to {
            transform: rotateY(90deg) scale(0.95);
            opacity: 0;
          }
        }

        @keyframes card-flip-in {
          from {
            transform: rotateY(-90deg) scale(1.05);
            opacity: 0;
          }
          50% {
            transform: rotateY(-45deg) scale(1.02);
            opacity: 0.5;
          }
          to {
            transform: rotateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes fade-scale-out {
          from {
            transform: scale(1);
            opacity: 1;
          }
          to {
            transform: scale(0.95);
            opacity: 0;
          }
        }

        @keyframes fade-scale-in {
          from {
            transform: scale(1.05);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Efectos adicionales para las tarjetas */
        .group:hover .absolute.inset-0 {
          animation: shimmer 0.7s ease-out;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%) skewX(-12deg);
            opacity: 0;
          }
          50% {
            opacity: 0.2;
          }
          100% {
            transform: translateX(100%) skewX(-12deg);
            opacity: 0;
          }
        }

        /* Fallback para navegadores sin soporte */
        @media (prefers-reduced-motion: reduce) {
          ::view-transition-old(*),
          ::view-transition-new(*) {
            animation: none !important;
          }
          
          .group:hover .absolute.inset-0 {
            animation: none !important;
          }
        }

        /* Mejoras de performance */
        [style*="view-transition-name"] {
          contain: layout style paint;
        }

        /* Scroll personalizado */
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;