// services/transferNotificationService.ts - Servicio de notificaciones de transferencias con polling inteligente

import type { Transfer } from '../types/types';

// ==========================================
// CONFIGURACIÓN DEL POLLING
// ==========================================

const POLLING_CONFIG = {
  // Intervalo normal: 15 segundos (4 req/min, muy por debajo del límite de 60 req/min)
  NORMAL_INTERVAL: 15000,

  // Intervalo cuando hay error: backoff exponencial
  ERROR_INTERVAL_BASE: 30000,
  ERROR_INTERVAL_MAX: 120000, // Máximo 2 minutos

  // Intervalo cuando la pestaña no está activa
  BACKGROUND_INTERVAL: 60000, // 1 minuto

  // Número de reintentos antes de aumentar el intervalo
  MAX_RETRIES: 3,
};

// ==========================================
// TIPOS
// ==========================================

export interface NewTransferNotification {
  transfer: Transfer;
  timestamp: string;
}

export type NotificationCallback = (notification: NewTransferNotification) => void;

interface PollingState {
  isActive: boolean;
  intervalId: number | null;
  currentInterval: number;
  lastCheckTimestamp: string | null;
  lastKnownTransfers: Set<string>;
  errorCount: number;
  isTabVisible: boolean;
  callbacks: Set<NotificationCallback>;
  initialLoadComplete: boolean; // Flag para evitar notificaciones en la carga inicial
}

// ==========================================
// ESTADO DEL SERVICIO
// ==========================================

const state: PollingState = {
  isActive: false,
  intervalId: null,
  currentInterval: POLLING_CONFIG.NORMAL_INTERVAL,
  lastCheckTimestamp: null,
  lastKnownTransfers: new Set(),
  errorCount: 0,
  isTabVisible: true,
  callbacks: new Set(),
  initialLoadComplete: false,
};

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

/**
 * Obtiene el token de autenticación
 */
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Calcula el intervalo de backoff exponencial
 */
const calculateBackoffInterval = (errorCount: number): number => {
  const interval = Math.min(
    POLLING_CONFIG.ERROR_INTERVAL_BASE * Math.pow(2, errorCount),
    POLLING_CONFIG.ERROR_INTERVAL_MAX
  );
  return interval;
};

/**
 * Verifica si estamos siendo rate limited
 */
const isRateLimited = (error: any): boolean => {
  return error?.status === 429 ||
         error?.message?.toLowerCase().includes('rate limit') ||
         error?.message?.toLowerCase().includes('demasiadas');
};

/**
 * Realiza la consulta al servidor para obtener transferencias recientes
 */
const fetchRecentTransfers = async (): Promise<Transfer[]> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('No authentication token');
  }

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Construir la URL con parámetros para obtener solo las transferencias más recientes
  const params = new URLSearchParams({
    page: '1',
    limit: '10', // Solo las últimas 10
    type: 'received', // Solo las recibidas
  });

  // Si tenemos un timestamp de última verificación, agregarlo
  if (state.lastCheckTimestamp) {
    params.append('since', state.lastCheckTimestamp);
  }

  const url = `${baseUrl}/transfers/history?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      status: response.status,
      message: errorData.message || `HTTP ${response.status}`,
      data: errorData,
    };
  }

  const data = await response.json();
  return data.data?.transfers || [];
};

/**
 * Procesa las transferencias y detecta las nuevas
 */
const processTransfers = (transfers: Transfer[]): NewTransferNotification[] => {
  const notifications: NewTransferNotification[] = [];
  const currentTimestamp = new Date().toISOString();

  // Filtrar solo transferencias recibidas que no conocíamos antes
  for (const transfer of transfers) {
    const transferId = transfer.id;

    // Si es una transferencia recibida y no la conocíamos
    if (
      (transfer.type === 'received' || transfer.direction === 'received') &&
      !state.lastKnownTransfers.has(transferId)
    ) {
      // Solo notificar si ya completamos la carga inicial
      // En la primera carga, solo registramos las transferencias existentes
      if (state.initialLoadComplete) {
        notifications.push({
          transfer,
          timestamp: currentTimestamp,
        });
      }

      // Agregar a las conocidas (siempre, incluso en carga inicial)
      state.lastKnownTransfers.add(transferId);
    }
  }

  return notifications;
};

/**
 * Ejecuta el polling una vez
 */
const poll = async (): Promise<void> => {
  try {
    // Si no hay token, pausar el polling
    if (!getAuthToken()) {
      console.log('[TransferNotificationService] No auth token, pausing polling');
      stop();
      return;
    }

    // Realizar la consulta
    const transfers = await fetchRecentTransfers();

    // Actualizar el timestamp de última verificación
    state.lastCheckTimestamp = new Date().toISOString();

    // Procesar transferencias y detectar nuevas
    const notifications = processTransfers(transfers);

    // Marcar la carga inicial como completa después del primer poll exitoso
    if (!state.initialLoadComplete) {
      state.initialLoadComplete = true;
      console.log('[TransferNotificationService] Carga inicial completa, notificaciones activadas');
    }

    // Notificar a todos los callbacks registrados
    if (notifications.length > 0) {
      console.log(`[TransferNotificationService] ${notifications.length} nueva(s) transferencia(s) detectada(s)`);

      for (const callback of state.callbacks) {
        for (const notification of notifications) {
          try {
            callback(notification);
          } catch (error) {
            console.error('[TransferNotificationService] Error en callback:', error);
          }
        }
      }
    }

    // Reset del contador de errores si todo salió bien
    if (state.errorCount > 0) {
      console.log('[TransferNotificationService] Conexión restaurada');
      state.errorCount = 0;
      state.currentInterval = state.isTabVisible
        ? POLLING_CONFIG.NORMAL_INTERVAL
        : POLLING_CONFIG.BACKGROUND_INTERVAL;
    }

  } catch (error: any) {
    console.error('[TransferNotificationService] Error en polling:', error);

    // Incrementar contador de errores
    state.errorCount++;

    // Si es rate limiting, aumentar significativamente el intervalo
    if (isRateLimited(error)) {
      console.warn('[TransferNotificationService] Rate limit detectado, aumentando intervalo');
      state.currentInterval = POLLING_CONFIG.ERROR_INTERVAL_MAX;
      state.errorCount = POLLING_CONFIG.MAX_RETRIES; // Forzar backoff máximo
    } else if (state.errorCount >= POLLING_CONFIG.MAX_RETRIES) {
      // Aplicar backoff exponencial
      const newInterval = calculateBackoffInterval(state.errorCount - POLLING_CONFIG.MAX_RETRIES);
      console.warn(`[TransferNotificationService] Múltiples errores, nuevo intervalo: ${newInterval}ms`);
      state.currentInterval = newInterval;
    }

    // Si el error es de autenticación, detener el polling
    if (error?.status === 401 || error?.status === 403) {
      console.error('[TransferNotificationService] Error de autenticación, deteniendo polling');
      stop();
    }
  }
};

/**
 * Maneja el cambio de visibilidad de la pestaña
 */
const handleVisibilityChange = (): void => {
  const isVisible = document.visibilityState === 'visible';

  if (state.isTabVisible === isVisible) {
    return; // No hay cambio
  }

  state.isTabVisible = isVisible;

  if (state.isActive) {
    // Reiniciar el polling con el nuevo intervalo
    const oldInterval = state.currentInterval;
    state.currentInterval = isVisible
      ? POLLING_CONFIG.NORMAL_INTERVAL
      : POLLING_CONFIG.BACKGROUND_INTERVAL;

    if (oldInterval !== state.currentInterval) {
      console.log(
        `[TransferNotificationService] Pestaña ${isVisible ? 'visible' : 'oculta'}, ` +
        `nuevo intervalo: ${state.currentInterval}ms`
      );

      // Reiniciar el intervalo
      if (state.intervalId !== null) {
        clearInterval(state.intervalId);
      }
      state.intervalId = window.setInterval(poll, state.currentInterval);

      // Si la pestaña se vuelve visible, hacer un poll inmediato
      if (isVisible) {
        poll();
      }
    }
  }
};

// ==========================================
// API PÚBLICA
// ==========================================

/**
 * Inicia el servicio de polling
 */
export const start = (): void => {
  if (state.isActive) {
    console.warn('[TransferNotificationService] Ya está activo');
    return;
  }

  console.log('[TransferNotificationService] Iniciando polling...');

  // Reiniciar flag de carga inicial
  state.initialLoadComplete = false;

  // Configurar el intervalo inicial basado en visibilidad
  state.currentInterval = state.isTabVisible
    ? POLLING_CONFIG.NORMAL_INTERVAL
    : POLLING_CONFIG.BACKGROUND_INTERVAL;

  // Iniciar el polling
  state.isActive = true;

  // Hacer un poll inmediato
  poll();

  // Configurar el intervalo
  state.intervalId = window.setInterval(poll, state.currentInterval);

  // Escuchar cambios de visibilidad
  document.addEventListener('visibilitychange', handleVisibilityChange);

  console.log(`[TransferNotificationService] Polling iniciado con intervalo de ${state.currentInterval}ms`);
};

/**
 * Detiene el servicio de polling
 */
export const stop = (): void => {
  if (!state.isActive) {
    return;
  }

  console.log('[TransferNotificationService] Deteniendo polling...');

  state.isActive = false;

  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }

  // Remover listener de visibilidad
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  console.log('[TransferNotificationService] Polling detenido');
};

/**
 * Registra un callback para recibir notificaciones
 */
export const subscribe = (callback: NotificationCallback): () => void => {
  state.callbacks.add(callback);

  // Retornar función de limpieza
  return () => {
    state.callbacks.delete(callback);
  };
};

/**
 * Reinicia el estado del servicio (útil al hacer logout)
 */
export const reset = (): void => {
  stop();
  state.lastCheckTimestamp = null;
  state.lastKnownTransfers.clear();
  state.errorCount = 0;
  state.callbacks.clear();
  state.currentInterval = POLLING_CONFIG.NORMAL_INTERVAL;
  state.initialLoadComplete = false; // Reiniciar flag de carga inicial

  console.log('[TransferNotificationService] Estado reiniciado');
};

/**
 * Obtiene el estado actual del servicio (para debugging)
 */
export const getState = () => ({
  isActive: state.isActive,
  currentInterval: state.currentInterval,
  lastCheckTimestamp: state.lastCheckTimestamp,
  knownTransfersCount: state.lastKnownTransfers.size,
  errorCount: state.errorCount,
  isTabVisible: state.isTabVisible,
  callbacksCount: state.callbacks.size,
  initialLoadComplete: state.initialLoadComplete,
});

// ==========================================
// EXPORT DEFAULT
// ==========================================

export default {
  start,
  stop,
  subscribe,
  reset,
  getState,
};
