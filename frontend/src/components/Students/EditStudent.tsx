// components/Students/EditStudentOptimized.tsx - Versión optimizada

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, BookOpen, XCircle, School, Building, Heart, Loader2, CheckCircle, Lock, DollarSign, CreditCard, Save, ArrowLeft, Key, Eye, EyeOff } from 'lucide-react';
import { validateRUT, formatRUTOnInput } from '../../utils/rutValidator';
import { useStudentEdit } from '../../hooks/useStudentEdit';

const EditStudentOptimized = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ✅ OPTIMIZACIÓN: Un solo hook que maneja todo el estado
  const {
    student,
    institutions,
    courses,
    formData,
    isLoading,
    isLoadingCourses,
    isSaving,
    isChangingPassword,
    error,
    errors,
    success,
    setFormData,
    setErrors,
    updateStudent,
    changePassword,
    loadCoursesForInstitution
  } = useStudentEdit(id!);

  // Estados locales mínimos
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'financial'>('info');

  // ✅ OPTIMIZACIÓN: Handlers memoizados
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
    
    setErrors((prev: any) => ({ ...prev, [name]: '' }));
  }, [setFormData, setErrors]);

  // ✅ OPTIMIZACIÓN: Cambio de institución optimizado
  const handleInstitutionChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    console.log('🏫 Institución seleccionada:', selectedId);
    
    setFormData((prev: any) => ({ 
      ...prev, 
      institutionId: selectedId,
      courseId: '' // Limpiar curso cuando cambia institución
    }));
    
    setErrors((prev: any) => ({ ...prev, institutionId: '', courseId: '' }));
    
    // Cargar cursos de forma optimizada
    if (selectedId) {
      await loadCoursesForInstitution(selectedId);
    }
  }, [setFormData, setErrors, loadCoursesForInstitution]);

  // ✅ OPTIMIZACIÓN: Validación rápida
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!validateRUT(formData.run)) newErrors.run = 'RUN inválido';
    if (!formData.firstName?.trim()) newErrors.firstName = 'Nombre requerido';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Apellido requerido';
    if (!formData.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
  }, [formData]);

  // ✅ OPTIMIZACIÓN: Submit optimizado
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await updateStudent(formData);
  }, [formData, validateForm, setErrors, updateStudent]);

  // ✅ OPTIMIZACIÓN: Cambio de contraseña optimizado
  const handlePasswordChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors({ password: 'Las contraseñas no coinciden' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setErrors({ password: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    await changePassword(passwordData.newPassword);
    setPasswordData({ newPassword: '', confirmPassword: '' });
  }, [passwordData, setErrors, changePassword]);

  // ✅ OPTIMIZACIÓN: Formateador de moneda memoizado
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP' 
    }).format(amount);
  }, []);

  // ✅ ESTADO DE CARGA UNIFICADO
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="bg-white rounded-lg shadow border border-gray-100 p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mr-3" />
            <span className="text-gray-600">Cargando datos del estudiante...</span>
          </div>
          <div className="mt-4 text-center text-sm text-gray-500">
            ⚡ Optimización: Cargando instituciones y datos en paralelo
          </div>
        </div>
      </div>
    );
  }

  // ✅ MANEJO DE ERRORES OPTIMIZADO
  if (!student && !isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Estudiante no encontrado</h3>
              <p className="text-sm text-red-600 mt-1">
                {error || 'No se pudo cargar la información del estudiante'}
              </p>
              <button
                onClick={() => navigate('/students')}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Volver a la lista
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      {/* Header Optimizado */}
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
              <p className="text-blue-200 text-xs">
                {student?.firstName} {student?.lastName} - {student?.run}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Balance Actual</p>
            <p className="text-base font-bold">{formatCurrency(student?.balance || 0)}</p>
          </div>
        </div>
      </div>

      {/* Mensajes de Estado */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <p>{success}</p>
        </div>
      )}

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs shadow-sm">
          <XCircle className="w-4 h-4" />
          <p>{errors.general}</p>
        </div>
      )}

      {/* Tabs Navigation */}
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

      {/* Contenido de Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
        {/* Tab: Información Personal */}
        {activeTab === 'info' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <School className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Información Personal</h2>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                ⚡ Optimizado
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RUN */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">RUN *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="run"
                    type="text"
                    value={formData.run || ''}
                    onChange={(e) => {
                      const formatted = formatRUTOnInput(e.target.value);
                      setFormData((prev: any) => ({ ...prev, run: formatted }));
                      setErrors((prev: any) => ({ ...prev, run: '' }));
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="email"
                    type="email"
                    value={formData.email || ''}
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

              {/* Institución */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Establecimiento Educacional *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    name="institutionId"
                    value={formData.institutionId || ''}
                    onChange={handleInstitutionChange}
                    disabled={isSaving}
                    className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                      errors.institutionId 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 focus:border-blue-300'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Seleccionar establecimiento</option>
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

              {/* Curso */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Curso *</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    name="courseId"
                    value={formData.courseId || ''}
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
                {isLoadingCourses && (
                  <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cargando cursos (optimizado con cache)...
                  </p>
                )}
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
                    value={formData.balance || 0}
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
                  Balance actual: {formatCurrency(formData.balance || 0)}
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
                    value={formData.overdraftLimit || 0}
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
                  Límite de sobregiro: {formatCurrency(formData.overdraftLimit || 0)}
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
                  <p className="font-semibold text-gray-900">{formatCurrency(formData.balance || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Límite de Sobregiro</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(formData.overdraftLimit || 0)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dinero Disponible Total</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency((formData.balance || 0) + (formData.overdraftLimit || 0))}
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