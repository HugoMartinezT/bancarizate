import { useState, useEffect } from 'react';
import { 
  Download, Database, Archive, Clock, FileText, AlertCircle, CheckCircle, 
  Loader2, HardDrive, Calendar, X, Eye, Shield, RefreshCw, Table, 
  Columns, BarChart3, Search, Filter, ChevronRight, ChevronDown
} from 'lucide-react';
import { apiService } from '../../services/api';

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

interface BackupStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalTransfers: number;
  totalInstitutions: number;
  totalCourses: number;
  lastUpdated: string;
  summary?: {
    totalTables: number;
    totalRecords: number;
    estimatedSizeMB: number;
  };
  recentBackups?: any[];
  tableStats?: Record<string, { count: number }>;
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
  
  const [selectedBackupType, setSelectedBackupType] = useState<string>('full');
  const [selectedTable, setSelectedTable] = useState<string>('');

  const [showTablePreview, setShowTablePreview] = useState(false);
  const [tablePreview, setTablePreview] = useState<TablePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  const safeFormatNumber = (value: any): string => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return Number(value).toLocaleString();
    }
    return '0';
  };

  const safeFormatSize = (value: any): string => {
    if (typeof value === 'number') {
      return `${value}`;
    }
    if (typeof value === 'string') {
      return value;
    }
    return '0';
  };

  const getValidBackupHistory = () => {
    if (!backupHistory || !Array.isArray(backupHistory)) {
      return [];
    }
    return backupHistory;
  };

  // ✅ ACTUALIZADO: Cargar estadísticas reales
  const loadBackupStats = async () => {
    try {
      setLoading(true);
      setError(null);
     
      console.log('📊 Cargando estadísticas de backup...');
     
      const response = await apiService.getBackupStats();
     
      if (!response?.data) {
        throw new Error('Respuesta del servidor inválida');
      }
      const { data } = response;
     
      console.log('🔍 ESTRUCTURA REAL del servidor:', JSON.stringify(data, null, 2));
     
      // Adaptación mejorada con datos reales
      const adaptedBackupStats: BackupStats = {
        totalUsers: data.totalUsers || 0,
        totalStudents: data.totalStudents || 0,
        totalTeachers: data.totalTeachers || 0,
        totalTransfers: data.totalTransfers || 0,
        totalInstitutions: data.totalInstitutions || 0,
        totalCourses: data.totalCourses || 0,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
       
        summary: {
          totalTables: 6,
          totalRecords: (data.totalUsers || 0) + (data.totalStudents || 0) + (data.totalTeachers || 0) + (data.totalTransfers || 0) + (data.totalInstitutions || 0) + (data.totalCourses || 0),
          estimatedSizeMB: Math.round(((data.totalUsers || 0) + (data.totalStudents || 0) + (data.totalTeachers || 0) + (data.totalTransfers || 0) + (data.totalInstitutions || 0) + (data.totalCourses || 0)) / 1000 * 100) / 100
        },
       
        recentBackups: [],
        tableStats: {
          users: { count: data.totalUsers || 0 },
          students: { count: data.totalStudents || 0 },
          teachers: { count: data.totalTeachers || 0 },
          transfers: { count: data.totalTransfers || 0 },
          institutions: { count: data.totalInstitutions || 0 },
          courses: { count: data.totalCourses || 0 }
        }
      };
      
      console.log('✅ Estadísticas adaptadas:', adaptedBackupStats);
      setBackupStats(adaptedBackupStats);
     
    } catch (error: any) {
      console.error('❌ Error cargando estadísticas:', error);
     
      if (error.message.includes('403') || error.message.includes('autorizado')) {
        setError('No tienes permisos para gestionar backups. Solo administradores pueden acceder.');
      } else if (error.message.includes('404')) {
        setError('Los endpoints de backup no están disponibles. Verifica la configuración del servidor.');
      } else {
        setError(error.message || 'Error al cargar estadísticas de backup');
      }
     
      // Estado de fallback
      setBackupStats({
        totalUsers: 0,
        totalStudents: 0,
        totalTeachers: 0,
        totalTransfers: 0,
        totalInstitutions: 0,
        totalCourses: 0,
        lastUpdated: new Date().toISOString(),
        summary: {
          totalTables: 0,
          totalRecords: 0,
          estimatedSizeMB: 0
        },
        recentBackups: [],
        tableStats: {}
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ ACTUALIZADO: Cargar historial real de backups
  const loadBackupHistory = async () => {
    try {
      setLoadingHistory(true);
      setError(null);
      
      console.log('📋 Cargando historial de backups...');
      
      const response = await apiService.getBackupHistory();
      
      if (response.status === 'success' && response.data) {
        setBackupHistory(response.data.backups || []);
        console.log('✅ Historial de backups cargado:', response.data.backups?.length || 0, 'registros');
      } else {
        console.warn('⚠️ Respuesta inesperada del historial:', response);
        setBackupHistory([]);
      }
     
    } catch (error: any) {
      console.error('❌ Error cargando historial:', error);
      setError('Error al cargar el historial de backups: ' + error.message);
      setBackupHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ✅ ACTUALIZADO: Cargar vista previa real de tabla
  const loadTablePreview = async (tableName: string) => {
    try {
      setLoadingPreview(true);
      setPreviewError(null);
      
      console.log('👁️ Cargando vista previa de tabla:', tableName);
      
      const response = await apiService.getTablePreview(tableName);
      
      if (response.status === 'success' && response.data) {
        setTablePreview(response.data);
        setShowTablePreview(true);
        console.log('✅ Vista previa cargada para:', tableName);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
      
    } catch (error: any) {
      console.error('❌ Error cargando vista previa:', error);
      setPreviewError('Error al cargar vista previa: ' + error.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadBackupStats();
  }, []);

  // ✅ ACTUALIZADO: Crear backup completo real
  const handleCreateFullBackup = async (option: BackupOption) => {
    try {
      setIsCreatingBackup(true);
      setError(null);
      
      console.log('🔄 Creando backup completo:', option.title);
      
      // Llamar al endpoint real de backup
      const blob = await apiService.createFullBackup({
        includeData: option.includeData,
        includeLogs: option.includeLogs
      });
      
      // Crear descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bancarizate_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess(`Backup "${option.title}" creado y descargado exitosamente`);
      
      // Recargar estadísticas e historial
      await loadBackupStats();
      if (showHistory) {
        await loadBackupHistory();
      }
      
    } catch (error: any) {
      console.error('❌ Error creando backup:', error);
      setError('Error al crear backup: ' + error.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // ✅ ACTUALIZADO: Crear backup de tabla específica real
  const handleCreateTableBackup = async () => {
    if (!selectedTable) {
      setError('Debes seleccionar una tabla');
      return;
    }
    
    try {
      setIsCreatingBackup(true);
      setError(null);
      
      console.log('🔄 Creando backup de tabla:', selectedTable);
      
      const blob = await apiService.createTableBackup(selectedTable, {
        includeData: true
      });
      
      // Crear descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bancarizate_${selectedTable}_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess(`Backup de tabla "${selectedTable}" creado y descargado exitosamente`);
      
      // Recargar estadísticas e historial
      await loadBackupStats();
      if (showHistory) {
        await loadBackupHistory();
      }
      
    } catch (error: any) {
      console.error('❌ Error creando backup de tabla:', error);
      setError('Error al crear backup de tabla: ' + error.message);
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

  // Filtrar historial
  const filteredHistory = getValidBackupHistory().filter(backup => {
    const matchesFilter = historyFilter === 'all' || backup.action === historyFilter;
    const matchesSearch = historySearch === '' || 
      backup.action.toLowerCase().includes(historySearch.toLowerCase()) ||
      (backup.users?.first_name + ' ' + backup.users?.last_name).toLowerCase().includes(historySearch.toLowerCase()) ||
      backup.metadata?.tableName?.toLowerCase().includes(historySearch.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Obtener detalles del backup
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
              {loading
                ? '...'
                : safeFormatNumber(backupStats?.summary?.totalRecords || 0)
              }
            </p>
          </div>
        </div>
      </div>

      {/* Mensajes de estado */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <p>{success}</p>
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
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

      {/* Estadísticas del sistema - DISEÑO MEJORADO */}
      {!loading && backupStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Card Usuarios */}
          <div className="group bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Usuarios</p>
                <p className="text-2xl font-black text-blue-900 mt-1">
                  {safeFormatNumber(backupStats.totalUsers)}
                </p>
                <div className="w-8 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mt-2"></div>
              </div>
              <div className="p-3 bg-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Database className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
         
          {/* Card Estudiantes */}
          <div className="group bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-xl border border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Estudiantes</p>
                <p className="text-2xl font-black text-emerald-900 mt-1">
                  {safeFormatNumber(backupStats.totalStudents)}
                </p>
                <div className="w-8 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full mt-2"></div>
              </div>
              <div className="p-3 bg-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
         
          {/* Card Docentes */}
          <div className="group bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Docentes</p>
                <p className="text-2xl font-black text-purple-900 mt-1">
                  {safeFormatNumber(backupStats.totalTeachers)}
                </p>
                <div className="w-8 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full mt-2"></div>
              </div>
              <div className="p-3 bg-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
         
          {/* Card Transferencias */}
          <div className="group bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Transferencias</p>
                <p className="text-2xl font-black text-amber-900 mt-1">
                  {safeFormatNumber(backupStats.totalTransfers)}
                </p>
                <div className="w-8 h-1 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full mt-2"></div>
              </div>
              <div className="p-3 bg-amber-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Archive className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
         
          {/* Card Instituciones */}
          <div className="group bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-indigo-700 font-semibold uppercase tracking-wide">Instituciones</p>
                <p className="text-2xl font-black text-indigo-900 mt-1">
                  {safeFormatNumber(backupStats.totalInstitutions)}
                </p>
                <div className="w-8 h-1 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full mt-2"></div>
              </div>
              <div className="p-3 bg-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
         
          {/* Card Cursos */}
          <div className="group bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl border border-cyan-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-cyan-700 font-semibold uppercase tracking-wide">Cursos</p>
                <p className="text-2xl font-black text-cyan-900 mt-1">
                  {safeFormatNumber(backupStats.totalCourses)}
                </p>
                <div className="w-8 h-1 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full mt-2"></div>
              </div>
              <div className="p-3 bg-cyan-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          {/* Card Total Registros */}
          <div className="group bg-gradient-to-br from-rose-50 to-rose-100 p-4 rounded-xl border border-rose-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-rose-700 font-semibold uppercase tracking-wide">Total Registros</p>
                <p className="text-2xl font-black text-rose-900 mt-1">
                  {safeFormatNumber(backupStats.summary?.totalRecords || 0)}
                </p>
                <div className="w-8 h-1 bg-gradient-to-r from-rose-400 to-rose-600 rounded-full mt-2"></div>
              </div>
              <div className="p-3 bg-rose-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          {/* Card Tamaño */}
          <div className="group bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-700 font-semibold uppercase tracking-wide">Tamaño Est.</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {safeFormatSize(backupStats.summary?.estimatedSizeMB || 0)} MB
                </p>
                <div className="w-8 h-1 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full mt-2"></div>
              </div>
              <div className="p-3 bg-slate-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <HardDrive className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opciones de backup completo - DISEÑO MEJORADO Y MÁS COMPACTO */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 mb-8 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg shadow-md">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Backup Completo</h2>
                <p className="text-xs text-gray-600">Elige el tipo de backup que necesitas crear</p>
              </div>
            </div>
            <button
              onClick={loadBackupStats}
              disabled={loading}
              className="group p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-white transition-all duration-200 shadow-sm"
              title="Recargar estadísticas"
            >
              <RefreshCw className={`w-4 h-4 group-hover:scale-110 transition-transform ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="relative inline-flex items-center justify-center w-12 h-12 mb-3">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full animate-pulse"></div>
                <Loader2 className="w-6 h-6 text-white animate-spin relative z-10" />
              </div>
              <p className="text-xs text-gray-500 font-medium">Cargando opciones de backup...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {backupOptions.map((option, index) => {
                const Icon = option.icon;
                const isCreating = isCreatingBackup;
                
                const cardStyles = {
                  'blue': {
                    gradient: 'from-blue-50 via-blue-100 to-blue-200',
                    border: 'border-blue-300/50',
                    iconBg: 'from-blue-600 to-blue-700',
                    iconHover: 'group-hover:from-blue-700 group-hover:to-blue-800',
                    button: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800',
                    textAccent: 'text-blue-800'
                  },
                  'green': {
                    gradient: 'from-emerald-50 via-emerald-100 to-emerald-200',
                    border: 'border-emerald-300/50',
                    iconBg: 'from-emerald-600 to-emerald-700',
                    iconHover: 'group-hover:from-emerald-700 group-hover:to-emerald-800',
                    button: 'from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800',
                    textAccent: 'text-emerald-800'
                  },
                  'gray': {
                    gradient: 'from-slate-50 via-slate-100 to-slate-200',
                    border: 'border-slate-300/50',
                    iconBg: 'from-slate-600 to-slate-700',
                    iconHover: 'group-hover:from-slate-700 group-hover:to-slate-800',
                    button: 'from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800',
                    textAccent: 'text-slate-800'
                  }
                };

                const styles = cardStyles[option.color as keyof typeof cardStyles] || cardStyles.gray;
                
                return (
                  <div
                    key={option.id}
                    className={`group relative bg-gradient-to-br ${styles.gradient} border-2 ${styles.border} rounded-xl p-4 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 transform overflow-hidden`}
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animation: 'fadeInUp 0.6s ease-out both'
                    }}
                  >
                    {/* Decorative background pattern */}
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10">
                      <Icon className="w-full h-full transform rotate-12" />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="text-center mb-3">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2 bg-gradient-to-br ${styles.iconBg} ${styles.iconHover} shadow-md transition-all duration-300 group-hover:scale-105`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className={`text-sm font-bold ${styles.textAccent} mb-1`}>{option.title}</h3>
                      </div>
                      
                      <p className="text-xs text-gray-700 mb-4 text-center leading-relaxed">
                        {option.description}
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Datos incluidos</span>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${option.includeData ? 'bg-emerald-500 shadow-md shadow-emerald-500/40' : 'bg-gray-300'}`}></div>
                            <span className={`font-medium ${option.includeData ? 'text-emerald-700' : 'text-gray-500'}`}>
                              {option.includeData ? 'Sí' : 'No'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Logs incluidos</span>
                          <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${option.includeLogs ? 'bg-emerald-500 shadow-md shadow-emerald-500/40' : 'bg-gray-300'}`}></div>
                            <span className={`font-medium ${option.includeLogs ? 'text-emerald-700' : 'text-gray-500'}`}>
                              {option.includeLogs ? 'Sí' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleCreateFullBackup(option)}
                        disabled={isCreating}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${styles.button} text-white shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-95`}
                      >
                        {isCreating ? (
                          <div className="flex items-center justify-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Creando...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Download className="w-3 h-3" />
                            <span>Crear Backup</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations handled via Tailwind animate-fadeInUp utility classes */}

      {/* Backup de tabla específica */}
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
              {/* Botón Vista Previa */}
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
                  {backupStats?.tableStats?.[selectedTable]?.count?.toLocaleString() || '0'}
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

      {/* Historial de backups */}
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
            {/* Filtros de historial */}
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
                      {/* Header expandible */}
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
                      
                      {/* Detalles expandibles */}
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

      {/* Modal de vista previa de tabla */}
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