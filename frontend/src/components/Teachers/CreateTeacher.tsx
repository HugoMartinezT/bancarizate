import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Building, BookOpen, XCircle, School, Sparkles, Heart, Loader2, CheckCircle, Plus, X } from 'lucide-react';
import { validateRUT, formatRUTOnInput } from '../../utils/rutValidator';
import { apiService } from '../../services/api';

interface FormData {
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  institutionId: string; // ✅ ID en lugar de nombre
  courseIds: string[];   // ✅ Array de IDs de cursos
  gender: string;
  status: 'active' | 'inactive' | 'retired';
}

// ✅ INTERFACES para las opciones de select (idénticas a Student)
interface InstitutionOption {
  value: string;
  label: string;
}

interface CourseOption {
  value: string;
  label: string;
}

interface CreateTeacherResponse {
  status: string;
  message: string;
  data: {
    teacher: {
      id: string;
      userId: string;
      run: string;
      firstName: string;
      lastName: string;
      email: string;
      tempPassword: string;
    };
  };
}

const CreateTeacher = () => {
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
    status: 'active'
  });
  
  // ✅ ESTADOS para dropdowns dinámicos (idénticos a Student)
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdTeacher, setCreatedTeacher] = useState<CreateTeacherResponse['data']['teacher'] | null>(null);

  // ✅ CARGAR INSTITUCIONES al montar (idéntico a Student)
  useEffect(() => {
    loadInstitutions();
  }, []);

  // ✅ CARGAR CURSOS cuando cambia la institución (idéntico a Student)
  useEffect(() => {
    if (formData.institutionId) {
      loadCourses(formData.institutionId);
    } else {
      setCourses([]);
      setFormData(prev => ({ ...prev, courseIds: [''] }));
    }
  }, [formData.institutionId]);

  // ✅ FUNCIÓN: Cargar instituciones activas (idéntica a Student)
  const loadInstitutions = async () => {
    try {
      setIsLoadingInstitutions(true);
      console.log('🏫 Cargando instituciones...');
      
      const response = await apiService.getActiveInstitutions();
      
      if (response.status === 'success') {
        const institutionOptions = apiService.formatInstitutionsForSelect(response.data);
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

  // ✅ FUNCIÓN: Cargar cursos por institución (idéntica a Student)
  const loadCourses = async (institutionId: string) => {
    try {
      setIsLoadingCourses(true);
      setCourses([]);
      console.log('📚 Cargando cursos para institución:', institutionId);
      
      const response = await apiService.getCoursesByInstitutionId(institutionId);
      
      if (response.status === 'success') {
        const courseOptions = apiService.formatCoursesForSelect(response.data);
        setCourses(courseOptions);
        console.log('✅ Cursos cargados:', courseOptions.length);
      }
    } catch (error: any) {
      console.error('❌ Error cargando cursos:', error);
      setErrors(prev => ({ 
        ...prev, 
        courseIds: 'Error al cargar cursos para esta institución' 
      }));
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'run') {
      const formatted = formatRUTOnInput(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ✅ NUEVA FUNCIÓN: Manejo de cursos con validación de duplicados
  const handleCourseChange = (index: number, value: string) => {
    const newCourseIds = [...formData.courseIds];
    newCourseIds[index] = value;
    setFormData(prev => ({ ...prev, courseIds: newCourseIds }));
    if (errors.courseIds) {
      setErrors(prev => ({ ...prev, courseIds: '' }));
    }
  };

  // ✅ NUEVA FUNCIÓN: Obtener cursos disponibles (sin duplicados)
  const getAvailableCourses = (currentIndex: number): CourseOption[] => {
    const selectedCourseIds = formData.courseIds
      .filter((courseId, index) => index !== currentIndex && courseId.trim() !== '');
    
    return courses.filter(course => !selectedCourseIds.includes(course.value));
  };

  // ✅ NUEVA FUNCIÓN: Agregar curso (solo si hay cursos disponibles)
  const addCourse = () => {
    if (formData.courseIds.length < 10) {
      const availableCourses = getAvailableCourses(-1); // -1 para obtener todos los disponibles
      if (availableCourses.length > 0) {
        setFormData(prev => ({ ...prev, courseIds: [...prev.courseIds, ''] }));
      }
    }
  };

  // ✅ FUNCIÓN: Remover curso
  const removeCourse = (index: number) => {
    if (formData.courseIds.length > 1) {
      const newCourseIds = formData.courseIds.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, courseIds: newCourseIds }));
    }
  };

  // ✅ FUNCIÓN: Verificar si se pueden agregar más cursos
  const canAddMoreCourses = (): boolean => {
    if (formData.courseIds.length >= 10) return false;
    const selectedCourseIds = formData.courseIds.filter(courseId => courseId.trim() !== '');
    return selectedCourseIds.length < courses.length;
  };

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    // Validar RUN
    if (!formData.run.trim()) {
      newErrors.run = 'El RUN es requerido';
    } else if (!validateRUT(formData.run)) {
      newErrors.run = 'El RUN no es válido';
    }

    // Validar nombres
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'El nombre debe tener al menos 2 caracteres';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'El apellido debe tener al menos 2 caracteres';
    }
    
    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    // Validar teléfono
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else {
      const cleanPhone = formData.phone.replace(/\s/g, '');
      if (!/^(\+56)?9\d{8}$/.test(cleanPhone)) {
        newErrors.phone = 'El teléfono debe ser válido (+56 9 XXXX XXXX)';
      }
    }

    // Validar fecha de nacimiento
    if (!formData.birthDate) {
      newErrors.birthDate = 'La fecha de nacimiento es requerida';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 22 || age > 70) {
        newErrors.birthDate = 'La edad debe estar entre 22 y 70 años';
      }
    }

    // ✅ VALIDAR institución y cursos
    if (!formData.institutionId) newErrors.institutionId = 'Debe seleccionar un establecimiento educacional';
    if (!formData.gender.trim()) newErrors.gender = 'El género es requerido';
    
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
    
    setErrors({});
    setSuccess(false);
    setCreatedTeacher(null);
    
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      console.log('📤 Enviando datos del docente:', formData);
      
      // ✅ OBTENER NOMBRES para el backend
      const institutionName = await apiService.getInstitutionNameById(formData.institutionId);
      const courseNames = await Promise.all(
        formData.courseIds
          .filter(courseId => courseId.trim() !== '')
          .map(courseId => apiService.getCourseNameById(courseId, formData.institutionId))
      );
      
      // Preparar datos para enviar al backend
      const teacherData = {
        run: formData.run,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        birthDate: formData.birthDate,
        institution: institutionName,
        courses: courseNames,
        gender: formData.gender,
        status: formData.status
      };

      const response: CreateTeacherResponse = await apiService.createTeacher(teacherData);
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response.status === 'success') {
        setSuccess(true);
        setCreatedTeacher(response.data.teacher);
        
        // Limpiar formulario después de 5 segundos
        setTimeout(() => {
          setFormData({
            run: '',
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            birthDate: '',
            institutionId: '',
            courseIds: [''],
            gender: '',
            status: 'active'
          });
          setSuccess(false);
          setCreatedTeacher(null);
        }, 5000);
      }

    } catch (error: any) {
      console.error('❌ Error creando docente:', error);
      
      if (error.message) {
        if (error.message.includes('RUN')) {
          setErrors({ run: 'Ya existe un usuario con este RUN' });
        } else if (error.message.includes('email')) {
          setErrors({ email: 'Ya existe un usuario con este email' });
        } else if (error.message.includes('autenticación') || error.message.includes('401')) {
          setErrors({ general: 'No tiene permisos para crear docentes. Inicie sesión como administrador.' });
        } else if (error.message.includes('validación') || error.message.includes('400')) {
          setErrors({ general: 'Los datos ingresados no son válidos. Revise todos los campos.' });
        } else {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: 'Error al crear el docente. Intente nuevamente.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Crear Docente</h1>
              <p className="text-blue-200 text-xs">Registra un nuevo docente en el sistema</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Estado</p>
            <p className="text-base font-bold">
              {isLoading ? 'Procesando...' : success ? 'Completado' : 'Nuevo Registro'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
            <School className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-sm font-bold text-gray-800">Información del Docente</h2>
        </div>

        {/* ✅ MENSAJE: Estado de carga de instituciones */}
        {isLoadingInstitutions && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-800 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p>Cargando instituciones educacionales...</p>
          </div>
        )}

        {/* Mensaje de error general */}
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs shadow-sm">
            <XCircle className="w-3.5 h-3.5" />
            <p>{errors.general}</p>
          </div>
        )}

        {/* Mensaje de éxito */}
        {success && createdTeacher && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" />
              <p className="font-bold">¡Docente creado exitosamente!</p>
            </div>
            <div className="ml-6 space-y-1">
              <p><span className="font-semibold">Nombre:</span> {createdTeacher.firstName} {createdTeacher.lastName}</p>
              <p><span className="font-semibold">RUN:</span> {createdTeacher.run}</p>
              <p><span className="font-semibold">Email:</span> {createdTeacher.email}</p>
              <p><span className="font-semibold">Contraseña temporal:</span> <code className="bg-green-100 px-2 py-1 rounded">{createdTeacher.tempPassword}</code></p>
              <p className="text-green-600 mt-2">💡 <em>Guarde la contraseña temporal para proporcionársela al docente</em></p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                  onChange={handleChange}
                  placeholder="12345678-9"
                  disabled={isLoading}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.run 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  disabled={isLoading}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.email 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                disabled={isLoading}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.firstName 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-blue-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                disabled={isLoading}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.lastName 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-blue-300'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  disabled={isLoading}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.phone 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  disabled={isLoading}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.birthDate 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  onChange={handleChange}
                  disabled={isLoading || isLoadingInstitutions}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.institutionId 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isLoading || isLoadingInstitutions ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  disabled={isLoading}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.gender 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                disabled={isLoading}
                className={`w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 transition-colors ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="retired">Jubilado</option>
              </select>
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
                        onChange={(e) => handleCourseChange(index, e.target.value)}
                        disabled={isLoading || isLoadingCourses || !formData.institutionId}
                        className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                          errors.courseIds && !courseId 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
                        } ${isLoading || isLoadingCourses || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        disabled={isLoading}
                        className={`p-2 text-red-600 hover:text-red-800 transition-colors ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
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
                disabled={isLoading || !formData.institutionId}
                className={`mt-2 flex items-center gap-1.5 text-xs text-[#193cb8] hover:text-[#0e2167] transition-colors ${
                  isLoading || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''
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
              disabled={isLoading || success || isLoadingInstitutions}
              className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md ${
                isLoading || success || isLoadingInstitutions
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creando...
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Docente Creado
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Crear Docente
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors ${
                isLoading 
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
  );
};

export default CreateTeacher;