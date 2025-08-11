import { useState } from 'react';
import { User, Lock, Bell, Shield, Globe, Smartphone, Eye, EyeOff, Save, AlertCircle, XCircle, Sparkles } from 'lucide-react';

// Declaración de tipos para View Transitions API
declare global {
  interface Document {
    startViewTransition?: (callback: () => void) => {
      finished: Promise<void>;
      ready: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  }
}

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
    if (!document.startViewTransition) {
      setActiveTab(newTab);
      return;
    }

    document.startViewTransition(() => {
      setActiveTab(newTab);
    });
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

    if (!document.startViewTransition) {
      setSaveStatus('saving');
      setErrors({});
      
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }, 1000);
      return;
    }

    document.startViewTransition(() => {
      setSaveStatus('saving');
      setErrors({});
    });
    
    setTimeout(() => {
      document.startViewTransition(() => {
        setSaveStatus('saved');
        setTimeout(() => {
          document.startViewTransition(() => {
            setSaveStatus('idle');
          });
        }, 3000);
      });
    }, 1000);
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Lock },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'preferences', label: 'Preferencias', icon: Globe }
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      {/* Header compacto */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Configuración</h1>
              <p className="text-blue-200 text-xs">Gestiona tu cuenta y preferencias</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Estado</p>
            <p className="text-base font-bold">Activo</p>
          </div>
        </div>
      </div>

      {/* Tabs compactos */}
      <div className="bg-white rounded-lg shadow border border-gray-100 mb-4 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-[#193cb8] border-[#193cb8] bg-blue-50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                }`}
                style={{ viewTransitionName: `tab-${tab.id}` }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status de guardado */}
      {saveStatus === 'saved' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <p>Configuración guardada exitosamente</p>
        </div>
      )}

      {/* Contenido según tab activa */}
      <div className="bg-white rounded-lg shadow border border-gray-100 p-4" style={{ viewTransitionName: 'tab-content' }}>
        {activeTab === 'profile' && (
          <div style={{ viewTransitionName: 'profile-content' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Información Personal</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm ${
                    errors.email 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  placeholder="+56 9 1234 5678"
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm ${
                    errors.phone 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200 focus:border-blue-300'
                  }`}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  name="address"
                  value={profileData.address}
                  onChange={handleProfileChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div style={{ viewTransitionName: 'security-content' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <Lock className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Seguridad de la Cuenta</h2>
            </div>

            <div className="space-y-6">
              {/* Cambiar Contraseña */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 mb-3">Cambiar Contraseña</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Contraseña Actual
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg shadow-sm ${
                          errors.currentPassword 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
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
                        <XCircle className="w-3 h-3" />
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg shadow-sm ${
                          errors.newPassword 
                            ? 'border-red-500 bg-red-50' 
                            : 'border-gray-200 focus:border-blue-300'
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
                        <XCircle className="w-3 h-3" />
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm ${
                        errors.confirmPassword 
                          ? 'border-red-500 bg-red-50' 
                          : 'border-gray-200 focus:border-blue-300'
                      }`}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Autenticación de Dos Factores */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-bold text-gray-700 mb-3">Autenticación de Dos Factores</h3>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Autenticación por SMS</p>
                      <p className="text-[10px] text-gray-500">Recibe un código en tu teléfono</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#193cb8]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div style={{ viewTransitionName: 'notifications-content' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <Bell className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Preferencias de Notificación</h2>
            </div>
            
            <div className="space-y-6">
              {/* Notificaciones por Email */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 mb-3">Notificaciones por Email</h3>
                <div className="space-y-3">
                  {[
                    { key: 'transfers', label: 'Transferencias realizadas' },
                    { key: 'login', label: 'Inicios de sesión' },
                    { key: 'updates', label: 'Actualizaciones del sistema' },
                    { key: 'marketing', label: 'Ofertas y promociones' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-700">{label}</span>
                      <input
                        type="checkbox"
                        checked={notifications.email[key as keyof typeof notifications.email]}
                        onChange={() => handleNotificationChange('email', key)}
                        className="w-3.5 h-3.5 text-[#193cb8] rounded focus:ring-[#193cb8]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Notificaciones por SMS */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 mb-3">Notificaciones por SMS</h3>
                <div className="space-y-3">
                  {[
                    { key: 'transfers', label: 'Transferencias realizadas' },
                    { key: 'login', label: 'Inicios de sesión' },
                    { key: 'updates', label: 'Actualizaciones del sistema' },
                    { key: 'marketing', label: 'Ofertas y promociones' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-700">{label}</span>
                      <input
                        type="checkbox"
                        checked={notifications.sms[key as keyof typeof notifications.sms]}
                        onChange={() => handleNotificationChange('sms', key)}
                        className="w-3.5 h-3.5 text-[#193cb8] rounded focus:ring-[#193cb8]"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div style={{ viewTransitionName: 'preferences-content' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Preferencias Generales</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Idioma
                </label>
                <select
                  name="language"
                  value={preferences.language}
                  onChange={handlePreferenceChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Moneda Predeterminada
                </label>
                <select
                  name="currency"
                  value={preferences.currency}
                  onChange={handlePreferenceChange}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
                >
                  <option value="CLP">Peso Chileno (CLP)</option>
                  <option value="USD">Dólar (USD)</option>
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
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
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300"
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
      <style jsx global>{`
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
      `}</style>
    </div>
  );
};

export default Settings;