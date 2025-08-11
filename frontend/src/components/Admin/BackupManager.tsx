import { useState, useEffect } from 'react';
import { 
  Download, Database, Archive, Clock, FileText, AlertCircle, CheckCircle, 
  Loader2, HardDrive, Calendar, X, Eye, Shield, RefreshCw, Table, 
  Columns, BarChart3, Search, Filter, ChevronRight, ChevronDown
} from 'lucide-react';
import { apiService, BackupStats } from '../../services/api';

interface BackupOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  includeData: boolean;
  includeLogs: boolean;
  estimatedSize?: string;
}

interface TablePreview {
  tableName: string;
  structure: {
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      defaultValue?: any;
    }>;
    indexes: string[];
    constraints: string[];
  };
  data: {
    sampleRows: any[];
    totalRows: number;
    estimatedSize: string;
  };
  metadata: {
    lastUpdated?: string;
    createdAt?: string;
  };
}

const BackupManager = () => {
  const [backupStats, setBackupStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Estados de backup específico
  const [selectedBackupType, setSelectedBackupType] = useState<string>('full');
  const [selectedTable, setSelectedTable] = useState<string>('');

  // ✅ NUEVOS ESTADOS PARA VISTA PREVIA
  const [showTablePreview, setShowTablePreview] = useState(false);
  const [tablePreview, setTablePreview] = useState<TablePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // ✅ NUEVOS ESTADOS PARA HISTORIAL MEJORADO
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(null);

  // Opciones de backup disponibles
  const backupOptions: BackupOption[] = [
    {
      id: 'full_with_data',
      title: 'Backup Completo',
      description: 'Estructura + Datos + Logs - Backup completo del sistema',
      icon: Database,
      color: 'blue',
      includeData: true,
      includeLogs: true
    },
    {
      id: 'full_no_logs',
      title: 'Backup de Producción',
      description: 'Estructura + Datos (sin logs) - Ideal para restaurar en otro ambiente',
      icon: HardDrive,
      color: 'green',
      includeData: true,
      includeLogs: false
    },
    {
      id: 'structure_only',
      title: 'Solo Estructura',
      description: 'Únicamente tablas e índices - Sin datos ni logs',
      icon: Archive,
      color: 'gray',
      includeData: false,
      includeLogs: false
    }
  ];

  // Tablas disponibles para backup individual
  const availableTables = [
    { value: 'users', label: 'Usuarios', icon: '👤', description: 'Usuarios del sistema' },
    { value: 'students', label: 'Estudiantes', icon: '🎓', description: 'Información de estudiantes' },
    { value: 'teachers', label: 'Docentes', icon: '👨‍🏫', description: 'Información de docentes' },
    { value: 'institutions', label: 'Instituciones', icon: '🏫', description: 'Establecimientos educacionales' },
    { value: 'courses', label: 'Cursos', icon: '📚', description: 'Cursos y carreras' },
    { value: 'transfers', label: 'Transferencias', icon: '💸', description: 'Historial de transferencias' },
    { value: 'system_config', label: 'Configuraciones', icon: '⚙️', description: 'Configuraciones del sistema' },
    { value: 'activity_logs', label: 'Logs de Actividad', icon: '📝', description: 'Registro de actividades' }
  ];

  // Cargar estadísticas de backup
  const loadBackupStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Cargando estadísticas de backup...');
      
      const response = await apiService.getBackupStats();
      
      console.log('✅ Estadísticas cargadas:', response.data);
      setBackupStats(response.data);
      
    } catch (error: any) {
      console.error('❌ Error cargando estadísticas:', error);
      
      if (error.message.includes('403') || error.message.includes('autorizado')) {
        setError('No tienes permisos para gestionar backups. Solo administradores pueden acceder.');
      } else {
        setError(error.message || 'Error al cargar estadísticas de backup');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar historial de backups
  const loadBackupHistory = async () => {
    try {
      setLoadingHistory(true);
      
      const response = await apiService.getBackupHistory({
        page: 1,
        limit: 50
      });
      
      setBackupHistory(response.data.backups || response.data.history || []);
      
    } catch (error: any) {
      console.error('❌ Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Cargar vista previa de tabla
  const loadTablePreview = async (tableName: string) => {
    try {
      setLoadingPreview(true);
      setPreviewError(null);
      
      console.log('👁️ Cargando vista previa de tabla:', tableName);
      
      const response = await apiService.getTablePreview(tableName, {
        limit: 10 // Mostrar solo 10 filas de muestra
      });
      
      setTablePreview(response.data);
      setShowTablePreview(true);
      
    } catch (error: any) {
      console.error('❌ Error cargando vista previa:', error);
      setPreviewError(error.message || 'Error al cargar vista previa de la tabla');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Cargar datos al montar
  useEffect(() => {
    loadBackupStats();
  }, []);

  // Crear backup completo
  const handleCreateFullBackup = async (option: BackupOption) => {
    try {
      setIsCreatingBackup(true);
      setError(null);
      
      console.log(`💾 Creando backup: ${option.title}...`);
      
      const blob = await apiService.createFullBackup({
        includeData: option.includeData,
        includeLogs: option.includeLogs
      });
      
      // Crear nombre de archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `bancarizate_${option.id}_${timestamp}.sql`;
      
      // Descargar archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess(`Backup "${option.title}" creado y descargado exitosamente`);
      
      // Recargar estadísticas y historial
      loadBackupStats();
      if (showHistory) {
        loadBackupHistory();
      }
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('❌ Error creando backup:', error);
      setError(error.message || 'Error al crear backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Crear backup de tabla específica
  const handleCreateTableBackup = async () => {
    if (!selectedTable) {
      setError('Selecciona una tabla para respaldar');
      return;
    }

    try {
      setIsCreatingBackup(true);
      setError(null);
      
      console.log(`📋 Creando backup de tabla: ${selectedTable}...`);
      
      const blob = await apiService.createTableBackup(selectedTable, {
        includeData: true
      });
      
      // Crear nombre de archivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `bancarizate_${selectedTable}_${timestamp}.sql`;
      
      // Descargar archivo
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess(`Backup de tabla "${selectedTable}" creado exitosamente`);
      
      // Recargar historial si está visible
      if (showHistory) {
        loadBackupHistory();
      }
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('❌ Error creando backup de tabla:', error);
      setError(error.message || 'Error al crear backup de tabla');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Formatear fecha
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

  // Formatear tamaño
  const formatSize = (sizeKB: number) => {
    if (sizeKB < 1024) {
      return `${sizeKB.toFixed(0)} KB`;
    } else {
      return `${(sizeKB / 1024).toFixed(1)} MB`;
    }
  };

  // ✅ NUEVA FUNCIÓN: Filtrar historial
  const filteredHistory = backupHistory.filter(backup => {
    const matchesFilter = historyFilter === 'all' || backup.action === historyFilter;
    const matchesSearch = historySearch === '' || 
      backup.action.toLowerCase().includes(historySearch.toLowerCase()) ||
      (backup.users?.first_name + ' ' + backup.users?.last_name).toLowerCase().includes(historySearch.toLowerCase()) ||
      backup.metadata?.tableName?.toLowerCase().includes(historySearch.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // ✅ NUEVA FUNCIÓN: Obtener detalles del backup
  const getBackupTypeLabel = (action: string, metadata: any) => {
    if (action === 'create_backup') {
      if (metadata?.includeLogs && metadata?.includeData) return 'Backup Completo';
      if (metadata?.includeData && !metadata?.includeLogs) return 'Backup de Producción';
      if (!metadata?.includeData) return 'Solo Estructura';
      return 'Backup Completo';
    } else if (action === 'create_table_backup') {
      return `Tabla: ${metadata?.tableName || 'Desconocida'}`;
    }
    return 'Backup';
  };

  return (
    <div className="max-w-6xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Sistema de Backup</h1>
              <p className="text-blue-200 text-xs">Crea y gestiona copias de seguridad de la base de datos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Total registros</p>
            <p className="text-base font-bold">
              {loading ? '...' : backupStats?.summary.totalRecords.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes de estado */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <p>{success}</p>
        </div>
      )}

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

      {/* Estadísticas generales */}
      {!loading && backupStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Tablas</p>
                <p className="text-lg font-bold text-gray-900">{backupStats.summary.totalTables}</p>
              </div>
              <Database className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Registros</p>
                <p className="text-lg font-bold text-gray-900">
                  {backupStats.summary.totalRecords.toLocaleString()}
                </p>
              </div>
              <FileText className="w-5 h-5 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Tamaño Est.</p>
                <p className="text-lg font-bold text-gray-900">{backupStats.summary.estimatedSizeMB} MB</p>
              </div>
              <HardDrive className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Backups</p>
                <p className="text-lg font-bold text-gray-900">{backupStats.recentBackups.length}</p>
              </div>
              <Archive className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Opciones de backup completo */}
      <div className="bg-white rounded-lg shadow border border-gray-100 mb-6">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <Database className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Backup Completo</h2>
            </div>
            <button
              onClick={loadBackupStats}
              disabled={loading}
              className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="Recargar estadísticas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-gray-500">Cargando opciones de backup...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {backupOptions.map((option) => {
                const Icon = option.icon;
                const isCreating = isCreatingBackup;
                
                return (
                  <div
                    key={option.id}
                    className={`border-2 rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                      option.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                      option.color === 'green' ? 'border-green-200 bg-green-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="text-center mb-3">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-2 ${
                        option.color === 'blue' ? 'bg-blue-600' :
                        option.color === 'green' ? 'bg-green-600' :
                        'bg-gray-600'
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">{option.title}</h3>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-4 text-center">
                      {option.description}
                    </p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${
                          option.includeData ? 'bg-green-500' : 'bg-gray-300'
                        }`}></span>
                        <span className={option.includeData ? 'text-green-700' : 'text-gray-500'}>
                          Datos incluidos
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${
                          option.includeLogs ? 'bg-green-500' : 'bg-gray-300'
                        }`}></span>
                        <span className={option.includeLogs ? 'text-green-700' : 'text-gray-500'}>
                          Logs incluidos
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleCreateFullBackup(option)}
                      disabled={isCreating}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                        option.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                        option.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                        'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 inline mr-1" />
                          Crear Backup
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ✅ BACKUP DE TABLA ESPECÍFICA MEJORADO */}
      <div className="bg-white rounded-lg shadow border border-gray-100 mb-6">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
              <Table className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">Backup de Tabla Específica</h2>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Seleccionar Tabla
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                disabled={isCreatingBackup}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-blue-300 disabled:opacity-50"
              >
                <option value="">Selecciona una tabla...</option>
                {availableTables.map(table => (
                  <option key={table.value} value={table.value}>
                    {table.icon} {table.label} - {table.description}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-2">
              {/* ✅ BOTÓN VISTA PREVIA */}
              <button
                onClick={() => selectedTable && loadTablePreview(selectedTable)}
                disabled={!selectedTable || loadingPreview}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5"
                title="Ver contenido de la tabla"
              >
                {loadingPreview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                Vista Previa
              </button>
              
              <button
                onClick={handleCreateTableBackup}
                disabled={!selectedTable || isCreatingBackup}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCreatingBackup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Crear Backup
                  </>
                )}
              </button>
            </div>
          </div>
          
          {backupStats && selectedTable && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Registros en esta tabla:</span>
                <span className="ml-2 font-bold text-gray-900">
                  {backupStats.tableStats[selectedTable]?.count.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          )}

          {previewError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800">{previewError}</p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ HISTORIAL DE BACKUPS MEJORADO */}
      <div className="bg-white rounded-lg shadow border border-gray-100">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <Clock className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Historial de Backups</h2>
              {showHistory && (
                <span className="text-xs text-gray-500">
                  ({filteredHistory.length} de {backupHistory.length})
                </span>
              )}
            </div>
            
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadBackupHistory();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Eye className="w-3.5 h-3.5" />
              {showHistory ? 'Ocultar' : 'Ver'} Historial
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="p-4">
            {/* ✅ FILTROS DE HISTORIAL */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Buscar por usuario, tabla o tipo..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:border-blue-300 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <select
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                  className="pl-9 pr-8 py-2 text-xs border border-gray-200 rounded-lg focus:border-blue-300 appearance-none"
                >
                  <option value="all">Todos los backups</option>
                  <option value="create_backup">Backup completo</option>
                  <option value="create_table_backup">Backup de tabla</option>
                </select>
              </div>
              
              <button
                onClick={loadBackupHistory}
                disabled={loadingHistory}
                className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 text-blue-600 mx-auto mb-2 animate-spin" />
                <p className="text-sm text-gray-500">Cargando historial...</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {backupHistory.length === 0 ? 'No hay backups registrados' : 'No se encontraron backups con los filtros aplicados'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((backup, index) => {
                  const isExpanded = expandedHistoryItem === backup.id;
                  const backupTypeLabel = getBackupTypeLabel(backup.action, backup.metadata);
                  
                  return (
                    <div key={backup.id || index} className="border border-gray-200 rounded-lg">
                      {/* ✅ HEADER EXPANDIBLE */}
                      <div 
                        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedHistoryItem(isExpanded ? null : backup.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${
                              backup.action === 'create_backup' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                              {backup.action === 'create_backup' ? (
                                <Database className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <Table className="w-3.5 h-3.5 text-green-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {backupTypeLabel}
                              </p>
                              <p className="text-xs text-gray-500">
                                Por {backup.users?.first_name} {backup.users?.last_name} ({backup.users?.run})
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs text-gray-900 font-medium">
                                {formatDate(backup.created_at)}
                              </p>
                              {backup.metadata?.backupSize && (
                                <p className="text-xs text-gray-500">
                                  {formatSize(backup.metadata.backupSize / 1024)}
                                </p>
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* ✅ DETALLES EXPANDIBLES */}
                      {isExpanded && backup.metadata && (
                        <div className="px-3 pb-3 border-t border-gray-100 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                            {backup.metadata.includeData !== undefined && (
                              <div className="text-center p-2 bg-white rounded border">
                                <p className="text-xs text-gray-500 mb-1">Datos</p>
                                <p className={`text-sm font-bold ${
                                  backup.metadata.includeData ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                  {backup.metadata.includeData ? 'Incluidos' : 'Excluidos'}
                                </p>
                              </div>
                            )}
                            {backup.metadata.includeLogs !== undefined && (
                              <div className="text-center p-2 bg-white rounded border">
                                <p className="text-xs text-gray-500 mb-1">Logs</p>
                                <p className={`text-sm font-bold ${
                                  backup.metadata.includeLogs ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                  {backup.metadata.includeLogs ? 'Incluidos' : 'Excluidos'}
                                </p>
                              </div>
                            )}
                            {backup.metadata.tableName && (
                              <div className="text-center p-2 bg-white rounded border">
                                <p className="text-xs text-gray-500 mb-1">Tabla</p>
                                <p className="text-sm font-bold text-blue-600">
                                  {backup.metadata.tableName}
                                </p>
                              </div>
                            )}
                            {backup.metadata.backupSize && (
                              <div className="text-center p-2 bg-white rounded border">
                                <p className="text-xs text-gray-500 mb-1">Tamaño</p>
                                <p className="text-sm font-bold text-purple-600">
                                  {formatSize(backup.metadata.backupSize / 1024)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ✅ MODAL DE VISTA PREVIA DE TABLA */}
      {showTablePreview && tablePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-t-lg p-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded">
                    <Table className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold">Vista Previa - Tabla: {tablePreview.tableName}</h2>
                </div>
                <button
                  onClick={() => setShowTablePreview(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
              {/* Estadísticas rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Total Registros</p>
                      <p className="text-lg font-bold text-blue-900">
                        {tablePreview.data.totalRows.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <Columns className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-xs text-green-600 font-medium">Columnas</p>
                      <p className="text-lg font-bold text-green-900">
                        {tablePreview.structure.columns.length}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-purple-600 font-medium">Tamaño Est.</p>
                      <p className="text-lg font-bold text-purple-900">
                        {tablePreview.data.estimatedSize}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estructura de la tabla */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Columns className="w-4 h-4 text-gray-600" />
                  Estructura de la Tabla
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-bold text-gray-700">Columna</th>
                        <th className="text-left py-2 font-bold text-gray-700">Tipo</th>
                        <th className="text-center py-2 font-bold text-gray-700">Nullable</th>
                        <th className="text-left py-2 font-bold text-gray-700">Valor Por Defecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tablePreview.structure.columns.map((column, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-white">
                          <td className="py-2 font-medium text-gray-900">{column.name}</td>
                          <td className="py-2 text-blue-600 font-mono">{column.type}</td>
                          <td className="py-2 text-center">
                            {column.nullable ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-red-600">✗</span>
                            )}
                          </td>
                          <td className="py-2 text-gray-600 font-mono">
                            {column.defaultValue || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Datos de muestra */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  Datos de Muestra (10 primeros registros)
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                  {tablePreview.data.sampleRows.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {Object.keys(tablePreview.data.sampleRows[0]).map((column) => (
                            <th key={column} className="text-left py-2 px-2 font-bold text-gray-700 whitespace-nowrap">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tablePreview.data.sampleRows.map((row, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-white">
                            {Object.values(row).map((value, cellIndex) => (
                              <td key={cellIndex} className="py-2 px-2 text-gray-900 whitespace-nowrap max-w-xs truncate">
                                {value === null ? (
                                  <span className="text-gray-400 italic">NULL</span>
                                ) : (
                                  String(value)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">La tabla está vacía</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="border-t border-gray-200 p-3 flex justify-between items-center bg-gray-50">
              <div className="text-xs text-gray-600">
                Mostrando {Math.min(10, tablePreview.data.totalRows)} de {tablePreview.data.totalRows.toLocaleString()} registros
              </div>
              <button
                onClick={() => setShowTablePreview(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManager;