// components/NotificationHub.tsx - Hub de notificaciones con Sonner

import { useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { ArrowDownLeft, DollarSign, X } from 'lucide-react';
import transferNotificationService, {
  type NewTransferNotification,
} from '../services/transferNotificationService';

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
  /**
   * Maneja las notificaciones de nuevas transferencias
   */
  const handleNewTransfer = useCallback((notification: NewTransferNotification) => {
    const transfer = notification.transfer;
    const senderName = getSenderName(notification);
    const amount = formatCurrency(transfer.amount || transfer.totalAmount || 0);

    // Mostrar toast personalizado con Sonner
    toast.custom(
      (t) => (
        <div
          className="relative bg-white rounded-xl shadow-2xl border border-blue-100 overflow-hidden w-[400px] animate-in slide-in-from-bottom-2"
          style={{
            animation: t === t ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-in',
          }}
        >
          {/* Barra de progreso gradiente */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-[#193cb8] to-[#0e2167]"
              style={{
                animation: 'progressBar 8s linear forwards',
              }}
            />
          </div>

          {/* Contenido */}
          <div className="p-4 pb-5">
            <div className="flex items-start gap-3">
              {/* Icono */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#193cb8] to-[#0e2167] flex items-center justify-center shadow-lg">
                <ArrowDownLeft className="w-6 h-6 text-white" />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base mb-1">
                  Nueva transferencia recibida
                </h3>
                <p className="text-sm text-gray-700 font-medium">
                  {senderName} te ha enviado{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#193cb8] to-[#0e2167] font-bold">
                    {amount}
                  </span>
                </p>
                {transfer.description && (
                  <p className="text-xs text-gray-500 mt-1.5 italic truncate border-l-2 border-blue-200 pl-2">
                    "{transfer.description}"
                  </p>
                )}
              </div>

              {/* Icono de dinero y botón cerrar */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => toast.dismiss(t)}
                  className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors group"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </button>
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        duration: 8000,
        position: 'bottom-right',
      }
    );

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
  }, [onNewTransfer]);

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
            transform: translateY(100%);
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
            transform: translateY(100%);
            opacity: 0;
          }
        }
      `}</style>
      <Toaster
        position="bottom-right"
        expand={false}
        toastOptions={{
          unstyled: true,
        }}
      />
    </>
  );
};

export default NotificationHub;
