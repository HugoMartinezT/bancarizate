import { useState, useEffect } from 'react';
import { Building, Plus, Search, Edit, Trash2, Globe, Phone, Mail, MapPin, CheckCircle, XCircle, Loader2, Save, X, Building2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
      loadInstitutions(pagination.page, searchTerm, filterType, filterActive);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterType, filterActive, pagination.page]);

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

    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (formData.name.trim().length < 3) newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    if (!formData.type) newErrors.type = 'El tipo es requerido';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
    if (formData.phone && !/^(\+56)?9\d{8}$/.test(formData.phone.replace(/\s/g, ''))) newErrors.phone = 'Teléfono inválido (ej: +56912345678)';
    if (formData.website && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+[/#?]?.*$/.test(formData.website)) newErrors.website = 'Sitio web inválido';

    return newErrors;
  };

  // Guardar institución
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
        response = await apiService.updateInstitution(editingId, formData);
      } else {
        response = await apiService.createInstitution(formData);
      }

      if (response.status === 'success') {
        setSuccess(isEditing ? 'Institución actualizada exitosamente' : 'Institución creada exitosamente');
        setShowForm(false);
        loadInstitutions(pagination.page, searchTerm, filterType, filterActive);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error guardando institución:', error);
      setError(error.message || 'Error al guardar institución');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ CORREGIDO: Editar institución con valores por defecto para campos opcionales
  const handleEdit = (institution: Institution) => {
    setFormData({
      name: institution.name,
      type: institution.type as any,
      address: institution.address || '', // ✅ CORREGIDO: Valor por defecto
      phone: institution.phone || '',     // ✅ CORREGIDO: Valor por defecto
      email: institution.email || '',     // ✅ CORREGIDO: Valor por defecto
      website: institution.website || '', // ✅ CORREGIDO: Valor por defecto
      isActive: institution.isActive
    });
    setEditingId(institution.id);
    setIsEditing(true);
    setShowForm(true);
    setFormErrors({});
  };

  // Eliminar institución
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta institución?')) return;

    try {
      const response = await apiService.deleteInstitution(id);
      if (response.status === 'success') {
        setSuccess('Institución eliminada exitosamente');
        loadInstitutions(pagination.page, searchTerm, filterType, filterActive);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      console.error('Error eliminando institución:', error);
      setError(error.message || 'Error al eliminar institución');
    }
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setIsEditing(false);
    setEditingId(null);
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
  };

  // Formatear fecha
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obtener label de tipo
  const getTypeLabel = (type: string) => {
    const typeObj = institutionTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  // Paginación
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadInstitutions(newPage, searchTerm, filterType, filterActive);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto px-3 py-4">
        <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-sm text-gray-600">Cargando instituciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <Building className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Gestión de Instituciones</h1>
              <p className="text-blue-200 text-xs">Administra establecimientos educacionales</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            Nueva Institución
          </button>
        </div>
      </div>

        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-lg shadow border border-gray-100 mb-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o dirección..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
              />
            </div>

            {/* Filtro por tipo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
            >
              <option value="all">Todos los tipos</option>
              {institutionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            {/* Filtro por estado */}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors"
            >
              <option value="all">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
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

        {/* Tabla de instituciones */}
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Institución</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacto</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creada</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {institutions.map(institution => (
                <tr key={institution.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-sm">{institution.name}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {institution.address}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getTypeLabel(institution.type)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    <div className="flex flex-col text-xs space-y-1">
                      {institution.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {institution.phone}
                        </span>
                      )}
                      {institution.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {institution.email}
                        </span>
                      )}
                      {institution.website && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <a 
                            href={institution.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 truncate max-w-32"
                          >
                            {institution.website}
                          </a>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{formatDate(institution.createdAt)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      institution.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {institution.isActive ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {institution.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(institution)}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(institution.id)}
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
              Mostrando {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} instituciones
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
                  <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Editar Institución' : 'Nueva Institución'}</h2>
                  <button type="button" onClick={handleCloseForm} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Building className="w-3 h-3 inline mr-1" />
                      Nombre
                    </label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="Nombre de la institución"
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

                  {/* Tipo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Building2 className="w-3 h-3 inline mr-1" />
                      Tipo
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleFormChange}
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
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
                    {formErrors.type && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.type}
                      </p>
                    )}
                  </div>

                  {/* Dirección */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      Dirección
                    </label>
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleFormChange}
                      placeholder="Dirección de la institución"
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        formErrors.address 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.address && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.address}
                      </p>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Teléfono
                    </label>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="+56912345678"
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        formErrors.phone 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.phone}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Mail className="w-3 h-3 inline mr-1" />
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="contacto@institucion.cl"
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        formErrors.email 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Website */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Globe className="w-3 h-3 inline mr-1" />
                      Sitio Web
                    </label>
                    <input
                      name="website"
                      value={formData.website}
                      onChange={handleFormChange}
                      placeholder="https://www.institucion.cl"
                      disabled={isSaving}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        formErrors.website 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {formErrors.website && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {formErrors.website}
                      </p>
                    )}
                  </div>

                  {/* Estado activo */}
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
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
                      <p className="mt-1 text-xs text-gray-500">
                        Las instituciones inactivas no aparecerán en los formularios de creación
                      </p>
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
        )}
    </div>
  );
};

export default InstitutionManager;