// components/Admin/NotificationSettings.tsx - Configuración de notificaciones

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Play,
  Volume2,
  VolumeX,
  Palette,
  Settings,
  Clock,
  Maximize2,
  MapPin,
  BarChart3,
  X,
  AlertCircle,
  CheckCircle2,
  Check,
  AlertTriangle,
  Upload,
  Music,
  Trash2,
} from 'lucide-react';
import {
  NotificationConfig,
  NotificationPosition,
  NotificationSize,
  DEFAULT_NOTIFICATION_CONFIG,
} from '../../types/types';
import { toast } from 'sonner';
import { apiService } from '../../services/api';

const NotificationSettings = () => {
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_NOTIFICATION_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'general' | 'colors' | 'advanced'>('general');
  const [audioFileName, setAudioFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar configuración al montar
  useEffect(() => {
    loadConfig();
  }, []);

  // Función helper para mostrar notificaciones personalizadas
  const showCustomNotification = (type: 'success' | 'error', title: string, description: string) => {
    const isSuccess = type === 'success';
    const duration = 4000;

    toast.custom(
      (t) => (
        <div
          className="relative rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2"
          style={{
            width: '420px',
            backgroundColor: '#ffffff',
            borderColor: isSuccess ? '#10b981' : '#ef4444',
            borderWidth: '2px',
            borderStyle: 'solid',
          }}
        >
          {/* Barra de progreso */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
            <div
              className="h-full"
              style={{
                background: isSuccess
                  ? 'linear-gradient(to right, #10b981, #059669)'
                  : 'linear-gradient(to right, #ef4444, #dc2626)',
                animation: `progressBar ${duration / 1000}s linear forwards`,
              }}
            />
          </div>

          {/* Contenido */}
          <div className="p-4 pb-5">
            <div className="flex items-start gap-3">
              {/* Icono */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: isSuccess
                    ? 'linear-gradient(to bottom right, #10b981, #059669)'
                    : 'linear-gradient(to bottom right, #ef4444, #dc2626)',
                }}
              >
                {isSuccess ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-white" />
                )}
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base mb-1 text-gray-900">
                  {title}
                </h3>
                <p className="text-sm text-gray-600">
                  {description}
                </p>
              </div>

              {/* Botón cerrar */}
              <button
                onClick={() => toast.dismiss(t)}
                className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors group"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      ),
      {
        duration,
        position: 'bottom-right',
      }
    );
  };

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getNotificationConfig();
      if (response.status === 'success') {
        setConfig(response.data);
        // También guardar en localStorage para acceso rápido
        localStorage.setItem('notificationConfig', JSON.stringify(response.data));
      }
    } catch (error: any) {
      console.error('Error al cargar configuración:', error);
      // Intentar cargar desde localStorage como fallback
      const saved = localStorage.getItem('notificationConfig');
      if (saved) {
        try {
          setConfig(JSON.parse(saved));
        } catch (e) {
          setConfig(DEFAULT_NOTIFICATION_CONFIG);
        }
      } else {
        setConfig(DEFAULT_NOTIFICATION_CONFIG);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setIsSaving(true);

      // Guardar en la base de datos
      const response = await apiService.updateNotificationConfig(config);

      if (response.status === 'success') {
        // También guardar en localStorage para acceso rápido
        localStorage.setItem('notificationConfig', JSON.stringify({
          ...config,
          lastUpdated: new Date().toISOString(),
        }));

        // Disparar evento para que NotificationHub se actualice
        window.dispatchEvent(new CustomEvent('notificationConfigUpdated', { detail: config }));

        showCustomNotification(
          'success',
          'Configuración guardada',
          'Los cambios se han guardado exitosamente en la base de datos'
        );

        setHasChanges(false);
      }
    } catch (error: any) {
      showCustomNotification(
        'error',
        'Error al guardar',
        error.message || 'No se pudo guardar la configuración en la base de datos'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (confirm('¿Estás seguro de que quieres restaurar la configuración por defecto?')) {
      try {
        setIsSaving(true);
        const response = await apiService.resetNotificationConfig();

        if (response.status === 'success') {
          setConfig(response.data);
          // Actualizar localStorage
          localStorage.setItem('notificationConfig', JSON.stringify(response.data));
          // Disparar evento para que NotificationHub se actualice
          window.dispatchEvent(new CustomEvent('notificationConfigUpdated', { detail: response.data }));

          showCustomNotification(
            'success',
            'Configuración restablecida',
            'Se han restaurado los valores por defecto exitosamente'
          );
          setHasChanges(false);
        }
      } catch (error: any) {
        showCustomNotification(
          'error',
          'Error al restablecer',
          error.message || 'No se pudo restablecer la configuración'
        );
      } finally {
        setIsSaving(false);
      }
    }
  };

  const testNotification = () => {
    // Crear una notificación de prueba
    window.dispatchEvent(new CustomEvent('testNotification'));
  };

  const updateConfig = (updates: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateColors = (colorUpdates: Partial<NotificationConfig['colors']>) => {
    setConfig(prev => ({
      ...prev,
      colors: { ...prev.colors, ...colorUpdates },
    }));
    setHasChanges(true);
  };

  // Mapeo de tamaños a anchos
  const getSizeWidth = (size: NotificationSize): number => {
    switch (size) {
      case 'small':
        return 320;
      case 'medium':
        return 400;
      case 'large':
        return 480;
      default:
        return 400;
    }
  };

  // Manejar selección de archivo de audio
  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg)$/i)) {
      showCustomNotification(
        'error',
        'Formato no válido',
        'Por favor selecciona un archivo MP3, WAV u OGG'
      );
      return;
    }

    // Validar tamaño (máximo 500KB)
    if (file.size > 500 * 1024) {
      showCustomNotification(
        'error',
        'Archivo muy grande',
        'El archivo de audio debe ser menor a 500KB'
      );
      return;
    }

    try {
      // Convertir a base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        setConfig(prev => ({ ...prev, soundData: base64String }));
        setAudioFileName(file.name);
        setHasChanges(true);
      };
      reader.onerror = () => {
        showCustomNotification(
          'error',
          'Error al cargar archivo',
          'No se pudo leer el archivo de audio'
        );
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showCustomNotification(
        'error',
        'Error al procesar archivo',
        'Ocurrió un error al procesar el archivo de audio'
      );
    }
  };

  // Eliminar sonido personalizado
  const removeCustomSound = () => {
    setConfig(prev => ({ ...prev, soundData: '' }));
    setAudioFileName('');
    setHasChanges(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Previsualizar sonido
  const previewSound = () => {
    try {
      if (config.soundData) {
        const audio = new Audio(config.soundData);
        audio.play().catch(() => {
          showCustomNotification(
            'error',
            'Error al reproducir',
            'No se pudo reproducir el archivo de audio'
          );
        });
      } else {
        // Usar sonido por defecto
        const defaultSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+Lk0tDK4aBlZJZJj0+WZOsn14mMjxnnK2gWS07QFqWrKNfLDY+YZqsol0nMj1kn66jXy87QFuXrKJfKzY+YZqsoV8pMz5ln7Cjb0U+XZmsomE6WJy0pGE2Ul+bqqBZOS89X5ispGM5WZ20pWA5V522p2E5W6C4qWI7Xam8q2M+Y622qmM+ZbC4q2Q/Z7K6rGVAabS8rmVBa7a+r2dCbbe/sGhCcLnBsmlDc7vDtGpFdb3EtmtGd7/FuGxHeMLIu21IesXKvG5Je8fLvnBKfMnNwHFMfsrOwXNNgM3QxHRPgc/SxnZQg9HUyHdShdPWynlThNXXzHpUh9fYznxViNnaz35XitvbzoBZit7e0YFajN/f0oNbjeHg1IRdjePi1oddjuTk14lek+fm2Ylfk+jp3Ipglujs3oxhmeru34thlOrv4Ixim+zx4o1jnO7z5I5kne/05Y9mofD25pBmo/L56ZJnpfT77JRopfX77ZVppvb97pdqp/f+751rqfj/8J5srPn/8p9trfr/9KBur/v/96FvsPz/+aNwsf3/+6Rxsv7//aVys/7//6Zztf///6Z0tf///6d0tv///6d1t////6h2uP///6l3uf///6l4uv///6p5u////6t6vP///6x8vf///61+wP///65+wf///7CAwv///7GBw////7KCxP///7OFxv///7WHyP///7eJyv///7mKy////7qMzP///7uOzv///76R0f///8CT0v///8GV1P///8OY1////8Wa2P///8ic2v///8ue3P///82h3////86j4f///9Cm4v///9Gp5P///9Os5v///9Wu6P///9aw6f///9ey7P///9m17v///9u47////9276////+C+8v///+DA8////+PD9f///+PG9////+TI9////+XK+f///+bL+////+fM+////+jO/P///+nP/f///+rR/v///+vS//////zU//////3W//////3X//////7Y//////7Z/////////v///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==');
        defaultSound.play().catch(() => {
          showCustomNotification(
            'error',
            'Error al reproducir',
            'No se pudo reproducir el sonido de notificación'
          );
        });
      }
    } catch (error) {
      showCustomNotification(
        'error',
        'Error al reproducir',
        'Ocurrió un error al reproducir el sonido'
      );
    }
  };

  return (
    <>
      {/* Estilos CSS para animaciones */}
      <style>{`
        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>

    <div className="mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate">Configuración de Notificaciones</h1>
            <p className="text-xs text-white/80 truncate">Personaliza la apariencia y comportamiento</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-[#193cb8] rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Cargando configuración...</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {!isLoading && (
      <>
      <div className="flex gap-2 mb-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setActiveSection('general')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            activeSection === 'general'
              ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-1" />
          General
        </button>
        <button
          onClick={() => setActiveSection('colors')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            activeSection === 'colors'
              ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Palette className="w-4 h-4 inline mr-1" />
          Colores
        </button>
        <button
          onClick={() => setActiveSection('advanced')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            activeSection === 'advanced'
              ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-1" />
          Avanzado
        </button>
      </div>

      {/* Contenido según sección activa */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4">
        {activeSection === 'general' && (
          <div className="space-y-4">
            {/* Estado */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {config.enabled ? (
                  <Eye className="w-5 h-5 text-green-600" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                  <p className="text-sm text-gray-600">
                    {config.enabled ? 'Activadas' : 'Desactivadas'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => updateConfig({ enabled: !config.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enabled ? 'bg-green-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Posición */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="w-4 h-4" />
                Posición de la notificación
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as NotificationPosition[]).map(
                  (position) => (
                    <button
                      key={position}
                      onClick={() => updateConfig({ position })}
                      className={`p-3 text-xs font-medium rounded-lg border-2 transition-all ${
                        config.position === position
                          ? 'border-[#193cb8] bg-blue-50 text-[#193cb8]'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {position.replace('-', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Tamaño */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Maximize2 className="w-4 h-4" />
                Tamaño
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as NotificationSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateConfig({ size })}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                      config.size === size
                        ? 'border-[#193cb8] bg-blue-50 text-[#193cb8]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)} ({getSizeWidth(size)}px)
                  </button>
                ))}
              </div>
            </div>

            {/* Duración */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Clock className="w-4 h-4" />
                Duración ({(config.duration / 1000).toFixed(1)}s)
              </label>
              <input
                type="range"
                min="3000"
                max="15000"
                step="1000"
                value={config.duration}
                onChange={(e) => updateConfig({ duration: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#193cb8]"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3s</span>
                <span>15s</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'colors' && (
          <div className="space-y-4">
            {/* Gradiente principal */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Gradiente del icono</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Color inicial</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.colors.gradientFrom}
                      onChange={(e) => updateColors({ gradientFrom: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.colors.gradientFrom}
                      onChange={(e) => updateColors({ gradientFrom: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      placeholder="#193cb8"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Color final</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.colors.gradientTo}
                      onChange={(e) => updateColors({ gradientTo: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.colors.gradientTo}
                      onChange={(e) => updateColors({ gradientTo: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                      placeholder="#0e2167"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de progreso */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Barra de progreso</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Color inicial</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.colors.progressBarFrom}
                      onChange={(e) => updateColors({ progressBarFrom: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.colors.progressBarFrom}
                      onChange={(e) => updateColors({ progressBarFrom: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Color final</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.colors.progressBarTo}
                      onChange={(e) => updateColors({ progressBarTo: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.colors.progressBarTo}
                      onChange={(e) => updateColors({ progressBarTo: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Otros colores */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Otros colores</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Borde</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.colors.borderColor}
                      onChange={(e) => updateColors({ borderColor: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.colors.borderColor}
                      onChange={(e) => updateColors({ borderColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Fondo</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.colors.backgroundColor}
                      onChange={(e) => updateColors({ backgroundColor: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.colors.backgroundColor}
                      onChange={(e) => updateColors({ backgroundColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'advanced' && (
          <div className="space-y-4">
            {/* Elementos visibles */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-2">Elementos visibles</h3>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Barra de progreso</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.showProgressBar}
                  onChange={(e) => updateConfig({ showProgressBar: e.target.checked })}
                  className="w-5 h-5 text-[#193cb8] border-gray-300 rounded focus:ring-[#193cb8]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <X className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Botón de cerrar</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.showCloseButton}
                  onChange={(e) => updateConfig({ showCloseButton: e.target.checked })}
                  className="w-5 h-5 text-[#193cb8] border-gray-300 rounded focus:ring-[#193cb8]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Icono de dinero</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.showMoneyIcon}
                  onChange={(e) => updateConfig({ showMoneyIcon: e.target.checked })}
                  className="w-5 h-5 text-[#193cb8] border-gray-300 rounded focus:ring-[#193cb8]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Descripción del mensaje</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.showDescription}
                  onChange={(e) => updateConfig({ showDescription: e.target.checked })}
                  className="w-5 h-5 text-[#193cb8] border-gray-300 rounded focus:ring-[#193cb8]"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  {config.playSound ? (
                    <Volume2 className="w-5 h-5 text-gray-600" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Sonido de notificación</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.playSound}
                  onChange={(e) => updateConfig({ playSound: e.target.checked })}
                  className="w-5 h-5 text-[#193cb8] border-gray-300 rounded focus:ring-[#193cb8]"
                />
              </label>
            </div>

            {/* Personalización de sonido */}
            {config.playSound && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Music className="w-4 h-4 text-[#193cb8]" />
                  <h4 className="font-semibold text-gray-900 text-sm">Sonido personalizado</h4>
                </div>

                {config.soundData ? (
                  <div className="space-y-3">
                    {/* Archivo cargado */}
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-300">
                      <Music className="w-5 h-5 text-[#193cb8]" />
                      <span className="text-sm text-gray-700 flex-1">
                        {audioFileName || 'Sonido personalizado'}
                      </span>
                      <button
                        onClick={removeCustomSound}
                        className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar sonido personalizado"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>

                    {/* Botón previsualizar */}
                    <button
                      onClick={previewSound}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#193cb8] text-white rounded-lg font-medium hover:bg-[#0e2167] transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Previsualizar sonido
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Mensaje informativo */}
                    <p className="text-xs text-gray-600">
                      Sube un archivo de audio personalizado (MP3, WAV, OGG). Máximo 500KB.
                    </p>

                    {/* Input de archivo oculto */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />

                    {/* Botón upload */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-[#193cb8] text-[#193cb8] rounded-lg font-medium hover:bg-blue-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Subir archivo de audio
                    </button>

                    {/* Botón previsualizar sonido por defecto */}
                    <button
                      onClick={previewSound}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Previsualizar sonido por defecto
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2">
        <button
          onClick={testNotification}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-[#193cb8] text-[#193cb8] rounded-lg font-semibold hover:bg-blue-50 transition-colors"
        >
          <Play className="w-4 h-4" />
          Probar
        </button>

        <button
          onClick={resetToDefaults}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={saveConfig}
          disabled={!hasChanges || isSaving}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
            hasChanges && !isSaving
              ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>

      {/* Mensaje de ayuda */}
      {hasChanges && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Tienes cambios sin guardar. Haz clic en "Guardar cambios" para aplicarlos.
          </p>
        </div>
      )}
      </>
      )}
    </div>
    </>
  );
};

export default NotificationSettings;
