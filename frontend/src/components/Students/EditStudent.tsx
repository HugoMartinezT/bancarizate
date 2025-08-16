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
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  // ✅ NUEVO: Estados para visibilidad de contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'financial'>('info');

  // ✅ CORREGIDO: Secuencia de carga optimizada
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('🚀 Iniciando carga de datos...');
        
        // 1. Cargar instituciones primero
        await loadInstitutions();
        
        // 2. Si tenemos ID, cargar estudiante
        if (id) {
          await loadStudent();
        }
      } catch (error) {
        console.error('❌ Error en inicialización:', error);
        setError('Error al cargar datos iniciales');
      }
    };

    initializeData();
  }, [id]);

  // ✅ CORREGIDO: Cargar cursos cuando cambia la institución
  useEffect(() => {
    if (formData.institutionId) {
      console.log('🔄 Cargando cursos para institución:', formData.institutionId);
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

  // ✅ CORREGIDO: Función de mapeo mejorada
  const findInstitutionByName = (institutionName: string): InstitutionOption | undefined => {
    if (!institutionName || !institutions.length) return undefined;
    
    const normalizedName = institutionName.trim().toLowerCase();
    console.log('🔍 Buscando institución:', normalizedName);
    
    // Buscar coincidencia exacta primero
    let found = institutions.find(inst => 
      inst.label.trim().toLowerCase() === normalizedName
    );
    
    // Si no encuentra, buscar contenido parcial
    if (!found) {
      found = institutions.find(inst => 
        inst.label.trim().toLowerCase().includes(normalizedName) ||
        normalizedName.includes(inst.label.trim().toLowerCase())
      );
    }
    
    console.log('📍 Institución encontrada:', found);
    return found;
  };

  const findCourseByName = (courseName: string): CourseOption | undefined => {
    if (!courseName || !courses.length) return undefined;
    
    const normalizedName = courseName.trim().toLowerCase();
    console.log('🔍 Buscando curso:', normalizedName);
    
    // Buscar coincidencia exacta primero
    let found = courses.find(course => 
      course.label.trim().toLowerCase() === normalizedName
    );
    
    // Si no encuentra, buscar contenido parcial
    if (!found) {
      found = courses.find(course => 
        course.label.trim().toLowerCase().includes(normalizedName) ||
        normalizedName.includes(course.label.trim().toLowerCase())
      );
    }
    
    console.log('📍 Curso encontrado:', found);
    return found;
  };

  // ✅ CORREGIDO: Mapear correctamente los datos del estudiante
  const loadStudent = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📖 Cargando estudiante...', { id });
      
      const response = await apiService.getStudentById(id!);
      
      if (response.status === 'success') {
        const studentData = response.data.student;
        setStudent(studentData);
        console.log('📋 Datos del estudiante cargados:', studentData);
        
        // ✅ CORREGIDO: Esperar a que las instituciones estén cargadas
        if (institutions.length === 0) {
          console.log('⏳ Esperando instituciones...');
          return;
        }
        
        await mapStudentDataToForm(studentData);
      }
    } catch (error: any) {
      console.error('Error cargando estudiante:', error);
      setError(error.message || 'Error al cargar estudiante');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ NUEVO: Función separada para mapear datos
  const mapStudentDataToForm = async (studentData: StudentData) => {
    console.log('🗺️ Mapeando datos del estudiante a formulario...');
    
    // Buscar institución por nombre
    const institutionOption = findInstitutionByName(studentData.institution);
    
    let formUpdate: Partial<FormData> = {
      run: studentData.run,
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      email: studentData.email,
      phone: studentData.phone || '',
      birthDate: studentData.birthDate,
      institutionId: institutionOption?.value || '',
      courseId: '', // Se llenará después de cargar cursos
      gender: studentData.gender,
      status: studentData.status,
      balance: studentData.balance,
      overdraftLimit: studentData.overdraftLimit,
      isActive: studentData.isActive
    };

    console.log('📊 FormData parcial:', formUpdate);
    setFormData(prev => ({ ...prev, ...formUpdate }));

    // Si encontramos institución, cargar cursos y buscar el curso
    if (institutionOption?.value) {
      console.log('🔄 Cargando cursos para mapear curso actual...');
      
      try {
        const response = await apiService.getCoursesByInstitutionId(institutionOption.value);
        if (response.status === 'success') {
          const courseOptions = apiService.formatCoursesForSelect(response);
          setCourses(courseOptions);
          
          // Buscar curso por nombre
          const courseOption = courseOptions.find(course => 
            course.label.trim().toLowerCase() === studentData.course.trim().toLowerCase()
          );
          
          if (courseOption) {
            console.log('✅ Curso encontrado y mapeado:', courseOption);
            setFormData(prev => ({ ...prev, courseId: courseOption.value }));
          } else {
            console.log('⚠️ Curso no encontrado en opciones disponibles:', studentData.course);
            // Agregar el curso actual como opción si no existe
            const currentCourseOption = { 
              value: `custom_${Date.now()}`, 
              label: studentData.course 
            };
            setCourses(prev => [currentCourseOption, ...prev]);
            setFormData(prev => ({ ...prev, courseId: currentCourseOption.value }));
          }
        }
      } catch (error) {
        console.error('❌ Error cargando cursos para mapeo:', error);
      }
    } else {
      console.log('⚠️ Institución no encontrada, agregando como custom:', studentData.institution);
      // Agregar institución actual como opción si no existe
      const currentInstitutionOption = { 
        value: `custom_${Date.now()}`, 
        label: studentData.institution 
      };
      setInstitutions(prev => [currentInstitutionOption, ...prev]);
      setFormData(prev => ({ ...prev, institutionId: currentInstitutionOption.value }));
    }

    console.log('✅ Mapeo completado');
  };

  // ✅ CORREGIDO: Efecto para mapear cuando las instituciones estén listas
  useEffect(() => {
    if (student && institutions.length > 0) {
      console.log('🔄 Instituciones cargadas, mapeando datos del estudiante...');
      mapStudentDataToForm(student);
    }
  }, [institutions, student]);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Cargando estudiante...</p>
        </div>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => navigate('/students')}
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
        <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver a Lista de Estudiantes
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Editar Estudiante: {student?.firstName} {student?.lastName}
          </h1>
          {student && (
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
              <span>RUN: {student.run}</span>
              <span>Balance: {formatCurrency(student.balance)}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                student.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {student.isActive ? 'Activo' : 'Inactivo'}
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
                  placeholder="Nombre del estudiante"
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
                  placeholder="Apellido del estudiante"
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
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
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
                  <option value="graduated">Graduado</option>
                </select>
              </div>
            </div>

            {/* ✅ CORREGIDO: Institución usando API real */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <Building className="w-3 h-3 inline mr-1" />
                Institución
              </label>
              <select
                name="institutionId"
                value={formData.institutionId}
                onChange={handleInstitutionChange}
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

            {/* ✅ CORREGIDO: Curso usando API real */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                <BookOpen className="w-3 h-3 inline mr-1" />
                Curso
              </label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleCourseChange}
                disabled={isSaving || isLoadingCourses || !formData.institutionId}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.courseId 
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
              {errors.courseId && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.courseId}
                </p>
              )}
              {isLoadingCourses && (
                <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Cargando cursos...
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
                Si está desactivado, el estudiante no podrá iniciar sesión
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
                    Actualizar Estudiante
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/students')}
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
                  Cambio de contraseña para estudiante
                </p>
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                Esta acción cambiará la contraseña de acceso del estudiante al sistema.
              </p>
            </div>

            {/* ✅ NUEVO: Nueva Contraseña con toggle de visibilidad */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => {
                    setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                    setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  placeholder="Mínimo 6 caracteres"
                  disabled={isChangingPassword}
                  className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg shadow-sm transition-colors ${
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
              <p className="mt-1 text-xs text-gray-500">
                La contraseña debe tener al menos 6 caracteres
              </p>
            </div>

            {/* ✅ NUEVO: Confirmar Contraseña con toggle de visibilidad */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => {
                    setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                    setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  placeholder="Confirma la nueva contraseña"
                  disabled={isChangingPassword}
                  className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg shadow-sm transition-colors ${
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
                  Gestión financiera del estudiante
                </p>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Modifica el balance y límites de sobregiro para este estudiante.
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

export default EditStudent;