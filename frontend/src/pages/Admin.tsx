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

// IMPORTAR COMPONENTES REALES
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
        const currentUser = apiService.getCurrentUser();
        setUser(currentUser);

        if (!currentUser || currentUser.role !== 'admin') {
          setError('Acceso denegado. Solo administradores pueden acceder a esta sección.');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Cargar stats
        const [institutionStats, courseStats] = await Promise.all([
          apiService.getInstitutionStats(),
          apiService.getCourseStats()
        ]);

        setStats({
          institutions: institutionStats.data.total,
          courses: courseStats.data.total,
          // Agrega más stats si es necesario
        });
      } catch (err: any) {
        setError(err.message || 'Error al verificar permisos');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  const renderDashboard = () => (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminModules.map(module => (
          <div key={module.id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <module.icon className={`w-5 h-5 text-${module.color}-600`} />
              <h2 className="text-lg font-bold">{module.title}</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">{module.description}</p>
            {module.stats && (
              <div className="bg-gray-50 p-2 rounded text-center">
                <div className="text-lg font-bold text-{module.color}-600">{module.stats.value}</div>
                <div className="text-xs text-gray-500">{module.stats.label}</div>
              </div>
            )}
            <button
              onClick={() => navigate(`/admin/${module.id}`)}
              className="w-full mt-4 bg-blue-600 text-white py-2 rounded"
            >
              Acceder
            </button>
          </div>
        ))}
      </div>
    </div>
  );

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
        
        {/* RUTA REAL: Gestión de Instituciones */}
        <Route path="/institutions" element={<InstitutionManager />} />
        
        {/* RUTA REAL: Gestión de Cursos */}
        <Route path="/courses" element={<CourseManager />} />
        
        {/* RUTA REAL: Carga Masiva */}
        <Route path="/mass-upload" element={<MassUpload />} />
        
        {/* RUTA REAL: Configuraciones del Sistema */}
        <Route path="/system-settings" element={<SystemSettings />} />
        
        {/* RUTA REAL: Backup y Restauración */}
        <Route path="/backup" element={<BackupManager />} />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
};

export default Admin;