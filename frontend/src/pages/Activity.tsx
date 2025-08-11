// Activity.tsx - Con detalles expandibles y diseño mejorado (VERSIÓN CORREGIDA)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Clock, LogIn, Send, UserPlus, Settings, Filter, Search, Sparkles, XCircle, 
  Calendar, Loader2, AlertTriangle, RefreshCw, Download, Users, Shield, 
  GraduationCap, User, ChevronDown, CalendarRange, DollarSign, ArrowUpRight, 
  ArrowDownRight, ChevronRight, Eye, EyeOff, Info
} from 'lucide-react';
import { apiService } from '../services/api';
import type { Activity, ActivityResponse, ActivityStats } from '../services/api';

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

interface ActivityFilters {
  page: number;
  limit: number;
  date: string;
  startDate: string;
  endDate: string;
  type: string;
  search: string;
  userId: string;
  userRun: string;
  userRole: string;
  institution: string;
}

interface AvailableUser {
  id: string;
  run: string;
  name: string;
  email: string;
  role: string;
  displayRole: string;
  displayText: string;
}

const Activity: React.FC = () => {
  // Estados principales
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de usuario
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Estados para detalles expandibles
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  // Estados de filtros
  const [filters, setFilters] = useState<ActivityFilters>({
    page: 1,
    limit: 50,
    date: new Date().toISOString().split('T')[0],
    startDate: '',
    endDate: '',
    type: 'all',
    search: '',
    userId: '',
    userRun: '',
    userRole: 'all',
    institution: ''
  });

  // Estados para filtros avanzados
  const [useAdvancedFilters, setUseAdvancedFilters] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Estados de paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50
  });

  // Estados de tipos de actividad y roles
  const [activityTypes, setActivityTypes] = useState<Array<{
    value: string;
    label: string;
    icon: string;
  }>>([]);

  const [activityRoles, setActivityRoles] = useState<Array<{
    value: string;
    label: string;
    icon: string;
  }>>([]);

  // Función para manejar expansión de detalles
  const toggleActivityDetails = (activityId: string) => {
    setExpandedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Función para formatear montos
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Función para extraer detalles financieros de la actividad
  const getFinancialDetails = (activity: Activity) => {
    if (!activity.metadata) return null;

    const { metadata } = activity;
    const details: any = {};

    // Transferencias enviadas
    if (activity.type === 'transfer' && metadata.amount) {
      details.amount = metadata.amount;
      details.recipient = metadata.recipient || metadata.recipientName;
      details.recipientRun = metadata.recipientRun;
      details.description = metadata.description;
      details.type = 'sent';
      details.recipientCount = metadata.recipientCount || 1;
      details.recipients = metadata.recipients || [];
    }

    // Transferencias recibidas
    if (activity.type === 'transfer_received' && metadata.amount) {
      details.amount = metadata.amount;
      details.sender = metadata.sender || metadata.senderName;
      details.senderRun = metadata.senderRun;
      details.description = metadata.description;
      details.type = 'received';
    }

    return Object.keys(details).length > 0 ? details : null;
  };

  // Función para formatear monto con color
  const formatAmountWithColor = (amount: number, type: 'sent' | 'received') => {
    const formatted = formatCurrency(amount);
    const colorClass = type === 'sent' ? 'text-red-600' : 'text-green-600';
    const prefix = type === 'sent' ? '-' : '+';
    
    return {
      formatted,
      colorClass,
      prefix,
      display: `${prefix}${formatted}`
    };
  };

  // Función para manejar transiciones suaves
  const handleViewTransition = (callback: () => void) => {
    if (!document.startViewTransition) {
      callback();
      return;
    }

    document.startViewTransition(callback);
  };

  // Verificar si el usuario es admin
  useEffect(() => {
    const user = apiService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setIsAdmin(user.role === 'admin');
    }
  }, []);

  // Función para cargar usuarios disponibles (solo admin)
  const loadAvailableUsers = useCallback(async (searchTerm = '') => {
    if (!isAdmin) return;

    try {
      setLoadingUsers(true);
      const response = await apiService.getAvailableUsers({
        search: searchTerm,
        role: filters.userRole === 'all' ? undefined : filters.userRole,
        limit: 20
      });
      
      // 🔧 CORRECCIÓN: Manejar estructura de respuesta
      const users = Array.isArray(response) ? response : (response.data || []);
      setAvailableUsers(users);
    } catch (err) {
      console.error('Error loading users:', err);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin, filters.userRole]);

  // Función para cargar actividades
  const loadActivities = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      // Preparar parámetros de filtro
      const params: any = {
        page: filters.page,
        limit: filters.limit,
        type: filters.type === 'all' ? undefined : filters.type,
        search: filters.search.trim() || undefined
      };

      // Filtros de fecha
      if (useAdvancedFilters && filters.startDate && filters.endDate) {
        params.startDate = filters.startDate;
        params.endDate = filters.endDate;
      } else if (filters.date) {
        params.date = filters.date;
      }

      // Filtros de usuario (solo para admin)
      if (isAdmin) {
        if (filters.userId) params.userId = filters.userId;
        if (filters.userRun) params.userRun = filters.userRun;
        if (filters.userRole !== 'all') params.userRole = filters.userRole;
        if (filters.institution) params.institution = filters.institution;
      }

      console.log('🔍 Cargando actividades con parámetros:', params);
      const response = await apiService.getActivities(params);
      
      console.log('📡 Respuesta completa del backend:', response);

      // 🔧 CORRECCIÓN: Manejar estructura de respuesta correctamente
      let activitiesData: Activity[] = [];
      let paginationData: any = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 50
      };

      // Verificar si la respuesta tiene la estructura esperada
      if (response && typeof response === 'object') {
        if (response.data) {
          // Estructura: { status: 'success', data: { activities: [...], pagination: {...} } }
          activitiesData = response.data.activities || [];
          paginationData = response.data.pagination || paginationData;
        } else if (response.activities) {
          // Estructura: { activities: [...], pagination: {...} }
          activitiesData = response.activities || [];
          paginationData = response.pagination || paginationData;
        } else if (Array.isArray(response)) {
          // Estructura: [activities...]
          activitiesData = response;
        }
      }

      console.log('✅ Actividades procesadas:', activitiesData.length);
      console.log('📊 Paginación procesada:', paginationData);

      handleViewTransition(() => {
        setActivities(activitiesData);
        setPagination(paginationData);
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error loading activities:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, isAdmin, useAdvancedFilters]);

  // Función para cargar tipos y roles
  const loadTypesAndRoles = useCallback(async () => {
    try {
      const [typesResponse, rolesResponse] = await Promise.all([
        apiService.getActivityTypes(),
        apiService.getActivityRoles()
      ]);
      
      // 🔧 CORRECCIÓN: Manejar estructura de respuesta
      const types = Array.isArray(typesResponse) ? typesResponse : (typesResponse.data || []);
      const roles = Array.isArray(rolesResponse) ? rolesResponse : (rolesResponse.data || []);
      
      setActivityTypes(types);
      setActivityRoles(roles);
      
      console.log('✅ Tipos de actividad cargados:', types.length);
      console.log('✅ Roles cargados:', roles.length);
    } catch (err) {
      console.error('❌ Error loading types and roles:', err);
      // Fallback a valores por defecto si la API falla
      setActivityTypes([
        { value: 'all', label: 'Toda la actividad', icon: 'activity' },
        { value: 'login', label: 'Inicios de sesión', icon: 'log-in' },
        { value: 'logout', label: 'Cierres de sesión', icon: 'log-out' },
        { value: 'transfer', label: 'Transferencias enviadas', icon: 'send' },
        { value: 'transfer_received', label: 'Transferencias recibidas', icon: 'inbox' }
      ]);
      setActivityRoles([
        { value: 'all', label: 'Todos los roles', icon: 'users' },
        { value: 'admin', label: 'Administradores', icon: 'shield' },
        { value: 'teacher', label: 'Docentes', icon: 'graduation-cap' },
        { value: 'student', label: 'Estudiantes', icon: 'user' }
      ]);
    }
  }, []);

  // Efectos
  useEffect(() => {
    loadTypesAndRoles();
  }, [loadTypesAndRoles]);

  useEffect(() => {
    if (isAdmin) {
      loadAvailableUsers(userSearchTerm);
    }
  }, [loadAvailableUsers, userSearchTerm]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // Handlers para filtros
  const handleFilterChange = (key: keyof ActivityFilters, value: string | number) => {
    handleViewTransition(() => {
      setFilters(prev => ({
        ...prev,
        [key]: value,
        page: key === 'page' ? value : 1 // Resetear página si cambia otro filtro
      }));
    });
  };

  const handleRefresh = () => {
    loadActivities(false);
  };

  const handleUserSelect = (user: AvailableUser) => {
    handleFilterChange('userId', user.id);
    setUserSearchTerm(user.displayText);
  };

  const handleClearUserFilter = () => {
    handleFilterChange('userId', '');
    handleFilterChange('userRun', '');
    setUserSearchTerm('');
  };

  const handleToggleAdvancedFilters = () => {
    setUseAdvancedFilters(!useAdvancedFilters);
    if (useAdvancedFilters) {
      // Limpiar filtros avanzados al desactivar
      handleFilterChange('startDate', '');
      handleFilterChange('endDate', '');
    }
  };

  // Función para obtener icono de actividad
  const getActivityIcon = (type: string) => {
    const iconClass = "w-3.5 h-3.5";
    switch (type) {
      case 'login':
        return <LogIn className={`${iconClass} text-blue-600`} />;
      case 'logout':
        return <LogIn className={`${iconClass} text-gray-600 rotate-180`} />;
      case 'transfer':
        return <ArrowUpRight className={`${iconClass} text-red-600`} />;
      case 'transfer_received':
        return <ArrowDownRight className={`${iconClass} text-green-600`} />;
      case 'student_created':
      case 'teacher_created':
        return <UserPlus className={`${iconClass} text-purple-600`} />;
      case 'profile_updated':
        return <Settings className={`${iconClass} text-orange-600`} />;
      case 'change_password':
        return <Settings className={`${iconClass} text-blue-600`} />;
      case 'failed_login':
        return <XCircle className={`${iconClass} text-red-600`} />;
      default:
        return <Clock className={`${iconClass} text-gray-600`} />;
    }
  };

  // Función para obtener icono de rol
  const getRoleIcon = (role: string) => {
    const iconClass = "w-3 h-3";
    switch (role) {
      case 'admin':
        return <Shield className={`${iconClass} text-red-600`} />;
      case 'teacher':
        return <GraduationCap className={`${iconClass} text-purple-600`} />;
      case 'student':
        return <User className={`${iconClass} text-blue-600`} />;
      default:
        return <User className={`${iconClass} text-gray-600`} />;
    }
  };

  // Función para formatear fecha
  const formatDate = (date: Date) => {
    const activityDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = activityDate.toDateString() === today.toDateString();
    const isYesterday = activityDate.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Hoy, ${activityDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Ayer, ${activityDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(activityDate);
    }
  };

  // Función para obtener etiqueta de fecha seleccionada
  const getSelectedDateLabel = () => {
    if (useAdvancedFilters && filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      return `${start.toLocaleDateString('es-CL')} - ${end.toLocaleDateString('es-CL')}`;
    }

    const selected = new Date(filters.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (selected.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (selected.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return new Intl.DateTimeFormat('es-CL', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      }).format(selected);
    }
  };

  // Renderizado condicional para estados de carga y error
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 py-4">
        <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-sm text-gray-600">Cargando actividades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-3 py-4">
        <div className="bg-white rounded-lg shadow border border-red-200 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => loadActivities()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header con información para admin */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              {isAdmin ? <Shield className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h1 className="text-base font-bold">
                {isAdmin ? 'Panel de Actividades - Administrador' : `Actividad del ${getSelectedDateLabel()}`}
              </h1>
              <p className="text-blue-200 text-xs">
                {isAdmin ? 'Vista completa de todas las actividades de la plataforma' : 'Historial de tus acciones'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-1.5 bg-white/20 rounded hover:bg-white/30 transition-colors disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="text-right">
              <p className="text-blue-200 text-xs mb-0.5">
                {isAdmin ? 'Total registros' : 'Actividades'}
              </p>
              <p className="text-base font-bold">{pagination.totalItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        {/* Filtros básicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar actividad..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
          
          {/* Tipo de actividad */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 appearance-none"
            >
              {activityTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de rol (solo admin) */}
          {isAdmin && (
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
              <select
                value={filters.userRole}
                onChange={(e) => handleFilterChange('userRole', e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300 appearance-none"
              >
                {activityRoles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Calendario / Filtros avanzados */}
          <div className="flex gap-2">
            {!useAdvancedFilters ? (
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none z-10" />
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            ) : (
              <>
                <div className="relative flex-1">
                  <input
                    type="date"
                    placeholder="Fecha inicio"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                </div>
                <div className="relative flex-1">
                  <input
                    type="date"
                    placeholder="Fecha fin"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                </div>
              </>
            )}
            
            {isAdmin && (
              <button
                onClick={handleToggleAdvancedFilters}
                className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                  useAdvancedFilters 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                title="Filtros avanzados"
              >
                <CalendarRange className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros de usuario (solo admin) */}
        {isAdmin && (
          <div className="border-t border-gray-100 p-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Búsqueda de usuario */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar usuario por nombre o RUN..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
                {userSearchTerm && (
                  <button
                    onClick={handleClearUserFilter}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                
                {/* Dropdown de usuarios */}
                {userSearchTerm && availableUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-20">
                    {availableUsers.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-xs"
                      >
                        {getRoleIcon(user.role)}
                        <span className="truncate">{user.displayText}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Búsqueda por RUN */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filtrar por RUN (ej: 12345678-9)"
                  value={filters.userRun}
                  onChange={(e) => handleFilterChange('userRun', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de actividades */}
      {activities.length > 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <h3 className="text-xs font-bold text-gray-700">
                  {isAdmin ? 'Actividades de la plataforma' : `Actividades del ${getSelectedDateLabel()}`}
                </h3>
                <span className="text-[10px] text-gray-500">
                  ({activities.length} de {pagination.totalItems})
                </span>
              </div>
              
              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFilterChange('page', Math.max(1, pagination.currentPage - 1))}
                    disabled={pagination.currentPage <= 1}
                    className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-[10px] text-gray-500">
                    {pagination.currentPage} de {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, pagination.currentPage + 1))}
                    disabled={pagination.currentPage >= pagination.totalPages}
                    className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Lista con detalles expandibles - DISEÑO MEJORADO */}
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {activities.map((activity) => {
              const financialDetails = getFinancialDetails(activity);
              const isExpanded = expandedActivities.has(activity.id);
              const hasFinancialDetails = !!financialDetails;
              
              return (
                <div
                  key={activity.id}
                  className="transition-all duration-200 hover:bg-gray-50"
                >
                  {/* Contenido principal - siempre visible */}
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold text-gray-900 leading-relaxed">
                                {activity.description}
                              </p>
                              
                              {/* Botón para expandir detalles - solo para transferencias */}
                              {hasFinancialDetails && (
                                <button
                                  onClick={() => toggleActivityDetails(activity.id)}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                                  title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
                                >
                                  <Info className="w-3 h-3" />
                                  <span className="hidden sm:inline">
                                    {isExpanded ? "Ocultar" : "Detalles"}
                                  </span>
                                  <ChevronRight 
                                    className={`w-3 h-3 transition-transform duration-200 ${
                                      isExpanded ? 'rotate-90' : ''
                                    }`} 
                                  />
                                </button>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-[10px] text-gray-500">
                                {formatDate(activity.date)}
                              </p>
                              {/* Información del usuario (solo para admin) */}
                              {isAdmin && activity.user && (
                                <>
                                  <span className="text-[10px] text-gray-400">•</span>
                                  <div className="flex items-center gap-1">
                                    {getRoleIcon(activity.user.role)}
                                    <span className="text-[10px] text-gray-600 font-medium">
                                      {activity.user.displayName}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      ({activity.user.run})
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Monto destacado para transferencias - compacto */}
                          {financialDetails && (
                            <div className="ml-3 text-right">
                              <div className={`text-sm font-bold ${
                                financialDetails.type === 'sent' ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {formatAmountWithColor(financialDetails.amount, financialDetails.type).display}
                              </div>
                              {financialDetails.type === 'sent' && (
                                <span className="text-[10px] text-red-500">Enviado</span>
                              )}
                              {financialDetails.type === 'received' && (
                                <span className="text-[10px] text-green-500">Recibido</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detalles expandibles - solo se muestran al hacer click */}
                  {hasFinancialDetails && isExpanded && (
                    <div className="px-3 pb-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="ml-6 pl-3 border-l-2 border-blue-100">
                        <div className="bg-gradient-to-r from-blue-50 to-gray-50 rounded-lg p-3 border border-blue-100">
                          <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-bold text-gray-800">
                              Detalles de la transferencia
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {/* Información de contacto */}
                            {financialDetails.recipient && (
                              <div className="bg-white p-3 rounded-lg border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Send className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-medium text-gray-700">Destinatario:</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {financialDetails.recipient}
                                  {financialDetails.recipientRun && (
                                    <span className="text-gray-600 ml-2 font-normal">({financialDetails.recipientRun})</span>
                                  )}
                                </p>
                                {financialDetails.recipientCount > 1 && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    +{financialDetails.recipientCount - 1} destinatarios más
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {financialDetails.sender && (
                              <div className="bg-white p-3 rounded-lg border">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-3 h-3 text-blue-600" />
                                  <span className="text-xs font-medium text-gray-700">Remitente:</span>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {financialDetails.sender}
                                  {financialDetails.senderRun && (
                                    <span className="text-gray-600 ml-2 font-normal">({financialDetails.senderRun})</span>
                                  )}
                                </p>
                              </div>
                            )}
                            
                            {/* Descripción */}
                            {financialDetails.description && (
                              <div className="bg-white p-3 rounded-lg border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Info className="w-3 h-3 text-gray-600" />
                                  <span className="text-xs font-medium text-gray-700">Descripción:</span>
                                </div>
                                <p className="text-sm text-gray-800 italic">
                                  "{financialDetails.description}"
                                </p>
                              </div>
                            )}

                            {/* Monto destacado en los detalles */}
                            <div className="bg-white p-3 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-medium text-gray-700">Monto:</span>
                                </div>
                                <div className={`text-lg font-bold ${
                                  financialDetails.type === 'sent' ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {formatAmountWithColor(financialDetails.amount, financialDetails.type).display}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Estado vacío */
        <div className="bg-white rounded-lg shadow border border-gray-100 p-6 text-center">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">
            No se encontraron actividades con los filtros seleccionados
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Prueba ajustando los filtros de búsqueda
          </p>
        </div>
      )}
    </div>
  );
};

export default Activity;