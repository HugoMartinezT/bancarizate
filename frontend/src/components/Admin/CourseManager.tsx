import { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Edit, Trash2, CheckCircle, XCircle, Loader2, Save, X, GraduationCap, AlertCircle, Building, Clock } from 'lucide-react';
import { apiService, Course, CoursesResponse, Institution } from '../../services/api';

interface FormData {
  institutionId: string;
  name: string;
  code: string;
  level: 'basico' | 'medio' | 'superior' | 'postgrado' | 'tecnico' | 'profesional' | '';
  durationMonths: number;
  description: string;
  isActive: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CourseManager = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInstitution, setFilterInstitution] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    institutionId: '',
    name: '',
    code: '',
    level: '',
    durationMonths: 0,
    description: '',
    isActive: true
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Niveles de curso disponibles
  const courseLevels = [
    { value: 'basico', label: 'Básico' },
    { value: 'medio', label: 'Medio' },
    { value: 'superior', label: 'Superior' },
    { value: 'postgrado', label: 'Postgrado' },
    { value: 'tecnico', label: 'Técnico' },
    { value: 'profesional', label: 'Profesional' }
  ];

  // Cargar instituciones
  const loadInstitutions = async () => {
    try {
      const response = await apiService.getInstitutions({ 
        active: 'true', 
        limit: 1000 
      });
      setInstitutions(response.data.institutions);
    } catch (error) {
      console.error('Error cargando instituciones:', error);
    }
  };

  // Cargar cursos
  const loadCourses = async (page = 1, search = '', institutionId = 'all', level = 'all', active = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📚 Cargando cursos...', { page, search, institutionId, level, active });
      
      const response: CoursesResponse = await apiService.getCourses({
        page,
        limit: pagination.limit,
        search: search || undefined,
        institutionId: institutionId === 'all' ? undefined : institutionId,
        level: level === 'all' ? undefined : level,
        active: active === 'all' ? undefined : active
      });
      
      console.log('✅ Cursos cargados:', response.data);
      
      setCourses(response.data.courses);
      setPagination(response.data.pagination);
      
    } catch (error: any) {
      console.error('❌ Error cargando cursos:', error);
      
      if (error.message.includes('403') || error.message.includes('autorizado')) {
        setError('No tienes permisos para gestionar cursos. Solo administradores pueden acceder.');
      } else if (error.message.includes('401')) {
        setError('Tu sesión ha expirado. Recarga la página e inicia sesión nuevamente.');
      } else {
        setError(error.message || 'Error al cargar cursos');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar
  useEffect(() => {
    loadInstitutions();
    loadCourses();
  }, []);

  // Buscar con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadCourses(1, searchTerm, filterInstitution, filterLevel, filterActive);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterInstitution, filterLevel, filterActive]);

  // Validar formulario
  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.institutionId) {
      newErrors.institutionId = 'La institución es requerida';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del curso es requerido';
    } else if (formData.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.level) {
      newErrors.level = 'El nivel del curso es requerido';
    }

    if (formData.durationMonths < 0 || formData.durationMonths > 120) {
      newErrors.durationMonths = 'La duración debe estar entre 0 y 120 meses';
    }

    return newErrors;
  };

  // Manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Limpiar error del campo
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Abrir formulario para crear
  const handleCreate = () => {
    setFormData({
      institutionId: '',
      name: '',
      code: '',
      level: '',
      durationMonths: 0,
      description: '',
      isActive: true
    });
    setFormErrors({});
    setIsEditing(false);
    setEditingId(null);
    setShowForm(true);
    setSuccess(null);
  };

  // Abrir formulario para editar
  const handleEdit = (course: Course) => {
    setFormData({
      institutionId: course.institutionId,
      name: course.name,
      code: course.code || '',
      level: course.level,
      durationMonths: course.durationMonths || 0,
      description: course.description || '',
      isActive: course.isActive
    });
    setFormErrors({});
    setIsEditing(true);
    setEditingId(course.id);
    setShowForm(true);
    setSuccess(null);
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      institutionId: '',
      name: '',
      code: '',
      level: '',
      durationMonths: 0,
      description: '',
      isActive: true
    });
    setFormErrors({});
    setIsEditing(false);
    setEditingId(null);
    setSuccess(null);
  };

  // Guardar curso
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormErrors({});
    setSuccess(null);
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setIsSaving(true);

    try {
      console.log(`💾 ${isEditing ? 'Actualizando' : 'Creando'} curso:`, formData);
      
      const submitData = {
        ...formData,
        durationMonths: formData.durationMonths || undefined
      };
      
      if (isEditing && editingId) {
        await apiService.updateCourse(editingId, submitData);
        setSuccess('Curso actualizado exitosamente');
      } else {
        await apiService.createCourse(submitData);
        setSuccess('Curso creado exitosamente');
      }
      
      // Recargar lista
      loadCourses(pagination.page, searchTerm, filterInstitution, filterLevel, filterActive);
      
      // Cerrar formulario después de 2 segundos
      setTimeout(() => {
        handleCloseForm();
      }, 2000);
      
    } catch (error: any) {
      console.error(`❌ Error ${isEditing ? 'actualizando' : 'creando'} curso:`, error);
      
      if (error.message.includes('nombre')) {
        setFormErrors({ name: 'Ya existe un curso con este nombre en esta institución' });
      } else if (error.message.includes('código')) {
        setFormErrors({ code: 'Ya existe un curso con este código' });
      } else {
        setFormErrors({ general: error.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el curso` });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar curso
  const handleDelete = async (course: Course) => {
    if (!confirm(`¿Estás seguro de eliminar "${course.name}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      console.log('🗑️ Eliminando curso:', course.id);
      
      await apiService.deleteCourse(course.id);
      
      setSuccess('Curso eliminado exitosamente');
      loadCourses(pagination.page, searchTerm, filterInstitution, filterLevel, filterActive);
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('❌ Error eliminando curso:', error);
      setError(error.message || 'Error al eliminar el curso');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Cambiar página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadCourses(newPage, searchTerm, filterInstitution, filterLevel, filterActive);
    }
  };

  const getLevelLabel = (level: string) => {
    const levelObj = courseLevels.find(l => l.value === level);
    return levelObj ? levelObj.label : level;
  };

  // ✅ FUNCIÓN formatDate CORREGIDA - Maneja fechas inválidas
  const formatDate = (dateString: string | undefined | null) => {
    // Verificar que dateString existe y no es nulo
    if (!dateString) {
      return 'Fecha no disponible';
    }
    
    try {
      const date = new Date(dateString);
      
      // Verificar que la fecha es válida
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      
      return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      console.warn('Error formateando fecha:', dateString, error);
      return 'Fecha inválida';
    }
  };

  // ✅ FUNCIÓN HELPER para manejar diferentes formatos de fecha
  const getCourseDate = (course: Course) => {
    // El backend puede devolver created_at o createdAt
    const dateField = course.createdAt || (course as any).created_at;
    return formatDate(dateField);
  };

  const getInstitutionName = (institutionId: string) => {
    const institution = institutions.find(i => i.id === institutionId);
    return institution ? institution.name : 'Institución no encontrada';
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Gestión de Cursos</h1>
              <p className="text-blue-200 text-xs">Administra los cursos y carreras disponibles</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Total cursos</p>
            <p className="text-base font-bold">{loading ? '...' : pagination.total}</p>
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

      {/* Filtros y acciones */}
      <div className="bg-white rounded-lg shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row gap-3 p-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
                disabled={loading}
              />
            </div>
          </div>
          
          <select
            value={filterInstitution}
            onChange={(e) => setFilterInstitution(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
            disabled={loading}
          >
            <option value="all">Todas las instituciones</option>
            {institutions.map(institution => (
              <option key={institution.id} value={institution.id}>{institution.name}</option>
            ))}
          </select>
          
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
            disabled={loading}
          >
            <option value="all">Todos los niveles</option>
            {courseLevels.map(level => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
          
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
            disabled={loading}
          >
            <option value="all">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          
          <button 
            onClick={handleCreate}
            disabled={loading}
            className="px-3 py-2 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white rounded-lg flex items-center gap-1 text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Curso
          </button>
        </div>
      </div>

      {/* Lista de cursos */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <GraduationCap className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Lista de Cursos</h2>
              {(searchTerm || filterInstitution !== 'all' || filterLevel !== 'all' || filterActive !== 'all') && !loading && (
                <span className="text-xs text-gray-500">
                  - Filtrado
                </span>
              )}
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Cargando...</span>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Curso</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Institución</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Nivel</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Duración</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Creado</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase">Estado</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="min-w-[200px]">
                      <p className="text-xs font-semibold text-gray-900">{course.name}</p>
                      {course.code && (
                        <p className="text-[10px] text-gray-500 mt-0.5">Código: {course.code}</p>
                      )}
                      {course.description && (
                        <p className="text-[10px] text-gray-600 mt-0.5 truncate" title={course.description}>
                          {course.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 min-w-[180px]">
                    <div className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-700">
                        {course.institution ? course.institution.name : getInstitutionName(course.institutionId)}
                      </span>
                    </div>
                    {course.institution && (
                      <p className="text-[10px] text-gray-500 ml-4">
                        {course.institution.type}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 min-w-[100px]">
                    {getLevelLabel(course.level)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 min-w-[100px]">
                    {course.durationMonths ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>{course.durationMonths} meses</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">No especificada</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 min-w-[100px]">
                    {getCourseDate(course)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-center min-w-[100px]">
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shadow-sm ${
                      course.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {course.isActive ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>{course.isActive ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-center min-w-[100px]">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(course)}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(course)}
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
        {!loading && courses.length === 0 && !error && (
          <div className="px-4 py-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">
              {searchTerm || filterInstitution !== 'all' || filterLevel !== 'all' || filterActive !== 'all'
                ? 'No se encontraron cursos' 
                : 'No hay cursos registrados'}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {searchTerm || filterInstitution !== 'all' || filterLevel !== 'all' || filterActive !== 'all'
                ? 'Intenta cambiar los filtros de búsqueda' 
                : 'Comienza agregando un nuevo curso al sistema'}
            </p>
            {(!searchTerm && filterInstitution === 'all' && filterLevel === 'all' && filterActive === 'all') && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-medium"
              >
                Agregar Primer Curso
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="px-4 py-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Cargando cursos...</p>
          </div>
        )}

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} cursos
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
              >
                ← Anterior
              </button>
              
              <span className="text-xs text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-xs bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal del formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-t-lg p-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-white/20 rounded">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold">
                    {isEditing ? 'Editar Curso' : 'Nuevo Curso'}
                  </h2>
                </div>
                <button
                  onClick={handleCloseForm}
                  disabled={isSaving}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido del formulario */}
            <div className="p-4">
              {/* Mensaje de error general */}
              {formErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs shadow-sm">
                  <XCircle className="w-3.5 h-3.5" />
                  <p>{formErrors.general}</p>
                </div>
              )}

              {/* Mensaje de éxito */}
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs shadow-sm">
                  <CheckCircle className="w-4 h-4" />
                  <p>{success}</p>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Institución */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Institución *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select
                        name="institutionId"
                        value={formData.institutionId}
                        onChange={handleFormChange}
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.institutionId 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Seleccionar institución</option>
                        {institutions.map(institution => (
                          <option key={institution.id} value={institution.id}>
                            {institution.name} ({institution.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    {formErrors.institutionId && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.institutionId}
                      </p>
                    )}
                  </div>

                  {/* Nombre del curso */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nombre del Curso *
                    </label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="Ingeniería Informática"
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.name 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Código del curso */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Código del Curso
                    </label>
                    <input
                      name="code"
                      type="text"
                      value={formData.code}
                      onChange={handleFormChange}
                      placeholder="ING-INF"
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        formErrors.code 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.code && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.code}
                      </p>
                    )}
                  </div>

                  {/* Nivel */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nivel *
                    </label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select
                        name="level"
                        value={formData.level}
                        onChange={handleFormChange}
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.level 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Seleccionar nivel</option>
                        {courseLevels.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                    {formErrors.level && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.level}
                      </p>
                    )}
                  </div>

                  {/* Duración */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Duración (meses)
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        name="durationMonths"
                        type="number"
                        value={formData.durationMonths}
                        onChange={handleFormChange}
                        placeholder="60"
                        min="0"
                        max="120"
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.durationMonths 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    {formErrors.durationMonths && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.durationMonths}
                      </p>
                    )}
                  </div>

                  {/* Descripción */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      placeholder="Descripción del curso..."
                      rows={3}
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors resize-none ${
                        formErrors.description 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  {/* Estado activo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Estado
                    </label>
                    <div className="flex items-center">
                      <input
                        name="isActive"
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={handleFormChange}
                        disabled={isSaving}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">
                        Curso activo
                      </label>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md ${
                      isSaving
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isEditing ? 'Actualizando...' : 'Creando...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {isEditing ? 'Actualizar Curso' : 'Crear Curso'}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    disabled={isSaving}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors ${
                      isSaving 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManager;