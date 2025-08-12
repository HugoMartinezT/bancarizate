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
import type { User, StatCardProps } from '../types/types';

// Interfaces
interface DashboardProps {
  user: User;
}

// Componente de tarjeta de estadística mejorada
const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, subtitle, trend, iconBgColor, iconColor, valueColor, onClick }) => (
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
    if (document.startViewTransition) {
      document.startViewTransition(callback);
    } else {
      callback();
    }
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
      
      // 🐛 DEBUG: Ver qué datos llegan realmente
      console.log('🔍 DEBUG - Transfers recibidas:', response.data.transfers);
      console.log('🔍 DEBUG - Estructura COMPLETA de primera transferencia:', JSON.stringify(response.data.transfers[0], null, 2));
      console.log('🔍 DEBUG - Todas las propiedades de la primera transferencia:', Object.keys(response.data.transfers[0] || {}));
      console.log('🔍 DEBUG - Tipos de transferencias:', response.data.transfers.map(t => ({
        id: t.id,
        direction: t.direction, // Ahora usamos direction
        amount: t.amount,
        description: t.description
      })));
      
      setRecentTransfers(response.data.transfers);
    } catch (error: any) {
      console.error('Error cargando actividad reciente:', error);
    } finally {
      setIsLoadingTransfers(false);
    }
  }, []);

  useEffect(() => {
    loadUserStats();
    loadRecentActivity();
  }, [loadUserStats, loadRecentActivity]);

  const toggleBalance = () => {
    handleTransition(() => setShowBalance(!showBalance));
  };

  const handleTransactionFilter = (filter: 'all' | 'sent' | 'received') => {
    handleTransition(() => setTransactionFilter(filter));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getAvatarColors = (name: string) => {
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-orange-100', text: 'text-orange-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700' }
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTransferType = (transfer: Transfer): 'sent' | 'received' => {
    return transfer.direction || transfer.type || 'sent';
  };

  const filteredTransfers = recentTransfers.filter(transfer => {
    if (transactionFilter === 'all') return true;
    return getTransferType(transfer) === transactionFilter;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bienvenido, {user.firstName}</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de tu cuenta</p>
        </div>
        <button 
          onClick={toggleBalance}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 flex items-center gap-2 text-xs font-medium"
        >
          {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showBalance ? 'Ocultar' : 'Mostrar'} saldo
        </button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CreditCard}
          title="Saldo Disponible"
          value={showBalance ? formatCurrency(user.balance) : '••••••'}
          subtitle="Incluye sobregiro disponible"
          trend={8.2}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          valueColor="text-blue-900"
          onClick={() => console.log('Saldo click')}
        />

        <StatCard
          icon={Home}
          title="Sobregiro"
          value={formatCurrency(user.overdraftLimit)}
          subtitle="Límite aprobado"
          iconBgColor="bg-orange-50"
          iconColor="text-orange-600"
          valueColor="text-orange-900"
          trend={0}
          onClick={() => console.log('Sobregiro click')}
        />

        <StatCard
          icon={Send}
          title="Transferencias Hoy"
          value={userStats?.stats.transfersToday || 0}
          subtitle="De un límite de 5"
          trend={-15}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
          valueColor="text-green-900"
          onClick={() => console.log('Transferencias click')}
        />

        <StatCard
          icon={Users}
          title="Contactos"
          value="24"
          subtitle="En tu institución"
          trend={12}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          valueColor="text-purple-900"
          onClick={() => console.log('Contactos click')}
        />
      </div>

      {/* Sección de actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Filtros de transacciones */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => handleTransactionFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              transactionFilter === 'all' 
                ? 'bg-[#193cb8] text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          <button 
            onClick={() => handleTransactionFilter('sent')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              transactionFilter === 'sent' 
                ? 'bg-[#193cb8] text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Enviadas
          </button>
          <button 
            onClick={() => handleTransactionFilter('received')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              transactionFilter === 'received' 
                ? 'bg-[#193cb8] text-white shadow-md' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Recibidas
          </button>
          <button 
            onClick={loadRecentActivity}
            disabled={isLoadingTransfers}
            className="ml-auto px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingTransfers ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Lista de transacciones */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          style={{ viewTransitionName: 'transactions-list' }}
        >
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Actividad Reciente</h2>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {isLoadingTransfers ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-xs font-medium">Cargando transacciones...</p>
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Clock className="w-8 h-8 mb-2" />
                <p className="text-xs font-medium">No hay transacciones recientes</p>
              </div>
            ) : (
              filteredTransfers.map(transfer => {
                const isIncoming = getTransferType(transfer) === 'received';
                const colors = getAvatarColors(transfer.otherPerson?.name || 'Desconocido');
                const initials = getInitials(transfer.otherPerson?.name || 'Desconocido');

                return (
                  <div key={transfer.id} className="p-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-3">
                    <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center shadow-sm`}>
                      <span className={`text-sm font-bold ${colors.text}`}>{initials}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {transfer.otherPerson?.name || 'Desconocido'}
                        </p>
                        <p className={`text-sm font-bold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                          {isIncoming ? '+' : '-'}{formatCurrency(transfer.amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="truncate flex-1">{transfer.description}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(transfer.date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Enlace para ver más si hay transacciones */}
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
      <style>
        {`
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
      `}
      </style>
    </div>
  );
};

export default Dashboard;