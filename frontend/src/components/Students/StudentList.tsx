import { useState, useEffect, useRef } from 'react';
import { Search, Clock, UserPlus, Download, School, User, CheckCircle, XCircle, Sparkles, Eye, Edit, Trash2, Printer, Loader, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import type { Student } from '../../types/types';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const StudentList = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
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

  // Cargar estudiantes desde la API
  const loadStudents = async (page = 1, search = '', status = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Cargando estudiantes...', { page, search, status });
      
      const response = await apiService.getStudents({
        page,
        limit: pagination.limit,
        search: search || undefined,
        status: status === 'all' ? undefined : status
      });
      
      console.log('✅ Estudiantes cargados:', response.data);
      
      setStudents(response.data.students);
      setPagination(response.data.pagination);
      
    } catch (error: any) {
      console.error('❌ Error cargando estudiantes:', error);
      
      // Manejo específico de errores
      if (error.message.includes('fetch') || error.message.includes('conectar')) {
        setError('No se puede conectar con el servidor. Verifica que el backend esté corriendo.');
      } else if (error.message.includes('403') || error.message.includes('autorizado')) {
        setError('No tienes permisos para ver esta información. Contacta al administrador.');
      } else if (error.message.includes('401')) {
        setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }, 3000);
      } else {
        setError(error.message || 'Error al cargar estudiantes');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar estudiantes al montar el componente
  useEffect(() => {
    loadStudents();
  }, []);

  // Buscar estudiantes con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (pagination.page === 1) {
        loadStudents(1, searchTerm, filterStatus);
      } else {
        // Resetear a página 1 cuando se busca
        loadStudents(1, searchTerm, filterStatus);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterStatus]);

  // Manejar cambio de página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadStudents(newPage, searchTerm, filterStatus);
    }
  };

  const getStatusIcon = (status: Student['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'inactive': return <XCircle className="w-3 h-3 text-red-500" />;
      case 'graduated': return <Sparkles className="w-3 h-3 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: Student['status']) => ({
    active: 'Activo',
    inactive: 'Inactivo',
    graduated: 'Graduado'
  }[status]);

  const PaginationComponent = () => (
    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600 print:hidden">
      <button 
        onClick={() => handlePageChange(pagination.page - 1)}
        disabled={pagination.page === 1}
        className="flex items-center gap-1 hover:text-gray-900 disabled:opacity-50"
      >
        <ChevronLeft className="w-4 h-4" />
        Anterior
      </button>
      <span>Página {pagination.page} de {pagination.totalPages}</span>
      <button 
        onClick={() => handlePageChange(pagination.page + 1)}
        disabled={pagination.page === pagination.totalPages}
        className="flex items-center gap-1 hover:text-gray-900 disabled:opacity-50"
      >
        Siguiente
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Estudiantes</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/students/create')}
            className="btn-secondary flex items-center gap-2 print:hidden"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Estudiante
          </button>
          <button 
            onClick={() => window.print()}
            className="btn-secondary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white rounded-lg shadow border border-gray-100 p-4 space-y-4 print:hidden">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o RUN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-300"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-300 min-w-[150px]"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="graduated">Graduados</option>
          </select>
        </div>
      </div>

      {/* Estado de Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 print:hidden">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error al cargar estudiantes</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
              <button
                onClick={() => loadStudents()}
                className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Estudiantes */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">RUN</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Institución</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Curso</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider print:hidden">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map(student => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{student.firstName} {student.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{student.run}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <School className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600">{student.institution}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{student.course}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'active' ? 'bg-green-100 text-green-700' :
                      student.status === 'inactive' ? 'bg-red-100 text-red-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {getStatusIcon(student.status)}
                      <span>{getStatusLabel(student.status)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-center print:hidden min-w-[150px]">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => navigate(`/students/${student.id}`)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                        title="Ver detalles"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => navigate(`/students/edit/${student.id}`)}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar a ${student.firstName} ${student.lastName}?`)) {
                            console.log('Eliminar estudiante:', student.id);
                            // TODO: Implementar eliminación real
                            // apiService.deleteStudent(student.id).then(() => loadStudents());
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
        {!loading && students.length === 0 && !error && (
          <div className="px-4 py-8 text-center print:hidden">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">
              {searchTerm || filterStatus !== 'all' ? 'No se encontraron estudiantes' : 'No hay estudiantes registrados'}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Intenta cambiar los filtros de búsqueda' 
                : 'Comienza agregando un nuevo estudiante al sistema'}
            </p>
            {(!searchTerm && filterStatus === 'all') && (
              <button
                onClick={() => navigate('/students/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-medium"
              >
                Agregar Primer Estudiante
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="px-4 py-8 text-center">
            <Loader className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Cargando estudiantes...</p>
          </div>
        )}

        {/* Paginación */}
        <PaginationComponent />
      </div>
    </div>
  );
};

export default StudentList;