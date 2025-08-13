import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle, XCircle, Loader2, DollarSign, Users, Shield, Globe, Eye, History, X, Clock } from 'lucide-react';
import { apiService, SystemConfig, SystemConfigResponse } from '../../services/api';

interface ConfigUpdate {
  key: string;
  value: any;
  originalValue: string;
}

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

  // ✅ AGREGADO: Función helper para generar labels dinámicos
  const generateLabel = (configKey: string): string => {
    return configKey
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Mapeo de categorías a iconos y labels
  const categoryInfo = {
    transfers: { icon: DollarSign, label: 'Transferencias', color: 'green' },
    users: { icon: Users, label: 'Usuarios', color: 'blue' },
    security: { icon: Shield, label: 'Seguridad', color: 'red' },
    general: { icon: Globe, label: 'General', color: 'gray' },
    system: { icon: Settings, label: 'Sistema', color: 'purple' },
    notifications: { icon: AlertCircle, label: 'Notificaciones', color: 'yellow' }
  };

  // Cargar configuraciones
  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('⚙️ Cargando configuraciones del sistema...');
      
      const response: SystemConfigResponse = await apiService.getSystemConfig();
      
      console.log('✅ Configuraciones cargadas:', response.data);
      
      setConfigurations(response.data.configurations);
      setGroupedConfigs(response.data.grouped);
      setCategories(response.data.categories);
      
    } catch (error: any) {
      console.error('❌ Error cargando configuraciones:', error);
      
      if (error.message.includes('403') || error.message.includes('autorizado')) {
        setError('No tienes permisos para gestionar configuraciones del sistema. Solo administradores pueden acceder.');
      } else if (error.message.includes('401')) {
        setError('Tu sesión ha expirado. Recarga la página e inicia sesión nuevamente.');
      } else {
        setError(error.message || 'Error al cargar configuraciones');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar configuraciones al montar
  useEffect(() => {
    loadConfigurations();
  }, []);

  // Manejar cambio de valor
  const handleValueChange = (config: SystemConfig, newValue: any) => {
    const key = config.configKey;
    
    // Validar tipo de dato
    let validatedValue = newValue;
    
    if (config.dataType === 'number') {
      validatedValue = parseFloat(newValue);
      
      if (isNaN(validatedValue)) {
        setError('El valor debe ser un número válido');
        return;
      }
      
      if (config.minValue !== null && config.minValue !== undefined && validatedValue < config.minValue) {
        setError(`El valor debe ser mayor o igual a ${config.minValue}`);
        return;
      }
      
      if (config.maxValue !== null && config.maxValue !== undefined && validatedValue > config.maxValue) {
        setError(`El valor debe ser menor o igual a ${config.maxValue}`);
        return;
      }
    } else if (config.dataType === 'boolean') {
      validatedValue = newValue === 'true' || newValue === true;
    }

    // Limpiar error anterior
    if (error) setError(null);

    setPendingChanges(prev => ({
      ...prev,
      [key]: {
        key,
        value: validatedValue,
        originalValue: config.configValue // ✅ CORREGIDO: configValue en lugar de value
      }
    }));
  };

  // Guardar cambios
  const handleSaveChanges = async () => {
    const updates = Object.values(pendingChanges);
    if (updates.length === 0) return;

    setIsSaving(true);
    setSuccess(null);
    setError(null);

    try {
      console.log('💾 Guardando configuraciones:', updates);
      
      const response = await apiService.updateMultipleConfigurations(updates);
      if (response.status === 'success') {
        setSuccess('Configuraciones actualizadas exitosamente');
        setPendingChanges({});
        loadConfigurations();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error guardando configuraciones:', error);
      setError(error.message || 'Error al guardar configuraciones');
    } finally {
      setIsSaving(false);
    }
  };

  // Descartar cambios
  const handleDiscardChanges = () => {
    setPendingChanges({});
    setError(null);
  };

  // Cargar historial
  const loadHistory = async (configKey: string) => {
    setLoadingHistory(true);
    setHistoryData([]);

    try {
      console.log('📋 Cargando historial para:', configKey);
      const response = await apiService.getConfigHistory(configKey);
      setHistoryData(response.data.history);
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      setError('Error al cargar historial de cambios');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Formatear fecha
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear valor para mostrar
  const formatDisplayValue = (config: SystemConfig, value: any) => {
    if (config.dataType === 'boolean') {
      return value ? 'Habilitado' : 'Deshabilitado';
    }
    if (config.dataType === 'number' && config.configKey.includes('amount')) {
      return new Intl.NumberFormat('es-CL', { 
        style: 'currency', 
        currency: 'CLP' 
      }).format(value);
    }
    return value;
  };

  // ✅ CORREGIDO: Filtrar configuraciones usando isEditable
  const filteredConfigs = configurations.filter(config => {
    if (selectedCategory !== 'all' && config.category !== selectedCategory) return false;
    if (showOnlyEditable && !config.isEditable) return false; // ✅ CORREGIDO: isEditable
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando configuraciones del sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuraciones del Sistema</h1>
            <p className="text-sm text-gray-500 mt-1">Ajusta parámetros y límites globales</p>
          </div>
          <div className="flex gap-2">
            {Object.keys(pendingChanges).length > 0 && (
              <button
                onClick={handleDiscardChanges}
                disabled={isSaving}
                className="px-3 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Descartar Cambios
              </button>
            )}
            <button
              onClick={handleSaveChanges}
              disabled={isSaving || Object.keys(pendingChanges).length === 0}
              className={`bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white px-4 py-2.5 rounded-lg shadow-md hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-bold ${
                isSaving || Object.keys(pendingChanges).length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Guardando...' : `Guardar Cambios (${Object.keys(pendingChanges).length})`}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {categoryInfo[cat as keyof typeof categoryInfo]?.label || cat}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlyEditable}
                onChange={(e) => setShowOnlyEditable(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-700">Mostrar solo editables</label>
            </div>

            <button
              onClick={loadConfigurations}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Recargar
            </button>
          </div>

          {/* Estadísticas rápidas */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Total Configuraciones</p>
              <p className="font-semibold text-gray-900">{configurations.length}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Editables</p>
              <p className="font-semibold text-blue-600">{configurations.filter(c => c.isEditable).length}</p> {/* ✅ CORREGIDO */}
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Cambios Pendientes</p>
              <p className="font-semibold text-orange-600">{Object.keys(pendingChanges).length}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <p className="text-xs text-gray-500">Categorías</p>
              <p className="font-semibold text-purple-600">{categories.length}</p>
            </div>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Tabla de configuraciones */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Configuración
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Valor Actual
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredConfigs.map(config => {
                const categoryMeta = categoryInfo[config.category as keyof typeof categoryInfo];
                const IconComponent = categoryMeta?.icon || Settings;
                const hasChanges = pendingChanges[config.configKey];
                const displayValue = hasChanges ? hasChanges.value : config.configValue; // ✅ CORREGIDO: configValue
                
                return (
                  <tr key={config.configKey} className={`hover:bg-gray-50 transition-colors ${hasChanges ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${categoryMeta?.color || 'gray'}-100 text-${categoryMeta?.color || 'gray'}-800`}>
                        <IconComponent className="w-3 h-3 mr-1" />
                        {categoryMeta?.label || config.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{generateLabel(config.configKey)}</span> {/* ✅ CORREGIDO: label generado */}
                        <span className="text-xs text-gray-500 font-mono">{config.configKey}</span>
                        {hasChanges && (
                          <span className="text-xs text-orange-600 font-medium">⚠ Cambio pendiente</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {config.isEditable ? ( // ✅ CORREGIDO: isEditable
                        <div className="flex flex-col">
                          {config.dataType === 'boolean' ? (
                            <select
                              value={displayValue?.toString() || 'false'}
                              onChange={(e) => handleValueChange(config, e.target.value === 'true')}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:border-blue-300"
                            >
                              <option value="false">Deshabilitado</option>
                              <option value="true">Habilitado</option>
                            </select>
                          ) : config.dataType === 'number' ? (
                            <input
                              type="number"
                              value={displayValue || ''}
                              onChange={(e) => handleValueChange(config, e.target.value)}
                              min={config.minValue || undefined}
                              max={config.maxValue || undefined}
                              step={config.configKey.includes('amount') ? '1000' : '1'}
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
                          {hasChanges && (
                            <div className="mt-1 text-xs">
                              <span className="text-gray-500">Original: </span>
                              <span className="text-red-600">{formatDisplayValue(config, config.configValue)}</span> {/* ✅ CORREGIDO */}
                              <span className="text-gray-500"> → </span>
                              <span className="text-green-600">{formatDisplayValue(config, displayValue)}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-700">
                          {formatDisplayValue(config, config.configValue)} {/* ✅ CORREGIDO */}
                        </span>
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
                        {hasChanges && (
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