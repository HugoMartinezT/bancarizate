import { useState, useEffect } from 'react';
import { User, Lock, DollarSign, Activity as ActivityIcon, Eye, EyeOff, Save, AlertCircle, CheckCircle, XCircle, Sparkles, Shield, Calendar, Mail, Phone, Building, BookOpen, Users, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, LogIn } from 'lucide-react';
import { apiService } from '../services/api';

// Tipos
interface UserProfile {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'student' | 'teacher' | 'admin';
  birthDate: string;
  institution: string;
  course?: string;
  courses?: string[];
  gender: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FinancialData {
  balance: number;
  overdraftLimit: number;
  totalAvailable: number;
  sent30Days: number;
  received30Days: number;
  netFlow30Days: number;
}

interface ActivityData {
  recentTransfersSent: any[];
  recentTransfersReceived: any[];
  recentLogins: any[];
  recentActions: any[];
}

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'financial' | 'activity'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Estados de datos
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  
  // Estados de formularios
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    institution: '',
    course: '',
    gender: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: 'weak' | 'medium' | 'strong';
    score: number;
    feedback: string[];
    color: string;
  } | null>(null);
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Cargar datos iniciales
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Cargar datos del usuario actual
      const verifyResponse = await apiService.verifyToken();
      const user = verifyResponse.data.user;
      
      setUserProfile(user);
      
      // Inicializar formulario de perfil
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        birthDate: user.birthDate ? user.birthDate.split('T')[0] : '',
        institution: user.institution || '',
        course: user.course || '',
        gender: user.gender || ''
      });
      
      // Cargar datos financieros si no es admin
      if (user.role !== 'admin') {
        try {
          const finData = await apiService.getMyFinancialStats();
          setFinancialData({
            balance: finData.balance,
            overdraftLimit: finData.overdraftLimit,
            totalAvailable: finData.totalAvailable,
            sent30Days: finData.stats30Days.sent?.total_amount || 0,
            received30Days: finData.stats30Days.received?.total_amount || 0,
            netFlow30Days: finData.stats30Days.net_flow || 0
          });
        } catch (err) {
          console.error('Error cargando datos financieros:', err);
        }
        
        // Cargar actividad reciente
        try {
          const activity = await apiService.getMyRecentActivity(5);
          setActivityData(activity);
        } catch (err) {
          console.error('Error cargando actividad:', err);
        }
      }
      
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  // Validar campo individual
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'email':
        if (!value) return 'El email es requerido';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email no válido';
        break;
      case 'phone':
        if (!value) return 'El teléfono es requerido';
        if (!apiService.isValidChileanPhone(value)) return 'Teléfono no válido (+56 9 XXXX XXXX)';
        break;
      case 'firstName':
      case 'lastName':
        if (!value) return 'Este campo es requerido';
        if (value.length < 2) return 'Debe tener al menos 2 caracteres';
        break;
      case 'currentPassword':
        if (!value) return 'La contraseña actual es requerida';
        break;
      case 'newPassword':
        if (!value) return 'La nueva contraseña es requerida';
        if (value.length < 6) return 'Debe tener al menos 6 caracteres';
        break;
      case 'confirmPassword':
        if (!value) return 'Debes confirmar la contraseña';
        if (value !== passwordForm.newPassword) return 'Las contraseñas no coinciden';
        break;
    }
    return '';
  };

  // Manejar cambios en formulario de perfil
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error del campo
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Manejar cambios en formulario de contraseña
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
    
    // Validar fortaleza si es nueva contraseña
    if (name === 'newPassword') {
      const strength = apiService.validatePasswordStrength(value);
      setPasswordStrength(strength);
    }
    
    // Limpiar error del campo
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Guardar cambios de perfil
  const handleSaveProfile = async () => {
    try {
      // Validar campos
      const errors: Record<string, string> = {};
      Object.keys(profileForm).forEach(key => {
        const error = validateField(key, profileForm[key as keyof typeof profileForm]);
        if (error) errors[key] = error;
      });
      
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      
      setSaving(true);
      setError('');
      setSuccessMessage('');
      
      // Enviar actualización al backend
      await apiService.updateMyProfile(profileForm);
      
      // Recargar datos del usuario
      const verifyResponse = await apiService.verifyToken();
      setUserProfile(verifyResponse.data.user);
      
      // Actualizar localStorage
      localStorage.setItem('user', JSON.stringify(verifyResponse.data.user));
      
      setSuccessMessage('Perfil actualizado correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err: any) {
      console.error('Error guardando perfil:', err);
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async () => {
    try {
      // Validar campos
      const errors: Record<string, string> = {};
      ['currentPassword', 'newPassword', 'confirmPassword'].forEach(field => {
        const error = validateField(field, passwordForm[field as keyof typeof passwordForm]);
        if (error) errors[field] = error;
      });
      
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }
      
      setSaving(true);
      setError('');
      setSuccessMessage('');
      
      // Cambiar contraseña en el backend
      await apiService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      // Limpiar formulario
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordStrength(null);
      
      setSuccessMessage('Contraseña cambiada correctamente');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err: any) {
      console.error('Error cambiando contraseña:', err);
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Formatear fecha corta
  const formatDateShort = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg font-medium text-gray-700">Cargando configuraciones...</span>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: No se pudo cargar la información del usuario</p>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Información Personal', icon: User },
    { id: 'security', label: 'Seguridad', icon: Lock },
    ...(userProfile.role !== 'admin' ? [{ id: 'financial', label: 'Información Financiera', icon: DollarSign }] : []),
    ...(userProfile.role !== 'admin' ? [{ id: 'activity', label: 'Mi Actividad', icon: ActivityIcon }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Configuraciones</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white rounded-lg">
          <Shield className="w-5 h-5" />
          <span className="font-semibold capitalize">{userProfile.role}</span>
        </div>
      </div>

      {/* Mensajes de éxito/error */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        
        {/* Tab: Información Personal */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Información Personal</h2>
            
            {/* RUN (no editable) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">RUN (no editable)</label>
              <input
                type="text"
                value={apiService.formatRUN(userProfile.run)}
                disabled
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre</label>
                <input
                  name="firstName"
                  type="text"
                  value={profileForm.firstName}
                  onChange={handleProfileChange}
                  className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all ${
                    formErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {formErrors.firstName && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {formErrors.firstName}
                  </p>
                )}
              </div>

              {/* Apellido */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Apellido</label>
                <input
                  name="lastName"
                  type="text"
                  value={profileForm.lastName}
                  onChange={handleProfileChange}
                  className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all ${
                    formErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {formErrors.lastName && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {formErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Mail className="w-3 h-3 inline mr-1" />
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all ${
                    formErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {formErrors.email}
                  </p>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />
                  Teléfono
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                  placeholder="+56 9 XXXX XXXX"
                  className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all ${
                    formErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {formErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {userProfile.role !== 'admin' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fecha de nacimiento */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Fecha de Nacimiento
                    </label>
                    <input
                      name="birthDate"
                      type="date"
                      value={profileForm.birthDate}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                    />
                  </div>

                  {/* Género */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Users className="w-3 h-3 inline mr-1" />
                      Género
                    </label>
                    <select
                      name="gender"
                      value={profileForm.gender}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                      <option value="Otro">Otro</option>
                      <option value="Prefiero no decir">Prefiero no decir</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Institución */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <Building className="w-3 h-3 inline mr-1" />
                      Institución
                    </label>
                    <input
                      name="institution"
                      type="text"
                      value={profileForm.institution}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                    />
                  </div>

                  {/* Curso */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <BookOpen className="w-3 h-3 inline mr-1" />
                      {userProfile.role === 'teacher' ? 'Cursos' : 'Curso'}
                    </label>
                    <input
                      name="course"
                      type="text"
                      value={profileForm.course}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Información del sistema */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Información del Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Registrado:</span>
                  <span className="font-medium">{formatDateShort(userProfile.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Última actualización:</span>
                  <span className="font-medium">{formatDateShort(userProfile.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Estado:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    userProfile.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {userProfile.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón guardar */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button 
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Seguridad */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Seguridad</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-2">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Recomendaciones de seguridad:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Usa una contraseña única que no uses en otros sitios</li>
                  <li>Incluye mayúsculas, minúsculas, números y símbolos</li>
                  <li>Evita información personal fácil de adivinar</li>
                  <li>Cambia tu contraseña regularmente</li>
                </ul>
              </div>
            </div>

            {/* Contraseña actual */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contraseña Actual</label>
              <div className="relative">
                <input
                  name="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg shadow-sm transition-all ${
                    formErrors.currentPassword ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                  placeholder="Ingresa tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.currentPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {formErrors.currentPassword}
                </p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nueva Contraseña</label>
              <div className="relative">
                <input
                  name="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg shadow-sm transition-all ${
                    formErrors.newPassword ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                  placeholder="Ingresa tu nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.newPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {formErrors.newPassword}
                </p>
              )}
              
              {/* Indicador de fortaleza de contraseña */}
              {passwordForm.newPassword && passwordStrength && (
                <div className="mt-2 space-y-2">
                  {/* Barra de fortaleza */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-300"
                        style={{ 
                          width: `${(passwordStrength.score / 9) * 100}%`,
                          backgroundColor: passwordStrength.color
                        }}
                      />
                    </div>
                    <span 
                      className="text-xs font-bold"
                      style={{ color: passwordStrength.color }}
                    >
                      {passwordStrength.strength === 'weak' && 'Débil'}
                      {passwordStrength.strength === 'medium' && 'Media'}
                      {passwordStrength.strength === 'strong' && 'Fuerte'}
                    </span>
                  </div>
                  
                  {/* Feedback */}
                  <div className="text-xs space-y-1">
                    {passwordStrength.feedback.map((tip, index) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-1"
                        style={{ color: passwordStrength.color }}
                      >
                        {passwordStrength.strength === 'strong' ? (
                          <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar nueva contraseña */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg shadow-sm transition-all ${
                    formErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                  placeholder="Confirma tu nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {formErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Botón cambiar contraseña */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button 
                onClick={handleChangePassword}
                disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cambiando...
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Cambiar Contraseña
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab: Información Financiera */}
        {activeTab === 'financial' && financialData && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Información Financiera</h2>
            
            {/* Tarjetas de balance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Balance actual */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-700">Balance Actual</span>
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {apiService.formatCurrency(financialData.balance)}
                </p>
              </div>

              {/* Límite de sobregiro */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-700">Límite Sobregiro</span>
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {apiService.formatCurrency(financialData.overdraftLimit)}
                </p>
              </div>

              {/* Total disponible */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-green-700">Total Disponible</span>
                  <Sparkles className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {apiService.formatCurrency(financialData.totalAvailable)}
                </p>
              </div>
            </div>

            {/* Resumen de movimientos últimos 30 días */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen Últimos 30 Días</h3>
              
              <div className="space-y-3">
                {/* Total enviado */}
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Total Enviado</span>
                  </div>
                  <span className="text-lg font-bold text-red-700">
                    {apiService.formatCurrency(financialData.sent30Days)}
                  </span>
                </div>

                {/* Total recibido */}
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Total Recibido</span>
                  </div>
                  <span className="text-lg font-bold text-green-700">
                    {apiService.formatCurrency(financialData.received30Days)}
                  </span>
                </div>

                {/* Flujo neto */}
                <div className={`flex items-center justify-between p-3 border rounded-lg ${
                  financialData.netFlow30Days >= 0 
                    ? 'bg-blue-50 border-blue-100' 
                    : 'bg-orange-50 border-orange-100'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      financialData.netFlow30Days >= 0 ? 'bg-blue-100' : 'bg-orange-100'
                    }`}>
                      {financialData.netFlow30Days >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">Flujo Neto</span>
                  </div>
                  <span className={`text-lg font-bold ${
                    financialData.netFlow30Days >= 0 ? 'text-blue-700' : 'text-orange-700'
                  }`}>
                    {apiService.formatCurrency(financialData.netFlow30Days)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Mi Actividad */}
        {activeTab === 'activity' && activityData && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Mi Actividad</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Últimas transferencias enviadas */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-red-600" />
                  Últimas Transferencias Enviadas
                </h3>
                
                {activityData.recentTransfersSent.length > 0 ? (
                  <div className="space-y-2">
                    {activityData.recentTransfersSent.map((transfer, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{transfer.recipientName || 'Usuario'}</p>
                          <p className="text-gray-500">{formatDateShort(transfer.createdAt)}</p>
                        </div>
                        <span className="font-bold text-red-600">
                          -{apiService.formatCurrency(transfer.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No hay transferencias enviadas</p>
                )}
              </div>

              {/* Últimas transferencias recibidas */}
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-green-600" />
                  Últimas Transferencias Recibidas
                </h3>
                
                {activityData.recentTransfersReceived.length > 0 ? (
                  <div className="space-y-2">
                    {activityData.recentTransfersReceived.map((transfer, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{transfer.senderName || 'Usuario'}</p>
                          <p className="text-gray-500">{formatDateShort(transfer.createdAt)}</p>
                        </div>
                        <span className="font-bold text-green-600">
                          +{apiService.formatCurrency(transfer.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No hay transferencias recibidas</p>
                )}
              </div>
            </div>

            {/* Últimos accesos */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <LogIn className="w-4 h-4 text-blue-600" />
                Últimos Accesos
              </h3>
              
              {activityData.recentLogins.length > 0 ? (
                <div className="space-y-2">
                  {activityData.recentLogins.map((login, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                      <div className="flex items-center gap-2">
                        <LogIn className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">Inicio de sesión</span>
                      </div>
                      <span className="text-gray-500">{formatDate(login.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No hay registros de acceso</p>
              )}
            </div>

            {/* Acciones recientes */}
            {activityData.recentActions.length > 0 && (
              <div className="border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-purple-600" />
                  Acciones Recientes
                </h3>
                
                <div className="space-y-2">
                  {activityData.recentActions.slice(0, 5).map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                      <div className="flex-1">
                        <span className="text-gray-700 capitalize">{action.action.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-gray-500">{formatDate(action.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;