// components/NotificationHub.tsx - Hub de notificaciones con Sonner

import { useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { ArrowDownLeft, DollarSign } from 'lucide-react';
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

    // Mostrar toast con Sonner
    toast.success(
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <ArrowDownLeft className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">Nueva transferencia recibida</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {senderName} te ha enviado {amount}
          </p>
          {transfer.description && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              "{transfer.description}"
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <DollarSign className="w-5 h-5 text-green-600" />
        </div>
      </div>,
      {
        duration: 8000, // 8 segundos
        position: 'top-right',
        className: 'bg-white border border-green-200',
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

  // Renderizar el Toaster de Sonner
  return (
    <Toaster
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        className: 'rounded-xl shadow-lg',
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
          padding: '16px',
        },
      }}
    />
  );
};

export default NotificationHub;
