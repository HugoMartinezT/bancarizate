import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Building, 
  BookOpen, 
  Upload, 
  Database,
  Shield,
  ArrowLeft,
  Loader2,
  AlertCircle
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

// Componente de tarjeta de módulo mejorada
const AdminModuleCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconBgColor: string;
  iconColor: string;
  onClick: () => void;
}> = ({ icon: Icon, title, description, iconBgColor, iconColor, onClick }) => (
  <div 
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer group relative overflow-hidden"
    onClick={onClick}
  >
    {/* Fondo decorativo sutil */}
    <div className={`absolute top-0 right-0 w-24 h-24 ${iconBgColor} opacity-5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300`} />
    
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-xl ${iconBgColor} group-hover:scale-105 transition-all duration-200 shadow-sm`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      
      <p className="text-sm text-gray-600">{description}</p>
    </div>

    {/* Efecto de brillo en hover */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-700" />
    
    {/* Indicador de acción */}
    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>
);

const Admin: React.FC<AdminProps> = ({ user: propUser }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  const navigate = useNavigate();

  // Módulos administrativos disponibles
  const adminModules: AdminModule[] = [
    {
      id: 'institutions',
      title: 'Instituciones',
      description: 'Gestiona establecimientos educacionales del sistema',
      icon: Building,
      color: 'blue',
      requiresAdmin: true
    },
    {
      id: 'courses',
      title: 'Cursos',
      description: 'Administra cursos y carreras disponibles',
      icon: BookOpen,
      color: 'green',
      requiresAdmin: true
    },
    {
      id: 'mass-upload',
      title: 'Carga Masiva',
      description: 'Importa múltiples usuarios desde archivos CSV',
      icon: Upload,
      color: 'purple',
      requiresAdmin: true
    },
    {
      id: 'system-settings',
      title: 'Configuraciones',
      description: 'Ajusta parámetros y límites del sistema',
      icon: Settings,
      color: 'orange',
      requiresAdmin: true
    },
    {
      id: 'backup',
      title: 'Backup y Restauración',
      description: 'Crea copias de seguridad de la base de datos',
      icon: Database,
      color: 'red',
      requiresAdmin: true
    }
  ];

  // Mapeo de colores para iconos
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-100', text: 'text-green-600' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
      red: { bg: 'bg-red-100', text: 'text-red-600' }
    };
    return colorMap[color] || { bg: 'bg-gray-100', text: 'text-gray-600' };
  };

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
      } catch (err: any) {
        setError(err.message || 'Error al verificar permisos');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error de acceso</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirigiendo al inicio...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header compacto con diseño gradiente */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-4 mb-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Panel de Administración</h1>
            <p className="text-blue-200 text-sm">Gestiona todos los aspectos del sistema</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Tarjetas de módulos mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map(module => {
            const colors = getColorClasses(module.color);
            return (
              <AdminModuleCard
                key={module.id}
                icon={module.icon}
                title={module.title}
                description={module.description}
                iconBgColor={colors.bg}
                iconColor={colors.text}
                onClick={() => navigate(`/admin/${module.id}`)}
              />
            );
          })}
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