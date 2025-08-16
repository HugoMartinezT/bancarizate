import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, BookOpen, XCircle, School, Sparkles, Building, Heart, Loader2, CheckCircle } from 'lucide-react';
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
  courseId: string;
  gender: string;
  status: 'active' | 'inactive' | 'graduated';
}

// ✅ CORREGIDO: Interfaces para las opciones de select desde API
interface InstitutionOption {
  value: string;
  label: string;
}

interface CourseOption {
  value: string;
  label: string;
}

interface CreateStudentResponse {
  status: string;
  message: string;
  data: {
    student: {
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

const CreateStudent = () => {
  const [formData, setFormData] = useState<FormData>({
    run: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    institutionId: '',
    courseId: '',
    gender: '',
    status: 'active'
  });
  
  // ✅ CORREGIDO: Estados para dropdowns dinámicos desde API
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<CreateStudentResponse['data']['student'] | null>(null);

  // ✅ CORREGIDO: Cargar instituciones al montar el componente
  useEffect(() => {
    loadInstitutions();
  }, []);

  // ✅ CORREGIDO: Cargar cursos cuando cambia la institución
  useEffect(() => {
    if (formData.institutionId) {
      loadCourses(formData.institutionId);
    } else {
      setCourses([]);
      setFormData(prev => ({ ...prev, courseId: '' }));
    }
  }, [formData.institutionId]);

  // ✅ CORREGIDO: Función que usa API real
  const loadInstitutions = async () => {
    try {
      setIsLoadingInstitutions(true);
      console.log('🏫 Cargando instituciones desde API...');
      
      const response = await apiService.getActiveInstitutions();
      
      if (response.status === 'success') {
        const institutionOptions = apiService.formatInstitutionsForSelect(response);
        setInstitutions(institutionOptions);
        console.log('✅ Instituciones cargadas desde API:', institutionOptions.length);
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

  // ✅ CORREGIDO: Función que usa API real
  const loadCourses = async (institutionId: string) => {
    try {
      setIsLoadingCourses(true);
      setCourses([]); // Limpiar cursos anteriores
      console.log('📚 Cargando cursos desde API para institución:', institutionId);
      
      const response = await apiService.getCoursesByInstitutionId(institutionId);
      
      if (response.status === 'success') {
        const courseOptions = apiService.formatCoursesForSelect(response);
        setCourses(courseOptions);
        console.log('✅ Cursos cargados desde API:', courseOptions.length);
      }
    } catch (error: any) {
      console.error('❌ Error cargando cursos:', error);
      setErrors(prev => ({ 
        ...prev, 
        courseId: 'Error al cargar cursos para esta institución' 
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
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
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
      
      if (age < 15 || age > 70) {
        newErrors.birthDate = 'La edad debe estar entre 15 y 70 años';
      }
    }

    // ✅ CORREGIDO: Validar institución y curso por ID
    if (!formData.institutionId) newErrors.institutionId = 'Debe seleccionar un establecimiento educacional';
    if (!formData.courseId) newErrors.courseId = 'Debe seleccionar un curso';
    if (!formData.gender.trim()) newErrors.gender = 'El género es requerido';

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpiar estados anteriores
    setErrors({});
    setSuccess(false);
    setCreatedStudent(null);
    
    // Validar formulario
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      console.log('📤 Enviando datos del estudiante:', formData);
      
      // ✅ CORREGIDO: Obtener nombres de las opciones seleccionadas desde API
      const selectedInstitution = institutions.find(inst => inst.value === formData.institutionId);
      const selectedCourse = courses.find(course => course.value === formData.courseId);
      
      const institutionName = selectedInstitution?.label || formData.institutionId;
      const courseName = selectedCourse?.label || formData.courseId;
      
      // Preparar datos para enviar al backend
      const studentData = {
        run: formData.run.replace(/[\.-]/g, ''), // Enviar RUN limpio
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        birthDate: formData.birthDate,
        institution: institutionName,
        course: courseName,
        gender: formData.gender,
        status: formData.status,
        initialBalance: 0,
        overdraftLimit: 0
      };

      const response: CreateStudentResponse = await apiService.createStudent(studentData);
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response.status === 'success') {
        setSuccess(true);
        setCreatedStudent(response.data.student);
        
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
            courseId: '',
            gender: '',
            status: 'active'
          });
          setSuccess(false);
          setCreatedStudent(null);
        }, 5000);
      }

    } catch (error: any) {
      console.error('❌ Error creando estudiante:', error);
      
      // Manejar diferentes tipos de errores
      if (error.message) {
        if (error.message.includes('RUN')) {
          setErrors({ run: 'Ya existe un usuario con este RUN' });
        } else if (error.message.includes('email')) {
          setErrors({ email: 'Ya existe un usuario con este email' });
        } else if (error.message.includes('autenticación') || error.message.includes('401')) {
          setErrors({ general: 'No tiene permisos para crear estudiantes. Inicie sesión como administrador.' });
        } else if (error.message.includes('validación') || error.message.includes('400')) {
          setErrors({ general: 'Los datos ingresados no son válidos. Revise todos los campos.' });
        } else {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: 'Error al crear el estudiante. Intente nuevamente.' });
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
              <h1 className="text-base font-bold">Crear Estudiante</h1>
              <p className="text-blue-200 text-xs">Registra un nuevo estudiante en el sistema</p>
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
          <h2 className="text-sm font-bold text-gray-800">Información del Estudiante</h2>
        </div>

        {/* MENSAJE: Estado de carga de instituciones */}
        {isLoadingInstitutions && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-800 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p>Cargando instituciones educacionales desde la base de datos...</p>
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
        {success && createdStudent && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4" />
              <p className="font-bold">¡Estudiante creado exitosamente!</p>
            </div>
            <div className="ml-6 space-y-1">
              <p><span className="font-semibold">Nombre:</span> {createdStudent.firstName} {createdStudent.lastName}</p>
              <p><span className="font-semibold">RUN:</span> {createdStudent.run}</p>
              <p><span className="font-semibold">Email:</span> {createdStudent.email}</p>
              <p><span className="font-semibold">Contraseña temporal:</span> <code className="bg-green-100 px-2 py-1 rounded">{createdStudent.tempPassword}</code></p>
              <p className="text-green-600 mt-2">💡 <em>Guarde la contraseña temporal para proporcionársela al estudiante</em></p>
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
                  placeholder="estudiante@email.com"
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
                placeholder="Juan"
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
                placeholder="Pérez"
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

            {/* ✅ CORREGIDO: Establecimiento Educacional usando API real */}
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

            {/* ✅ CORREGIDO: Curso usando API real y dependiente de institución */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Curso *
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleChange}
                  disabled={isLoading || isLoadingCourses || !formData.institutionId}
                  className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                    errors.courseId 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  } ${isLoading || isLoadingCourses || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">
                    {!formData.institutionId 
                      ? 'Primero seleccione un establecimiento'
                      : isLoadingCourses 
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
              </div>
              {errors.courseId && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.courseId}
                </p>
              )}
              {/* Indicador de carga de cursos */}
              {isLoadingCourses && (
                <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Cargando cursos desde la base de datos...
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
                <option value="graduated">Graduado</option>
              </select>
            </div>
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
                  Estudiante Creado
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Crear Estudiante
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

export default CreateStudent;