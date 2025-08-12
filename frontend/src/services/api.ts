// services/api.ts - Servicio API COMPLETO con todas las funcionalidades CORREGIDO

// ==========================================
// IMPORTS DE TIPOS
// ==========================================
import type {
  User,
  Student,
  Teacher,
  Transfer,
  Activity,
  Institution,
  Course,
  SystemConfig,
  MassUploadRow,
  MassUploadValidationError,
  MassUploadResult,
  BackupStats,
  LoginResponse,
  StudentsResponse,
  TeachersResponse,
  TransferHistoryResponse,
  UserStats,
  CreateTransferResponse,
  UsersResponse,
  ApiError,
  ActivityResponse,
  ActivityFilters
} from '../types/types';

// ==========================================
// INTERFACES LOCALES PARA API
// ==========================================

interface InstitutionsResponse {
  status: string;
  data: {
    institutions: Institution[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface CoursesResponse {
  status: string;
  data: {
    courses: Course[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface SystemConfigResponse {
  status: string;
  data: {
    configurations: SystemConfig[];
    grouped: Record<string, SystemConfig[]>;
    categories: string[];
  };
}

interface MassUploadValidation {
  status: string;
  data: {
    valid: number;
    errors: number;
    validData: any[];
    validationErrors: Array<{
      row: number;
      errors: string[];
      data: any;
    }>;
    duplicates: {
      inFile: {
        runs: string[];
        emails: string[];
      };
      inDatabase: {
        runs: string[];
        emails: string[];
      };
    };
    summary: {
      totalRows: number;
      validRows: number;
      errorRows: number;
      duplicateRuns: number;
      duplicateEmails: number;
      existingRuns: number;
      existingEmails: number;
    };
  };
}

interface ActivityStats {
  status: string;
  data: {
    totalActivities: number;
    activityByType: Record<string, number>;
    dailyActivity: Record<string, number>;
    timeframe: string;
    period: {
      start: string;
      end: string;
    };
    isAdmin: boolean;
    byRole?: Record<string, number>;
    uniqueUsers?: number;
    totalGlobalActivities?: number;
  };
}

interface ActivityType {
  value: string;
  label: string;
  icon: string;
}

interface ActivityRole {
  value: string;
  label: string;
  icon: string;
}

interface AvailableUser {
  id: string;
  run: string;
  name: string;
  email: string;
  role: string;
  displayRole: string;
  displayText: string;
}

class ApiService {
  private baseURL: string;
  private _institutionCache: Institution[] | null = null;
  private _courseCache: Record<string, Course[]> = {};

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  }

  // ==========================================
  // MÉTODO GENÉRICO PARA REQUESTS
  // ==========================================
  
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    // ✅ CORREGIDO: Usar tipo específico para headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Agregar token si existe
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      // Para descargas de archivos, retornar el blob directamente
      if (options.headers && (
        (options.headers as any)['Accept'] === 'application/sql' ||
        (options.headers as any)['Accept'] === 'text/csv'
      )) {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return await response.blob();
      }
      
      const data = await response.json();

      console.log(`📡 API Response (${response.status}):`, data);

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS DE AUTENTICACIÓN
  // ==========================================

  async login(run: string, password: string): Promise<LoginResponse> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ run, password }),
    });

    if (response.status === 'success' && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async verifyToken(): Promise<any> {
    return await this.request('/auth/verify', {
      method: 'GET',
    });
  }

  async logout(): Promise<any> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return response;
  }

  // ==========================================
  // MÉTODOS DE ESTUDIANTES
  // ==========================================

  async getStudents(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    institution?: string;
    course?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<StudentsResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // ✅ CORREGIDO: Validar que value no sea null/undefined
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/students?${queryParams.toString()}`);
  }

  async getStudentById(id: string): Promise<any> {
    return await this.request(`/students/${id}`);
  }

  async createStudent(data: Partial<Student>): Promise<any> {
    return await this.request('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<any> {
    return await this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(id: string): Promise<any> {
    return await this.request(`/students/${id}`, {
      method: 'DELETE',
    });
  }

  async changeStudentPassword(id: string, newPassword: string): Promise<any> {
    return await this.request(`/students/${id}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // ==========================================
  // MÉTODOS DE DOCENTES
  // ==========================================

  async getTeachers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    institution?: string;
    course?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<TeachersResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // ✅ CORREGIDO: Validar que value no sea null/undefined
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/teachers?${queryParams.toString()}`);
  }

  async getTeacherById(id: string): Promise<any> {
    return await this.request(`/teachers/${id}`);
  }

  async createTeacher(data: Partial<Teacher>): Promise<any> {
    return await this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeacher(id: string, data: Partial<Teacher>): Promise<any> {
    return await this.request(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeacher(id: string): Promise<any> {
    return await this.request(`/teachers/${id}`, {
      method: 'DELETE',
    });
  }

  async changeTeacherPassword(id: string, newPassword: string): Promise<any> {
    return await this.request(`/teachers/${id}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  // ==========================================
  // MÉTODOS ADMINISTRATIVOS
  // ==========================================

  async getAllUsers(params?: {
    search?: string;
    role?: string;
    limit?: number;
  }): Promise<UsersResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // ✅ CORREGIDO: Validar que value no sea null/undefined
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/admin/users?${queryParams.toString()}`);
  }

  async getInstitutions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    active?: string;
  }): Promise<InstitutionsResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/admin/institutions?${queryParams.toString()}`);
  }

  async getActiveInstitutions(): Promise<InstitutionsResponse> {
    return await this.getInstitutions({ active: 'true' });
  }

  // ✅ CORREGIDO: Formatear instituciones para select - maneja respuesta con paginación
  formatInstitutionsForSelect(response: InstitutionsResponse | Institution[]): Array<{value: string, label: string}> {
    // Si es un array directo de instituciones
    if (Array.isArray(response)) {
      return response.map(inst => ({
        value: inst.id,
        label: inst.name
      }));
    }
    
    // Si es una respuesta con paginación
    if (response && 'data' in response && response.data.institutions) {
      return response.data.institutions.map(inst => ({
        value: inst.id,
        label: inst.name
      }));
    }
    
    return [];
  }

  async getInstitutionNameById(id: string): Promise<string> {
    try {
      const response = await this.request(`/admin/institutions/${id}`);
      return response.data.institution.name;
    } catch (error) {
      return 'Institución no encontrada';
    }
  }

  async getInstitutionStats(): Promise<{ data: { total: number } }> {
    return await this.request('/admin/institutions/stats');
  }

  async createInstitution(data: Partial<Institution>): Promise<any> {
    return await this.request('/admin/institutions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInstitution(id: string, data: Partial<Institution>): Promise<any> {
    return await this.request(`/admin/institutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInstitution(id: string): Promise<any> {
    return await this.request(`/admin/institutions/${id}`, {
      method: 'DELETE',
    });
  }

  async getCourses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    institution?: string;
    institutionId?: string;
    level?: string;
    active?: string;
  }): Promise<CoursesResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/admin/courses?${queryParams.toString()}`);
  }

  async getCoursesByInstitutionId(institutionId: string): Promise<CoursesResponse> {
    return await this.getCourses({ institutionId, active: 'true' });
  }

  // ✅ CORREGIDO: Formatear cursos para select - maneja respuesta con paginación
  formatCoursesForSelect(response: CoursesResponse | Course[]): Array<{value: string, label: string}> {
    // Si es un array directo de cursos
    if (Array.isArray(response)) {
      return response.map(course => ({
        value: course.id,
        label: course.name
      }));
    }
    
    // Si es una respuesta con paginación
    if (response && 'data' in response && response.data.courses) {
      return response.data.courses.map(course => ({
        value: course.id,
        label: course.name
      }));
    }
    
    return [];
  }

  async getCourseNameById(courseId: string, institutionId?: string): Promise<string> {
    try {
      const response = await this.request(`/admin/courses/${courseId}`);
      return response.data.course.name;
    } catch (error) {
      return 'Curso no encontrado';
    }
  }

  async getCourseStats(): Promise<{ data: { total: number } }> {
    return await this.request('/admin/courses/stats');
  }

  async createCourse(data: Partial<Course>): Promise<any> {
    return await this.request('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCourse(id: string, data: Partial<Course>): Promise<any> {
    return await this.request(`/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCourse(id: string): Promise<any> {
    return await this.request(`/admin/courses/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // CONFIGURACIÓN DEL SISTEMA
  // ==========================================

  async getSystemConfig(): Promise<SystemConfigResponse> {
    return await this.request('/admin/config');
  }

  async getSystemConfigurations(params?: any): Promise<SystemConfigResponse> {
    return await this.getSystemConfig();
  }

  async updateConfig(id: string, value: string): Promise<any> {
    return await this.request(`/admin/config/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // ✅ CORREGIDO: updateMultipleConfigurations ahora acepta 'id' en lugar de 'key'
  async updateMultipleConfigurations(updates: Array<{id: string, value: string}>): Promise<any> {
    return await this.request('/admin/config/bulk-update', {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async getConfigurationHistory(configKey: string, params?: any): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/admin/config/${configKey}/history?${queryParams.toString()}`);
  }

  // ==========================================
  // BACKUP Y SISTEMA
  // ==========================================

  async getBackupStats(): Promise<{ data: BackupStats }> {
    return await this.request('/admin/backup/stats');
  }

  async getBackupHistory(params?: any): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/admin/backup/history?${queryParams.toString()}`);
  }

  async getTablePreview(tableName: string, params?: any): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/admin/backup/tables/${tableName}/preview?${queryParams.toString()}`);
  }

  async createBackup(): Promise<any> {
    return await this.request('/admin/backup/create', {
      method: 'POST',
    });
  }

  async createFullBackup(options?: any): Promise<Blob> {
    return await this.request('/admin/backup/full', {
      method: 'POST',
      body: JSON.stringify(options || {}),
      headers: {
        'Accept': 'application/sql',
      },
    });
  }

  async createTableBackup(tableName: string, options?: any): Promise<Blob> {
    return await this.request(`/admin/backup/tables/${tableName}`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
      headers: {
        'Accept': 'application/sql',
      },
    });
  }

  async downloadBackup(id: string): Promise<Blob> {
    return await this.request(`/admin/backup/${id}/download`, {
      headers: {
        'Accept': 'application/sql',
      },
    });
  }

  // ==========================================
  // MASS UPLOAD
  // ==========================================

  async validateMassUpload(type: 'student' | 'teacher', file: File): Promise<MassUploadValidation> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return await this.request('/admin/mass-upload/validate', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // ✅ CORREGIDO: Tipo de retorno corregido para executeMassUpload
  async executeMassUpload(type: 'student' | 'teacher', validData: any[]): Promise<{ data: MassUploadResult }> {
    const response = await this.request('/admin/mass-upload/execute', {
      method: 'POST',
      body: JSON.stringify({ type, validData }),
    });
    
    // Si la respuesta ya tiene la estructura correcta
    if (response.data && response.data.summary) {
      return { data: response.data };
    }
    
    // Si la respuesta ES el MassUploadResult directamente
    if (response.summary) {
      return { data: response };
    }
    
    // Por defecto, asumir que la respuesta completa es el resultado
    return response;
  }

  async getCSVTemplate(type: 'student' | 'teacher'): Promise<Blob> {
    return await this.request(`/admin/templates/${type}`, {
      headers: {
        'Accept': 'text/csv',
      },
    });
  }

  // ==========================================
  // ACTIVIDAD Y LOGS
  // ==========================================

  async getActivityLog(filters: Partial<ActivityFilters>): Promise<ActivityResponse> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        queryParams.append(key, value.toString());
      }
    });
    return await this.request(`/activity?${queryParams.toString()}`);
  }

  async getActivityStats(filters?: { timeframe?: string }): Promise<ActivityStats> {
    const queryParams = new URLSearchParams();
    if (filters?.timeframe) queryParams.append('timeframe', filters.timeframe);
    return await this.request(`/activity/stats?${queryParams.toString()}`);
  }

  async getActivityTypes(): Promise<{ status: string; data: ActivityType[] }> {
    return await this.request('/activity/types');
  }

  async getActivityRoles(): Promise<{ status: string; data: ActivityRole[] }> {
    return await this.request('/activity/roles');
  }

  async getAvailableUsers(search?: string): Promise<{ status: string; data: AvailableUser[] }> {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    return await this.request(`/activity/users?${queryParams.toString()}`);
  }

  // ==========================================
  // MÉTODOS DE TRANSFERENCIAS
  // ==========================================

  async createTransfer(transferData: {
    recipientIds: string[];
    amount?: number;
    description: string;
    distributionMode?: 'equal' | 'custom';
    recipientAmounts?: number[];
  }): Promise<CreateTransferResponse> {
    return await this.request('/transfers', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  async getTransferHistory(params?: {
    page?: number;
    limit?: number;
    type?: 'all' | 'sent' | 'received';
    status?: 'all' | 'completed' | 'pending' | 'failed';
  }): Promise<TransferHistoryResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type && params.type !== 'all') queryParams.append('type', params.type);
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status);

    const endpoint = `/transfers/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async getTransferDetails(transferId: string): Promise<any> {
    return await this.request(`/transfers/${transferId}`);
  }

  async getUserStats(): Promise<UserStats> {
    return await this.request('/transfers/stats');
  }

  async getClassmates(): Promise<any> {
    return await this.request('/transfers/classmates');
  }

  // ==========================================
  // OTROS MÉTODOS
  // ==========================================

  async getDashboardStats(): Promise<any> {
    return await this.request('/dashboard/stats');
  }

  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/api/health`);
      const data = await response.json();
      console.log('💚 Health check exitoso:', data);
      return data;
    } catch (error) {
      console.error('❤️‍🩹 Health check falló:', error);
      throw new Error('No se puede conectar con el backend');
    }
  }

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  /**
   * Capitalizar primera letra de una palabra
   */
  private capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Método helper para obtener usuario actual desde localStorage
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  /**
   * Método helper para verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Verificar si el usuario es admin
   */
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  /**
   * Método helper para obtener el rol del usuario actual
   */
  getCurrentUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  /**
   * Método helper para formatear nombres completos
   */
  formatFullName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
  }

  /**
   * Método helper para formatear RUN chileno
   */
  formatRUN(run: string): string {
    if (!run) return '';
    // Remover puntos y guiones existentes
    const cleanRUN = run.replace(/[\.\-]/g, '');
    // Formatear: XX.XXX.XXX-X
    if (cleanRUN.length >= 8) {
      const body = cleanRUN.slice(0, -1);
      const dv = cleanRUN.slice(-1);
      return `${body.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}-${dv}`;
    }
    return run;
  }

  /**
   * Método helper para validar email
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Método helper para validar teléfono chileno
   */
  isValidChileanPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(\+56)?9\d{8}$/;
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Método helper para formatear montos
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
}

// Instancia singleton
export const apiService = new ApiService();

// Exportar tipos principales 
export type { 
  LoginResponse, 
  ApiError, 
  Student, 
  StudentsResponse,
  Teacher,
  TeachersResponse,
  User,
  UsersResponse,
  Transfer,
  TransferHistoryResponse,
  UserStats,
  CreateTransferResponse,
  Activity,
  ActivityStats,
  ActivityResponse,
  ActivityType,
  ActivityRole,
  AvailableUser,
  Institution,
  InstitutionsResponse,
  Course,
  CoursesResponse,
  SystemConfig,
  SystemConfigResponse,
  MassUploadValidation,
  MassUploadResult,
  BackupStats
};