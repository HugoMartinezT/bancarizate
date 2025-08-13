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
  institutionId: string;
  courseId: string;
  gender: string;
  status: 'active' | 'inactive' | 'graduated';
  balance: number;
  overdraftLimit: number;
  isActive: boolean;
}

// NUEVAS INTERFACES para las opciones de select
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
  institution: string;  // ACTUAL: Viene como nombre desde backend
  course: string;       // ACTUAL: Viene como nombre desde backend
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
    gender: '',
    status: 'active',
    balance: 0,
    overdraftLimit: 0,
    isActive: true
  });
  
  // NUEVOS ESTADOS para dropdowns dinámicos
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null); // ✅ AGREGADO: estado para errores generales
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'financial'>('info');

  // NUEVO: Cargar instituciones al montar el componente
  useEffect(() => {
    loadInstitutions();
  }, []);

  // NUEVO: Cargar cursos cuando cambia la institución
  useEffect(() => {
    if (formData.institutionId) {
      loadCourses(formData.institutionId);
    } else {
      setCourses([]);
    }
  }, [formData.institutionId]);

  // NUEVA FUNCIÓN: Cargar instituciones activas
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

  // NUEVA FUNCIÓN: Cargar cursos por institución
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
        courseId: 'Error al cargar cursos disponibles' 
      }));
    } finally {
      setIsLoadingCourses(false);
    }
  };

  // ✅ CORREGIDO: Cargar estudiante con manejo de errores
  const loadStudent = async () => {
    try {
      setIsLoading(true);
      setError(null); // ✅ CORREGIDO: Ahora existe setError
      
      console.log('🔍 Cargando estudiante...', { id });
      
      const response = await apiService.getStudentById(id!);
      
      if (response.status === 'success') {
        const studentData = response.data.student;
        setStudent(studentData);
        setFormData({
          ...studentData,
          institutionId: await apiService.getInstitutionNameById(studentData.institution), // Map name to ID if needed
          courseId: await apiService.getCourseNameById(studentData.course) // Map name to ID if needed
        });
      }
    } catch (error: any) {
      console.error('Error cargando estudiante:', error);
      setError(error.message || 'Error al cargar estudiante'); // ✅ CORREGIDO: Ahora existe setError
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudent();
  }, [id]);

  // ✅ MEJORADO: handleChange con limpieza de error general
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    // ✅ OPCIONAL: Limpiar error general también
    if (error) setError(null);
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
      const response = await apiService.updateStudent(id!, formData);
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
    if (passwordData.newPassword.length < 8) {
      setErrors({ password: 'La contraseña debe tener al least 8 caracteres' });
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

  // ✅ CORREGIDO: Renderizado condicional con error/setError existentes
  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>; // ✅ CORREGIDO: Ahora existe error

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-6">
        <button onClick={() => navigate('/students')} className="flex items-center gap-2 text-blue-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver a Lista de Estudiantes
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Estudiante: {student?.firstName} {student?.lastName}</h1>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button onClick={() => setActiveTab('info')} className={`flex-1 py-2 ${activeTab === 'info' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>
            Información
          </button>
          <button onClick={() => setActiveTab('password')} className={`flex-1 py-2 ${activeTab === 'password' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>
            Contraseña
          </button>
          <button onClick={() => setActiveTab('financial')} className={`flex-1 py-2 ${activeTab === 'financial' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>
            Finanzas
          </button>
        </div>

        {/* Mostrar mensaje de éxito */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {activeTab === 'info' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* RUN */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                name="email"
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

            {/* Teléfono */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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

            {/* Institución */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
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

            {/* Curso */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Curso
              </label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
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
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
                <option value="graduated">Graduado</option>
              </select>
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

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {/* Nueva Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="********"
                disabled={isChangingPassword}
                className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                  errors.password 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 focus:border-blue-300'
                } ${isChangingPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="********"
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
              disabled={isChangingPassword}
              className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md ${
                isChangingPassword
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90'
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
          </form>
        )}

        {activeTab === 'financial' && (
          <form onSubmit={handleSubmit} className="space-y-4">
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