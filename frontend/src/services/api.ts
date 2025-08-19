// services/api.ts - Servicio API COMPLETO con CORRECCIONES INTEGRADAS y NUEVO MÉTODO DE VERIFICACIÓN DE CONTRASEÑA

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
// NUEVOS TIPOS PARA RATE LIMITERS
// ==========================================
interface RateLimiterRefreshResponse {
  status: string;
  message: string;
  data: {
    refreshResult: {
      status: string;
      message: string;
      config: Record<string, number>;
      timestamp: string;
    };
    appliedAt: string;
    adminUser: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface RateLimiterStatusResponse {
  status: string;
  message: string;
  data: {
    configuration: Record<string, number | string>;
    timestamp: string;
    requestedBy: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface RateLimiterTestResponse {
  status: string;
  message: string;
  data: {
    rateLimitInfo: {
      limit: string | number;
      remaining: string | number;
      reset: string | number;
      used: string | number;
    };
    testType: string;
    timestamp: string;
    message: string;
  };
}

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

  // ==========================================
  // 🚀 PROPIEDADES DE OPTIMIZACIÓN
  // ==========================================
  private _institutionCache: {
    data: Institution[];
    timestamp: number;
    expiry: number;
  } | null = null;
  
  private _courseCache: Record<string, {
    data: Course[];
    timestamp: number;
    expiry: number;
  }> = {};
  
  private _abortControllers: Map<string, AbortController> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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

  /**
   * 🔑 Verificar contraseña actual del usuario autenticado
   * Solo para verificación - NO actualiza la contraseña
   * Usado para confirmar cambios críticos como rate limiters
   */
  async verifyCurrentPassword(password: string): Promise<any> {
    console.log('🔑 Verificando contraseña actual del usuario...');
 
    try {
      const response = await this.request('/auth/verify-current-password', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      console.log('✅ Contraseña verificada exitosamente');
      return response;
    } catch (error: any) {
      console.error('❌ Error verificando contraseña:', error);
   
      // Manejar errores específicos para mejor UX
      if (error.message.includes('401')) {
        throw new Error('Contraseña incorrecta');
      } else if (error.message.includes('429')) {
        throw new Error('Demasiados intentos fallidos. Espera antes de intentar nuevamente.');
      } else if (error.message.includes('403')) {
        throw new Error('Cuenta temporalmente bloqueada por seguridad');
      }
   
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS DE ESTUDIANTES
  // ==========================================

  async getStudents(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    institution?: string;
    course?: string;
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<StudentsResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
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

  async getTeachers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    institution?: string;
    course?: string;
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
  }): Promise<TeachersResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
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
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    return await this.request(`/transfers/users?${queryParams.toString()}`);
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

  // Formatear instituciones para select
  formatInstitutionsForSelect(response: InstitutionsResponse | Institution[]): Array<{value: string, label: string}> {
    if (Array.isArray(response)) {
      return response.map(inst => ({
        value: inst.id,
        label: inst.name
      }));
    }
    return response.data.institutions.map(inst => ({
      value: inst.id,
      label: inst.name
    }));
  }

  async getCourses(params?: {
    institution?: string;
    page?: number;
    limit?: number;
    search?: string;
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

  // Método para cursos por institución (usando params)
  async getCoursesByInstitutionId(institutionId: string): Promise<CoursesResponse> {
    return await this.getCourses({ institution: institutionId });
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

  // Formatear cursos para select
  formatCoursesForSelect(response: CoursesResponse | Course[]): Array<{value: string, label: string}> {
    if (Array.isArray(response)) {
      return response.map(course => ({
        value: course.id,
        label: course.name
      }));
    }
    return response.data.courses.map(course => ({
      value: course.id,
      label: course.name
    }));
  }

  // Helpers para nombres
  async getInstitutionNameById(id: string): Promise<string> {
    const response = await this.getInstitutions();
    const institution = response.data.institutions.find(inst => inst.id === id);
    return institution ? institution.name : 'Desconocido';
  }

  async getCourseNameById(id: string): Promise<string> {
    const response = await this.getCourses();
    const course = response.data.courses.find(c => c.id === id);
    return course ? course.name : 'Desconocido';
  }

  // Configuraciones del sistema
  async getSystemConfigurations(): Promise<SystemConfigResponse> {
    return await this.getSystemConfig();  // Alias para getSystemConfig
  }

  async updateMultipleConfigurations(updates: { key: string, value: any }[]): Promise<any> {
    return await this.request('/admin/config/multiple', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getConfigurationHistory(configKey: string, params?: { page?: number; limit?: number }): Promise<any> {
    return await this.getConfigHistory(configKey, params);  // Alias para getConfigHistory
  }

  async getSystemConfig(): Promise<SystemConfigResponse> {
    return await this.request('/admin/config');
  }

  async updateConfig(key: string, value: any): Promise<any> {
    return await this.request(`/admin/config/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
  }

  async getConfigHistory(configKey: string, params?: { page?: number; limit?: number }): Promise<any> {
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

  async getInstitutionStats(): Promise<any> {
    return await this.request('/admin/institutions/stats');
  }

  async getCourseStats(): Promise<any> {
    return await this.request('/admin/courses/stats');
  }

  // ==========================================
  // BACKUP Y SISTEMA - ✅ CORREGIDO
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
    return await this.request(`/admin/backup/table/${tableName}/preview?${queryParams.toString()}`);
  }

  async createBackup(): Promise<any> {
    return await this.request('/admin/backup/create', {
      method: 'POST',
    });
  }

  // ✅ CORREGIDO: Cambiar de POST a GET con query parameters
  async createFullBackup(options?: {
    includeData?: boolean;
    includeLogs?: boolean;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    
    if (options?.includeData !== undefined) {
      queryParams.append('includeData', options.includeData.toString());
    }
    
    if (options?.includeLogs !== undefined) {
      queryParams.append('includeLogs', options.includeLogs.toString());
    }

    const endpoint = `/admin/backup/full${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return await this.request(endpoint, {
      method: 'GET',  // ✅ Cambiar a GET
      headers: {
        'Accept': 'application/sql',
      },
    });
  }

  // ✅ CORREGIDO: Cambiar de POST a GET con query parameters
  async createTableBackup(tableName: string, options?: {
    includeData?: boolean;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    
    if (options?.includeData !== undefined) {
      queryParams.append('includeData', options.includeData.toString());
    }

    const endpoint = `/admin/backup/table/${tableName}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    return await this.request(endpoint, {
      method: 'GET',  // ✅ Cambiar a GET
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

  async executeMassUpload(type: 'student' | 'teacher', validData: any[]): Promise<{ data: MassUploadResult }> {
    const response = await this.request('/admin/mass-upload/execute', {
      method: 'POST',
      body: JSON.stringify({ type, validData }),
    });
    
    if (response.data && response.data.summary) {
      return { data: response.data };
    }
    
    if (response.summary) {
      return { data: response };
    }
    
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
      console.log('🩹 Health check exitoso:', data);
      return data;
    } catch (error) {
      console.error('❤️‍🩹 Health check falló:', error);
      throw new Error('No se puede conectar con el backend');
    }
  }

  // ==========================================
  // MÉTODOS PARA GESTIÓN DE RATE LIMITERS
  // ==========================================

  /**
   * 🔄 Refrescar rate limiters desde configuración de BD
   * Solo admins pueden ejecutar este endpoint
   */
  async refreshRateLimiters(): Promise<RateLimiterRefreshResponse> {
    console.log('🔄 Solicitando refresh de rate limiters...');
 
    try {
      const response = await this.request('/admin/config/rate-limiters/refresh', {
        method: 'POST',
      });
   
      console.log('✅ Rate limiters refrescados exitosamente:', response);
      return response;
   
    } catch (error) {
      console.error('❌ Error refrescando rate limiters:', error);
      throw error;
    }
  }

  /**
   * 📊 Obtener estado actual de rate limiters
   * Solo admins pueden consultar este endpoint
   */
  async getRateLimiterStatus(): Promise<RateLimiterStatusResponse> {
    console.log('📊 Consultando estado de rate limiters...');
 
    try {
      const response = await this.request('/admin/config/rate-limiters/status', {
        method: 'GET',
      });
   
      console.log('✅ Estado de rate limiters obtenido:', response);
      return response;
   
    } catch (error) {
      console.error('❌ Error obteniendo estado de rate limiters:', error);
      throw error;
    }
  }

  /**
   * 🧪 Probar funcionamiento de rate limiters
   * Solo admins pueden ejecutar este test
   */
  async testRateLimiters(): Promise<RateLimiterTestResponse> {
    console.log('🧪 Probando funcionamiento de rate limiters...');
 
    try {
      const response = await this.request('/admin/config/rate-limiters/test', {
        method: 'GET',
      });
   
      console.log('✅ Test de rate limiters exitoso:', response);
      return response;
   
    } catch (error) {
      console.error('❌ Error en test de rate limiters:', error);
      throw error;
    }
  }

  /**
   * 🔧 Método combinado: Actualizar configuración + Refrescar rate limiters
   * Flujo completo para cambios de rate limiting
   */
  async updateRateLimiterConfigs(updates: { key: string, value: any }[]): Promise<{
    configUpdate: any;
    rateLimiterRefresh: RateLimiterRefreshResponse;
  }> {
    console.log('🔧 Actualizando configuraciones de rate limiting:', updates);
 
    try {
      // 1. Actualizar configuraciones en BD
      console.log('📝 Paso 1: Actualizando configuraciones...');
      const configUpdate = await this.updateMultipleConfigurations(updates);
   
      // 2. Refrescar rate limiters para aplicar cambios
      console.log('🔄 Paso 2: Refrescando rate limiters...');
      const rateLimiterRefresh = await this.refreshRateLimiters();
   
      console.log('✅ Configuraciones y rate limiters actualizados exitosamente');
   
      return {
        configUpdate,
        rateLimiterRefresh
      };
   
    } catch (error) {
      console.error('❌ Error en actualización completa de rate limiters:', error);
      throw error;
    }
  }

  /**
   * 📋 Obtener configuraciones específicas de rate limiting
   * Filtra solo las configuraciones relacionadas con rate limiting
   */
  async getRateLimitingConfigurations(): Promise<SystemConfigResponse> {
    console.log('📋 Obteniendo configuraciones de rate limiting...');
 
    try {
      const response = await this.getSystemConfig();
   
      // Filtrar solo configuraciones de rate limiting
      const rateLimitConfigs = response.data.configurations.filter(config =>
        config.category === 'security' && config.configKey.includes('_limit_')
      );
   
      console.log(`✅ ${rateLimitConfigs.length} configuraciones de rate limiting encontradas`);
   
      return {
        status: response.status,
        data: {
          configurations: rateLimitConfigs,
          grouped: { security: rateLimitConfigs },
          categories: ['security']
        }
      };
   
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones de rate limiting:', error);
      throw error;
    }
  }

  /**
   * 🎯 Validar configuración de rate limiting antes de aplicar
   * Verifica que los valores estén en rangos seguros
   */
  validateRateLimitConfig(key: string, value: number): {
    isValid: boolean;
    error?: string;
    recommendation?: string;
  } {
    const validationRules: Record<string, { min: number; max: number; recommended: number }> = {
      // Login limits
      'login_limit_max': { min: 3, max: 20, recommended: 5 },
      'login_limit_window_ms': { min: 300000, max: 3600000, recommended: 900000 }, // 5min - 1h
   
      // Transfer limits
      'transfer_limit_max': { min: 5, max: 50, recommended: 10 },
      'transfer_limit_window_ms': { min: 60000, max: 1800000, recommended: 300000 }, // 1min - 30min
   
      // General API limits
      'general_limit_max': { min: 50, max: 1000, recommended: 100 },
      'general_limit_window_ms': { min: 300000, max: 3600000, recommended: 900000 }, // 5min - 1h
   
      // User search limits
      'user_search_limit_max': { min: 10, max: 100, recommended: 30 },
      'user_search_limit_window_ms': { min: 30000, max: 300000, recommended: 60000 }, // 30s - 5min
   
      // History limits
      'history_limit_max': { min: 20, max: 200, recommended: 60 },
      'history_limit_window_ms': { min: 30000, max: 300000, recommended: 60000 }, // 30s - 5min
   
      // Password change limits
      'password_change_limit_max': { min: 1, max: 10, recommended: 3 },
      'password_change_limit_window_ms': { min: 1800000, max: 7200000, recommended: 3600000 }, // 30min - 2h
   
      // User creation limits
      'create_user_limit_max': { min: 5, max: 50, recommended: 10 },
      'create_user_limit_window_ms': { min: 1800000, max: 7200000, recommended: 3600000 }, // 30min - 2h
    };
 
    const rule = validationRules[key];
    if (!rule) {
      return {
        isValid: false,
        error: `Configuración desconocida: ${key}`
      };
    }
 
    if (value < rule.min) {
      return {
        isValid: false,
        error: `Valor demasiado bajo (mínimo: ${rule.min})`,
        recommendation: `Se recomienda: ${rule.recommended}`
      };
    }
 
    if (value > rule.max) {
      return {
        isValid: false,
        error: `Valor demasiado alto (máximo: ${rule.max})`,
        recommendation: `Se recomienda: ${rule.recommended}`
      };
    }
 
    return { isValid: true };
  }

  /**
   * 🔍 Formatear configuración de rate limiting para mostrar en UI
   * Convierte milisegundos a formato legible
   */
  formatRateLimitDisplay(key: string, value: number): string {
    if (key.includes('_window_ms')) {
      // Convertir milisegundos a formato legible
      const minutes = Math.floor(value / 60000);
      const seconds = Math.floor((value % 60000) / 1000);
   
      if (minutes > 0) {
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} minutos`;
      }
      return `${seconds} segundos`;
    }
 
    if (key.includes('_limit_max')) {
      return `${value} requests`;
    }
 
    return value.toString();
  }

  // ==========================================
  // 🚀 MÉTODOS OPTIMIZADOS
  // ==========================================

  /**
   * 🚀 OPTIMIZADO: Cache inteligente para instituciones
   * Evita requests repetitivos, cache de 5 minutos
   */
  async getActiveInstitutionsOptimized(): Promise<InstitutionsResponse> {
    const cacheKey = 'institutions';
    
    // Verificar cache válido
    if (this._institutionCache && 
        Date.now() - this._institutionCache.timestamp < this._institutionCache.expiry) {
      console.log('🚀 Cache hit - Instituciones');
      return {
        status: 'success',
        data: {
          institutions: this._institutionCache.data,
          pagination: { 
            page: 1, 
            limit: 100, 
            total: this._institutionCache.data.length, 
            totalPages: 1 
          }
        }
      };
    }

    // Cancelar request anterior si existe
    if (this._abortControllers.has(cacheKey)) {
      this._abortControllers.get(cacheKey)?.abort();
    }

    // Crear nuevo AbortController
    const abortController = new AbortController();
    this._abortControllers.set(cacheKey, abortController);

    try {
      console.log('📡 API Request - Instituciones (con cache)');
      const response = await this.getInstitutions({ active: 'true' });
      
      // Guardar en cache
      this._institutionCache = {
        data: response.data.institutions,
        timestamp: Date.now(),
        expiry: this.CACHE_DURATION
      };

      this._abortControllers.delete(cacheKey);
      return response;
    } catch (error) {
      this._abortControllers.delete(cacheKey);
      throw error;
    }
  }

  /**
   * 🚀 OPTIMIZADO: Cache inteligente para cursos por institución
   * Cache individual por institución, evita recargas innecesarias
   */
  async getCoursesByInstitutionOptimized(institutionId: string): Promise<CoursesResponse> {
    const cacheKey = `courses_${institutionId}`;
    
    // Verificar cache válido
    if (this._courseCache[institutionId] && 
        Date.now() - this._courseCache[institutionId].timestamp < this._courseCache[institutionId].expiry) {
      console.log('🚀 Cache hit - Cursos:', institutionId);
      return {
        status: 'success',
        data: {
          courses: this._courseCache[institutionId].data,
          pagination: { 
            page: 1, 
            limit: 100, 
            total: this._courseCache[institutionId].data.length, 
            totalPages: 1 
          }
        }
      };
    }

    // Cancelar request anterior si existe
    if (this._abortControllers.has(cacheKey)) {
      this._abortControllers.get(cacheKey)?.abort();
    }

    // Crear nuevo AbortController
    const abortController = new AbortController();
    this._abortControllers.set(cacheKey, abortController);

    try {
      console.log('📡 API Request - Cursos:', institutionId);
      const response = await this.getCoursesByInstitutionId(institutionId);
      
      // Guardar en cache
      this._courseCache[institutionId] = {
        data: response.data.courses,
        timestamp: Date.now(),
        expiry: this.CACHE_DURATION
      };

      this._abortControllers.delete(cacheKey);
      return response;
    } catch (error) {
      this._abortControllers.delete(cacheKey);
      throw error;
    }
  }

  /**
   * 🚀 OPTIMIZADO: Carga paralela completa para edición de estudiantes
   * Carga instituciones, estudiante y cursos de forma optimizada
   */
  async getStudentEditData(studentId: string): Promise<{
    student: any;
    institutions: Institution[];
    courses: Course[];
    institutionMap: Map<string, string>;
    courseMap: Map<string, string>;
  }> {
    console.log('📄 Cargando datos del estudiante de forma optimizada...');
    
    try {
      // 1. Cargar instituciones y estudiante EN PARALELO
      const [institutionsRes, studentRes] = await Promise.all([
        this.getActiveInstitutionsOptimized(),
        this.getStudentById(studentId)
      ]);

      const institutions = institutionsRes.data.institutions;
      const student = studentRes.data.student;

      console.log('✅ Instituciones y estudiante cargados');

      // 2. Encontrar institución del estudiante
      const studentInstitution = institutions.find(inst => 
        inst.name === student.institution
      );

      // 3. Cargar cursos SOLO para la institución del estudiante
      let courses: Course[] = [];
      if (studentInstitution) {
        const coursesRes = await this.getCoursesByInstitutionOptimized(studentInstitution.id);
        courses = coursesRes.data.courses;
        console.log('✅ Cursos cargados para institución:', studentInstitution.name);
      }

      // 4. Crear mapas optimizados para búsquedas O(1)
      const institutionMap = new Map(institutions.map(inst => [inst.name, inst.id]));
      const courseMap = new Map(courses.map(course => [course.name, course.id]));

      console.log('🎯 Datos del estudiante optimizados listos');

      return {
        student,
        institutions,
        courses,
        institutionMap,
        courseMap
      };

    } catch (error) {
      console.error('❌ Error cargando datos del estudiante:', error);
      throw error;
    }
  }

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  private capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }

  getCurrentUserRole(): string | null {
    const user = this.getCurrentUser();
    return user?.role || null;
  }

  formatFullName(firstName: string, lastName: string): string {
    return `${firstName} ${lastName}`.trim();
  }

  formatRUN(run: string): string {
    if (!run) return '';
    const cleanRUN = run.replace(/[\.\-]/g, '');
    if (cleanRUN.length >= 8) {
      const body = cleanRUN.slice(0, -1);
      const dv = cleanRUN.slice(-1);
      return `${body.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}-${dv}`;
    }
    return run;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidChileanPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(\+56)?9\d{8}$/;
    return phoneRegex.test(cleanPhone);
  }

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
  BackupStats,
  RateLimiterRefreshResponse,
  RateLimiterStatusResponse,
  RateLimiterTestResponse
};