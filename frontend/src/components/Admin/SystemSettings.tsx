import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle, XCircle, Loader2, DollarSign, Users, Shield, Globe, Eye, History, X, Clock, Zap, TestTube, AlertTriangle } from 'lucide-react';
import { apiService, SystemConfig, SystemConfigResponse } from '../../services/api';

interface ConfigUpdate {
  key: string;
  value: any;
  originalValue: string;
}

const RateLimiterPanel = ({ showRateLimiterPanel, rateLimiterStatus, isRefreshingRateLimiters, rateLimiterTest, handleRefreshRateLimiters, handleTestRateLimiters, setShowRateLimiterPanel }: {
  showRateLimiterPanel: boolean;
  rateLimiterStatus: any;
  isRefreshingRateLimiters: boolean;
  rateLimiterTest: any;
  handleRefreshRateLimiters: () => Promise<void>;
  handleTestRateLimiters: () => Promise<void>;
  setShowRateLimiterPanel: (value: boolean) => void;
}) => {
  if (!showRateLimiterPanel || !rateLimiterStatus) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-t-lg p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <h2 className="text-lg font-bold">Estado de Rate Limiters</h2>
            </div>
            <button
              onClick={() => setShowRateLimiterPanel(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Contenido */}
        <div className="p-6 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Información</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Última carga:</span> {rateLimiterStatus.configuration.lastLoaded}</div>
                <div><span className="font-medium">Origen:</span> {rateLimiterStatus.configuration.source}</div>
                <div><span className="font-medium">Actualizado por:</span> {rateLimiterStatus.requestedBy.name}</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Acciones</h3>
              <div className="space-y-2">
                <button
                  onClick={handleRefreshRateLimiters}
                  disabled={isRefreshingRateLimiters}
                  className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingRateLimiters ? 'animate-spin' : ''}`} />
                  {isRefreshingRateLimiters ? 'Refrescando...' : 'Refrescar'}
                </button>
                <button
                  onClick={handleTestRateLimiters}
                  className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  Probar Rate Limiters
                </button>
              </div>
            </div>
          </div>
          {/* Configuraciones actuales */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Configuración Actual</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(rateLimiterStatus.configuration).map(([key, value]) => {
                if (typeof value === 'object' || key === 'lastLoaded' || key === 'source') return null;
                return (
                  <div key={key} className="p-3 bg-gray-50 rounded border">
                    <div className="text-xs text-gray-500 font-mono">{key}</div>
                    <div className="font-semibold text-gray-900">
                      {apiService.formatRateLimitDisplay(key, value as number)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Resultado del test */}
          {rateLimiterTest && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                <CheckCircle className="w-4 h-4" />
                Test de Rate Limiters
              </div>
              <div className="text-sm text-green-600">
                <div><span className="font-medium">Tipo:</span> {rateLimiterTest.testType}</div>
                <div><span className="font-medium">Mensaje:</span> {rateLimiterTest.message}</div>
                <div><span className="font-medium">Timestamp:</span> {rateLimiterTest.timestamp}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RateLimiterControls = ({ handleGetRateLimiterStatus, handleRefreshRateLimiters, isRefreshingRateLimiters }: {
  handleGetRateLimiterStatus: () => Promise<void>;
  handleRefreshRateLimiters: () => Promise<void>;
  isRefreshingRateLimiters: boolean;
}) => (
  <div className="flex gap-2">
    <button
      onClick={handleGetRateLimiterStatus}
      className="px-3 py-2 text-sm text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
      title="Ver estado de rate limiters"
    >
      <Shield className="w-4 h-4" />
      Estado Rate Limiters
    </button>
    <button
      onClick={handleRefreshRateLimiters}
      disabled={isRefreshingRateLimiters}
      className={`px-3 py-2 text-sm text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 ${
        isRefreshingRateLimiters ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title="Aplicar cambios de rate limiters inmediatamente"
    >
      <Zap className={`w-4 h-4 ${isRefreshingRateLimiters ? 'animate-pulse' : ''}`} />
      {isRefreshingRateLimiters ? 'Aplicando...' : 'Aplicar Rate Limiters'}
    </button>
  </div>
);

const SystemSettings = () => {
  const [configurations, setConfigurations] = useState<SystemConfig[]>([]);
  const [groupedConfigs, setGroupedConfigs] = useState<Record<string, SystemConfig[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados del formulario
  const [pendingChanges, setPendingChanges] = useState<Record<string, ConfigUpdate>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyEditable, setShowOnlyEditable] = useState(true);
  
  // Estados de la UI
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Estados para Rate Limiters
  const [isRefreshingRateLimiters, setIsRefreshingRateLimiters] = useState(false);
  const [rateLimiterStatus, setRateLimiterStatus] = useState<any>(null);
  const [showRateLimiterPanel, setShowRateLimiterPanel] = useState(false);
  const [rateLimiterTest, setRateLimiterTest] = useState<any>(null);

  // ✅ HELPER: Convertir isEditable a boolean de forma segura
  const convertToBoolean = (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
    if (typeof value === 'number') return value === 1;
    return false;
  };

  // Función helper para generar labels dinámicos
  const generateLabel = (configKey: string): string => {
    return configKey
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Función helper para obtener el icono correcto según la categoría
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'financial':
        return DollarSign;
      case 'security':
        return Shield;
      case 'general':
        return Settings;
      case 'users':
        return Users;
      default:
        return Globe;
    }
  };

  // Función para formatear valores para mostrar
  const formatDisplayValue = (config: SystemConfig, value: any): string => {
    if (config.dataType === 'boolean') {
      return value === true || value === 'true' ? 'Activado' : 'Desactivado';
    }
    
    if (config.dataType === 'number') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      // Para rate limiters con _window_ms, formatear como tiempo
      if (config.configKey.includes('_window_ms') || config.configKey.includes('window')) {
        const minutes = Math.floor(numValue / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours >= 1) {
          return `${hours} hora${hours !== 1 ? 's' : ''}`;
        }
        return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
      }
      
      // Para otros números, formatear con separador de miles
      return numValue.toLocaleString('es-CL');
    }
    
    return String(value);
  };

  // Función para formatear fechas
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cargar configuraciones desde el backend
  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getSystemConfig();
      
      if (response.status === 'success' && response.data) {
        const configs = response.data.configurations || [];
        setConfigurations(configs);
        
        // Agrupar por categoría
        const grouped = configs.reduce((acc: Record<string, SystemConfig[]>, config: SystemConfig) => {
          const category = config.category || 'general';
          if (!acc[category]) acc[category] = [];
          acc[category].push(config);
          return acc;
        }, {});
        
        setGroupedConfigs(grouped);
        setCategories(Object.keys(grouped).sort());
      }
    } catch (err: any) {
      console.error('Error cargando configuraciones:', err);
      setError(err.response?.data?.message || 'Error al cargar las configuraciones del sistema');
    } finally {
      setLoading(false);
    }
  };

  // Cargar historial de una configuración específica
  const loadHistory = async (configKey: string) => {
    try {
      setLoadingHistory(true);
      const response = await apiService.getConfigHistory(configKey);
      
      if (response.status === 'success' && response.data) {
        setHistoryData(response.data.history || []);
      }
    } catch (err: any) {
      console.error('Error cargando historial:', err);
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Manejar cambios en valores
  const handleValueChange = (config: SystemConfig, newValue: any) => {
    let processedValue = newValue;
    
    // Convertir según el tipo de dato
    if (config.dataType === 'number') {
      processedValue = parseFloat(newValue) || 0;
    } else if (config.dataType === 'boolean') {
      processedValue = newValue === true || newValue === 'true';
    }

    // Actualizar cambios pendientes
    setPendingChanges(prev => ({
      ...prev,
      [config.configKey]: {
        key: config.configKey,
        value: processedValue,
        originalValue: config.configValue
      }
    }));
  };

  // Guardar cambios
  const handleSave = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      setError('No hay cambios pendientes para guardar');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Convertir pendingChanges a formato que espera el backend
      const updates = Object.entries(pendingChanges).map(([key, change]) => ({
        key: key,
        value: change.value
      }));

      const response = await apiService.updateMultipleConfigurations(updates);

      if (response.status === 'success') {
        setSuccess(`✅ ${Object.keys(updates).length} configuración(es) actualizada(s) exitosamente`);
        setPendingChanges({});
        
        // Recargar configuraciones
        await loadConfigurations();
        
        // Limpiar mensaje de éxito después de 5 segundos
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err: any) {
      console.error('Error guardando configuraciones:', err);
      setError(err.response?.data?.message || 'Error al guardar las configuraciones');
    } finally {
      setIsSaving(false);
    }
  };

  // Descartar cambios
  const handleDiscard = () => {
    setPendingChanges({});
    setSuccess('Cambios descartados');
    setTimeout(() => setSuccess(null), 3000);
  };

  // ✅ NUEVAS FUNCIONES PARA RATE LIMITERS
  const handleGetRateLimiterStatus = async () => {
    try {
      const response = await apiService.getRateLimiterStatus();
      if (response.status === 'success') {
        setRateLimiterStatus(response.data);
        setShowRateLimiterPanel(true);
      }
    } catch (err: any) {
      console.error('Error obteniendo estado de rate limiters:', err);
      setError('Error al obtener estado de rate limiters');
    }
  };

  const handleRefreshRateLimiters = async () => {
    try {
      setIsRefreshingRateLimiters(true);
      setError(null);
      
      const response = await apiService.refreshRateLimiters();
      
      if (response.status === 'success') {
        setSuccess('✅ Rate limiters aplicados exitosamente');
        
        // Recargar estado actualizado
        await handleGetRateLimiterStatus();
        
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Error refrescando rate limiters:', err);
      setError(err.response?.data?.message || 'Error al refrescar rate limiters');
    } finally {
      setIsRefreshingRateLimiters(false);
    }
  };

  const handleTestRateLimiters = async () => {
    try {
      const response = await apiService.testRateLimiters();
      if (response.status === 'success') {
        setRateLimiterTest(response.data);
        setSuccess('✅ Test de rate limiters completado');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Error probando rate limiters:', err);
      setError('Error al probar rate limiters');
    }
  };

  // Cargar configuraciones al montar
  useEffect(() => {
    loadConfigurations();
  }, []);

  // Filtrar configuraciones según categoría y filtros
  const filteredConfigs = configurations.filter(config => {
    // Filtro por categoría
    if (selectedCategory !== 'all' && config.category !== selectedCategory) {
      return false;
    }
    
    // Filtro por editables
    if (showOnlyEditable && !convertToBoolean(config.isEditable)) {
      return false;
    }
    
    return true;
  });

  const hasChanges = Object.keys(pendingChanges).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando configuraciones del sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Configuración del Sistema</h1>
              <p className="text-blue-200 text-xs">
                Gestiona las configuraciones globales de BANCARIZATE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RateLimiterControls
              handleGetRateLimiterStatus={handleGetRateLimiterStatus}
              handleRefreshRateLimiters={handleRefreshRateLimiters}
              isRefreshingRateLimiters={isRefreshingRateLimiters}
            />
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div>
        {/* Mensajes de estado */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Controles superiores */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Selector de categoría */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle solo editables */}
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyEditable}
                  onChange={(e) => setShowOnlyEditable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">
                  Solo editables
                </span>
              </label>
            </div>

            {/* Botones de acción */}
            {hasChanges && (
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={handleDiscard}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Descartar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Guardando...' : `Guardar (${Object.keys(pendingChanges).length})`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de configuraciones */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Configuración
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConfigs.map((config) => {
                const hasChange = config.configKey in pendingChanges;
                const displayValue = hasChange 
                  ? pendingChanges[config.configKey].value 
                  : config.configValue;

                const CategoryIcon = getCategoryIcon(config.category);

                return (
                  <tr 
                    key={config.configKey}
                    className={hasChange ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {generateLabel(config.configKey)}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">
                            {config.configKey}
                          </div>
                        </div>
                        {hasChange && (
                          <span className="text-xs text-orange-600 font-medium">⚠ Cambio pendiente</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {/* ✅ CORREGIDO: Conversión de boolean usando helper function */}
                      {convertToBoolean(config.isEditable) ? (
                        <div className="flex flex-col">
                          {config.dataType === 'boolean' ? (
                            <select
                              value={displayValue?.toString() || 'false'}
                              onChange={(e) => handleValueChange(config, e.target.value === 'true')}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-300"
                            >
                              <option value="true">Activado</option>
                              <option value="false">Desactivado</option>
                            </select>
                          ) : config.dataType === 'number' ? (
                            <input
                              type="number"
                              value={displayValue || 0}
                              onChange={(e) => handleValueChange(config, e.target.value)}
                              min={config.minValue || undefined}
                              max={config.maxValue || undefined}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-300"
                            />
                          ) : (
                            <input
                              type="text"
                              value={displayValue || ''}
                              onChange={(e) => handleValueChange(config, e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-300"
                            />
                          )}
                          {hasChange && (
                            <div className="text-xs text-gray-500 mt-1">
                              Anterior: {' '}
                              <span className="text-green-600">{formatDisplayValue(config, displayValue)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700">
                            {formatDisplayValue(config, config.configValue)}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                      <div className="truncate" title={config.description}>
                        {config.description}
                      </div>
                      {(config.minValue !== null || config.maxValue !== null) && (
                        <div className="text-xs text-gray-500 mt-1">
                          Rango: {config.minValue || '∞'} - {config.maxValue || '∞'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setShowHistory(config.configKey);
                            loadHistory(config.configKey);
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                          title="Ver historial"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {hasChange && (
                          <button
                            onClick={() => {
                              const newChanges = { ...pendingChanges };
                              delete newChanges[config.configKey];
                              setPendingChanges(newChanges);
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-red-600 transition-colors"
                            title="Descartar cambio"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredConfigs.length === 0 && (
            <div className="text-center py-8">
              <Settings className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay configuraciones que mostrar</p>
            </div>
          )}
        </div>

        <RateLimiterPanel
          showRateLimiterPanel={showRateLimiterPanel}
          rateLimiterStatus={rateLimiterStatus}
          isRefreshingRateLimiters={isRefreshingRateLimiters}
          rateLimiterTest={rateLimiterTest}
          handleRefreshRateLimiters={handleRefreshRateLimiters}
          handleTestRateLimiters={handleTestRateLimiters}
          setShowRateLimiterPanel={setShowRateLimiterPanel}
        />

        {/* Modal de historial */}
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              {/* Header del modal */}
              <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-t-lg p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/20 rounded">
                      <History className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-bold">Historial de Cambios</h2>
                  </div>
                  <button
                    onClick={() => setShowHistory(null)}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-blue-200 text-sm mt-1">Configuración: {showHistory}</p>
              </div>

              {/* Contenido del historial */}
              <div className="p-4 max-h-96 overflow-y-auto">
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-600 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-gray-500">Cargando historial...</p>
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-8">
                    <Eye className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No hay cambios registrados</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Los cambios aparecerán aquí una vez que se modifique esta configuración
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyData.map((entry, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {entry.users?.first_name} {entry.users?.last_name}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatDate(entry.created_at)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          RUN: {entry.users?.run}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Valor anterior:</span>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-mono">
                                {entry.metadata?.oldValue}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Valor nuevo:</span>
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-mono">
                                {entry.metadata?.newValue}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettings;
export { RateLimiterPanel, RateLimiterControls };