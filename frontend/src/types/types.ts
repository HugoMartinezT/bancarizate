// Definición de tipos como interfaces independientes
export interface User {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
  overdraftLimit: number;
}

export interface Student {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  enrollmentDate: Date;
  course: string;
  status: 'active' | 'inactive' | 'graduated';
}

export interface Teacher {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  subjects: string[];
  hireDate: Date;
  status: 'active' | 'inactive' | 'retired';
}

export interface Transfer {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: Date;
  description: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface Activity {
  id: string;
  type: 'login' | 'transfer' | 'student_created' | 'teacher_created' | 'profile_updated';
  description: string;
  date: Date;
  userId: string;
}

// ==========================================
// ✅ NUEVOS TIPOS ADMINISTRATIVOS
// ==========================================

export interface Institution {
  id: string;
  name: string;
  type: 'universidad' | 'instituto' | 'colegio' | 'escuela' | 'centro_formacion';
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
  level: 'basico' | 'medio' | 'superior' | 'postgrado' | 'tecnico' | 'profesional';
  durationMonths?: number;
  description?: string;
  isActive: boolean;
  institution?: {
    id: string;
    name: string;
    type: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  dataType: 'string' | 'number' | 'boolean';
  category: 'transfers' | 'users' | 'security' | 'general';
  minValue?: number;
  maxValue?: number;
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
  course?: string; // Para estudiantes
  courses?: string; // Para docentes (separado por comas)
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
}

export interface BackupStats {
  tableStats: Record<string, { count: number; error?: string }>;
  summary: {
    totalTables: number;
    totalRecords: number;
    estimatedSizeKB: number;
    estimatedSizeMB: string;
  };
  recentBackups: Array<{
    id: string;
    action: string;
    createdAt: string;
    metadata: any;
  }>;
}

export interface AdminPanelTab {
  id: string;
  label: string;
  icon: string;
  component: string;
  description: string;
  requiresAdmin: boolean;
}