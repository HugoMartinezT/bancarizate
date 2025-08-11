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
  institutionId: string;    // ✅ NUEVO: Ahora maneja IDs
  courseIds: string[];      // ✅ NUEVO: Array de IDs de cursos
  institutionName: string;  // ✅ TEMPORAL: Para compatibilidad con datos existentes
  courseNames: string[];    // ✅ TEMPORAL: Para compatibilidad con datos existentes
  gender: string;
  status: 'active' | 'inactive' | 'retired';
  balance: number;
  overdraftLimit: number;
  isActive: boolean;
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
  institution: string;    // ✅ ACTUAL: Viene como nombre desde backend
  courses: string[];      // ✅ ACTUAL: Viene como array de nombres desde backend
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
  
  // ✅ ESTADOS para dropdowns dinámicos (idénticos a Student)
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

  // ✅ FUNCIÓN: Encontrar ID de institución por nombre (para compatibilidad)
  const findInstitutionIdByName = (institutionName: string): string => {
    const institution = institutions.find(inst => 
      inst.label.toLowerCase().includes(institutionName.toLowerCase())
    );
    return institution ? institution.value : '';
  };

  // ✅ FUNCIÓN: Encontrar IDs de cursos por nombres (para compatibilidad)
  const findCourseIdsByNames = (courseNames: string[]): string[] => {
    return courseNames.map(courseName => {
      const course = courses.find(c => 
        c.label.toLowerCase().includes(courseName.toLowerCase())
      );
      return course ? course.value : '';
    }).filter(id => id !== '');
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

  // Cargar datos del docente
  useEffect(() => {
    const loadTeacher = async () => {
      if (!id) {
        navigate('/teachers');
        return;
      }

      try {
        setIsLoading(true);
        console.log('🔍 Cargando docente:', id);
        
        const response = await apiService.getTeacherById(id);
        
        if (response.status === 'success') {
          const teacherData = response.data.teacher;
          console.log('✅ Docente cargado:', teacherData);
          
          setTeacher(teacherData);
          setFormData({
            run: teacherData.run,
            firstName: teacherData.firstName,
            lastName: teacherData.lastName,
            email: teacherData.email,
            phone: teacherData.phone || '',
            birthDate: teacherData.birthDate,
            institutionId: '',        // ✅ Se establecerá cuando se carguen las instituciones
            courseIds: [''],          // ✅ Se establecerá cuando se carguen los cursos
            institutionName: teacherData.institution,           // ✅ Guardar nombre original
            courseNames: teacherData.courses && teacherData.courses.length > 0 ? teacherData.courses : [], // ✅ Guardar nombres originales
            gender: teacherData.gender,
            status: teacherData.status,
            balance: teacherData.balance || 0,
            overdraftLimit: teacherData.overdraftLimit || 0,
            isActive: teacherData.isActive
          });
        }
        
      } catch (error: any) {
        console.error('❌ Error cargando docente:', error);
        
        if (error.message.includes('404') || error.message.includes('no encontrado')) {
          setErrors({ general: 'Docente no encontrado' });
          setTimeout(() => navigate('/teachers'), 3000);
        } else if (error.message.includes('403') || error.message.includes('permisos')) {
          setErrors({ general: 'No tienes permisos para ver esta información' });
        } else {
          setErrors({ general: 'Error al cargar los datos del docente' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTeacher();
  }, [id, navigate]);

  // ✅ ESTABLECER IDs cuando se carguen las opciones y los datos del docente
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
    if (courses.length > 0 && formData.courseNames.length > 0 && formData.courseIds.length === 1 && formData.courseIds[0] === '') {
      const courseIds = findCourseIdsByNames(formData.courseNames);
      if (courseIds.length > 0) {
        setFormData(prev => ({ ...prev, courseIds }));
        console.log('📚 Cursos encontrados por nombres:', formData.courseNames, '→', courseIds);
      }
    }
  }, [courses, formData.courseNames, formData.courseIds]);

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

  // ✅ FUNCIÓN: Manejo de cursos con validación de duplicados
  const handleCourseChange = (index: number, value: string) => {
    const newCourseIds = [...formData.courseIds];
    newCourseIds[index] = value;
    setFormData(prev => ({ ...prev, courseIds: newCourseIds }));
    if (errors.courseIds) {
      setErrors(prev => ({ ...prev, courseIds: '' }));
    }
  };

  // ✅ FUNCIÓN: Agregar curso (solo si hay cursos disponibles)
  const addCourse = () => {
    if (formData.courseIds.length < 10) {
      const availableCourses = getAvailableCourses(-1);
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
      console.log('📤 Actualizando información del docente:', formData);
      
      // ✅ OBTENER NOMBRES para enviar al backend
      const institutionName = await apiService.getInstitutionNameById(formData.institutionId);
      const courseNames = await Promise.all(
        formData.courseIds
          .filter(courseId => courseId.trim() !== '')
          .map(courseId => apiService.getCourseNameById(courseId, formData.institutionId))
      );
      
      // Preparar datos actualizados con nombres para el backend
      const updateData = {
        ...formData,
        institution: institutionName,
        courses: courseNames
      };
      
      const response = await apiService.updateTeacher(id!, updateData);
      
      console.log('✅ Respuesta del servidor:', response);
      
      if (response.status === 'success') {
        setSuccess('Información actualizada exitosamente');
        
        // Recargar datos del docente
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

    } catch (error: any) {
      console.error('❌ Error actualizando docente:', error);
      
      if (error.message.includes('RUN')) {
        setErrors({ run: 'Ya existe un usuario con este RUN' });
      } else if (error.message.includes('email')) {
        setErrors({ email: 'Ya existe un usuario con este email' });
      } else if (error.message.includes('401')) {
        setErrors({ general: 'No tienes permisos para editar docentes' });
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
      console.log('🔒 Cambiando contraseña del docente...');
      
      const response = await apiService.changeTeacherPassword(id!, passwordData.newPassword);
      
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
                          onChange={(e) => handleCourseChange(index, e.target.value)}
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
              {/* ✅ Mostrar cursos actuales si no se encuentran */}
              {formData.courseNames.length > 0 && formData.courseIds.length === 1 && formData.courseIds[0] === '' && !isLoadingCourses && formData.institutionId && (
                <p className="mt-1 text-xs text-orange-600">
                  Cursos actuales: {formData.courseNames.join(', ')} (seleccione nuevos si desea cambiar)
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
          <form onSubmit={handleSubmitPassword} className="space-y-4">
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