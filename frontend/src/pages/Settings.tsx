import { useState } from 'react';
import { User, Lock, Bell, Shield, Globe, Smartphone, Eye, EyeOff, Save, AlertCircle, XCircle, Sparkles } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileData, setProfileData] = useState({
    email: 'juan.perez@banco.cl',
    phone: '+56 9 8765 4321',
    address: 'Av. Providencia 1234, Santiago'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    email: {
      transfers: true,
      login: true,
      updates: false,
      marketing: false
    },
    sms: {
      transfers: true,
      login: false,
      updates: false,
      marketing: false
    }
  });
  const [preferences, setPreferences] = useState({
    language: 'es',
    currency: 'CLP',
    theme: 'light',
    timezone: 'America/Santiago'
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleNotificationChange = (channel: 'email' | 'sms', type: string) => {
    setNotifications(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [type]: !prev[channel][type as keyof typeof prev.email]
      }
    }));
  };

  const handlePreferenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const validateProfile = () => {
    const newErrors: Record<string, string> = {};
    
    if (!profileData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!profileData.phone) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^(\+56)?9\d{8}$/.test(profileData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'El teléfono debe ser válido (+56 9 XXXX XXXX)';
    }

    return newErrors;
  };

  const validatePassword = () => {
    const newErrors: Record<string, string> = {};
    
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'La contraseña actual es requerida';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'La nueva contraseña es requerida';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return newErrors;
  };

  // Función para manejar transiciones suaves entre tabs
  const handleTabChange = (newTab: 'profile' | 'security' | 'notifications' | 'preferences') => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setActiveTab(newTab);
      });
    } else {
      setActiveTab(newTab);
    }
  };

  const handleSave = () => {
    let newErrors = {};
    
    if (activeTab === 'profile') {
      newErrors = validateProfile();
    } else if (activeTab === 'security') {
      newErrors = validatePassword();
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setSaveStatus('saving');
        setErrors({});
      });
    } else {
      setSaveStatus('saving');
      setErrors({});
    }
    
    setTimeout(() => {
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          setSaveStatus('saved');
          setTimeout(() => {
            if (document.startViewTransition) {
              document.startViewTransition(() => {
                setSaveStatus('idle');
              });
            } else {
              setSaveStatus('idle');
            }
          }, 3000);
        });
      } else {
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    }, 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'preferences', label: 'Preferencias', icon: Globe }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Configuraciones</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={{ viewTransitionName: `tab-${tab.id}` }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      <div 
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        style={{ viewTransitionName: `${activeTab}-content` }}
      >
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Información Personal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all ${
                    errors.email ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                <input
                  name="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all ${
                    errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Dirección</label>
                <input
                  name="address"
                  type="text"
                  value={profileData.address}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Seguridad</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Contraseña Actual</label>
                <div className="relative">
                  <input
                    name="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all pr-10 ${
                      errors.currentPassword ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {errors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all pr-10 ${
                      errors.newPassword ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {errors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`w-full px-3 py-2.5 border rounded-lg shadow-sm transition-all ${
                    errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Notificaciones</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" /> SMS
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700">
                    Transferencias
                    <input
                      type="checkbox"
                      checked={notifications.sms.transfers}
                      onChange={() => handleNotificationChange('sms', 'transfers')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700">
                    Inicios de sesión
                    <input
                      type="checkbox"
                      checked={notifications.sms.login}
                      onChange={() => handleNotificationChange('sms', 'login')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700">
                    Actualizaciones
                    <input
                      type="checkbox"
                      checked={notifications.sms.updates}
                      onChange={() => handleNotificationChange('sms', 'updates')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700">
                    Marketing
                    <input
                      type="checkbox"
                      checked={notifications.sms.marketing}
                      onChange={() => handleNotificationChange('sms', 'marketing')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" /> Email
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700">
                    Transferencias
                    <input
                      type="checkbox"
                      checked={notifications.email.transfers}
                      onChange={() => handleNotificationChange('email', 'transfers')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700">
                    Inicios de sesión
                    <input
                      type="checkbox"
                      checked={notifications.email.login}
                      onChange={() => handleNotificationChange('email', 'login')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700">
                    Actualizaciones
                    <input
                      type="checkbox"
                      checked={notifications.email.updates}
                      onChange={() => handleNotificationChange('email', 'updates')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700">
                    Marketing
                    <input
                      type="checkbox"
                      checked={notifications.email.marketing}
                      onChange={() => handleNotificationChange('email', 'marketing')}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Preferencias</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Idioma
                </label>
                <select
                  name="language"
                  value={preferences.language}
                  onChange={handlePreferenceChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Moneda
                </label>
                <select
                  name="currency"
                  value={preferences.currency}
                  onChange={handlePreferenceChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                >
                  <option value="CLP">Peso Chileno (CLP)</option>
                  <option value="USD">Dólar Estadounidense (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tema
                </label>
                <select
                  name="theme"
                  value={preferences.theme}
                  onChange={handlePreferenceChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                >
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="auto">Automático</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Zona Horaria
                </label>
                <select
                  name="timezone"
                  value={preferences.timezone}
                  onChange={handlePreferenceChange}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                >
                  <option value="America/Santiago">Santiago, Chile</option>
                  <option value="America/Buenos_Aires">Buenos Aires, Argentina</option>
                  <option value="America/Lima">Lima, Perú</option>
                  <option value="America/Bogota">Bogotá, Colombia</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Botón de guardar */}
        <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
          <button 
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90 disabled:opacity-50"
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Guardado
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

      {/* Estilos CSS para View Transitions */}
      <style>
        {`
        /* View Transitions para el contenido de tabs */
        ::view-transition-old(tab-content),
        ::view-transition-new(tab-content) {
          animation-duration: 0.3s;
          animation-timing-function: ease-in-out;
        }

        ::view-transition-old(tab-content) {
          animation-name: slide-out-right;
        }

        ::view-transition-new(tab-content) {
          animation-name: slide-in-left;
        }

        /* Animaciones específicas para cada sección */
        ::view-transition-old(profile-content),
        ::view-transition-new(profile-content),
        ::view-transition-old(security-content),
        ::view-transition-new(security-content),
        ::view-transition-old(notifications-content),
        ::view-transition-new(notifications-content),
        ::view-transition-old(preferences-content),
        ::view-transition-new(preferences-content) {
          animation-duration: 0.25s;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        ::view-transition-old(profile-content),
        ::view-transition-old(security-content),
        ::view-transition-old(notifications-content),
        ::view-transition-old(preferences-content) {
          animation-name: fade-scale-out;
        }

        ::view-transition-new(profile-content),
        ::view-transition-new(security-content),
        ::view-transition-new(notifications-content),
        ::view-transition-new(preferences-content) {
          animation-name: fade-scale-in;
        }

        /* Transiciones para los tabs */
        @supports (view-transition-name: none) {
          .tab-button {
            view-transition-name: var(--tab-name);
          }
        }

        /* Keyframes para las animaciones */
        @keyframes slide-out-right {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(20px);
            opacity: 0;
          }
        }

        @keyframes slide-in-left {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fade-scale-out {
          from {
            transform: scale(1);
            opacity: 1;
          }
          to {
            transform: scale(0.96);
            opacity: 0;
          }
        }

        @keyframes fade-scale-in {
          from {
            transform: scale(1.04);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Fallback para navegadores sin soporte */
        @media (prefers-reduced-motion: reduce) {
          ::view-transition-old(*),
          ::view-transition-new(*) {
            animation: none !important;
          }
        }

        /* Mejoras adicionales */
        [style*="view-transition-name"] {
          contain: layout style paint;
        }
      `}
      </style>
    </div>
  );
};

export default Settings;