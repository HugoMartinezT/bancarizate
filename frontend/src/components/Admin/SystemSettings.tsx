import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle, XCircle, Loader2, DollarSign, Users, Shield, Globe, Eye, History, X } from 'lucide-react';
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

  // Mapeo de categorías a iconos y labels
  const categoryInfo = {
    transfers: { icon: DollarSign, label: 'Transferencias', color: 'green' },
    users: { icon: Users, label: 'Usuarios', color: 'blue' },
    security: { icon: Shield, label: 'Seguridad', color: 'red' },
    general: { icon: Globe, label: 'General', color: 'gray' }
  };

  // Cargar configuraciones
  const loadConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('⚙️ Cargando configuraciones del sistema...');
      
      const response: SystemConfigResponse = await apiService.getSystemConfigurations({
        editable: showOnlyEditable ? 'true' : 'all'
      });
      
      console.log('✅ Configuraciones cargadas:', response.data);
      
      setConfigurations(response.data.configurations);
      setGroupedConfigs(response.data.grouped);
      setCategories(response.data.categories);
      
    } catch (error: any) {
      console.error('❌ Error cargando configuraciones:', error);
      setError(error.message || 'Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  // Cargar configuraciones al montar
  useEffect(() => {
    loadConfigurations();
  }, [showOnlyEditable]);

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
      
      // ✅ CORREGIDO: Validar rango con verificación de null/undefined
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
    
    setError(null);
    
    // Agregar a cambios pendientes
    setPendingChanges(prev => ({
      ...prev,
      [key]: {
        key,
        value: validatedValue,
        originalValue: config.configValue
      }
    }));
  };

  // Remover cambio pendiente
  const removePendingChange = (key: string) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      delete newChanges[key];
      return newChanges;
    });
  };

  // Guardar cambios
  const handleSaveChanges = async () => {
    const changesArray = Object.values(pendingChanges);
    
    if (changesArray.length === 0) {
      setError('No hay cambios para guardar');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      console.log(`💾 Guardando ${changesArray.length} configuraciones...`);
      
      // ✅ CORREGIDO: Mapear correctamente con 'id' en lugar de 'key'
      const response = await apiService.updateMultipleConfigurations(
        changesArray.map(change => ({
          id: change.key,  // ✅ Cambiado de 'key' a 'id'
          value: change.value.toString()  // Convertir a string
        }))
      );
      
      console.log('✅ Configuraciones guardadas:', response);
      
      setSuccess(`${changesArray.length} configuraciones actualizadas exitosamente`);
      setPendingChanges({});
      
      // Recargar configuraciones
      loadConfigurations();
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('❌ Error guardando configuraciones:', error);
      setError(error.message || 'Error al guardar configuraciones');
    } finally {
      setIsSaving(false);
    }
  };

  // Cargar historial de configuración
  const loadConfigHistory = async (configKey: string) => {
    try {
      setLoadingHistory(true);
      
      const response = await apiService.getConfigurationHistory(configKey, {
        page: 1,
        limit: 10
      });
      
      setHistoryData(response.data.history);
      
    } catch (error: any) {
      console.error('❌ Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Mostrar historial
  const handleShowHistory = (configKey: string) => {
    setShowHistory(configKey);
    loadConfigHistory(configKey);
  };

  // Renderizar campo de configuración
  const renderConfigField = (config: SystemConfig) => {
    const pendingChange = pendingChanges[config.configKey];
    const currentValue = pendingChange ? pendingChange.value : config.configValue;
    const hasChanges = !!pendingChange;

    return (
      <div key={config.id} className={`p-4 rounded-lg border transition-all ${
        hasChanges 
          ? 'border-orange-200 bg-orange-50' 
          : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-gray-900">{config.configKey}</h3>
              {hasChanges && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-xs text-orange-600 font-medium">Modificado</span>
                </div>
              )}
            </div>
            {config.description && (
              <p className="text-xs text-gray-600 mb-2">{config.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleShowHistory(config.configKey)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Ver historial"
            >
              <History className="w-3.5 h-3.5" />
            </button>
            
            {hasChanges && (
              <button
                onClick={() => removePendingChange(config.configKey)}
                className="p-1 text-orange-500 hover:text-orange-700 rounded"
                title="Descartar cambio"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          {/* Campo de valor */}
          <div className="md:col-span-2">
            {config.dataType === 'boolean' ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentValue === 'true' || currentValue === true}
                  onChange={(e) => handleValueChange(config, e.target.checked)}
                  disabled={!config.isEditable || isSaving}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm text-gray-700">
                  {currentValue === 'true' || currentValue === true ? 'Activado' : 'Desactivado'}
                </label>
              </div>
            ) : (
              <input
                type={config.dataType === 'number' ? 'number' : 'text'}
                value={currentValue}
                onChange={(e) => handleValueChange(config, e.target.value)}
                disabled={!config.isEditable || isSaving}
                min={config.minValue !== null && config.minValue !== undefined ? config.minValue : undefined}
                max={config.maxValue !== null && config.maxValue !== undefined ? config.maxValue : undefined}
                className={`w-full px-3 py-2 text-sm border rounded-lg transition-colors ${
                  !config.isEditable 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : hasChanges
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 focus:border-blue-300'
                }`}
              />
            )}
            
            {/* Información de rango */}
            {config.dataType === 'number' && (config.minValue !== null || config.maxValue !== null) && (
              <p className="text-xs text-gray-500 mt-1">
                Rango: {config.minValue !== null && config.minValue !== undefined ? config.minValue : 'Sin mínimo'} - {config.maxValue !== null && config.maxValue !== undefined ? config.maxValue : 'Sin máximo'}
              </p>
            )}
          </div>

          {/* Metadatos */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                config.isEditable 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {config.isEditable ? 'Editable' : 'Solo lectura'}
              </span>
            </div>
            <p className="text-xs text-gray-500">Tipo: {config.dataType}</p>
            {hasChanges && (
              <p className="text-xs text-orange-600 font-medium mt-1">
                Anterior: {pendingChange.originalValue}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Formatear fecha para historial
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredConfigs = selectedCategory === 'all' 
    ? configurations 
    : configurations.filter(config => config.category === selectedCategory);

  const pendingChangesCount = Object.keys(pendingChanges).length;

  return (
    <div className="max-w-6xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Configuraciones del Sistema</h1>
              <p className="text-blue-200 text-xs">Administra los parámetros configurables del sistema</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Configuraciones</p>
            <p className="text-base font-bold">{filteredConfigs.length}</p>
          </div>
        </div>
      </div>

      {/* Mensaje de éxito */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <p>{success}</p>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs shadow-sm">
          <AlertCircle className="w-4 h-4" />
          <div className="flex-1">
            <p>{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controles */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row gap-3 p-3">
          
          {/* Filtro por categoría */}
          <div className="flex-1">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todas ({configurations.length})
              </button>
              
              {categories.map(category => {
                const info = categoryInfo[category as keyof typeof categoryInfo];
                const Icon = info?.icon || Globe;
                const count = groupedConfigs[category]?.length || 0;
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {info?.label || category} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controles adicionales */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={showOnlyEditable}
                onChange={(e) => setShowOnlyEditable(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600"
              />
              Solo editables
            </label>
            
            <button
              onClick={loadConfigurations}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              title="Recargar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Panel de cambios pendientes */}
      {pendingChangesCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {pendingChangesCount} cambio{pendingChangesCount > 1 ? 's' : ''} pendiente{pendingChangesCount > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingChanges({})}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200 disabled:opacity-50"
              >
                Descartar Todo
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de configuraciones */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Cargando configuraciones...</p>
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">
              No hay configuraciones disponibles
            </p>
            <p className="text-xs text-gray-400">
              {selectedCategory === 'all' 
                ? 'No se encontraron configuraciones en el sistema' 
                : `No hay configuraciones en la categoría seleccionada`}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {filteredConfigs.map(config => renderConfigField(config))}
          </div>
        )}
      </div>

      {/* Modal de historial */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-t-lg p-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded">
                    <History className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold">Historial de Cambios</h2>
                </div>
                <button
                  onClick={() => setShowHistory(null)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-blue-200 text-xs mt-1">Configuración: {showHistory}</p>
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
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.map((entry, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-900">
                          {entry.users?.first_name} {entry.users?.last_name} ({entry.users?.run})
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(entry.created_at)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Valor anterior:</span>
                          <span className="ml-1 font-mono bg-red-50 text-red-700 px-1 rounded">
                            {entry.metadata?.oldValue}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Valor nuevo:</span>
                          <span className="ml-1 font-mono bg-green-50 text-green-700 px-1 rounded">
                            {entry.metadata?.newValue}
                          </span>
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
  );
};

export default SystemSettings;