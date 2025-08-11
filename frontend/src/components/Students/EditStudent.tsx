import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, BookOpen, XCircle, School, Building, Heart, Loader2, CheckCircle, Lock, DollarSign, CreditCard, Save, ArrowLeft, Key } from 'lucide-react';
import { validateRUT, formatRUTOnInput } from '../../utils/rutValidator';
import { apiService } from '../../services/api';

interface FormData {
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  institutionId: string; // ✅ NUEVO: Ahora maneja IDs
  courseId: string;      // ✅ NUEVO: Ahora maneja IDs
  institutionName: string; // ✅ TEMPORAL: Para compatibilidad con datos existentes
  courseName: string;     // ✅ TEMPORAL: Para compatibilidad con datos existentes
  gender: string;
  status: 'active' | 'inactive' | 'graduated';
  balance: number;
  overdraftLimit: number;
  isActive: boolean;
}

// ✅ NUEVAS INTERFACES para las opciones de select
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
  institution: string;  // ✅ ACTUAL: Viene como nombre desde backend
  course: string;       // ✅ ACTUAL: Viene como nombre desde backend
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
    institutionId: '',
    courseId: '',
    institutionName: '',
    courseName: '',
    gender: '',
    status: 'active',
    balance: 0,
    overdraftLimit: 0,
    isActive: true
  });
  
  // ✅ NUEVOS ESTADOS para dropdowns dinámicos
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
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'financial'>('info');

  // ✅ NUEVO: Cargar instituciones al montar el componente
  useEffect(() => {
    loadInstitutions();
  }, []);

  // ✅ NUEVO: Cargar cursos cuando cambia la institución
  useEffect(() => {
    if (formData.institutionId) {
      loadCourses(formData.institutionId);
    } else {
      setCourses([]);
    }
  }, [formData.institutionId]);

  // ✅ NUEVA FUNCIÓN: Cargar instituciones activas
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

  // ✅ NUEVA FUNCIÓN: Cargar cursos por institución
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
        courseId: 'Error al cargar cursos para esta institución' 
      }));
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // ✅ NUEVA FUNCIÓN: Encontrar ID de institución por nombre (para compatibilidad)
  const findInstitutionIdByName = (institutionName: string): string => {
    const institution = institutions.find(inst => 
      inst.label.toLowerCase().includes(institutionName.toLowerCase())
    );
    return institution ? institution.value : '';
  };

  // ✅ NUEVA FUNCIÓN: Encontrar ID de curso por nombre (para compatibilidad)
  const findCourseIdByName = (courseName: string): string => {
    const course = courses.find(c => 
      c.label.toLowerCase().includes(courseName.toLowerCase())
    );
    return course ? course.value : '';
  };

  // Cargar datos del estudiante
  useEffect(() => {
    const loadStudent = async () => {
      if (!id) {
        navigate('/students');
        return;
      }

      try {
        setIsLoading(true);
        console.log('🔍 Cargando estudiante:', id);
        
        const response = await apiService.getStudentById(id);
        
        if (response.status === 'success') {
          const studentData = response.data.student;
          console.log('✅ Estudiante cargado:', studentData);
          
          setStudent(studentData);
          setFormData({
            run: studentData.run,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            email: studentData.email,
            phone: studentData.phone || '',
            birthDate: studentData.birthDate,
            institutionId: '', // ✅ Se establecerá cuando se carguen las instituciones
            courseId: '',     // ✅ Se establecerá cuando se carguen los cursos
            institutionName: studentData.institution, // ✅ Guardar nombre original
            courseName: studentData.course,           // ✅ Guardar nombre original
            gender: studentData.gender,
            status: studentData.status,
            balance: studentData.balance || 0,
            overdraftLimit: studentData.overdraftLimit || 0,
            isActive: studentData.isActive
          });
        }
        
      } catch (error: any) {
        console.error('❌ Error cargando estudiante:', error);
        
        if (error.message.includes('404') || error.message.includes('no encontrado')) {
          setErrors({ general: 'Estudiante no encontrado' });
          setTimeout(() => navigate('/students'), 3000);
        } else if (error.message.includes('403') || error.message.includes('permisos')) {
          setErrors({ general: 'No tienes permisos para ver esta información' });
        } else {
          setErrors({ general: 'Error al cargar los datos del estudiante' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStudent();
  }, [id, navigate]);

  // ✅ NUEVO: Establecer IDs cuando se carguen las opciones y los datos del estudiante
  useEffect(() => {
    if (institutions.length > 0 && formData.institutionName && !formData.institutionId) {
      const institutionId = findInstitutionIdByName(formData.institutionName);
      if (institutionId) {
        setFormData(prev => ({ ...prev, institutionId }));
        console.log('🏫 Institución encontrada por nombre:', formData.institutionName, '→', institutionId);
      }
    }
  }, [institutions, formData.institutionName, formData.institutionId]);

  useEffect(() => {
    if (courses.length > 0 && formData.courseName && !formData.courseId) {
      const courseId = findCourseIdByName(formData.courseName);
      if (courseId) {
        setFormData(prev => ({ ...prev, courseId }));
        console.log('📚 Curso encontrado por nombre:', formData.courseName, '→', courseId);
      }
    }
  }, [courses, formData.courseName, formData.courseId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'run') {
      const formatted = formatRUTOnInput(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    
    if (errors.newPassword || errors.confirmPassword) {
      setErrors(prev => ({ 
        ...prev, 
        newPassword: '', 
        confirmPassword: '' 
      }));
    }
  };

  const validateForm = (): Record<string, string> => {
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

    // ✅ NUEVO: Validar institución y curso
    if (!formData.institutionId) newErrors.institutionId = 'Debe seleccionar un establecimiento educacional';
    if (!formData.courseId) newErrors.courseId = 'Debe seleccionar un curso';
    if (!formData.gender.trim()) newErrors.gender = 'El género es requerido';

    // Validar balance (no puede ser negativo)
    if (formData.balance < 0) {
      newErrors.balance = 'El balance no puede ser negativo';
    }

    if (formData.overdraftLimit < 0) {
      newErrors.overdraftLimit = 'El límite de sobregiro no puede ser negativo';
    }

    return newErrors;
  };

  const validatePassword = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma la nueva contraseña';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return newErrors;
  };

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrors({});
    setSuccess(null);
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);

    try {
      console.log('📤 Actualizando información del estudiante:', formData);
      
      // ✅ CAMBIO: Obtener nombres para enviar al backend
      const institutionName = await apiService.getInstitutionNameById(formData.institutionId);
      const courseName = await apiService.getCourseNameById(formData.courseId, formData.institutionId);
      
      // Preparar datos actualizados con nombres para el backend
      const updateData = {
        ...formData,
        institution: institutionName,  // Backend espera nombre
        course: courseName            // Backend espera nombre
      };
      
      const response = await apiService.updateStudent(id!, updateData);
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response.status === 'success') {
        setSuccess('Información actualizada exitosamente');
        
        // Recargar datos del estudiante
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error: any) {
      console.error('❌ Error actualizando estudiante:', error);
      
      if (error.message.includes('RUN')) {
        setErrors({ run: 'Ya existe un usuario con este RUN' });
      } else if (error.message.includes('email')) {
        setErrors({ email: 'Ya existe un usuario con este email' });
      } else if (error.message.includes('401')) {
        setErrors({ general: 'No tienes permisos para editar estudiantes' });
      } else {
        setErrors({ general: error.message || 'Error al actualizar la información' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrors({});
    setSuccess(null);
    
    const newErrors = validatePassword();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsChangingPassword(true);

    try {
      console.log('🔒 Cambiando contraseña del estudiante...');
      
      const response = await apiService.changeStudentPassword(id!, passwordData.newPassword);
      
      console.log('✅ Contraseña cambiada:', response);
      
      if (response.status === 'success') {
        setSuccess('Contraseña actualizada exitosamente');
        setPasswordData({ newPassword: '', confirmPassword: '' });
      }

    } catch (error: any) {
      console.error('❌ Error cambiando contraseña:', error);
      setErrors({ general: error.message || 'Error al cambiar la contraseña' });
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
          <form onSubmit={handleSubmitInfo} className="space-y-4">
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
                    onChange={handleChange}
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
                    onChange={handleChange}
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
                {/* ✅ Mostrar institución actual si no se encuentra */}
                {formData.institutionName && !formData.institutionId && !isLoadingInstitutions && (
                  <p className="mt-1 text-xs text-orange-600">
                    Institución actual: {formData.institutionName} (seleccione una nueva si desea cambiar)
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
                    onChange={handleChange}
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
                {/* ✅ Mostrar curso actual si no se encuentra */}
                {formData.courseName && !formData.courseId && !isLoadingCourses && formData.institutionId && (
                  <p className="mt-1 text-xs text-orange-600">
                    Curso actual: {formData.courseName} (seleccione uno nuevo si desea cambiar)
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

        {/* Tab: Contraseña */}
        {activeTab === 'password' && (
          <form onSubmit={handleSubmitPassword} className="space-y-4">
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
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isChangingPassword}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.newPassword 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isChangingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.newPassword}
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
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Repite la nueva contraseña"
                    disabled={isChangingPassword}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.confirmPassword 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isChangingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
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
          <form onSubmit={handleSubmitInfo} className="space-y-4">
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