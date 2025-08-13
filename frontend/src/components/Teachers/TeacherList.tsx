import { useState, useEffect } from 'react';
import { Search, Clock, UserPlus, Download, School, User, CheckCircle, XCircle, Sparkles, Eye, Edit, Trash2, Printer, Loader, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Teacher } from '../../types/types';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TeacherList = () => {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Cargar docentes desde la API
  const loadTeachers = async (page = 1, search = '', status = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Cargando docentes...', { page, search, status });
      
      const response = await apiService.getTeachers({
        page,
        limit: pagination.limit,
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        sortOrder: 'desc'  // Agregado para resolver TS2345
      });
      
      console.log('✅ Docentes cargados:', response.data);
      
      setTeachers(response.data.teachers);
      setPagination(response.data.pagination);
      
    } catch (error: any) {
      console.error('❌ Error cargando docentes:', error);
      
      // Manejo específico de errores
      if (error.message.includes('fetch') || error.message.includes('conectar')) {
        setError('No se puede conectar con el servidor. Verifica que el backend esté corriendo.');
      } else if (error.message.includes('403') || error.message.includes('autorizado')) {
        setError('No tienes permisos para ver esta información. Contacta al administrador.');
      } else if (error.message.includes('401')) {
        setError('Tu sesión ha expirado. Redirigiendo al login...');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }, 3000);
      } else {
        setError(error.message || 'Error al cargar docentes');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar docentes al montar el componente
  useEffect(() => {
    loadTeachers();
  }, []);

  // Buscar docentes con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pagination.page === 1) {
        loadTeachers(1, searchTerm, filterStatus);
      } else {
        // Resetear a página 1 cuando se busca
        loadTeachers(1, searchTerm, filterStatus);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterStatus]);

  // Manejar cambio de página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadTeachers(newPage, searchTerm, filterStatus);
    }
  };

  const getStatusIcon = (status: Teacher['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case 'inactive': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'retired': return <Clock className="w-3.5 h-3.5 text-gray-500" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: Teacher['status']) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'retired': return 'Retirado';
      default: return status;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const PaginationComponent = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 print:hidden">
      <div className="text-xs text-gray-500">
        Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} docentes
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page === 1}
          className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-700">
          Página {pagination.page} de {pagination.totalPages}
        </span>
        <button
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages}
          className="p-1 hover:bg-gray-100 rounded text-gray-600 disabled:opacity-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lista de Docentes</h1>
            <p className="text-sm text-gray-500 mt-1">Gestiona docentes en el sistema</p>
          </div>
          <button
            onClick={() => navigate('/teachers/create')}
            className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white px-4 py-2.5 rounded-lg shadow-md hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-bold"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Docente
          </button>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-lg shadow border border-gray-100 mb-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, RUN o email..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
              />
            </div>

            {/* Filtro por estado */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="retired">Retirados</option>
            </select>
          </div>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Tabla de docentes */}
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Docente</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Institución</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cursos</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-sm">{teacher.firstName} {teacher.lastName}</span>
                      <span className="text-xs text-gray-500">{teacher.run}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{teacher.institution}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{teacher.courses.join(', ')}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{formatDate(teacher.createdAt)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      teacher.status === 'active' ? 'bg-green-100 text-green-800' : 
                      teacher.status === 'inactive' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusIcon(teacher.status)}
                      {getStatusLabel(teacher.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center print:hidden min-w-[150px]">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => navigate(`/teachers/${teacher.id}`)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                        title="Ver detalles"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => navigate(`/teachers/edit/${teacher.id}`)}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar a ${teacher.firstName} ${teacher.lastName}?`)) {
                            console.log('Eliminar docente:', teacher.id);
                            // TODO: Implementar eliminación real
                          }
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {!loading && teachers.length === 0 && !error && (
          <div className="px-4 py-8 text-center print:hidden">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">
              {searchTerm || filterStatus !== 'all' ? 'No se encontraron docentes' : 'No hay docentes registrados'}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Intenta cambiar los filtros de búsqueda' 
                : 'Comienza agregando un nuevo docente al sistema'}
            </p>
            {(!searchTerm && filterStatus === 'all') && (
              <button
                onClick={() => navigate('/teachers/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-medium"
              >
                Agregar Primer Docente
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="px-4 py-8 text-center">
            <Loader className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Cargando docentes...</p>
          </div>
        )}

        {/* Paginación mejorada */}
        <PaginationComponent />
      </div>
    </div>
  );
};

export default TeacherList;