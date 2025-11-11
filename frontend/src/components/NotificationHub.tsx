// components/NotificationHub.tsx - Hub de notificaciones con Sonner

import { useEffect, useCallback, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { ArrowDownLeft, DollarSign, X } from 'lucide-react';
import transferNotificationService, {
  type NewTransferNotification,
} from '../services/transferNotificationService';
import { NotificationConfig, DEFAULT_NOTIFICATION_CONFIG } from '../types/types';

// ==========================================
// UTILIDADES DE FORMATO
// ==========================================

/**
 * Formatea un número como moneda chilena
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Obtiene el nombre del remitente de una transferencia
 */
const getSenderName = (notification: NewTransferNotification): string => {
  const transfer = notification.transfer;

  // Si hay información del remitente en otherPerson
  if (transfer.otherPerson?.name) {
    return transfer.otherPerson.name;
  }

  // Si es una transferencia múltiple con recipients
  if (transfer.isMultiple && transfer.recipients && transfer.recipients.length > 0) {
    const sender = transfer.recipients[0];
    return sender.name || 'Usuario desconocido';
  }

  // Fallback
  return 'Usuario';
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

interface NotificationHubProps {
  /**
   * Si es true, el servicio de notificaciones se inicia automáticamente
   */
  autoStart?: boolean;

  /**
   * Callback cuando se recibe una nueva transferencia
   */
  onNewTransfer?: (notification: NewTransferNotification) => void;
}

export const NotificationHub: React.FC<NotificationHubProps> = ({
  autoStart = true,
  onNewTransfer,
}) => {
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_NOTIFICATION_CONFIG);

  // Cargar configuración desde localStorage
  useEffect(() => {
    const loadConfig = () => {
      const saved = localStorage.getItem('notificationConfig');
      if (saved) {
        try {
          setConfig(JSON.parse(saved));
        } catch (error) {
          console.error('Error al cargar configuración de notificaciones:', error);
        }
      }
    };

    loadConfig();

    // Escuchar cambios en la configuración
    const handleConfigUpdate = (event: CustomEvent) => {
      setConfig(event.detail);
    };

    window.addEventListener('notificationConfigUpdated', handleConfigUpdate as EventListener);

    return () => {
      window.removeEventListener('notificationConfigUpdated', handleConfigUpdate as EventListener);
    };
  }, []);

  /**
   * Mapeo de tamaños a anchos
   */
  const getSizeWidth = (size: string): number => {
    switch (size) {
      case 'small':
        return 320;
      case 'medium':
        return 400;
      case 'large':
        return 480;
      default:
        return config.customWidth || 400;
    }
  };

  /**
   * Maneja las notificaciones de nuevas transferencias
   */
  const handleNewTransfer = useCallback((notification: NewTransferNotification) => {
    // Si las notificaciones están desactivadas, no mostrar
    if (!config.enabled) {
      console.log('[NotificationHub] Notificaciones desactivadas');
      return;
    }

    const transfer = notification.transfer;
    const senderName = getSenderName(notification);
    const amount = formatCurrency(transfer.amount || transfer.totalAmount || 0);

    const width = getSizeWidth(config.size);
    const durationInSeconds = config.duration / 1000;

    // Mostrar toast personalizado con Sonner usando configuraciones dinámicas
    toast.custom(
      (t) => (
        <div
          className="relative rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2"
          style={{
            width: `${width}px`,
            backgroundColor: config.colors.backgroundColor,
            borderColor: config.colors.borderColor,
            borderWidth: '1px',
            borderStyle: 'solid',
            animation: t === t ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-in',
          }}
        >
          {/* Barra de progreso gradiente */}
          {config.showProgressBar && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
              <div
                className="h-full"
                style={{
                  background: `linear-gradient(to right, ${config.colors.progressBarFrom}, ${config.colors.progressBarTo})`,
                  animation: `progressBar ${durationInSeconds}s linear forwards`,
                }}
              />
            </div>
          )}

          {/* Contenido */}
          <div className="p-4 pb-5">
            <div className="flex items-start gap-3">
              {/* Icono */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(to bottom right, ${config.colors.gradientFrom}, ${config.colors.gradientTo})`,
                }}
              >
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <h3
                  className="font-bold text-base mb-1"
                  style={{ color: config.colors.titleColor }}
                >
                  Nueva transferencia recibida
                </h3>
                <p
                  className="text-sm font-medium"
                  style={{ color: config.colors.textColor }}
                >
                  {senderName} te ha enviado{' '}
                  <span
                    className="text-transparent bg-clip-text font-bold"
                    style={{
                      backgroundImage: `linear-gradient(to right, ${config.colors.gradientFrom}, ${config.colors.gradientTo})`,
                    }}
                  >
                    {amount}
                  </span>
                </p>
                {config.showDescription && transfer.description && (
                  <p
                    className="text-xs mt-1.5 italic truncate border-l-2 pl-2"
                    style={{
                      color: config.colors.descriptionColor,
                      borderColor: config.colors.borderColor,
                    }}
                  >
                    "{transfer.description}"
                  </p>
                )}
              </div>

              {/* Icono de dinero y botón cerrar */}
              <div className="flex flex-col items-center gap-1">
                {config.showCloseButton && (
                  <button
                    onClick={() => toast.dismiss(t)}
                    className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors group"
                    aria-label="Cerrar notificación"
                  >
                    <X className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </button>
                )}
                {config.showMoneyIcon && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        duration: config.duration,
        position: config.position,
      }
    );

    // Reproducir sonido si está habilitado
    if (config.playSound) {
      try {
        // Usar sonido personalizado si está disponible, de lo contrario usar el predeterminado
        const soundData = config.soundData || 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+Lk0tDK4aBlZJZJj0+WZOsn14mMjxnnK2gWS07QFqWrKNfLDY+YZqsol0nMj1kn66jXy87QFuXrKJfKzY+YZqsoV8pMz5ln7Cjb0U+XZmsomE6WJy0pGE2Ul+bqqBZOS89X5ispGM5WZ20pWA5V522p2E5W6C4qWI7Xam8q2M+Y622qmM+ZbC4q2Q/Z7K6rGVAabS8rmVBa7a+r2dCbbe/sGhCcLnBsmlDc7vDtGpFdb3EtmtGd7/FuGxHeMLIu21IesXKvG5Je8fLvnBKfMnNwHFMfsrOwXNNgM3QxHRPgc/SxnZQg9HUyHdShdPWynlThNXXzHpUh9fYznxViNnaz35XitvbzoBZit7e0YFajN/f0oNbjeHg1IRdjePi1oddjuTk14lek+fm2Ylfk+jp3Ipglujs3oxhmeru34thlOrv4Ixim+zx4o1jnO7z5I5kne/05Y9mofD25pBmo/L56ZJnpfT77JRopfX77ZVppvb97pdqp/f+751rqfj/8J5srPn/8p9trfr/9KBur/v/96FvsPz/+aNwsf3/+6Rxsv7//aVys/7//6Zztf///6Z0tf///6d0tv///6d1t////6h2uP///6l3uf///6l4uv///6p5u////6t6vP///6x8vf///61+wP///65+wf///7CAwv///7GBw////7KCxP///7OFxv///7WHyP///7eJyv///7mKy////7qMzP///7uOzv///76R0f///8CT0v///8GV1P///8OY1////8Wa2P///8ic2v///8ue3P///82h3////86j4f///9Cm4v///9Gp5P///9Os5v///9Wu6P///9aw6f///9ey7P///9m17v///9u47////9276////+C+8v///+DA8////+PD9f///+PG9////+TI9////+XK+f///+bL+////+fM+////+jO/P///+nP/f///+rR/v///+vS//////zU//////3W//////3X//////7Y//////7Z/////////v///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////w==';
        const audio = new Audio(soundData);
        audio.play().catch(() => {
          // Ignorar errores de reproducción (ej: permisos del navegador)
        });
      } catch (error) {
        console.error('Error al reproducir sonido:', error);
      }
    }

    // Llamar al callback si existe
    if (onNewTransfer) {
      onNewTransfer(notification);
    }

    // Log para debugging
    console.log('[NotificationHub] Nueva transferencia:', {
      from: senderName,
      amount: transfer.amount,
      description: transfer.description,
    });
  }, [onNewTransfer, config]);

  // Manejar evento de prueba de notificación (separado para evitar stale closures)
  useEffect(() => {
    const handleTestNotification = () => {
      const testNotification: NewTransferNotification = {
        transfer: {
          id: 'test-' + Date.now(),
          amount: 50000,
          totalAmount: 50000,
          description: 'Esta es una notificación de prueba',
          type: 'received',
          direction: 'received',
          date: new Date().toISOString(),
          status: 'completed',
          isMultiple: false,
          otherPerson: {
            id: 'test-user',
            name: 'Usuario de Prueba',
            run: '12345678-9',
            role: 'student',
          },
          recipients: [],
          recipientCount: 1,
        },
        timestamp: new Date().toISOString(),
      };
      handleNewTransfer(testNotification);
    };

    window.addEventListener('testNotification', handleTestNotification);

    return () => {
      window.removeEventListener('testNotification', handleTestNotification);
    };
  }, [config, handleNewTransfer]);

  /**
   * Inicializar el servicio de notificaciones
   */
  useEffect(() => {
    if (!autoStart) {
      return;
    }

    // Suscribirse a las notificaciones
    const unsubscribe = transferNotificationService.subscribe(handleNewTransfer);

    // Iniciar el polling
    transferNotificationService.start();

    // Cleanup
    return () => {
      unsubscribe();
      transferNotificationService.stop();
    };
  }, [autoStart, handleNewTransfer]);

  // Determinar dirección de animación basada en posición
  const isBottom = config.position.startsWith('bottom');
  const translateDirection = isBottom ? 'translateY(100%)' : 'translateY(-100%)';

  // Renderizar el Toaster de Sonner con estilos personalizados
  return (
    <>
      <style>{`
        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        @keyframes slideIn {
          from {
            transform: ${translateDirection};
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: ${translateDirection};
            opacity: 0;
          }
        }
      `}</style>
      <Toaster
        position={config.position}
        expand={false}
        toastOptions={{
          unstyled: true,
        }}
      />
    </>
  );
};

export default NotificationHub;
