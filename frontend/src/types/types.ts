// ==========================================
// TIPOS BASE DEL SISTEMA BANCARIZATE
// ==========================================

// Definición de tipos como interfaces independientes
export interface User {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
  overdraftLimit: number;
  role: string;
  phone?: string;
  isActive?: boolean;
}

export interface Student {
  id: string;
  userId?: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  balance: number;
  overdraftLimit: number;
  enrollmentDate?: Date;
  birthDate: string;
  institution: string;
  course: string;
  gender: string;
  status: 'active' | 'inactive' | 'graduated';
  isActive: boolean;
  createdAt: string;
}

export interface Teacher {
  id: string;
  userId?: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  balance: number;
  overdraftLimit: number;
  birthDate: string;
  institution: string;
  department?: string;
  subjects?: string[];
  courses: string[];
  hireDate?: Date;
  gender: string;
  status: 'active' | 'inactive' | 'retired';
  isActive: boolean;
  createdAt: string;
}

export interface Transfer {
  id: string;
  from?: string;
  to?: string;
  type?: 'sent' | 'received';
  direction?: 'sent' | 'received';
  amount: number;
  totalAmount: number;
  date: Date | string;
  completedAt?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  isMultiple: boolean;
  otherPerson?: {
    id: string;
    name: string;
    run: string;
    role: string;
  };
  recipients: Array<{
    id: string;
    name: string;
    run: string;
    role: string;
    amount: number;
    status: string;
  }>;
  recipientCount: number;
}

export interface Activity {
  id: string;
  type: 'login' | 'transfer' | 'student_created' | 'teacher_created' | 'profile_updated' | string;
  description: string;
  date: Date | string;
  userId: string;
  metadata?: any;
  user?: {
    id: string;
    run: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    displayName: string;
    displayRole: string;
  };
}

// ==========================================
// TIPOS PARA COMPONENTES ESPECÍFICOS
// ==========================================

export interface SelectedRecipient {
  id: string;
  name: string;
  run: string;
  role: string;
  displayRole: string;
  amount?: number;
  favorite?: boolean;
}

export interface ActivityFilters {
  page: number;
  limit: number;
  date: string;
  startDate: string;
  endDate: string;
  type: string;
  search: string;
  userId: string;
  userRun: string;
  userRole: string;
  institution: string;
}

export interface ActivityResponse {
  status: string;
  data: {
    activities: Activity[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
    isAdmin: boolean;
    debug?: any;
  };
}

export interface LoadingScreenProps {
  onComplete: () => void;
  userName?: string;
  skipAnimation?: boolean;
}

export interface StatCardProps {
  icon: any;
  title: any;
  value: any;
  subtitle: any;
  trend: any;
  iconBgColor: any;
  iconColor: any;
  valueColor: any;
  onClick: any;
}

// ==========================================
// TIPOS ADMINISTRATIVOS
// ==========================================

export interface Institution {
  id: string;
  name: string;
  type: 'universidad' | 'instituto' | 'colegio' | 'escuela' | 'centro_formacion' | '';
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  institutionId: string;
  name: string;
  code?: string;
  level: 'basico' | 'medio' | 'superior' | 'postgrado' | 'tecnico' | 'profesional' | '';
  durationMonths?: number;
  description?: string;
  isActive: boolean;
  institution?: {
    id: string;
    name: string;
    type: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  dataType: 'string' | 'number' | 'boolean';
  category: 'transfers' | 'users' | 'security' | 'general';
  minValue?: number | null;
  maxValue?: number | null;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MassUploadRow {
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate: string;
  institution: string;
  course?: string;
  courses?: string;
  gender: string;
  status?: string;
  initialBalance?: number;
  overdraftLimit?: number;
}

export interface MassUploadValidationError {
  row: number;
  errors: string[];
  data: MassUploadRow;
}

export interface MassUploadResult {
  status: string;
  data: {
    created: Array<{
      run: string;
      firstName: string;
      lastName: string;
      email: string;
      tempPassword: string;
      userId: string;
    }>;
    failed: Array<{
      run: string;
      firstName: string;
      lastName: string;
      error: string;
    }>;
    skipped: Array<{
      run: string;
      firstName: string;
      lastName: string;
      reason: string;
    }>;
    summary: {
      totalProcessed: number;
      created: number;
      failed: number;
      skipped: number;
      successRate: string;
    };
  };
}

// ✅ ACTUALIZADO: BackupStats adaptada al backend actual
export interface BackupStats {
  // Datos originales del servidor
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalTransfers: number;
  totalInstitutions: number;
  totalCourses: number;
  lastUpdated: string;
  
  // Propiedades computadas para compatibilidad con frontend
  summary: {
    totalTables: number;
    totalRecords: number;
    estimatedSizeMB: number;
  };
  recentBackups: Array<{
    id: string;
    action: string;
    created_at: string;
    createdAt?: string;
    metadata?: any;
    users?: {
      first_name: string;
      last_name: string;
      run: string;
    };
  }>;
  tableStats: {
    [tableName: string]: {
      count: number;
      error?: string;
    };
  };
}

export interface AdminPanelTab {
  id: string;
  label: string;
  icon: string;
  component: string;
  description: string;
  requiresAdmin: boolean;
}

// ==========================================
// TIPOS DE RESPUESTA API
// ==========================================

export interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface StudentsResponse {
  status: string;
  data: {
    students: Student[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface TeachersResponse {
  status: string;
  data: {
    teachers: Teacher[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface TransferHistoryResponse {
  status: string;
  data: {
    transfers: Transfer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface UserStats {
  status: string;
  data: {
    user: {
      name: string;
      balance: number;
      overdraftLimit: number;
      availableBalance: number;
    };
    limits: {
      dailyLimit: number;
      transferredToday: number;
      remainingToday: number;
      maxPerTransfer: number;
      usagePercentage: number;
    };
    stats: {
      transfersToday: number;
    };
  };
}

export interface CreateTransferResponse {
  status: string;
  message: string;
  data: {
    transferId: string;
    amount: number;
    newBalance: number;
    recipients: Array<{
      id: string;
      name: string;
      run: string;
      role: string;
      amount: number;
    }>;
    transferredToday: number;
    dailyLimit: number;
  };
}

export interface UsersResponse {
  status: string;
  data: {
    users: User[];
    stats: {
      total: number;
      students: number;
      teachers: number;
      admins: number;
      institutions: string[];
    };
  };
}

export interface ApiError {
  status: string;
  message: string;
}

// ==========================================
// TIPOS PARA VIEW TRANSITION API
// ==========================================

export interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
}

declare global {
  interface Document {
    startViewTransition(callback: () => void): ViewTransition;
  }
}

// ==========================================
// TIPOS PARA CONFIGURACIÓN DE NOTIFICACIONES
// ==========================================

export type NotificationPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type NotificationSize = 'small' | 'medium' | 'large';

export interface NotificationColors {
  // Colores del gradiente principal
  gradientFrom: string;
  gradientTo: string;

  // Color de la barra de progreso
  progressBarFrom: string;
  progressBarTo: string;

  // Color del borde
  borderColor: string;

  // Color de fondo
  backgroundColor: string;

  // Colores del texto
  titleColor: string;
  textColor: string;
  descriptionColor: string;
}

export interface NotificationConfig {
  // Estado
  enabled: boolean;

  // Posición
  position: NotificationPosition;

  // Tamaño
  size: NotificationSize;

  // Duración (en milisegundos)
  duration: number;

  // Colores
  colors: NotificationColors;

  // Mostrar barra de progreso
  showProgressBar: boolean;

  // Mostrar botón de cerrar
  showCloseButton: boolean;

  // Mostrar icono de dinero
  showMoneyIcon: boolean;

  // Ancho personalizado (en px, solo si size es 'custom')
  customWidth?: number;

  // Configuración adicional
  playSound: boolean;
  showDescription: boolean;
  soundData?: string; // Base64 encoded audio file

  // Metadata
  lastUpdated?: string;
  updatedBy?: string;
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  enabled: true,
  position: 'bottom-right',
  size: 'medium',
  duration: 8000,
  colors: {
    gradientFrom: '#193cb8',
    gradientTo: '#0e2167',
    progressBarFrom: '#193cb8',
    progressBarTo: '#0e2167',
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    titleColor: '#111827',
    textColor: '#374151',
    descriptionColor: '#6b7280',
  },
  showProgressBar: true,
  showCloseButton: true,
  showMoneyIcon: true,
  playSound: false,
  showDescription: true,
  soundData: '',
};