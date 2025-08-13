import { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Edit, Trash2, CheckCircle, XCircle, Loader2, Save, X, GraduationCap, AlertCircle, Building, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
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
        institution: institutionId === 'all' ? undefined : institutionId,
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

  // Cargar instituciones y cursos al montar
  useEffect(() => {
    loadInstitutions();
    loadCourses();
  }, []);

  // Buscar cursos con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadCourses(pagination.page, searchTerm, filterInstitution, filterLevel, filterActive);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterInstitution, filterLevel, filterActive, pagination.page]);

  // Manejar cambio de formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.institutionId) newErrors.institutionId = 'La institución es requerida';
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (formData.name.trim().length < 3) newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    if (!formData.code.trim()) newErrors.code = 'El código es requerido';
    if (!formData.level) newErrors.level = 'El nivel es requerido';
    if (formData.durationMonths <= 0) newErrors.durationMonths = 'La duración debe ser mayor a 0';
    if (formData.description.trim().length > 500) newErrors.description = 'La descripción no puede exceder 500 caracteres';

    return newErrors;
  };

  // Guardar curso
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setSuccess(null);

    try {
      let response;
      if (isEditing && editingId) {
        response = await apiService.updateCourse(editingId, formData);
      } else {
        response = await apiService.createCourse(formData);
      }

      if (response.status === 'success') {
        setSuccess(isEditing ? 'Curso actualizado exitosamente' : 'Curso creado exitosamente');
        setShowForm(false);
        loadCourses(pagination.page, searchTerm, filterInstitution, filterLevel, filterActive);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error guardando curso:', error);
      setError(error.message || 'Error al guardar curso');
    } finally {
      setIsSaving(false);
    }
  };

  // Editar curso
  const handleEdit = (course: Course) => {
    setFormData({
      institutionId: course.institutionId,
      name: course.name,
      code: course.code || '',
      level: course.level as any,
      durationMonths: course.durationMonths || 0,
      description: course.description || '',
      isActive: course.isActive
    });
    setEditingId(course.id);
    setIsEditing(true);
    setShowForm(true);
    setFormErrors({});
  };

  // Eliminar curso
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;

    try {
      const response = await apiService.deleteCourse(id);
      if (response.status === 'success') {
        setSuccess('Curso eliminado exitosamente');
        loadCourses(pagination.page, searchTerm, filterInstitution, filterLevel, filterActive);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error eliminando curso:', error);
      setError(error.message || 'Error al eliminar curso');
    }
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
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
  };

  // Formatear fecha
  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obtener nombre de institución
  const getInstitutionName = (institutionId: string) => {
    const institution = institutions.find(inst => inst.id === institutionId);
    return institution ? institution.name : 'Desconocida';
  };

  // Obtener label de nivel
  const getLevelLabel = (level: string) => {
    const levelObj = courseLevels.find(l => l.value === level);
    return levelObj ? levelObj.label : level;
  };

  // Paginación
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadCourses(newPage, searchTerm, filterInstitution, filterLevel, filterActive);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Cursos</h1>
            <p className="text-sm text-gray-500 mt-1">Administra cursos y carreras en el sistema</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white px-4 py-2.5 rounded-lg shadow-md hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-bold"
          >
            <Plus className="w-4 h-4" />
            Nuevo Curso
          </button>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-lg shadow border border-gray-100 mb-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, código o descripción..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
              />
            </div>

            {/* Filtro por institución */}
            <select
              value={filterInstitution}
              onChange={(e) => setFilterInstitution(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
            >
              <option value="all">Todas las instituciones</option>
              {institutions.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>

            {/* Filtro por nivel */}
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
            >
              <option value="all">Todos los niveles</option>
              {courseLevels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>

            {/* Filtro por estado */}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
            >
              <option value="all">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Tabla de cursos */}
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Curso</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Institución</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nivel</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duración</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map(course => (
                <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-sm">{course.name}</span>
                      <span className="text-xs text-gray-500">{course.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{getInstitutionName(course.institutionId)}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{getLevelLabel(course.level)}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{course.durationMonths} meses</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{formatDate(course.createdAt)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      course.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {course.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {course.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(course)}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(course.id)}
                        className="p-1 hover:bg-gray-100 rounded text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} cursos
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
        </div>

        {/* Formulario modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Editar Curso' : 'Nuevo Curso'}</h2>
                  <button type="button" onClick={handleCloseForm} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Institución */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Institución
                    </label>
                    <select
                      name="institutionId"
                      value={formData.institutionId}
                      onChange={handleFormChange}
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        formErrors.institutionId 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Seleccionar institución</option>
                      {institutions.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                    {formErrors.institutionId && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.institutionId}
                      </p>
                    )}
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Nombre del curso"
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        formErrors.name 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.name}
                      </p>
                    )}
                  </div>

                  {/* Código */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Código
                    </label>
                    <input
                      name="code"
                      value={formData.code}
                      onChange={handleFormChange}
                      placeholder="Código del curso"
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
                      Nivel
                    </label>
                    <select
                      name="level"
                      value={formData.level}
                      onChange={handleFormChange}
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
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
                    <input
                      name="durationMonths"
                      type="number"
                      value={formData.durationMonths}
                      onChange={handleFormChange}
                      placeholder="Duración en meses"
                      min="1"
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        formErrors.durationMonths 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
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
                    {formErrors.description && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.description}
                      </p>
                    )}
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
        )}
      </div>
    </div>
  );
};

export default CourseManager;