import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, BookOpen, XCircle, School, Sparkles, Building, Heart, Loader2, CheckCircle, Lock, DollarSign, CreditCard, Save, ArrowLeft, Key, Plus, X, Eye, EyeOff } from 'lucide-react';
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
  gender: string;
  status: 'active' | 'inactive' | 'retired';
  balance: number;
  overdraftLimit: number;
  isActive: boolean;
}

// INTERFACES para las opciones de select
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
    gender: '',
    status: 'active',
    balance: 0,
    overdraftLimit: 0,
    isActive: true
  });
  
  // ESTADOS para dropdowns dinámicos
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  // ✅ NUEVO: Estado para tracking de carga del docente
  const [teacherLoaded, setTeacherLoaded] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  // ✅ Estados para visibilidad de contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'financial'>('info');

  // ✅ CORREGIDO: Cargar instituciones al montar
  useEffect(() => {
    loadInstitutions();
  }, []);

  // ✅ CORREGIDO: Cargar docente después de tener instituciones
  useEffect(() => {
    if (id && !isLoadingInstitutions && institutions.length > 0) {
      loadTeacher();
    }
  }, [id, isLoadingInstitutions, institutions]);

  // ✅ CORREGIDO: Cargar cursos cuando cambia la institución
  useEffect(() => {
    if (formData.institutionId) {
      loadCourses(formData.institutionId);
    } else {
      setCourses([]);
    }
  }, [formData.institutionId]);

  // ✅ NUEVO: Mapear institución DESPUÉS de tener datos completos
  useEffect(() => {
    if (teacherLoaded && teacher && institutions.length > 0) {
      // Encontrar y setear la institución
      const institutionOption = institutions.find(inst => inst.label === teacher.institution);
      
      if (institutionOption) {
        console.log('🏫 Mapeando institución:', teacher.institution, '→', institutionOption.value);
        
        setFormData(prev => ({
          ...prev,
          institutionId: institutionOption.value
        }));
      } else {
        console.warn('⚠️ No se encontró la institución:', teacher.institution);
        
        // Agregar institución como opción custom
        const customInstitution = { 
          value: `custom_${Date.now()}`, 
          label: teacher.institution 
        };
        setInstitutions(prev => [customInstitution, ...prev]);
        setFormData(prev => ({ ...prev, institutionId: customInstitution.value }));
      }
    }
  }, [teacherLoaded, teacher, institutions]);

  // ✅ NUEVO: Mapear cursos DESPUÉS de que los cursos se carguen
  useEffect(() => {
    if (teacher && courses.length > 0 && formData.institutionId && teacher.courses) {
      console.log('📚 Mapeando cursos del docente:', teacher.courses);
      
      const mappedCourseIds: string[] = [];
      const notFoundCourses: string[] = [];
      
      teacher.courses.forEach(courseName => {
        const courseOption = courses.find(course => 
          course.label.toLowerCase().trim() === courseName.toLowerCase().trim()
        );
        
        if (courseOption) {
          mappedCourseIds.push(courseOption.value);
          console.log('✅ Curso mapeado:', courseName, '→', courseOption.value);
        } else {
          notFoundCourses.push(courseName);
          console.warn('⚠️ Curso no encontrado:', courseName);
        }
      });
      
      // Agregar cursos no encontrados como opciones custom
      if (notFoundCourses.length > 0) {
        const customCourses = notFoundCourses.map(courseName => ({
          value: `custom_${Date.now()}_${Math.random()}`,
          label: courseName
        }));
        
        setCourses(prev => [...customCourses, ...prev]);
        mappedCourseIds.push(...customCourses.map(c => c.value));
      }
      
      // Asegurar al menos un elemento en el array
      const finalCourseIds = mappedCourseIds.length > 0 ? mappedCourseIds : [''];
      
      setFormData(prev => ({
        ...prev,
        courseIds: finalCourseIds
      }));
      
      console.log('🎯 Cursos finales mapeados:', finalCourseIds);
    }
  }, [teacher, courses, formData.institutionId]);

  // ✅ NUEVO: Reset teacherLoaded cuando cambia el ID
  useEffect(() => {
    setTeacherLoaded(false);
  }, [id]);

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

  // ✅ CORREGIDO: Cargar docente sin mapear IDs inmediatamente
  const loadTeacher = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📖 Cargando docente...', { id });
      
      const response = await apiService.getTeacherById(id!);
      
      if (response.status === 'success') {
        const teacherData = response.data.teacher;
        setTeacher(teacherData);
        
        // ✅ CORREGIDO: Solo setear datos básicos, NO mapear IDs todavía
        setFormData({
          run: teacherData.run,
          firstName: teacherData.firstName,
          lastName: teacherData.lastName,
          email: teacherData.email,
          phone: teacherData.phone || '',
          birthDate: teacherData.birthDate,
          institutionId: '', // ← Vacío por ahora
          courseIds: [''],   // ← Solo un elemento vacío por ahora
          gender: teacherData.gender,
          status: teacherData.status,
          balance: teacherData.balance,
          overdraftLimit: teacherData.overdraftLimit,
          isActive: teacherData.isActive
        });

        // Marcar que el docente se cargó
        setTeacherLoaded(true);

        console.log('✅ Datos del docente cargados:', {
          run: teacherData.run,
          institution: teacherData.institution,
          courses: teacherData.courses
        });
      }
    } catch (error: any) {
      console.error('Error cargando docente:', error);
      setError(error.message || 'Error al cargar docente');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (error) setError(null);
  };

  // ✅ CORREGIDO: Manejar cambio de institución
  const handleInstitutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    console.log('🏫 Institución seleccionada ID:', selectedId);
    
    setFormData(prev => ({ 
      ...prev, 
      institutionId: selectedId,
      courseIds: ['']  // Limpiar cursos cuando cambia institución
    }));
    setErrors(prev => ({ ...prev, institutionId: '', courseIds: '' }));
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

  const updateCourseId = (index: number, newCourseId: string) => {
    setFormData(prev => ({
      ...prev,
      courseIds: prev.courseIds.map((id, i) => i === index ? newCourseId : id)
    }));
    setErrors(prev => ({ ...prev, courseIds: '' }));
  };

  // ✅ FUNCIÓN: Obtener cursos disponibles (sin duplicados)
  const getAvailableCourses = (currentIndex: number): CourseOption[] => {
    const selectedCourseIds = formData.courseIds
      .filter((courseId, index) => index !== currentIndex && courseId.trim() !== '');
    
    return courses.filter(course => !selectedCourseIds.includes(course.value));
  };

  // ✅ FUNCIÓN: Verificar si se pueden agregar más cursos
  const canAddMoreCourses = (): boolean => {
    if (formData.courseIds.length >= 10) return false;
    const selectedCourseIds = formData.courseIds.filter(courseId => courseId.trim() !== '');
    return selectedCourseIds.length < courses.length;
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

    // ✅ VALIDAR cursos con verificación de duplicados
    const validCourseIds = formData.courseIds.filter(courseId => courseId.trim() !== '');
    if (validCourseIds.length === 0) {
      newErrors.courseIds = 'Debe seleccionar al menos un curso';
    } else {
      // Verificar duplicados
      const uniqueCourseIds = new Set(validCourseIds);
      if (uniqueCourseIds.size !== validCourseIds.length) {
        newErrors.courseIds = 'No puede seleccionar cursos duplicados';
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
      // ✅ CORREGIDO: Convertir IDs a nombres para el backend
      const selectedInstitution = institutions.find(inst => inst.value === formData.institutionId);
      const selectedCourses = formData.courseIds
        .filter(id => id.trim())
        .map(id => {
          const course = courses.find(c => c.value === id);
          return course ? course.label : id;
        });
      
      const updateData = {
        ...formData,
        institution: selectedInstitution?.label || formData.institutionId,
        courses: selectedCourses
      };
      
      console.log('📤 Enviando datos al backend:', updateData);
      
      const response = await apiService.updateTeacher(id!, updateData);
      if (response.status === 'success') {
        setSuccess('Docente actualizado exitosamente');
        setTimeout(() => navigate('/teachers'), 2000);
      }
    } catch (error: any) {
      console.error('Error actualizando docente:', error);
      setErrors({ general: error.message || 'Error al actualizar docente' });
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
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="bg-white rounded-lg shadow border border-gray-100 p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
            <span className="text-gray-600">Cargando datos del docente...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Docente no encontrado</h3>
              <p className="text-sm text-red-600 mt-1">
                {errors.general || 'No se pudo cargar la información del docente'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/teachers')}
              className="p-1.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="p-1.5 bg-white/20 rounded">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Editar Docente</h1>
              <p className="text-blue-200 text-xs">{teacher.firstName} {teacher.lastName} - {teacher.run}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Balance Actual</p>
            <p className="text-base font-bold">{formatCurrency(teacher.balance)}</p>
          </div>
        </div>
      </div>

      {/* ✅ MENSAJE: Estado de carga de instituciones */}
      {isLoadingInstitutions && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-800 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p>Cargando instituciones educacionales...</p>
        </div>
      )}

      {/* Mensaje de éxito */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <p>{success}</p>
        </div>
      )}

      {/* Mensaje de error general */}
      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs shadow-sm">
          <XCircle className="w-4 h-4" />
          <p>{errors.general}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-100 mb-4">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              Información Personal
            </div>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Contraseña
            </div>
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'financial'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-4 h-4" />
              Información Financiera
            </div>
          </button>
        </div>
      </div>

      {/* Contenido de tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
        {/* Tab: Información Personal */}
        {activeTab === 'info' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <School className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Información Personal</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RUN */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  RUN *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="run"
                    type="text"
                    value={formData.run}
                    onChange={(e) => {
                      const formatted = formatRUTOnInput(e.target.value);
                      setFormData(prev => ({ ...prev, run: formatted }));
                      setErrors(prev => ({ ...prev, run: '' }));
                    }}
                    placeholder="12345678-9"
                    disabled={isSaving}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.run 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                {errors.run && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.run}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="docente@email.com"
                    disabled={isSaving}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.email 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="María"
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
                  Apellido *
                </label>
                <input
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="González"
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

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+56 9 1234 5678"
                    disabled={isSaving}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.phone 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
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
                  Fecha de Nacimiento *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleChange}
                    disabled={isSaving}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.birthDate 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                {errors.birthDate && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.birthDate}
                  </p>
                )}
              </div>

              {/* ✅ Establecimiento Educacional como dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Establecimiento Educacional *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    name="institutionId"
                    value={formData.institutionId}
                    onChange={handleInstitutionChange}
                    disabled={isSaving || isLoadingInstitutions}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.institutionId 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving || isLoadingInstitutions ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {isLoadingInstitutions ? 'Cargando instituciones...' : 'Seleccionar establecimiento'}
                    </option>
                    {institutions.map(institution => (
                      <option key={institution.value} value={institution.value}>
                        {institution.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.institutionId && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.institutionId}
                  </p>
                )}
              </div>

              {/* Género */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Género *
                </label>
                <div className="relative">
                  <Heart className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={isSaving}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.gender 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Seleccionar género</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
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
                  className={`w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="retired">Jubilado</option>
                </select>
              </div>

              {/* Usuario Activo */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Usuario Activo
                </label>
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
                    El usuario puede iniciar sesión
                  </label>
                </div>
              </div>
            </div>

            {/* ✅ Cursos como dropdowns dependientes CON VALIDACIÓN DE DUPLICADOS */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Cursos que Imparte *
              </label>
              <div className="space-y-2">
                {formData.courseIds.map((courseId, index) => {
                  const availableCourses = getAvailableCourses(index);
                  return (
                    <div key={index} className="flex gap-2">
                      <div className="relative flex-1">
                        <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                          value={courseId}
                          onChange={(e) => updateCourseId(index, e.target.value)}
                          disabled={isSaving || isLoadingCourses || !formData.institutionId}
                          className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                            errors.courseIds && !courseId 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-gray-200 focus:border-blue-300'
                          } ${isSaving || isLoadingCourses || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="">
                            {!formData.institutionId 
                              ? 'Primero seleccione un establecimiento'
                              : isLoadingCourses 
                              ? 'Cargando cursos...'
                              : availableCourses.length === 0
                              ? 'No hay cursos disponibles'
                              : 'Seleccionar curso'
                            }
                          </option>
                          {availableCourses.map(course => (
                            <option key={course.value} value={course.value}>
                              {course.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formData.courseIds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCourse(index)}
                          disabled={isSaving}
                          className={`p-2 text-red-600 hover:text-red-800 transition-colors ${
                            isSaving ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {errors.courseIds && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.courseIds}
                </p>
              )}
              {/* ✅ Indicador de carga de cursos */}
              {isLoadingCourses && (
                <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Cargando cursos...
                </p>
              )}
              {/* ✅ Botón agregar curso CON VALIDACIÓN */}
              {canAddMoreCourses() && (
                <button
                  type="button"
                  onClick={addCourse}
                  disabled={isSaving || !formData.institutionId}
                  className={`mt-2 flex items-center gap-1.5 text-xs text-[#193cb8] hover:text-[#0e2167] transition-colors ${
                    isSaving || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Agregar curso ({formData.courseIds.filter(c => c.trim()).length}/{courses.length} disponibles)
                </button>
              )}
              {/* ✅ Mensaje cuando no se pueden agregar más cursos */}
              {!canAddMoreCourses() && formData.courseIds.length < 10 && courses.length > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  ✅ Todos los cursos disponibles han sido seleccionados
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                disabled={isSaving || isLoadingInstitutions}
                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md ${
                  isSaving || isLoadingInstitutions
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
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab: Contraseña */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <Key className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Cambiar Contraseña</h2>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Importante:</strong> Al cambiar la contraseña, el docente deberá usar la nueva contraseña para iniciar sesión.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nueva Contraseña */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                      setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isChangingPassword}
                    className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.password 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isChangingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isChangingPassword}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirmar Contraseña *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => {
                      setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                      setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    placeholder="Repite la nueva contraseña"
                    disabled={isChangingPassword}
                    className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.password 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isChangingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isChangingPassword}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                disabled={isChangingPassword}
                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md ${
                  isChangingPassword
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90'
                }`}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    Cambiar Contraseña
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab: Información Financiera */}
        {activeTab === 'financial' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <CreditCard className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Información Financiera</h2>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800">
                💡 <strong>Información:</strong> Aquí puedes modificar el balance actual y el límite de sobregiro del docente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Balance Actual */}
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
            </div>

            {/* Resumen Financiero */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Resumen Financiero</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Balance Actual</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(formData.balance)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Límite de Sobregiro</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(formData.overdraftLimit)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dinero Disponible Total</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(formData.balance + formData.overdraftLimit)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
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
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Actualizar Finanzas
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