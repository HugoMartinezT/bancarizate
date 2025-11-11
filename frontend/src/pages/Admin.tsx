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
  AlertCircle,
  Bell
} from 'lucide-react';
import { apiService } from '../services/api';

// IMPORTAR COMPONENTES REALES
import InstitutionManager from '../components/Admin/InstitutionManager';
import CourseManager from '../components/Admin/CourseManager';
import MassUpload from '../components/Admin/MassUpload';
import SystemSettings from '../components/Admin/SystemSettings';
import BackupManager from '../components/Admin/BackupManager';
import NotificationSettings from '../components/Admin/NotificationSettings';

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
  onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="group relative bg-white rounded-lg border-2 border-gray-100 hover:border-[#193cb8] p-5 hover:shadow-xl transition-all duration-300 cursor-pointer text-left w-full overflow-hidden active:scale-[0.98]"
  >
    {/* Fondo decorativo con gradiente sutil */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#193cb8]/5 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />

    <div className="relative z-10">
      {/* Icono y título */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-[#193cb8] to-[#0e2167] group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg group-hover:shadow-xl">
            {/* Brillo interior */}
            <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Icon className="w-5 h-5 text-white relative z-10" />
          </div>
          <h3 className="text-base font-bold text-gray-900 group-hover:text-[#193cb8] transition-colors duration-300">{title}</h3>
        </div>

        {/* Indicador de flecha */}
        <div className="flex-shrink-0 ml-2 w-7 h-7 rounded-full bg-gradient-to-r from-[#193cb8] to-[#0e2167] flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 shadow-md">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Descripción */}
      <p className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">{description}</p>
    </div>

    {/* Barra de acento inferior */}
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#193cb8] to-[#0e2167] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-lg" />
  </button>
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
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Personaliza la apariencia y comportamiento de notificaciones',
      icon: Bell,
      color: 'indigo',
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-sm text-gray-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow border border-red-200 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error de acceso</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500">Redirigiendo al inicio...</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="mx-auto px-3 py-4">
      {/* Header compacto con diseño gradiente */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold">Panel de Administración</h1>
            <p className="text-blue-200 text-xs">Gestiona todos los aspectos del sistema</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Tarjetas de módulos mejoradas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map(module => (
            <AdminModuleCard
              key={module.id}
              icon={module.icon}
              title={module.title}
              description={module.description}
              onClick={() => navigate(`/admin/${module.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
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

        {/* RUTA REAL: Configuración de Notificaciones */}
        <Route path="/notifications" element={<NotificationSettings />} />

        {/* RUTA REAL: Backup y Restauración */}
        <Route path="/backup" element={<BackupManager />} />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  );
};

export default Admin;