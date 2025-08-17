import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, BookOpen, XCircle, School, Building, Heart, Loader2, CheckCircle, Lock, DollarSign, CreditCard, Save, ArrowLeft, Key, Eye, EyeOff, Zap } from 'lucide-react';
import { validateRUT, formatRUTOnInput } from '../../utils/rutValidator';
import { apiService } from '../../services/api';
import type { OptimizedStudentEditData } from '../../services/api';

// ==========================================
// 🎯 INTERFACES OPTIMIZADAS
// ==========================================

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
  balance: number;
  overdraftLimit: number;
  isActive: boolean;
}

interface InstitutionOption {
  value: string;
  label: string;
  type?: string;
}

interface CourseOption {
  value: string;
  label: string;
  level?: string;
}

// ==========================================
// 🚀 COMPONENTE PRINCIPAL OPTIMIZADO
// ==========================================

const EditStudentOptimized = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // 🔥 ESTADOS OPTIMIZADOS
  const [studentData, setStudentData] = useState<OptimizedStudentEditData | null>(null);
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
    status: 'active',
    balance: 0,
    overdraftLimit: 0,
    isActive: true
  });
  
  // Estados de UI
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'financial'>('info');
  const [loadTime, setLoadTime] = useState<number>(0);

  // ==========================================
  // 🚀 CARGA OPTIMIZADA PRINCIPAL
  // ==========================================

  useEffect(() => {
    if (!id) return;
    
    loadStudentDataOptimized();
  }, [id]);

  /**
   * ⚡ MÉTODO PRINCIPAL: Carga todos los datos en UNA sola request
   * Reemplaza: loadInstitutions() + loadStudent() + mapData() + loadCourses()
   */
  const loadStudentDataOptimized = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const startTime = Date.now();
      console.log('⚡ [OPTIMIZED] Iniciando carga optimizada...');
      
      // 🔥 UNA SOLA REQUEST para obtener TODO
      const response = await (apiService as any).getStudentEditDataOptimized(id!);
      
      if (response.status === 'success') {
        const data = response.data;
        setStudentData(data);
        setLoadTime(response.loadTime || 0);
        
        // 🔥 MAPEO AUTOMÁTICO desde el backend optimizado
        setFormData({
          run: data.student.run,
          firstName: data.student.firstName,
          lastName: data.student.lastName,
          email: data.student.email,
          phone: data.student.phone || '',
          birthDate: data.student.birthDate,
          institutionId: data.student.institutionId || '',
          courseId: data.student.courseId || '',
          gender: data.student.gender,
          status: data.student.status,
          balance: data.student.balance,
          overdraftLimit: data.student.overdraftLimit,
          isActive: data.student.isActive
        });
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        console.log(`🎉 [OPTIMIZED] Carga completada en ${totalTime}ms total:`);
        console.log(`  📊 Backend: ${response.loadTime}ms`);
        console.log(`  🌐 Frontend: ${totalTime - response.loadTime}ms`);
        console.log(`  📈 Instituciones: ${data.metadata.totalInstitutions}`);
        console.log(`  📚 Cursos: ${data.metadata.totalCourses}`);
        console.log(`  🎯 Match institución: ${data.metadata.institutionMatch ? '✅' : '❌'}`);
        console.log(`  🎯 Match curso: ${data.metadata.courseMatch ? '✅' : '❌'}`);
      }
    } catch (error: any) {
      console.error('💥 [OPTIMIZED] Error en carga:', error);
      setError(error.message || 'Error al cargar datos del estudiante');
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // 📄 MÉTODOS DE MANEJO DE DATOS
  // ==========================================

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (error) setError(null);
  };

  const handleInstitutionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    console.log('🏫 [OPTIMIZED] Institución seleccionada:', selectedId);
    
    setFormData(prev => ({ 
      ...prev, 
      institutionId: selectedId,
      courseId: ''  // Limpiar curso cuando cambia institución
    }));
    setErrors(prev => ({ ...prev, institutionId: '', courseId: '' }));

    // 🔥 Los cursos ya están cacheados, no necesitamos hacer request adicional
    // Solo actualizamos el estado, los cursos se renderizan automáticamente
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    console.log('📚 [OPTIMIZED] Curso seleccionado:', selectedId);
    
    setFormData(prev => ({ ...prev, courseId: selectedId }));
    setErrors(prev => ({ ...prev, courseId: '' }));
  };

  // ==========================================
  // 🔍 VALIDACIÓN Y ENVÍO OPTIMIZADO
  // ==========================================

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
    setError(null);

    try {
      // 🔥 OPTIMIZADO: Convertir IDs a nombres usando datos cacheados
      const selectedInstitution = studentData?.institutions.find(inst => inst.value === formData.institutionId);
      const selectedCourse = getCurrentCourses().find(course => course.value === formData.courseId);
      
      const updateData = {
        ...formData,
        institution: selectedInstitution?.label || formData.institutionId,
        course: selectedCourse?.label || formData.courseId
      };
      
      console.log('📤 [OPTIMIZED] Enviando datos:', updateData);
      
      const response = await apiService.updateStudent(id!, updateData);
      if (response.status === 'success') {
        setSuccess('Estudiante actualizado exitosamente');
        
        // 🔥 OPTIMIZACIÓN: Limpiar cache para refrescar datos
        (apiService as any).clearCache?.();
        
        setTimeout(() => navigate('/students'), 2000);
      }
    } catch (error: any) {
      console.error('💥 Error actualizando estudiante:', error);
      setError(error.message || 'Error al actualizar estudiante');
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
      const response = await apiService.changeStudentPassword(id!, passwordData.newPassword);
      if (response.status === 'success') {
        setSuccess('Contraseña actualizada exitosamente');
        setPasswordData({ newPassword: '', confirmPassword: '' });
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (error: any) {
      setError(error.message || 'Error al cambiar contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ==========================================
  // 🎯 MÉTODOS AUXILIARES OPTIMIZADOS
  // ==========================================

  /**
   * Obtener cursos para la institución seleccionada (desde cache)
   */
  const getCurrentCourses = (): CourseOption[] => {
    if (!studentData || !formData.institutionId) return [];
    
    // 🔥 OPTIMIZADO: Usar datos pre-cargados del cache
    return studentData.coursesByInstitution[formData.institutionId] || [];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // ==========================================
  // 🎨 RENDERIZADO OPTIMIZADO
  // ==========================================

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="bg-white rounded-lg shadow border border-gray-100 p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
            <div className="text-center">
              <span className="text-gray-600">Cargando datos optimizados...</span>
              <p className="text-xs text-gray-400 mt-1">
                ⚡ Carga ultra-rápida con cache inteligente
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !studentData) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar estudiante</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!studentData) return null;

  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      {/* Header Optimizado con métricas */}
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
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Editar Estudiante (Optimizado)</h1>
              <p className="text-blue-200 text-xs">
                {studentData.student.firstName} {studentData.student.lastName} - {studentData.student.run}
                {loadTime && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded text-xs">
                    ⚡ {loadTime}ms
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Balance Actual</p>
            <p className="text-base font-bold">{formatCurrency(studentData.student.balance)}</p>
          </div>
        </div>
      </div>

      {/* Métricas de optimización */}
      {studentData.metadata && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Carga optimizada: {loadTime}ms</span>
            </div>
            <div>📊 {studentData.metadata.totalInstitutions} instituciones</div>
            <div>📚 {studentData.metadata.totalCourses} cursos</div>
            <div>🎯 Match: {studentData.metadata.institutionMatch ? '✅' : '❌'} / {studentData.metadata.courseMatch ? '✅' : '❌'}</div>
          </div>
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
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs shadow-sm">
          <XCircle className="w-4 h-4" />
          <p>{error}</p>
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
              <h2 className="text-sm font-bold text-gray-800">Información Personal (Optimizada)</h2>
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

              {/* 🔥 OPTIMIZADO: Establecimiento Educacional (datos pre-cargados) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Establecimiento Educacional * 
                  <span className="text-green-600 ml-1">⚡ Optimizado</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    name="institutionId"
                    value={formData.institutionId}
                    onChange={handleInstitutionChange}
                    disabled={isSaving}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.institutionId 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Seleccionar establecimiento</option>
                    {studentData.institutions.map(institution => (
                      <option key={institution.value} value={institution.value}>
                        {institution.label} {institution.type && `(${institution.type})`}
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

              {/* 🔥 OPTIMIZADO: Curso (datos pre-cargados desde cache) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Curso * 
                  <span className="text-green-600 ml-1">⚡ Cache</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleCourseChange}
                    disabled={isSaving || !formData.institutionId}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.courseId 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {!formData.institutionId 
                        ? 'Primero seleccione un establecimiento'
                        : getCurrentCourses().length === 0
                        ? 'No hay cursos disponibles'
                        : 'Seleccionar curso'
                      }
                    </option>
                    {getCurrentCourses().map(course => (
                      <option key={course.value} value={course.value}>
                        {course.label} {course.level && `(${course.level})`}
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
                {/* Info de cursos cargados */}
                {formData.institutionId && getCurrentCourses().length > 0 && (
                  <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {getCurrentCourses().length} cursos cargados desde cache
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

export default EditStudentOptimized;