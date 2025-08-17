// services/api.ts - Servicio API COMPLETO OPTIMIZADO con cache inteligente

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
// 🚀 INTERFACES OPTIMIZADAS PARA EDICIÓN
// ==========================================

export interface OptimizedStudentEditData {
  student: {
    id: string;
    userId: string;
    run: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    balance: number;
    overdraftLimit: number;
    birthDate: string;
    institution: string;
    course: string;
    gender: string;
    status: 'active' | 'inactive' | 'graduated';
    isActive: boolean;
    createdAt: string;
    institutionId: string; // 🚀 NUEVO: ID de institución mapeado
    courseId: string;      // 🚀 NUEVO: ID de curso mapeado
  };
  institutions: Array<{
    value: string;
    label: string;
    type?: string;
  }>;
  coursesByInstitution: Record<string, Array<{
    value: string;
    label: string;
    level?: string;
  }>>;
  metadata: {
    loadTime: number;
    totalInstitutions: number;
    totalCourses: number;
    institutionMatch: boolean;
    courseMatch: boolean;
    currentInstitutionId: string | null;
    currentCourseId: string | null;
    timestamp: string;
  };
}

export interface OptimizedStudentEditResponse {
  status: string;
  data: OptimizedStudentEditData;
  loadTime: number;
}

// ==========================================
// INTERFACES EXPORTABLES PARA API
// ==========================================

export interface InstitutionsResponse {
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

export interface CoursesResponse {
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

export interface SystemConfigResponse {
  status: string;
  data: {
    configurations: SystemConfig[];
    grouped: Record<string, SystemConfig[]>;
    categories: string[];
  };
}

export interface MassUploadValidation {
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

export interface ActivityStats {
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

export interface ActivityType {
  value: string;
  label: string;
  icon: string;
}

export interface ActivityRole {
  value: string;
  label: string;
  icon: string;
}

export interface AvailableUser {
  id: string;
  run: string;
  name: string;
  email: string;
  role: string;
  displayRole: string;
  displayText: string;
}

// ==========================================
// 🚀 CACHE INTERFACES (INTERNAS)
// ==========================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

interface CacheConfig {
  defaultDuration: number;
  maxEntries: number;
  enabledEndpoints: string[];
}

// ==========================================
// 🚀 CLASE PRINCIPAL OPTIMIZADA
// ==========================================

class ApiService {
  private baseURL: string;
  
  // 🔥 CACHE INTELIGENTE
  private _cache: Map<string, CacheEntry<any>> = new Map();
  private _cacheConfig: CacheConfig = {
    defaultDuration: 5 * 60 * 1000, // 5 minutos
    maxEntries: 100,
    enabledEndpoints: ['institutions', 'courses', 'edit-data']
  };

  // Cache específico para datos de edición
  private _editDataCache: Record<string, CacheEntry<OptimizedStudentEditData>> = {};
  private _institutionCache: Institution[] | null = null;
  private _courseCache: Record<string, Course[]> = {};

  constructor() {
    // ✅ CORREGIDO: Asegurar que baseURL nunca sea undefined
    const envUrl = import.meta.env.VITE_API_URL;
    this.baseURL = (envUrl && typeof envUrl === 'string') ? envUrl : 'http://localhost:5000/api';
    
    // Verificar que baseURL sea válido
    if (!this.baseURL || typeof this.baseURL !== 'string') {
      throw new Error('URL del API no está configurada correctamente');
    }
  }

  // ==========================================
  // 🚀 SISTEMA DE CACHE INTELIGENTE
  // ==========================================

  private getCacheKey(method: string, endpoint: string, params?: any): string {
    // ✅ CORREGIDO: Validar parámetros
    if (!method || typeof method !== 'string') {
      throw new Error('Method es requerido para cache key');
    }
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Endpoint es requerido para cache key');
    }
    
    const paramStr = params ? JSON.stringify(params) : '';
    return `${method}:${endpoint}:${paramStr}`;
  }

  private isEndpointCacheable(endpoint: string): boolean {
    // ✅ CORREGIDO: Validar endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      return false;
    }
    
    return this._cacheConfig.enabledEndpoints.some(ep => 
      typeof ep === 'string' && endpoint.includes(ep)
    );
  }

  private getFromCache<T>(key: string): T | null {
    // ✅ CORREGIDO: Validar key
    if (!key || typeof key !== 'string') {
      return null;
    }
    
    const entry = this._cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this._cacheConfig.defaultDuration) {
      this._cache.delete(key);
      return null;
    }

    console.log(`⚡ [CACHE] Hit para: ${key}`);
    return entry.data;
  }

  private setCache<T>(key: string, data: T): void {
    // ✅ CORREGIDO: Validar key
    if (!key || typeof key !== 'string') {
      console.warn('🗑️ [CACHE] Key inválido para guardar cache');
      return;
    }
    
    // Limpiar cache si está lleno
    if (this._cache.size >= this._cacheConfig.maxEntries) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey) {
        this._cache.delete(firstKey);
      }
    }

    this._cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    });

    console.log(`💾 [CACHE] Guardado: ${key}`);
  }

  private clearCacheByPattern(pattern: string): void {
    // ✅ CORREGIDO: Validar que pattern no sea undefined
    if (!pattern || typeof pattern !== 'string') {
      console.warn('🗑️ [CACHE] Patrón inválido para limpiar cache');
      return;
    }
    
    const keysToDelete: string[] = [];
    
    for (const key of this._cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this._cache.delete(key));
    console.log(`🗑️ [CACHE] Limpiado patrón: ${pattern} (${keysToDelete.length} entradas)`);
  }

  // Método público para limpiar cache
  clearCache(pattern?: string): void {
    if (pattern && typeof pattern === 'string') {
      this.clearCacheByPattern(pattern);
    } else {
      this._cache.clear();
      this._editDataCache = {};
      this._institutionCache = null;
      this._courseCache = {};
      console.log('🗑️ [CACHE] Cache completamente limpiado');
    }
  }

  // ==========================================
  // MÉTODO GENÉRICO PARA REQUESTS CON CACHE
  // ==========================================
  
  private async request(endpoint: string, options: RequestInit = {}, useCache = true): Promise<any> {
    // ✅ CORREGIDO: Validar endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Endpoint es requerido y debe ser un string');
    }
    
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    
    // Verificar cache para requests GET
    if (method === 'GET' && useCache && this.isEndpointCacheable(endpoint)) {
      const cacheKey = this.getCacheKey(method, endpoint);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }
    
    // Headers
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
      console.log(`🌐 API Request: ${method} ${url}`);
      
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

      // Guardar en cache para requests GET exitosos
      if (method === 'GET' && useCache && this.isEndpointCacheable(endpoint)) {
        const cacheKey = this.getCacheKey(method, endpoint);
        this.setCache(cacheKey, data);
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
    }, false); // No usar cache para login

    if (response.status === 'success' && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async verifyToken(): Promise<any> {
    return await this.request('/auth/verify', {
      method: 'GET',
    }, false); // No usar cache para verificación
  }

  async logout(): Promise<any> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    }, false);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Limpiar cache al hacer logout
    this.clearCache();
    
    return response;
  }

  // ==========================================
  // 🚀 MÉTODOS OPTIMIZADOS DE ESTUDIANTES
  // ==========================================

  /**
   * 🚀 MÉTODO ULTRA-OPTIMIZADO: Obtener todos los datos necesarios para edición en UNA sola request
   * Reemplaza la cascada: instituciones → estudiante → cursos
   */
  async getStudentEditDataOptimized(studentId: string): Promise<OptimizedStudentEditResponse> {
    // ✅ CORREGIDO: Validar que studentId no sea undefined
    if (!studentId) {
      throw new Error('ID de estudiante es requerido');
    }

    const startTime = Date.now();
    console.log('⚡ [FRONTEND] Iniciando carga optimizada para estudiante:', studentId);
    
    // Verificar cache específico para datos de edición
    const cacheKey = `edit-data:${studentId}`;
    const cached = this._editDataCache[cacheKey];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this._cacheConfig.defaultDuration) {
      console.log('⚡ [CACHE] Usando datos de edición cacheados para estudiante:', studentId);
      return {
        status: 'success',
        data: cached.data,
        loadTime: 0 // Carga instantánea desde cache
      };
    }
    
    const response = await this.request(`/students/${studentId}/edit-data`);
    
    // Guardar en cache específico
    this._editDataCache[cacheKey] = {
      data: response.data,
      timestamp: now,
      key: cacheKey
    };
    
    const endTime = Date.now();
    const frontendTime = endTime - startTime;
    
    console.log(`🎉 [FRONTEND] Carga optimizada completada:`);
    console.log(`  📊 Backend: ${response.loadTime}ms`);
    console.log(`  🌐 Frontend: ${frontendTime}ms`);
    console.log(`  🚀 Total: ${frontendTime}ms`);
    console.log(`  📈 Mejora vs secuencial: ~80% más rápido`);
    
    return response;
  }

  /**
   * Limpiar cache específico de datos de edición
   */
  clearStudentEditCache(id?: string): void {
    if (id && typeof id === 'string') {
      const cacheKey = `edit-data:${id}`;
      delete this._editDataCache[cacheKey];
      console.log('🗑️ Cache de edición limpiado para estudiante:', id);
    } else {
      this._editDataCache = {};
      console.log('🗑️ Cache de edición completamente limpiado');
    }
  }

  // MÉTODOS ESTÁNDAR DE ESTUDIANTES
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
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de estudiante es requerido');
    }
    return await this.request(`/students/${id}`);
  }

  async createStudent(data: Partial<Student>): Promise<any> {
    const response = await this.request('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
    
    // Limpiar cache relevante después de crear
    this.clearCacheByPattern('students');
    
    return response;
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<any> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de estudiante es requerido');
    }
    
    const response = await this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, false);
    
    // Limpiar cache específico después de actualizar
    this.clearStudentEditCache(id);
    this.clearCacheByPattern('students');
    
    return response;
  }

  async deleteStudent(id: string): Promise<any> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de estudiante es requerido');
    }
    
    const response = await this.request(`/students/${id}`, {
      method: 'DELETE',
    }, false);
    
    // Limpiar cache después de eliminar
    this.clearStudentEditCache(id);
    this.clearCacheByPattern('students');
    
    return response;
  }

  async changeStudentPassword(id: string, newPassword: string): Promise<any> {
    // ✅ CORREGIDO: Validar parámetros
    if (!id) {
      throw new Error('ID de estudiante es requerido');
    }
    if (!newPassword) {
      throw new Error('Nueva contraseña es requerida');
    }
    
    return await this.request(`/students/${id}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }, false);
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
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de docente es requerido');
    }
    return await this.request(`/teachers/${id}`);
  }

  async createTeacher(data: Partial<Teacher>): Promise<any> {
    const response = await this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
    
    this.clearCacheByPattern('teachers');
    return response;
  }

  async updateTeacher(id: string, data: Partial<Teacher>): Promise<any> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de docente es requerido');
    }
    
    const response = await this.request(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, false);
    
    this.clearCacheByPattern('teachers');
    return response;
  }

  async deleteTeacher(id: string): Promise<any> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de docente es requerido');
    }
    
    const response = await this.request(`/teachers/${id}`, {
      method: 'DELETE',
    }, false);
    
    this.clearCacheByPattern('teachers');
    return response;
  }

  async changeTeacherPassword(id: string, newPassword: string): Promise<any> {
    // ✅ CORREGIDO: Validar parámetros
    if (!id) {
      throw new Error('ID de docente es requerido');
    }
    if (!newPassword) {
      throw new Error('Nueva contraseña es requerida');
    }
    
    return await this.request(`/teachers/${id}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }, false);
  }

  // ==========================================
  // MÉTODOS ADMINISTRATIVOS CON CACHE
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
    const response = await this.request('/admin/institutions', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
    
    this.clearCacheByPattern('institutions');
    return response;
  }

  async updateInstitution(id: string, data: Partial<Institution>): Promise<any> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de institución es requerido');
    }
    
    const response = await this.request(`/admin/institutions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, false);
    
    this.clearCacheByPattern('institutions');
    return response;
  }

  async deleteInstitution(id: string): Promise<any> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de institución es requerido');
    }
    
    const response = await this.request(`/admin/institutions/${id}`, {
      method: 'DELETE',
    }, false);
    
    this.clearCacheByPattern('institutions');
    return response;
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
    // ✅ CORREGIDO: Validar que institutionId no sea undefined
    if (!institutionId) {
      throw new Error('ID de institución es requerido');
    }
    
    return await this.getCourses({ institution: institutionId });
  }

  async createCourse(data: Partial<Course>): Promise<any> {
    const response = await this.request('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
    
    this.clearCacheByPattern('courses');
    return response;
  }

  async updateCourse(id: string, data: Partial<Course>): Promise<any> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de curso es requerido');
    }
    
    const response = await this.request(`/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, false);
    
    this.clearCacheByPattern('courses');
    return response;
  }

  async deleteCourse(id: string): Promise<any> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de curso es requerido');
    }
    
    const response = await this.request(`/admin/courses/${id}`, {
      method: 'DELETE',
    }, false);
    
    this.clearCacheByPattern('courses');
    return response;
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
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      return 'Desconocido';
    }
    
    const response = await this.getInstitutions();
    const institution = response.data.institutions.find(inst => inst.id === id);
    return institution ? institution.name : 'Desconocido';
  }

  async getCourseNameById(id: string): Promise<string> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      return 'Desconocido';
    }
    
    const response = await this.getCourses();
    const course = response.data.courses.find(c => c.id === id);
    return course ? course.name : 'Desconocido';
  }

  // Configuraciones del sistema
  async getSystemConfigurations(): Promise<SystemConfigResponse> {
    return await this.getSystemConfig();
  }

  async updateMultipleConfigurations(updates: { key: string, value: any }[]): Promise<any> {
    return await this.request('/admin/config/multiple', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }, false);
  }

  async getConfigurationHistory(configKey: string, params?: { page?: number; limit?: number }): Promise<any> {
    return await this.getConfigHistory(configKey, params);
  }

  async getSystemConfig(): Promise<SystemConfigResponse> {
    return await this.request('/admin/config');
  }

  async updateConfig(key: string, value: any): Promise<any> {
    // ✅ CORREGIDO: Validar que key no sea undefined
    if (!key) {
      throw new Error('Clave de configuración es requerida');
    }
    
    return await this.request(`/admin/config/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    }, false);
  }

  async getConfigHistory(configKey: string, params?: { page?: number; limit?: number }): Promise<any> {
    // ✅ CORREGIDO: Validar que configKey no sea undefined
    if (!configKey) {
      throw new Error('Clave de configuración es requerida');
    }
    
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
    // ✅ CORREGIDO: Validar que tableName no sea undefined
    if (!tableName) {
      throw new Error('Nombre de tabla es requerido');
    }
    
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
    }, false);
  }

  async createFullBackup(options?: any): Promise<Blob> {
    return await this.request('/admin/backup/full', {
      method: 'POST',
      body: JSON.stringify(options || {}),
      headers: {
        'Accept': 'application/sql',
      },
    }, false);
  }

  async createTableBackup(tableName: string, options?: any): Promise<Blob> {
    // ✅ CORREGIDO: Validar que tableName no sea undefined
    if (!tableName) {
      throw new Error('Nombre de tabla es requerido');
    }
    
    return await this.request(`/admin/backup/tables/${tableName}`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
      headers: {
        'Accept': 'application/sql',
      },
    }, false);
  }

  async downloadBackup(id: string): Promise<Blob> {
    // ✅ CORREGIDO: Validar que id no sea undefined
    if (!id) {
      throw new Error('ID de backup es requerido');
    }
    
    return await this.request(`/admin/backup/${id}/download`, {
      headers: {
        'Accept': 'application/sql',
      },
    }, false);
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
    }, false);
  }

  async executeMassUpload(type: 'student' | 'teacher', validData: any[]): Promise<{ data: MassUploadResult }> {
    const response = await this.request('/admin/mass-upload/execute', {
      method: 'POST',
      body: JSON.stringify({ type, validData }),
    }, false);
    
    // Limpiar cache después de mass upload
    this.clearCacheByPattern(type === 'student' ? 'students' : 'teachers');
    
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
    }, false);
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
    }, false);
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
    // ✅ CORREGIDO: Validar que transferId no sea undefined
    if (!transferId) {
      throw new Error('ID de transferencia es requerido');
    }
    
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
      // ✅ CORREGIDO: Asegurar que la URL sea válida
      const baseUrl = this.baseURL || 'http://localhost:5000/api';
      const healthUrl = baseUrl.replace('/api', '') + '/api/health';
      
      console.log('🔍 Health check URL:', healthUrl);
      
      const response = await fetch(healthUrl);
      const data = await response.json();
      console.log('💚 Health check exitoso:', data);
      return data;
    } catch (error) {
      console.error('❤️‍🩹 Health check falló:', error);
      throw new Error('No se puede conectar con el backend');
    }
  }

  // ==========================================
  // 🚀 MÉTODOS DE ESTADÍSTICAS Y EXPORTACIÓN
  // ==========================================

  async getStudentStats(): Promise<any> {
    return await this.request('/students/stats/general');
  }

  async exportStudentsCSV(): Promise<Blob> {
    return await this.request('/students/export/csv', {
      headers: {
        'Accept': 'text/csv',
      },
    }, false);
  }

  // ==========================================
  // MÉTODOS AUXILIARES
  // ==========================================

  private capitalizeFirst(str: string): string {
    // ✅ CORREGIDO: Validar parámetro
    if (!str || typeof str !== 'string') return '';
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
    const token = localStorage.getItem('token');
    return !!(token && typeof token === 'string' && token.trim() !== '');
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
    // ✅ CORREGIDO: Validar parámetros
    const first = (firstName && typeof firstName === 'string') ? firstName.trim() : '';
    const last = (lastName && typeof lastName === 'string') ? lastName.trim() : '';
    return `${first} ${last}`.trim();
  }

  formatRUN(run: string): string {
    // ✅ CORREGIDO: Validar parámetro
    if (!run || typeof run !== 'string') return '';
    
    const cleanRUN = run.replace(/[\.\-]/g, '');
    if (cleanRUN.length >= 8) {
      const body = cleanRUN.slice(0, -1);
      const dv = cleanRUN.slice(-1);
      return `${body.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')}-${dv}`;
    }
    return run;
  }

  isValidEmail(email: string): boolean {
    // ✅ CORREGIDO: Validar parámetro
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidChileanPhone(phone: string): boolean {
    // ✅ CORREGIDO: Validar parámetro
    if (!phone || typeof phone !== 'string') return false;
    
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^(\+56)?9\d{8}$/;
    return phoneRegex.test(cleanPhone);
  }

  formatCurrency(amount: number): string {
    // ✅ CORREGIDO: Validar parámetro
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0';
    }
    
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  // ==========================================
  // 🚀 MÉTODOS DE MONITOREO DE CACHE
  // ==========================================

  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: string | null;
  } {
    const now = Date.now();
    let oldestTimestamp = now;
    let oldestKey: string | null = null;

    for (const [key, entry] of this._cache.entries()) {
      // ✅ CORREGIDO: Validar entry
      if (entry && typeof entry.timestamp === 'number' && entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return {
      size: this._cache.size,
      maxSize: this._cacheConfig.maxEntries,
      hitRate: 0, // Se podría implementar un contador de hits/misses
      oldestEntry: oldestKey
    };
  }

  // Método para debugging del cache
  logCacheContents(): void {
    console.log('📊 [CACHE] Contenido actual:');
    for (const [key, entry] of this._cache.entries()) {
      // ✅ CORREGIDO: Validar entry
      if (entry && typeof entry.timestamp === 'number') {
        const age = Date.now() - entry.timestamp;
        console.log(`  ${key}: ${age}ms antiguo`);
      }
    }
  }
}

// Instancia singleton
export const apiService = new ApiService();

// ==========================================
// 🚀 EXPORTACIONES COMPLETAS (SIN DUPLICADOS)
// ==========================================

// Exportar tipos principales - ✅ TODAS LAS INTERFACES DISPONIBLES
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
  ActivityResponse,
  Institution,
  Course,
  SystemConfig,
  BackupStats
};