import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, User, AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Clock, FileText, UserPlus, Edit, LogIn, LogOut, Send, Download, Trash2, Settings, Eye, Shield, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import type { Activity, ActivityFilters, ActivityResponse } from '../types/types';

const ActivityPage = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Estados para filtros
  const [filters, setFilters] = useState<Partial<ActivityFilters>>({
    page: 1,
    limit: 20,
    search: '',
    type: '',
    userRole: '',
    startDate: '',
    endDate: ''
  });

  // Estados para paginación
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });

  // Estados para filtros avanzados
  const [availableTypes, setAvailableTypes] = useState<Array<{value: string, label: string}>>([]);
  const [availableRoles, setAvailableRoles] = useState<Array<{value: string, label: string}>>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Cargar actividades
  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Cargando actividades con filtros:', filters);

      const response: ActivityResponse = await apiService.getActivityLog(filters as ActivityFilters);
      
      console.log('✅ Actividades cargadas:', response.data);

      setActivities(response.data.activities);
      setPagination(response.data.pagination);
      setIsAdmin(response.data.isAdmin);

    } catch (error: any) {
      console.error('❌ Error cargando actividades:', error);
      setError(error.message || 'Error al cargar actividades');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Cargar tipos y roles disponibles
  const loadFilterOptions = useCallback(async () => {
    try {
      const [typesResponse, rolesResponse] = await Promise.all([
        apiService.getActivityTypes(),
        apiService.getActivityRoles()
      ]);

      setAvailableTypes(typesResponse.data.map(t => ({ value: t.value, label: t.label })));
      setAvailableRoles(rolesResponse.data.map(r => ({ value: r.value, label: r.label })));
    } catch (error) {
      console.error('Error cargando opciones de filtro:', error);
    }
  }, []);

  // Efectos
  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadActivities();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [loadActivities]);

  // Handlers
  const handleFilterChange = (key: keyof ActivityFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && { page: 1 }) // Resetear página al cambiar filtros
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: '',
      type: '',
      userRole: '',
      startDate: '',
      endDate: ''
    });
  };

  const refreshActivities = () => {
    loadActivities();
  };

  // Formateo de fecha
  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Formateo de descripción
  const formatDescription = (activity: Activity) => {
    if (activity.description) return activity.description;
    
    const typeDescriptions: Record<string, string> = {
      login: 'Inicio de sesión',
      logout: 'Cierre de sesión',
      transfer: 'Transferencia realizada',
      student_created: 'Estudiante creado',
      teacher_created: 'Docente creado',
      profile_updated: 'Perfil actualizado',
      password_changed: 'Contraseña cambiada',
      default: 'Actividad del sistema'
    };

    return typeDescriptions[activity.type] || typeDescriptions.default;
  };

  // Obtener ícono para tipo de actividad
  const getActivityIcon = (type: string): React.ReactElement => {
    const icons: Record<string, React.ReactElement> = {
      login: <LogIn className="w-4 h-4 text-green-500" />,
      logout: <LogOut className="w-4 h-4 text-red-500" />,
      transfer: <Send className="w-4 h-4 text-blue-500" />,
      student_created: <UserPlus className="w-4 h-4 text-purple-500" />,
      teacher_created: <UserPlus className="w-4 h-4 text-indigo-500" />,
      profile_updated: <Edit className="w-4 h-4 text-orange-500" />,
      password_changed: <Shield className="w-4 h-4 text-yellow-500" />,
      default: <AlertCircle className="w-4 h-4 text-gray-500" />
    };

    return icons[type] || icons.default;
  };

  // Obtener color de badge para rol
  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      teacher: 'bg-green-100 text-green-700',
      student: 'bg-blue-100 text-blue-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registro de Actividad</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isAdmin ? 'Actividad de todos los usuarios del sistema' : 'Tu actividad reciente'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-blue-50 text-blue-700' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
          <button
            onClick={refreshActivities}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow border border-gray-100 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar en descripción..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-300"
                />
              </div>
            </div>

            {/* Tipo de actividad */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo de Actividad</label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-300"
              >
                <option value="">Todos los tipos</option>
                {availableTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Rol de usuario */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rol de Usuario</label>
                <select
                  value={filters.userRole || ''}
                  onChange={(e) => handleFilterChange('userRole', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-300"
                >
                  <option value="">Todos los roles</option>
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Fecha desde */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Desde</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-300"
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-300"
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Estado de Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error al cargar actividades</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              <button
                onClick={refreshActivities}
                className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Actividades */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
            <p className="text-sm text-gray-500">Cargando actividades...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No hay actividades para mostrar</p>
            <p className="text-xs text-gray-400 mt-1">
              {Object.values(filters).some(f => f && f !== 1 && f !== 20)
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'No se han registrado actividades aún'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity, index) => (
              <div key={activity.id || index} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Ícono de actividad */}
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDescription(activity)}
                        </p>
                        
                        {/* Información del usuario */}
                        {isAdmin && activity.user && (
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              {activity.user.displayName || `${activity.user.first_name} ${activity.user.last_name}`}
                            </span>
                            <span className="text-xs text-gray-400">({activity.user.run})</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(activity.user.role)}`}>
                              {activity.user.displayRole}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Fecha */}
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(activity.date)}
                      </div>
                    </div>

                    {/* Metadata adicional */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <details>
                          <summary className="cursor-pointer font-medium">Detalles adicionales</summary>
                          <pre className="mt-1 text-xs whitespace-pre-wrap">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {!loading && activities.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span>
                Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} a{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de{' '}
                {pagination.totalItems} actividades
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="flex items-center gap-1 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              
              <span>
                Página {pagination.currentPage} de {pagination.totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="flex items-center gap-1 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPage;