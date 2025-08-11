import { useState, useEffect } from 'react';
import { Search, Clock, UserPlus, Download, School, User, CheckCircle, XCircle, Sparkles, Eye, Edit, Trash2, Printer, Loader, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService, Student } from '../../services/api';

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

  const getStatusLabel = (status: Student['status']) => {
    return {
      active: 'Activo',
      inactive: 'Inactivo',
      graduated: 'Graduado'
    }[status];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColors = (name: string) => {
    const colors = [
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const exportToCSV = () => {
    if (students.length === 0) return;
    
    const headers = ['RUN', 'Nombre', 'Apellido', 'Email', 'Teléfono', 'Nacimiento', 'Institución', 'Curso', 'Género', 'Estado'];
    const rows = students.map(s => [
      s.run,
      s.firstName,
      s.lastName,
      s.email,
      s.phone || '',
      formatDate(s.birthDate),
      s.institution,
      s.course,
      s.gender,
      getStatusLabel(s.status)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `estudiantes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    window.print();
  };

  // Componente de paginación
  const PaginationComponent = () => {
    if (pagination.totalPages <= 1) return null;

    const pages = [];
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.totalPages, pagination.page + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 print:hidden">
        <div className="text-xs text-gray-500">
          Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} estudiantes
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            ← Anterior
          </button>
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 text-xs rounded ${
                page === pagination.page 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
          >
            Siguiente →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <School className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Estudiantes</h1>
              <p className="text-blue-200 text-xs">Gestiona los estudiantes del sistema</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Total estudiantes</p>
            <p className="text-base font-bold">{loading ? '...' : pagination.total}</p>
          </div>
        </div>
      </div>

      {/* Filtros y acciones */}
      <div className="bg-white rounded-lg shadow-sm mb-4 print:hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por nombre, RUN o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
                disabled={loading}
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
            disabled={loading}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="graduated">Graduados</option>
          </select>
          
          <button 
            onClick={exportToCSV} 
            disabled={students.length === 0 || loading}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 text-xs shadow-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          
          <button 
            onClick={exportToPDF} 
            disabled={students.length === 0 || loading}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 text-xs shadow-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF
          </button>
          
          <button 
            onClick={() => navigate('/students/create')}
            className="px-3 py-2 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white rounded-lg flex items-center gap-1 text-xs font-bold shadow-md hover:opacity-90"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error al cargar estudiantes</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => loadStudents(pagination.page, searchTerm, filterStatus)}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-medium"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* Lista de estudiantes */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-100 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <Clock className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Lista de Estudiantes</h2>
              {(searchTerm || filterStatus !== 'all') && !loading && (
                <span className="text-xs text-gray-500">
                  - {searchTerm && `"${searchTerm}"`} {filterStatus !== 'all' && `(${getStatusLabel(filterStatus as any)})`}
                </span>
              )}
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-xs">Cargando...</span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Estudiante</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">RUN</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Establecimiento</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Curso</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Nacimiento</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Género</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase">Estado</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase print:hidden">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => {
                const colors = getAvatarColors(`${student.firstName} ${student.lastName}`);
                
                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 min-w-[200px]">
                        <div className={`w-7 h-7 ${colors.bg} rounded-full flex items-center justify-center shadow-sm`}>
                          <span className={`text-xs font-bold ${colors.text}`}>
                            {getInitials(student.firstName, student.lastName)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{student.firstName} {student.lastName}</p>
                          <p className="text-[10px] text-gray-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 min-w-[120px]">{student.run}</td>
                    <td className="px-4 py-2 text-xs text-gray-700 min-w-[200px]">{student.institution}</td>
                    <td className="px-4 py-2 text-xs text-gray-700 min-w-[180px]">{student.course}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 min-w-[120px]">{formatDate(student.birthDate)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 min-w-[100px]">{student.gender}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-center min-w-[120px]">
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shadow-sm ${
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
                );
              })}
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