import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, BookOpen, XCircle, School, Sparkles, Building, Heart, Loader2, CheckCircle, Lock, DollarSign, CreditCard, Save, ArrowLeft, Key, Plus, X } from 'lucide-react';
import { validateRUT, formatRUTOnInput } from '../../utils/rutValidator';
import { apiService } from '../../services/api';

interface FormData {
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  institutionId: string;    
  courseIds: string[];      
  institutionName: string;  
  courseNames: string[];    
  gender: string;
  status: 'active' | 'inactive' | 'retired';
  balance: number;
  overdraftLimit: number;
  isActive: boolean;
}

// INTERFACES para las opciones de select (idénticas a Student)
interface InstitutionOption {
  value: string;
  label: string;
}

interface CourseOption {
  value: string;
  label: string;
}

interface TeacherData {
  id: string;
  userId: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  balance: number;
  overdraftLimit: number;
  birthDate: string;
  institution: string;    
  courses: string[];      
  gender: string;
  status: 'active' | 'inactive' | 'retired';
  isActive: boolean;
  createdAt: string;
}

const EditTeacher = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    run: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    institutionId: '',
    courseIds: [''],
    institutionName: '',
    courseNames: [],
    gender: '',
    status: 'active',
    balance: 0,
    overdraftLimit: 0,
    isActive: true
  });
  
  // ESTADOS para dropdowns dinámicos (idénticos a Student)
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // AGREGADO: faltaba esta línea
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'financial'>('info');

  // CARGAR INSTITUCIONES al montar (idéntico a Student)
  useEffect(() => {
    loadInstitutions();
  }, []);

  // CARGAR CURSOS cuando cambia la institución (idéntico a Student)
  useEffect(() => {
    if (formData.institutionId) {
      loadCourses(formData.institutionId);
    } else {
      setCourses([]);
    }
  }, [formData.institutionId]);

  // FUNCIÓN: Cargar instituciones activas
  const loadInstitutions = async () => {
    try {
      setIsLoadingInstitutions(true);
      console.log('🏫 Cargando instituciones...');
      
      const response = await apiService.getActiveInstitutions();
      
      if (response.status === 'success') {
        const institutionOptions = apiService.formatInstitutionsForSelect(response);
        setInstitutions(institutionOptions);
        console.log('✅ Instituciones cargadas:', institutionOptions.length);
      }
    } catch (error: any) {
      console.error('❌ Error cargando instituciones:', error);
      setErrors(prev => ({ 
        ...prev, 
        general: 'Error al cargar instituciones. Verifique su conexión.' 
      }));
    } finally {
      setIsLoadingInstitutions(false);
    }
  };

  // FUNCIÓN: Cargar cursos por institución
  const loadCourses = async (institutionId: string) => {
    try {
      setIsLoadingCourses(true);
      console.log('📚 Cargando cursos para institución:', institutionId);
      
      const response = await apiService.getCoursesByInstitutionId(institutionId);
      
      if (response.status === 'success') {
        const courseOptions = apiService.formatCoursesForSelect(response);
        setCourses(courseOptions);
        console.log('✅ Cursos cargados:', courseOptions.length);
      }
    } catch (error: any) {
      console.error('❌ Error cargando cursos:', error);
      setErrors(prev => ({ 
        ...prev, 
        courseIds: 'Error al cargar cursos disponibles' 
      }));
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // Cargar docente
  const loadTeacher = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Cargando docente...', { id });
      
      const response = await apiService.getTeacherById(id!);
      
      if (response.status === 'success') {
        const teacherData = response.data.teacher;
        setTeacher(teacherData);
        setFormData({
          ...teacherData,
          institutionId: teacherData.institution, // Usar directamente si ya es el ID
          courseIds: teacherData.courses || [''] // Usar cursos directamente
        });
      }
    } catch (error: any) {
      console.error('Error cargando docente:', error);
      setError(error.message || 'Error al cargar docente');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadTeacher();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const addCourse = () => {
    setFormData(prev => ({ ...prev, courseIds: [...prev.courseIds, ''] }));
  };

  const removeCourse = (index: number) => {
    if (formData.courseIds.length > 1) {
      setFormData(prev => ({ 
        ...prev, 
        courseIds: prev.courseIds.filter((_, i) => i !== index) 
      }));
    }
  };

  const canAddMoreCourses = () => {
    return formData.courseIds.length < courses.length && 
           formData.courseIds.every(id => id.trim()) &&
           formData.courseIds.length < 10;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!validateRUT(formData.run)) newErrors.run = 'RUN inválido';
    if (!formData.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'Apellido requerido';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (formData.phone && !/^(\+56)?9\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Teléfono inválido';
    }
    if (!formData.birthDate) newErrors.birthDate = 'Fecha de nacimiento requerida';
    if (!formData.institutionId) newErrors.institutionId = 'Institución requerida';
    if (formData.courseIds.some(id => !id.trim())) {
      newErrors.courseIds = 'Todos los cursos son requeridos';
    }
    if (!formData.gender) newErrors.gender = 'Género requerido';

    // Validar edad mínima para docentes (22 años)
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 22) {
        newErrors.birthDate = 'Los docentes deben tener al menos 22 años';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const response = await apiService.updateTeacher(id!, formData);
      if (response.status === 'success') {
        setSuccess('Docente actualizado exitosamente');
        setTimeout(() => navigate('/teachers'), 2000);
      }
    } catch (error: any) {
      console.error('Error actualizando docente:', error);
      setError(error.message || 'Error al actualizar docente');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors({ password: 'Las contraseñas no coinciden' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setErrors({ password: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setIsChangingPassword(true);
    setError(null);

    try {
      const response = await apiService.changeTeacherPassword(id!, passwordData.newPassword);
      if (response.status === 'success') {
        setSuccess('Contraseña actualizada exitosamente');
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      setErrors({ password: error.message || 'Error al cambiar contraseña' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP' 
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando docente...</p>
        </div>
      </div>
    );
  }

  if (error && !teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => navigate('/teachers')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Volver a Lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-6">
        {/* Header con breadcrumb */}
        <button 
          onClick={() => navigate('/teachers')} 
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Lista de Docentes
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Editar Docente: {teacher?.firstName} {teacher?.lastName}
          </h1>
          {teacher && (
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>RUN: {teacher.run}</span>
              <span>Balance: {formatCurrency(teacher.balance)}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                teacher.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {teacher.isActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          )}
        </div>

        {/* Mensajes de éxito/error */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
            <XCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-700 text-sm">
            <XCircle className="w-4 h-4" />
            {errors.general}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button 
            onClick={() => setActiveTab('info')} 
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'info' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Información Personal
          </button>
          <button 
            onClick={() => setActiveTab('password')} 
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'password' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Contraseña
          </button>
          <button 
            onClick={() => setActiveTab('financial')} 
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === 'financial' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Información Financiera
          </button>
        </div>

        {/* Tab: Información Personal */}
        {activeTab === 'info' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* RUN */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <User className="w-3 h-3 inline mr-1" />
                RUN
              </label>
              <input
                name="run"
                value={formData.run}
                onChange={(e) => {
                  const formatted = formatRUTOnInput(e.target.value);
                  setFormData(prev => ({ ...prev, run: formatted }));
                  setErrors(prev => ({ ...prev, run: '' }));
                }}
                placeholder="Ej: 12.345.678-9"
                disabled={isSaving}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.run 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-blue-300'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {errors.run && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.run}
                </p>
              )}
            </div>

            {/* Grid de 2 columnas para nombre y apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Nombre del docente"
                  disabled={isSaving}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.firstName 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.firstName}
                  </p>
                )}
              </div>

              {/* Apellido */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Apellido
                </label>
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Apellido del docente"
                  disabled={isSaving}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.lastName 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.lastName}
                  </p>
                )}
              </div>
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
                onChange={handleChange}
                placeholder="email@ejemplo.com"
                disabled={isSaving}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.email 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-blue-300'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Grid de 2 columnas para teléfono y fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Teléfono */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />
                  Teléfono (opcional)
                </label>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+56912345678"
                  disabled={isSaving}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.phone 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Fecha de Nacimiento */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Fecha de Nacimiento
                </label>
                <input
                  name="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={handleChange}
                  disabled={isSaving}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.birthDate 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {errors.birthDate && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.birthDate}
                  </p>
                )}
              </div>
            </div>

            {/* Grid de 2 columnas para género y estado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Género */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Género
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={isSaving}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.gender 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">Seleccionar género</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
                {errors.gender && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.gender}
                  </p>
                )}
              </div>

              {/* Estado */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={isSaving}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : 'border-gray-200 focus:border-blue-300'
                  }`}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="retired">Jubilado</option>
                </select>
              </div>
            </div>

            {/* Institución */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <Building className="w-3 h-3 inline mr-1" />
                Institución
              </label>
              <select
                name="institutionId"
                value={formData.institutionId}
                onChange={handleChange}
                disabled={isSaving || isLoadingInstitutions}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.institutionId 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-blue-300'
                } ${isSaving || isLoadingInstitutions ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {isLoadingInstitutions 
                    ? 'Cargando instituciones...' 
                    : 'Seleccionar institución'}
                </option>
                {institutions.map(inst => (
                  <option key={inst.value} value={inst.value}>
                    {inst.label}
                  </option>
                ))}
              </select>
              {errors.institutionId && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.institutionId}
                </p>
              )}
            </div>

            {/* Cursos */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <BookOpen className="w-3 h-3 inline mr-1" />
                Cursos que imparte
              </label>
              <div className="space-y-2">
                {formData.courseIds.map((courseId, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={courseId}
                      onChange={(e) => {
                        const newCourseIds = [...formData.courseIds];
                        newCourseIds[index] = e.target.value;
                        setFormData(prev => ({ ...prev, courseIds: newCourseIds }));
                        setErrors(prev => ({ ...prev, courseIds: '' }));
                      }}
                      disabled={isSaving || isLoadingCourses || !formData.institutionId}
                      className={`flex-1 px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                        errors.courseIds 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      } ${isSaving || isLoadingCourses || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="">
                        {isLoadingCourses 
                          ? 'Cargando cursos...'
                          : courses.length === 0
                          ? 'No hay cursos disponibles'
                          : 'Seleccionar curso'
                        }
                      </option>
                      {courses.map(course => (
                        <option key={course.value} value={course.value}>
                          {course.label}
                        </option>
                      ))}
                    </select>
                    {formData.courseIds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCourse(index)}
                        disabled={isSaving}
                        className={`p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors ${
                          isSaving ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Eliminar curso"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {errors.courseIds && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.courseIds}
                </p>
              )}

              {isLoadingCourses && (
                <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Cargando cursos...
                </p>
              )}

              {canAddMoreCourses() && (
                <button
                  type="button"
                  onClick={addCourse}
                  disabled={isSaving || !formData.institutionId}
                  className={`mt-2 flex items-center gap-1.5 text-xs text-[#193cb8] hover:text-[#0e2167] hover:bg-blue-50 px-2 py-1 rounded transition-colors ${
                    isSaving || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Agregar curso ({formData.courseIds.filter(c => c.trim()).length}/{courses.length} disponibles)
                </button>
              )}

              {!canAddMoreCourses() && formData.courseIds.length < 10 && courses.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  ✅ Todos los cursos disponibles han sido seleccionados
                </p>
              )}

              {!formData.institutionId && (
                <p className="mt-1 text-xs text-gray-500">
                  Primero selecciona una institución para cargar los cursos disponibles
                </p>
              )}
            </div>

            {/* Checkbox activo */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center">
                <input
                  name="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={handleChange}
                  disabled={isSaving}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Usuario activo en el sistema
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Si está desactivado, el docente no podrá iniciar sesión
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
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
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Actualizar Docente
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/teachers')}
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
        )}

        {/* Tab: Contraseña */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-700 font-medium">
                  Cambio de contraseña para docente
                </p>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                Esta acción cambiará la contraseña de acceso del docente al sistema.
              </p>
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => {
                  setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                  setErrors(prev => ({ ...prev, password: '' }));
                }}
                placeholder="Mínimo 6 caracteres"
                disabled={isChangingPassword}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.password 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-blue-300'
                } ${isChangingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <p className="mt-1 text-xs text-gray-500">
                La contraseña debe tener al menos 6 caracteres
              </p>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                  setErrors(prev => ({ ...prev, password: '' }));
                }}
                placeholder="Confirma la nueva contraseña"
                disabled={isChangingPassword}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.password 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-blue-300'
                } ${isChangingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md ${
                isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:opacity-90'
              }`}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cambiando contraseña...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Cambiar Contraseña
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab: Información Financiera */}
        {activeTab === 'financial' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <p className="text-sm text-blue-700 font-medium">
                  Gestión financiera del docente
                </p>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Modifica el balance y límites de sobregiro para este docente.
              </p>
            </div>

            {/* Balance */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Balance Actual
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  name="balance"
                  type="number"
                  value={formData.balance}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="1000"
                  disabled={isSaving}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.balance 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Balance actual: {formatCurrency(formData.balance)}
              </p>
              {errors.balance && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.balance}
                </p>
              )}
            </div>

            {/* Límite de Sobregiro */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Límite de Sobregiro
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  name="overdraftLimit"
                  type="number"
                  value={formData.overdraftLimit}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="1000"
                  disabled={isSaving}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.overdraftLimit 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Límite de sobregiro: {formatCurrency(formData.overdraftLimit)}
              </p>
              {errors.overdraftLimit && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.overdraftLimit}
                </p>
              )}
            </div>

            {/* Resumen Financiero */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-gray-600" />
                Resumen Financiero
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="text-center p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">Balance Actual</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(formData.balance)}</p>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">Límite de Sobregiro</p>
                  <p className="font-semibold text-orange-600">{formatCurrency(formData.overdraftLimit)}</p>
                </div>
                <div className="text-center p-3 bg-white rounded border">
                  <p className="text-xs text-gray-500 mb-1">Dinero Total Disponible</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(formData.balance + formData.overdraftLimit)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="submit" 
                disabled={isSaving}
                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md ${
                  isSaving
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:opacity-90'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Actualizar Información Financiera
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditTeacher;