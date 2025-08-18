import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, BookOpen, XCircle, School, Building, Heart, Loader2, CheckCircle, Lock, DollarSign, CreditCard, Save, ArrowLeft, Key, Eye, EyeOff } from 'lucide-react';
import { validateRUT, formatRUTOnInput } from '../../utils/rutValidator';
import { apiService } from '../../services/api';

// ✅ CORREGIDO: Usar nombres de campos consistentes con backend
interface FormData {
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  institutionId: string;        // ✅ CAMBIADO: usar ID para API
  courseId: string;             // ✅ CAMBIADO: usar ID para API
  gender: string;
  status: 'active' | 'inactive' | 'graduated';
  balance: number;
  overdraftLimit: number;
  isActive: boolean;
}

// Interfaces para las opciones de select
interface InstitutionOption {
  value: string;
  label: string;
}

interface CourseOption {
  value: string;
  label: string;
}

interface StudentData {
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
  institution: string;  // Backend devuelve nombre de institución
  course: string;       // Backend devuelve nombre de curso
  gender: string;
  status: 'active' | 'inactive' | 'graduated';
  isActive: boolean;
  createdAt: string;
}

const EditStudent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [student, setStudent] = useState<StudentData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    run: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    institutionId: '',      // ✅ CORREGIDO: Usar ID
    courseId: '',           // ✅ CORREGIDO: Usar ID
    gender: '',
    status: 'active',
    balance: 0,
    overdraftLimit: 0,
    isActive: true
  });
  
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  // ✅ NUEVO: Estado para tracking de carga del estudiante
  const [studentLoaded, setStudentLoaded] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  // ✅ NUEVO: Estados para visibilidad de contraseñas (como en EditTeacher)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'financial'>('info');

  // Cargar instituciones al montar el componente
  useEffect(() => {
    loadInstitutions();
  }, []);

  // ✅ CORREGIDO: Cargar cursos cuando cambia la institución
  useEffect(() => {
    if (formData.institutionId) {
      loadCourses(formData.institutionId);
    } else {
      setCourses([]);
    }
  }, [formData.institutionId]);

  // ✅ CORREGIDO: Usar API real
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

  // ✅ CORREGIDO: Usar API real
  const loadCourses = async (institutionId: string) => {
    try {
      setIsLoadingCourses(true);
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
        courseId: 'Error al cargar cursos disponibles' 
      }));
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // ✅ CORREGIDO: Modificar loadStudent para NO mapear IDs inmediatamente
  const loadStudent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Cargando estudiante...', { id });
      
      const response = await apiService.getStudentById(id!);
      
      if (response.status === 'success') {
        const studentData = response.data.student;
        setStudent(studentData);
        
        // ✅ CORREGIDO: Solo setear datos básicos, NO mapear IDs todavía
        setFormData({
          run: studentData.run,
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          email: studentData.email,
          phone: studentData.phone || '',
          birthDate: studentData.birthDate,
          institutionId: '', // ← Vacío por ahora
          courseId: '',      // ← Vacío por ahora
          gender: studentData.gender,
          status: studentData.status,
          balance: studentData.balance,
          overdraftLimit: studentData.overdraftLimit,
          isActive: studentData.isActive
        });

        // Marcar que el estudiante se cargó
        setStudentLoaded(true);

        console.log('✅ Datos del estudiante cargados:', {
          run: studentData.run,
          institution: studentData.institution,
          course: studentData.course
        });
      }
    } catch (error: any) {
      console.error('Error cargando estudiante:', error);
      setError(error.message || 'Error al cargar estudiante');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ CORREGIDO: Cargar estudiante después de tener instituciones
  useEffect(() => {
    if (id && !isLoadingInstitutions && institutions.length > 0) {
      loadStudent();
    }
  }, [id, isLoadingInstitutions, institutions]);

  // ✅ NUEVO: Mapear institución DESPUÉS de tener datos completos
  useEffect(() => {
    if (studentLoaded && student && institutions.length > 0) {
      // Encontrar y setear la institución
      const institutionOption = institutions.find(inst => inst.label === student.institution);
      
      if (institutionOption) {
        console.log('🏫 Mapeando institución:', student.institution, '→', institutionOption.value);
        
        setFormData(prev => ({
          ...prev,
          institutionId: institutionOption.value
        }));
        
        // Los cursos se cargarán automáticamente por el useEffect existente
        // y se mapearán en el siguiente useEffect
      } else {
        console.warn('⚠️ No se encontró la institución:', student.institution, 'en la lista:', institutions.map(i => i.label));
      }
    }
  }, [studentLoaded, student, institutions]);

  // ✅ NUEVO: Mapear curso DESPUÉS de que los cursos se carguen
  useEffect(() => {
    if (student && courses.length > 0 && formData.institutionId) {
      const courseOption = courses.find(course => course.label === student.course);
      
      if (courseOption) {
        console.log('📚 Mapeando curso:', student.course, '→', courseOption.value);
        
        setFormData(prev => ({
          ...prev,
          courseId: courseOption.value
        }));
      } else {
        console.warn('⚠️ No se encontró el curso:', student.course, 'en la lista:', courses.map(c => c.label));
      }
    }
  }, [student, courses, formData.institutionId]);

  // ✅ NUEVO: Reset studentLoaded cuando cambia el ID
  useEffect(() => {
    setStudentLoaded(false);
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (error) setError(null);
  };

  // ✅ CORREGIDO: Manejar cambio de institución con IDs
  const handleInstitutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    console.log('🏫 Institución seleccionada ID:', selectedId);
    
    setFormData(prev => ({ 
      ...prev, 
      institutionId: selectedId,
      courseId: ''  // Limpiar curso cuando cambia institución
    }));
    setErrors(prev => ({ ...prev, institutionId: '', courseId: '' }));
  };

  // ✅ CORREGIDO: Manejar cambio de curso con IDs
  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    console.log('📚 Curso seleccionado ID:', selectedId);
    
    setFormData(prev => ({ ...prev, courseId: selectedId }));
    setErrors(prev => ({ ...prev, courseId: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!validateRUT(formData.run)) newErrors.run = 'RUN inválido';
    if (!formData.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'Apellido requerido';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
    if (formData.phone && !/^(\+56)?9\d{8}$/.test(formData.phone.replace(/\s/g, ''))) newErrors.phone = 'Teléfono inválido';
    if (!formData.birthDate) newErrors.birthDate = 'Fecha de nacimiento requerida';
    if (!formData.institutionId) newErrors.institutionId = 'Institución requerida';
    if (!formData.courseId) newErrors.courseId = 'Curso requerido';
    if (!formData.gender) newErrors.gender = 'Género requerido';

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

    try {
      // ✅ CORREGIDO: Convertir IDs a nombres para el backend
      const selectedInstitution = institutions.find(inst => inst.value === formData.institutionId);
      const selectedCourse = courses.find(course => course.value === formData.courseId);
      
      const updateData = {
        ...formData,
        institution: selectedInstitution?.label || formData.institutionId,
        course: selectedCourse?.label || formData.courseId
      };
      
      console.log('📤 Enviando datos al backend:', updateData);
      
      const response = await apiService.updateStudent(id!, updateData);
      if (response.status === 'success') {
        setSuccess('Estudiante actualizado exitosamente');
        setTimeout(() => navigate('/students'), 2000);
      }
    } catch (error: any) {
      console.error('Error actualizando estudiante:', error);
      setErrors({ general: error.message || 'Error al actualizar estudiante' });
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
      const response = await apiService.changeStudentPassword(id!, passwordData.newPassword);
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
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="bg-white rounded-lg shadow border border-gray-100 p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
            <span className="text-gray-600">Cargando datos del estudiante...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Estudiante no encontrado</h3>
              <p className="text-sm text-red-600 mt-1">
                {errors.general || 'No se pudo cargar la información del estudiante'}
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
              onClick={() => navigate('/students')}
              className="p-1.5 bg-white/20 rounded hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <div className="p-1.5 bg-white/20 rounded">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Editar Estudiante</h1>
              <p className="text-blue-200 text-xs">{student.firstName} {student.lastName} - {student.run}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Balance Actual</p>
            <p className="text-base font-bold">{formatCurrency(student.balance)}</p>
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
                    placeholder="estudiante@email.com"
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
                  placeholder="Juan"
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
                  placeholder="Pérez"
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

              {/* ✅ CAMBIO: Establecimiento Educacional como dropdown */}
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

              {/* ✅ CAMBIO: Curso como dropdown dependiente */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Curso *
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleCourseChange}
                    disabled={isSaving || isLoadingCourses || !formData.institutionId}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.courseId 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving || isLoadingCourses || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                {/* ✅ Indicador de carga de cursos */}
                {isLoadingCourses && (
                  <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cargando cursos...
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
                  <option value="graduated">Graduado</option>
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

        {/* Tab: Contraseña - ✅ DISEÑO IGUAL A EDITTEACHER */}
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
                ⚠️ <strong>Importante:</strong> Al cambiar la contraseña, el estudiante deberá usar la nueva contraseña para iniciar sesión.
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
                💡 <strong>Información:</strong> Aquí puedes modificar el balance actual y el límite de sobregiro del estudiante.
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

export default EditStudent;