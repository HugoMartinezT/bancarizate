import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Settings, 
  Building, 
  BookOpen, 
  Upload, 
  Database, 
  BarChart3, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Shield, 
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import { apiService } from '../services/api';

// ✅ IMPORTAR COMPONENTES REALES
import InstitutionManager from '../components/Admin/InstitutionManager';
import CourseManager from '../components/Admin/CourseManager';
import MassUpload from '../components/Admin/MassUpload';
import SystemSettings from '../components/Admin/SystemSettings';
import BackupManager from '../components/Admin/BackupManager';

interface AdminModule {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  requiresAdmin: boolean;
  stats?: {
    value: string;
    label: string;
  };
}

interface User {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
  overdraftLimit: number;
  role: string;
}

interface AdminProps {
  user?: User;
}

const Admin: React.FC<AdminProps> = ({ user: propUser }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>({});
  
  const navigate = useNavigate();
  const location = useLocation();

  // Módulos administrativos disponibles
  const adminModules: AdminModule[] = [
    {
      id: 'institutions',
      title: 'Instituciones',
      description: 'Gestiona establecimientos educacionales del sistema',
      icon: Building,
      color: 'blue',
      requiresAdmin: true,
      stats: {
        value: stats.institutions || '...',
        label: 'Instituciones'
      }
    },
    {
      id: 'courses',
      title: 'Cursos',
      description: 'Administra cursos y carreras disponibles',
      icon: BookOpen,
      color: 'green',
      requiresAdmin: true,
      stats: {
        value: stats.courses || '...',
        label: 'Cursos'
      }
    },
    {
      id: 'mass-upload',
      title: 'Carga Masiva',
      description: 'Importa múltiples usuarios desde archivos CSV',
      icon: Upload,
      color: 'purple',
      requiresAdmin: true,
      stats: {
        value: stats.users || '...',
        label: 'Usuarios'
      }
    },
    {
      id: 'system-settings',
      title: 'Configuraciones',
      description: 'Ajusta parámetros y límites del sistema',
      icon: Settings,
      color: 'orange',
      requiresAdmin: true,
      stats: {
        value: stats.configs || '...',
        label: 'Configuraciones'
      }
    },
    {
      id: 'backup',
      title: 'Backup y Restauración',
      description: 'Crea copias de seguridad de la base de datos',
      icon: Database,
      color: 'red',
      requiresAdmin: true,
      stats: {
        value: stats.backups || '...',
        label: 'Backups'
      }
    }
  ];

  // Verificar autenticación y permisos
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener usuario actual
        const currentUser = propUser || apiService.getCurrentUser();
        
        if (!currentUser) {
          setError('No hay sesión activa');
          return;
        }

        if (currentUser.role !== 'admin') {
          setError('No tienes permisos de administrador para acceder a esta sección');
          return;
        }

        setUser(currentUser);
        
        // Cargar estadísticas reales
        await loadStats();
        
      } catch (error: any) {
        console.error('❌ Error verificando acceso admin:', error);
        setError('Error al verificar permisos de administrador');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [propUser]);

  // Cargar estadísticas del dashboard
  const loadStats = async () => {
    try {
      // ✅ CARGAR ESTADÍSTICAS REALES
      const [institutionStats, courseStats] = await Promise.allSettled([
        apiService.getInstitutionStats().catch(() => ({ data: { total: 0 } })),
        apiService.getCourseStats().catch(() => ({ data: { total: 0 } }))
      ]);

      const newStats = {
        institutions: institutionStats.status === 'fulfilled' ? institutionStats.value.data.total : '0',
        courses: courseStats.status === 'fulfilled' ? courseStats.value.data.total : '0',
        users: '156', // Simulado por ahora
        configs: '8',  // Simulado por ahora
        backups: '3'   // Simulado por ahora
      };

      setStats(newStats);

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      // Usar valores por defecto en caso de error
      setStats({
        institutions: '0',
        courses: '0',
        users: '0',
        configs: '0',
        backups: '0'
      });
    }
  };

  // Manejar navegación a módulos
  const handleModuleClick = (moduleId: string) => {
    navigate(`/admin/${moduleId}`);
  };

  // Renderizar vista principal (dashboard de módulos)
  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verificando permisos de administrador...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="p-4 bg-red-100 rounded-full w-fit mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-3 py-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-4 mb-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Panel de Administración</h1>
                <p className="text-blue-200 text-sm">
                  Bienvenido, {user?.firstName} {user?.lastName} - Administrador del Sistema
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-sm mb-1">RUN</p>
              <p className="text-lg font-bold">{user?.run}</p>
            </div>
          </div>
        </div>

        {/* Mensaje de bienvenida */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-blue-900 mb-1">
                Acceso de Administrador Confirmado
              </h2>
              <p className="text-xs text-blue-700">
                Tienes acceso completo a todas las funcionalidades administrativas. 
                Selecciona un módulo para comenzar a gestionar el sistema.
              </p>
            </div>
          </div>
        </div>

        {/* Grid de módulos administrativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {adminModules.map((module) => {
            const Icon = module.icon;
            const colorClasses = {
              blue: 'border-blue-300 hover:border-blue-400 bg-blue-100 hover:bg-blue-200 text-blue-600',
              green: 'border-green-300 hover:border-green-400 bg-green-100 hover:bg-green-200 text-green-600',
              purple: 'border-purple-300 hover:border-purple-400 bg-purple-100 hover:bg-purple-200 text-purple-600',
              orange: 'border-orange-300 hover:border-orange-400 bg-orange-100 hover:bg-orange-200 text-orange-600',
              red: 'border-red-300 hover:border-red-400 bg-red-100 hover:bg-red-200 text-red-600'
            };
            
            return (
              <div
                key={module.id}
                onClick={() => handleModuleClick(module.id)}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg transition-colors ${colorClasses[module.color as keyof typeof colorClasses]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold text-${module.color}-600`}>
                      {module.stats?.value}
                    </p>
                    <p className="text-xs text-gray-500">{module.stats?.label}</p>
                  </div>
                </div>
                
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {module.title}
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {module.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 bg-${module.color}-50 text-${module.color}-700 text-xs font-medium rounded-full`}>
                    Admin
                  </span>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">
                    Click para acceder →
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estadísticas rápidas */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            Resumen del Sistema
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{stats.institutions}</div>
              <div className="text-xs text-gray-500">Instituciones</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{stats.courses}</div>
              <div className="text-xs text-gray-500">Cursos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{stats.users}</div>
              <div className="text-xs text-gray-500">Usuarios</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">{stats.configs}</div>
              <div className="text-xs text-gray-500">Configuraciones</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{stats.backups}</div>
              <div className="text-xs text-gray-500">Backups</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Componente placeholder para módulos no implementados aún
  const ModulePlaceholder = ({ title, description }: { title: string; description: string }) => (
    <div className="max-w-7xl mx-auto px-3 py-4">
      <div className="mb-4">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Panel de Administración
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
        <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
          <Settings className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">{description}</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            🚧 Este módulo está en desarrollo. Próximamente estará disponible.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Routes>
        {/* Ruta principal del admin - dashboard de módulos */}
        <Route path="/" element={renderDashboard()} />
        
        {/* ✅ RUTA REAL: Gestión de Instituciones */}
        <Route path="/institutions" element={<InstitutionManager />} />
        
        {/* ✅ RUTA REAL: Gestión de Cursos */}
        <Route path="/courses" element={<CourseManager />} />
        
        {/* ✅ RUTA REAL: Carga Masiva */}
        <Route path="/mass-upload" element={<MassUpload />} />
        
        {/* ✅ RUTA REAL: Configuraciones del Sistema */}
        <Route path="/system-settings" element={<SystemSettings />} />
        
        {/* ✅ RUTA REAL: Backup y Restauración */}
        <Route path="/backup" element={<BackupManager />} />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
};

export default Admin;