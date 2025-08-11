import { useState, useEffect } from 'react';
import { Building, Plus, Search, Edit, Trash2, Globe, Phone, Mail, MapPin, CheckCircle, XCircle, Loader2, Save, X, Building2, AlertCircle } from 'lucide-react';
import { apiService, Institution, InstitutionsResponse } from '../../services/api';

interface FormData {
  name: string;
  type: 'universidad' | 'instituto' | 'colegio' | 'escuela' | 'centro_formacion' | '';
  address: string;
  phone: string;
  email: string;
  website: string;
  isActive: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const InstitutionManager = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    isActive: true
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Tipos de institución disponibles
  const institutionTypes = [
    { value: 'universidad', label: 'Universidad' },
    { value: 'instituto', label: 'Instituto' },
    { value: 'colegio', label: 'Colegio' },
    { value: 'escuela', label: 'Escuela' },
    { value: 'centro_formacion', label: 'Centro de Formación' }
  ];

  // Cargar instituciones
  const loadInstitutions = async (page = 1, search = '', type = 'all', active = 'all') => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏫 Cargando instituciones...', { page, search, type, active });
      
      const response: InstitutionsResponse = await apiService.getInstitutions({
        page,
        limit: pagination.limit,
        search: search || undefined,
        type: type === 'all' ? undefined : type,
        active: active === 'all' ? undefined : active
      });
      
      console.log('✅ Instituciones cargadas:', response.data);
      
      setInstitutions(response.data.institutions);
      setPagination(response.data.pagination);
      
    } catch (error: any) {
      console.error('❌ Error cargando instituciones:', error);
      
      if (error.message.includes('403') || error.message.includes('autorizado')) {
        setError('No tienes permisos para gestionar instituciones. Solo administradores pueden acceder.');
      } else if (error.message.includes('401')) {
        setError('Tu sesión ha expirado. Recarga la página e inicia sesión nuevamente.');
      } else {
        setError(error.message || 'Error al cargar instituciones');
      }
    } finally {
      setLoading(false);
    }
  };

  // Cargar instituciones al montar
  useEffect(() => {
    loadInstitutions();
  }, []);

  // Buscar con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadInstitutions(1, searchTerm, filterType, filterActive);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterType, filterActive]);

  // Validar formulario
  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.type) {
      newErrors.type = 'El tipo de institución es requerido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (formData.phone && !/^[\+]?[0-9\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono no es válido';
    }

    if (formData.website && !/^https?:\/\/.+$/.test(formData.website)) {
      newErrors.website = 'El sitio web debe incluir http:// o https://';
    }

    return newErrors;
  };

  // Manejar cambios en el formulario
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
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
      name: '',
      type: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      isActive: true
    });
    setFormErrors({});
    setIsEditing(false);
    setEditingId(null);
    setShowForm(true);
    setSuccess(null);
  };

  // Abrir formulario para editar
  const handleEdit = (institution: Institution) => {
    setFormData({
      name: institution.name,
      type: institution.type,
      address: institution.address || '',
      phone: institution.phone || '',
      email: institution.email || '',
      website: institution.website || '',
      isActive: institution.isActive
    });
    setFormErrors({});
    setIsEditing(true);
    setEditingId(institution.id);
    setShowForm(true);
    setSuccess(null);
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({
      name: '',
      type: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      isActive: true
    });
    setFormErrors({});
    setIsEditing(false);
    setEditingId(null);
    setSuccess(null);
  };

  // Guardar institución
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
      console.log(`💾 ${isEditing ? 'Actualizando' : 'Creando'} institución:`, formData);
      
      if (isEditing && editingId) {
        await apiService.updateInstitution(editingId, formData);
        setSuccess('Institución actualizada exitosamente');
      } else {
        await apiService.createInstitution(formData);
        setSuccess('Institución creada exitosamente');
      }
      
      // Recargar lista
      loadInstitutions(pagination.page, searchTerm, filterType, filterActive);
      
      // Cerrar formulario después de 2 segundos
      setTimeout(() => {
        handleCloseForm();
      }, 2000);
      
    } catch (error: any) {
      console.error(`❌ Error ${isEditing ? 'actualizando' : 'creando'} institución:`, error);
      
      if (error.message.includes('nombre')) {
        setFormErrors({ name: 'Ya existe una institución con este nombre' });
      } else {
        setFormErrors({ general: error.message || `Error al ${isEditing ? 'actualizar' : 'crear'} la institución` });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar institución
  const handleDelete = async (institution: Institution) => {
    if (!confirm(`¿Estás seguro de eliminar "${institution.name}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      console.log('🗑️ Eliminando institución:', institution.id);
      
      await apiService.deleteInstitution(institution.id);
      
      setSuccess('Institución eliminada exitosamente');
      loadInstitutions(pagination.page, searchTerm, filterType, filterActive);
      
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('❌ Error eliminando institución:', error);
      setError(error.message || 'Error al eliminar la institución');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Cambiar página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadInstitutions(newPage, searchTerm, filterType, filterActive);
    }
  };

  const getTypeLabel = (type: string) => {
    const typeObj = institutionTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  // ✅ FUNCIÓN formatDate CORREGIDA
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) {
        return 'Sin fecha';
      }
      
      const date = new Date(dateString);
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.warn('Fecha inválida recibida:', dateString);
        return 'Fecha inválida';
      }
      
      return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch (error) {
      console.error('Error formateando fecha:', error, 'Fecha original:', dateString);
      return 'Error en fecha';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <Building className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Gestión de Instituciones</h1>
              <p className="text-blue-200 text-xs">Administra los establecimientos educacionales</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Total instituciones</p>
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
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
                disabled={loading}
              />
            </div>
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
            disabled={loading}
          >
            <option value="all">Todos los tipos</option>
            {institutionTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs shadow-sm focus:border-blue-300"
            disabled={loading}
          >
            <option value="all">Todos los estados</option>
            <option value="true">Activas</option>
            <option value="false">Inactivas</option>
          </select>
          
          <button 
            onClick={handleCreate}
            disabled={loading}
            className="px-3 py-2 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white rounded-lg flex items-center gap-1 text-xs font-bold shadow-md hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Institución
          </button>
        </div>
      </div>

      {/* Lista de instituciones */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Lista de Instituciones</h2>
              {(searchTerm || filterType !== 'all' || filterActive !== 'all') && !loading && (
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
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Institución</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Contacto</th>
                <th className="px-4 py-2 text-left text-xs font-bold uppercase">Creada</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase">Estado</th>
                <th className="px-4 py-2 text-center text-xs font-bold uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {institutions.map((institution) => (
                <tr key={institution.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="min-w-[200px]">
                      <p className="text-xs font-semibold text-gray-900">{institution.name}</p>
                      {institution.address && (
                        <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {institution.address}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 min-w-[120px]">
                    {getTypeLabel(institution.type)}
                  </td>
                  <td className="px-4 py-2 min-w-[180px]">
                    <div className="space-y-0.5">
                      {institution.email && (
                        <p className="text-[10px] text-gray-600 flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5" />
                          {institution.email}
                        </p>
                      )}
                      {institution.phone && (
                        <p className="text-[10px] text-gray-600 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {institution.phone}
                        </p>
                      )}
                      {institution.website && (
                        <p className="text-[10px] text-gray-600 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          <a href={institution.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                            Sitio web
                          </a>
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700 min-w-[100px]">
                    {formatDate(institution.createdAt)}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-center min-w-[100px]">
                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shadow-sm ${
                      institution.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {institution.isActive ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>{institution.isActive ? 'Activa' : 'Inactiva'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-center min-w-[100px]">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(institution)}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(institution)}
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
        {!loading && institutions.length === 0 && !error && (
          <div className="px-4 py-8 text-center">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium mb-1">
              {searchTerm || filterType !== 'all' || filterActive !== 'all' 
                ? 'No se encontraron instituciones' 
                : 'No hay instituciones registradas'}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {searchTerm || filterType !== 'all' || filterActive !== 'all'
                ? 'Intenta cambiar los filtros de búsqueda' 
                : 'Comienza agregando una nueva institución al sistema'}
            </p>
            {(!searchTerm && filterType === 'all' && filterActive === 'all') && (
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 font-medium"
              >
                Agregar Primera Institución
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="px-4 py-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500">Cargando instituciones...</p>
          </div>
        )}

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} instituciones
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
                    <Building className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-base font-bold">
                    {isEditing ? 'Editar Institución' : 'Nueva Institución'}
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
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nombre de la Institución *
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="Universidad de Chile"
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

                  {/* Tipo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Tipo de Institución *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleFormChange}
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.type 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Seleccionar tipo</option>
                        {institutionTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    {formErrors.type && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.type}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        placeholder="contacto@institucion.cl"
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.email 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleFormChange}
                        placeholder="+56 2 2978 2000"
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.phone 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Dirección */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Dirección
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        name="address"
                        type="text"
                        value={formData.address}
                        onChange={handleFormChange}
                        placeholder="Av. Libertador Bernardo O'Higgins 1058, Santiago"
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.address 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Sitio web */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Sitio Web
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        name="website"
                        type="url"
                        value={formData.website}
                        onChange={handleFormChange}
                        placeholder="https://www.institucion.cl"
                        disabled={isSaving}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          formErrors.website 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                    {formErrors.website && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.website}
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
                        Institución activa
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
                        {isEditing ? 'Actualizar Institución' : 'Crear Institución'}
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

export default InstitutionManager;