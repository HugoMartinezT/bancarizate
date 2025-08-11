// services/api.ts - Servicio API COMPLETO con funcionalidades administrativas, instituciones, actividades, configuraciones y backup

// ==========================================
// INTERFACES PARA INSTITUCIONES Y CURSOS
// ==========================================

interface Institution {
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

interface Course {
  id: string;
  institutionId: string;
  name: string;
  code?: string;
  level: 'basico' | 'medio' | 'superior' | 'postgrado' | 'tecnico' | 'profesional';
  durationMonths?: number;
  description?: string;
  isActive: boolean;
  institutions: {
    id: string;
    name: string;
    type: string;
  };
  createdAt: string;
  updatedAt: string;
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

interface SystemConfig {
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

interface MassUploadResult {
  status: string;
  message: string;
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

interface BackupStats {
  status: string;
  data: {
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
  };
}

// ==========================================
// INTERFACES PARA ACTIVIDADES
// ==========================================

interface Activity {
  id: string;
  type: string;
  description: string;
  date: Date;
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

interface ActivityResponse {
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

// ==========================================
// INTERFACES BÁSICAS
// ==========================================

interface LoginResponse {
  status: string;
  message: string;
  data: {
    user: {
      id: string;
      run: string;
      firstName: string;
      lastName: string;
      email: string;
      balance: number;
      overdraftLimit: number;
      role: string;
    };
    token: string;
  };
}

interface Student {
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
}

interface StudentsResponse {
  status: string;
  data: {
    students: Student[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface Teacher {
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
  courses: string[];
  gender: string;
  status: 'active' | 'inactive' | 'retired';
  isActive: boolean;
  createdAt: string;
}

interface TeachersResponse {
  status: string;
  data: {
    teachers: Teacher[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface User {
  id: string;
  run: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  institution: string;
  course: string;
  displayRole: string;
}

interface UsersResponse {
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

interface Transfer {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  totalAmount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  completedAt?: string;
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

interface TransferHistoryResponse {
  status: string;
  data: {
    transfers: Transfer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface UserStats {
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

interface CreateTransferResponse {
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

interface ApiError {
  status: string;
  message: string;
}

class ApiService {
  private baseURL: string;
  private _institutionCache: any[] | null = null;
  private _courseCache: Record<string, any[]> = {};

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  }

  // ==========================================
  // MÉTODO GENÉRICO PARA REQUESTS
  // ==========================================
  
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
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
      console.log('🔐 Token guardado:', response.data.token.substring(0, 20) + '...');
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
      console.log('🚪 Logout exitoso en el backend');
    } catch (error) {
      console.warn('⚠️ Error en logout del backend, continuando con logout local:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.clearEducationCache();
      console.log('🧹 Datos locales limpiados');
    }
  }

  async verifyToken(): Promise<LoginResponse> {
    return await this.request('/auth/verify', {
      method: 'GET',
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<any> {
    return await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ==========================================
  // MÉTODOS DE ACTIVIDADES
  // ==========================================

  /**
   * Obtener actividades con filtros y paginación
   * GET /api/activity
   */
  async getActivities(params?: {
    page?: number;
    limit?: number;
    date?: string;
    startDate?: string;
    endDate?: string;
    type?: string;
    search?: string;
    userId?: string;
    userRun?: string;
    userRole?: string;
    institution?: string;
  }): Promise<ActivityResponse> {
    console.log('📊 Obteniendo actividades con parámetros:', params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.date) queryParams.append('date', params.date);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.type && params.type !== 'all') queryParams.append('type', params.type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.userRun) queryParams.append('userRun', params.userRun);
    if (params?.userRole && params.userRole !== 'all') queryParams.append('userRole', params.userRole);
    if (params?.institution) queryParams.append('institution', params.institution);

    const endpoint = `/activity${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  /**
   * Obtener estadísticas de actividad
   * GET /api/activity/stats
   */
  async getActivityStats(params?: {
    timeframe?: '1d' | '7d' | '30d';
    userId?: string;
    userRole?: string;
  }): Promise<ActivityStats> {
    console.log('📈 Obteniendo estadísticas de actividad:', params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.timeframe) queryParams.append('timeframe', params.timeframe);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.userRole && params.userRole !== 'all') queryParams.append('userRole', params.userRole);

    const endpoint = `/activity/stats${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  /**
   * Obtener actividades recientes para dashboard
   * GET /api/activity/recent
   */
  async getRecentActivity(params?: {
    limit?: number;
    userId?: string;
  }): Promise<{ status: string; data: Activity[]; isAdmin: boolean }> {
    console.log('🕒 Obteniendo actividad reciente:', params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.userId) queryParams.append('userId', params.userId);

    const endpoint = `/activity/recent${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  /**
   * Obtener tipos de actividad disponibles
   * GET /api/activity/types
   */
  async getActivityTypes(): Promise<ActivityType[]> {
    console.log('🏷️ Obteniendo tipos de actividad...');
    
    const response = await this.request('/activity/types');
    return response.data || response;
  }

  /**
   * Obtener roles disponibles para filtrar
   * GET /api/activity/roles
   */
  async getActivityRoles(): Promise<ActivityRole[]> {
    console.log('👥 Obteniendo roles de actividad...');
    
    const response = await this.request('/activity/roles');
    return response.data || response;
  }

  /**
   * Obtener usuarios disponibles para filtrar (solo admin)
   * GET /api/activity/users
   */
  async getAvailableUsers(params?: {
    search?: string;
    role?: string;
    limit?: number;
  }): Promise<AvailableUser[]> {
    console.log('👤 Obteniendo usuarios disponibles:', params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role && params.role !== 'all') queryParams.append('role', params.role);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/activity/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request(endpoint);
    return response.data || response;
  }

  // ==========================================
  // MÉTODOS ESPECÍFICOS PARA FORMULARIOS DE ESTUDIANTES/DOCENTES
  // ==========================================

  /**
   * Obtener instituciones activas para formularios
   */
  async getActiveInstitutions(): Promise<any> {
    try {
      console.log('🏫 Cargando instituciones activas...');
      
      try {
        return await this.request('/students/institutions');
      } catch (studentError) {
        console.warn('⚠️ Endpoint de estudiantes falló, intentando con admin...', studentError);
        
        const response = await this.getInstitutions({ active: 'true', limit: 100 });
        if (response.status === 'success') {
          return {
            status: 'success',
            data: response.data.institutions
          };
        }
        throw studentError;
      }
    } catch (error) {
      console.error('❌ Error en getActiveInstitutions:', error);
      throw error;
    }
  }

  /**
   * Obtener cursos por ID de institución para formularios
   */
  async getCoursesByInstitutionId(institutionId: string): Promise<any> {
    try {
      console.log('📚 Cargando cursos para institución:', institutionId);
      
      try {
        return await this.request(`/students/courses/${institutionId}`);
      } catch (studentError) {
        console.warn('⚠️ Endpoint de estudiantes falló, intentando con admin...', studentError);
        
        const response = await this.getCoursesByInstitution(institutionId, { active: 'true' });
        if (response.status === 'success') {
          return {
            status: 'success',
            data: response.data.courses
          };
        }
        throw studentError;
      }
    } catch (error) {
      console.error('❌ Error en getCoursesByInstitutionId:', error);
      throw error;
    }
  }

  /**
   * Formatear instituciones para uso en componentes Select
   */
  formatInstitutionsForSelect(institutions: any[]): Array<{value: string, label: string}> {
    if (!institutions || !Array.isArray(institutions)) {
      console.warn('⚠️ formatInstitutionsForSelect: datos inválidos', institutions);
      return [];
    }

    return institutions.map(institution => ({
      value: institution.id,
      label: `${institution.name}${institution.type ? ` (${this.capitalizeFirst(institution.type)})` : ''}`
    }));
  }

  /**
   * Formatear cursos para uso en componentes Select
   */
  formatCoursesForSelect(courses: any[]): Array<{value: string, label: string}> {
    if (!courses || !Array.isArray(courses)) {
      console.warn('⚠️ formatCoursesForSelect: datos inválidos', courses);
      return [];
    }

    return courses.map(course => ({
      value: course.id,
      label: course.level 
        ? `${course.name} (${this.capitalizeFirst(course.level)})`
        : course.name
    }));
  }

  /**
   * Obtener nombre de institución por ID
   */
  async getInstitutionNameById(institutionId: string): Promise<string> {
    try {
      console.log('🔍 Obteniendo nombre de institución:', institutionId);
      
      if (this._institutionCache) {
        const institution = this._institutionCache.find((inst: any) => inst.id === institutionId);
        if (institution) {
          console.log('✅ Institución encontrada en caché:', institution.name);
          return institution.name;
        }
      }

      const response = await this.getInstitutionById(institutionId);
      if (response.status === 'success' && response.data.institution) {
        const name = response.data.institution.name;
        console.log('✅ Nombre de institución obtenido:', name);
        return name;
      }
      
      throw new Error('Institución no encontrada');
    } catch (error) {
      console.error('❌ Error obteniendo nombre de institución:', error);
      console.warn('⚠️ Usando ID como fallback para institución:', institutionId);
      return institutionId;
    }
  }

  /**
   * Obtener nombre de curso por ID
   */
  async getCourseNameById(courseId: string, institutionId: string): Promise<string> {
    try {
      console.log('🔍 Obteniendo nombre de curso:', courseId);
      
      const cachedCourses = this._courseCache?.[institutionId];
      if (cachedCourses) {
        const course = cachedCourses.find((c: any) => c.id === courseId);
        if (course) {
          console.log('✅ Curso encontrado en caché:', course.name);
          return course.name;
        }
      }

      const response = await this.getCourseById(courseId);
      if (response.status === 'success' && response.data.course) {
        const name = response.data.course.name;
        console.log('✅ Nombre de curso obtenido:', name);
        return name;
      }
      
      throw new Error('Curso no encontrado');
    } catch (error) {
      console.error('❌ Error obteniendo nombre de curso:', error);
      console.warn('⚠️ Usando ID como fallback para curso:', courseId);
      return courseId;
    }
  }

  // ==========================================
  // MÉTODOS ADMINISTRATIVOS - INSTITUCIONES
  // ==========================================

  async getInstitutions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    active?: string;
  }): Promise<InstitutionsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.type && params.type !== 'all') queryParams.append('type', params.type);
    if (params?.active && params.active !== 'all') queryParams.append('active', params.active);

    const endpoint = `/admin/institutions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async getInstitutionById(id: string): Promise<any> {
    return await this.request(`/admin/institutions/${id}`);
  }

  async createInstitution(data: {
    name: string;
    type: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    isActive?: boolean;
  }): Promise<any> {
    return await this.request('/admin/institutions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInstitution(id: string, data: {
    name?: string;
    type?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    isActive?: boolean;
  }): Promise<any> {
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

  async getInstitutionTypes(): Promise<any> {
    return await this.request('/admin/institutions/types');
  }

  async getInstitutionStats(): Promise<any> {
    return await this.request('/admin/institutions/stats');
  }

  // ==========================================
  // MÉTODOS ADMINISTRATIVOS - CURSOS
  // ==========================================

  async getCourses(params?: {
    page?: number;
    limit?: number;
    search?: string;
    institutionId?: string;
    level?: string;
    active?: string;
  }): Promise<CoursesResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.institutionId && params.institutionId !== 'all') queryParams.append('institutionId', params.institutionId);
    if (params?.level && params.level !== 'all') queryParams.append('level', params.level);
    if (params?.active && params.active !== 'all') queryParams.append('active', params.active);

    const endpoint = `/admin/courses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async getCoursesByInstitution(institutionId: string, params?: {
    active?: string;
    level?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    if (params?.active && params.active !== 'all') queryParams.append('active', params.active);
    if (params?.level && params.level !== 'all') queryParams.append('level', params.level);

    const endpoint = `/admin/courses/by-institution/${institutionId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async getCourseById(id: string): Promise<any> {
    return await this.request(`/admin/courses/${id}`);
  }

  async createCourse(data: {
    institutionId: string;
    name: string;
    code?: string;
    level: string;
    durationMonths?: number;
    description?: string;
    isActive?: boolean;
  }): Promise<any> {
    return await this.request('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCourse(id: string, data: {
    institutionId?: string;
    name?: string;
    code?: string;
    level?: string;
    durationMonths?: number;
    description?: string;
    isActive?: boolean;
  }): Promise<any> {
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

  async getCourseLevels(): Promise<any> {
    return await this.request('/admin/courses/levels');
  }

  async getCourseStats(): Promise<any> {
    return await this.request('/admin/courses/stats');
  }

  // ==========================================
  // MÉTODOS ADMINISTRATIVOS - CONFIGURACIONES DEL SISTEMA
  // ==========================================

  /**
   * Obtener todas las configuraciones del sistema
   * GET /api/admin/config
   */
  async getSystemConfigurations(params?: {
    category?: string;
    editable?: string;
  }): Promise<SystemConfigResponse> {
    console.log('⚙️ Obteniendo configuraciones del sistema:', params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.category && params.category !== 'all') queryParams.append('category', params.category);
    if (params?.editable && params.editable !== 'all') queryParams.append('editable', params.editable);

    const endpoint = `/admin/config${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  /**
   * Obtener configuración específica por clave
   * GET /api/admin/config/:key
   */
  async getSystemConfigurationByKey(key: string): Promise<any> {
    console.log('🔑 Obteniendo configuración por clave:', key);
    return await this.request(`/admin/config/${key}`);
  }

  /**
   * Actualizar configuración específica
   * PUT /api/admin/config/:key
   */
  async updateSystemConfiguration(key: string, value: any): Promise<any> {
    console.log('💾 Actualizando configuración:', key, '=', value);
    return await this.request(`/admin/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  /**
   * Actualizar múltiples configuraciones
   * PUT /api/admin/config/batch
   */
  async updateMultipleConfigurations(configurations: Array<{
    key: string;
    value: any;
  }>): Promise<any> {
    console.log('📦 Actualizando múltiples configuraciones:', configurations.length);
    return await this.request('/admin/config/batch', {
      method: 'PUT',
      body: JSON.stringify({ configurations }),
    });
  }

  /**
   * Obtener categorías de configuración disponibles
   * GET /api/admin/config/categories
   */
  async getSystemConfigCategories(): Promise<any> {
    console.log('📋 Obteniendo categorías de configuración...');
    return await this.request('/admin/config/categories');
  }

  /**
   * Obtener configuraciones por categoría
   * GET /api/admin/config/category/:category
   */
  async getSystemConfigurationsByCategory(category: string): Promise<any> {
    console.log('📂 Obteniendo configuraciones por categoría:', category);
    return await this.request(`/admin/config/category/${category}`);
  }

  /**
   * Resetear configuración a valor por defecto
   * POST /api/admin/config/:key/reset
   */
  async resetSystemConfiguration(key: string): Promise<any> {
    console.log('🔄 Reseteando configuración:', key);
    return await this.request(`/admin/config/${key}/reset`, {
      method: 'POST',
    });
  }

  /**
   * Obtener historial de cambios de configuración
   * GET /api/admin/config/:key/history
   */
  async getConfigurationHistory(key: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<any> {
    console.log('📚 Obteniendo historial de configuración:', key, params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/admin/config/${key}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  // ==========================================
  // MÉTODOS ADMINISTRATIVOS - BACKUP
  // ==========================================

  /**
   * Crear backup completo de la base de datos
   * GET /api/admin/backup/full
   */
  async createFullBackup(params?: {
    includeData?: boolean;
    includeLogs?: boolean;
  }): Promise<Blob> {
    console.log('💾 Creando backup completo:', params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.includeData !== undefined) queryParams.append('includeData', params.includeData.toString());
    if (params?.includeLogs !== undefined) queryParams.append('includeLogs', params.includeLogs.toString());

    const endpoint = `/admin/backup/full${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return await this.request(endpoint, {
      headers: {
        'Accept': 'application/sql'
      }
    });
  }

  /**
   * Crear backup de tabla específica
   * GET /api/admin/backup/table/:tableName
   */
  async createTableBackup(tableName: string, params?: {
    includeData?: boolean;
  }): Promise<Blob> {
    console.log('📋 Creando backup de tabla:', tableName, params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.includeData !== undefined) queryParams.append('includeData', params.includeData.toString());

    const endpoint = `/admin/backup/table/${tableName}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    return await this.request(endpoint, {
      headers: {
        'Accept': 'application/sql'
      }
    });
  }

  /**
   * Obtener estadísticas de backup
   * GET /api/admin/backup/stats
   */
  async getBackupStats(): Promise<BackupStats> {
    console.log('📊 Obteniendo estadísticas de backup...');
    return await this.request('/admin/backup/stats');
  }

  /**
   * Obtener historial de backups
   * GET /api/admin/backup/history
   */
  async getBackupHistory(params?: {
    page?: number;
    limit?: number;
  }): Promise<any> {
    console.log('📚 Obteniendo historial de backups:', params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/admin/backup/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  /**
   * Validar archivo de backup
   * POST /api/admin/backup/validate
   */
  async validateBackupFile(sqlContent: string): Promise<any> {
    console.log('🔍 Validando archivo de backup...');
    return await this.request('/admin/backup/validate', {
      method: 'POST',
      body: JSON.stringify({ sqlContent }),
    });
  }

  /**
   * Obtener vista previa de tabla (estructura y datos de muestra)
   * GET /api/admin/backup/table/:tableName/preview
   */
  async getTablePreview(tableName: string, params?: {
    limit?: number;
  }): Promise<any> {
    console.log('👁️ Obteniendo vista previa de tabla:', tableName, params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/admin/backup/table/${tableName}/preview${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  // ==========================================
  // MÉTODOS ADMINISTRATIVOS - CARGA MASIVA
  // ==========================================

  /**
   * Descargar plantilla CSV para carga masiva
   * GET /api/admin/mass-upload/template/:userType
   */
  async getCSVTemplate(userType: 'student' | 'teacher'): Promise<Blob> {
    console.log(`📥 Descargando plantilla CSV para ${userType}s...`);
    
    try {
      const url = `${this.baseURL}/admin/mass-upload/template/${userType}`;
      
      const headers: HeadersInit = {
        'Accept': 'text/csv',
      };

      // Agregar token si existe
      const token = localStorage.getItem('token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      console.log(`📡 CSV Template Response (${response.status})`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Retornar el blob directamente para descargas
      const blob = await response.blob();
      console.log('✅ Plantilla CSV descargada exitosamente');
      return blob;
      
    } catch (error) {
      console.error('❌ Error descargando plantilla CSV:', error);
      throw error;
    }
  }

  /**
   * Validar datos de carga masiva
   * POST /api/admin/mass-upload/validate
   */
  async validateMassUpload(data: any[], userType: 'student' | 'teacher'): Promise<MassUploadValidation> {
    console.log(`🔍 Validando carga masiva de ${data.length} ${userType}s...`);
    
    return await this.request('/admin/mass-upload/validate', {
      method: 'POST',
      body: JSON.stringify({ data, userType }),
    });
  }

  /**
   * Ejecutar carga masiva
   * POST /api/admin/mass-upload/execute
   */
  async executeMassUpload(
    validData: any[], 
    userType: 'student' | 'teacher', 
    skipDuplicates: boolean = true
  ): Promise<MassUploadResult> {
    console.log(`⬆️ Ejecutando carga masiva de ${validData.length} ${userType}s...`);
    
    return await this.request('/admin/mass-upload/execute', {
      method: 'POST',
      body: JSON.stringify({ validData, userType, skipDuplicates }),
    });
  }

  /**
   * Obtener historial de cargas masivas
   * GET /api/admin/mass-upload/history
   */
  async getMassUploadHistory(params?: {
    page?: number;
    limit?: number;
    userType?: string;
  }): Promise<any> {
    console.log('📚 Obteniendo historial de cargas masivas:', params);
    
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.userType && params.userType !== 'all') queryParams.append('userType', params.userType);

    const endpoint = `/admin/mass-upload/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  // ==========================================
  // SISTEMA DE CACHÉ PARA INSTITUCIONES Y CURSOS
  // ==========================================

  /**
   * Precargar instituciones en caché para mejorar rendimiento
   */
  async preloadInstitutions(): Promise<void> {
    try {
      console.log('🔄 Precargando instituciones...');
      const response = await this.getActiveInstitutions();
      if (response.status === 'success') {
        this._institutionCache = response.data;
        console.log('✅ Instituciones precargadas en caché:', this._institutionCache.length);
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron precargar instituciones:', error);
    }
  }

  /**
   * Precargar cursos en caché para una institución
   */
  async preloadCourses(institutionId: string): Promise<void> {
    try {
      console.log('🔄 Precargando cursos para institución:', institutionId);
      const response = await this.getCoursesByInstitutionId(institutionId);
      if (response.status === 'success') {
        this._courseCache[institutionId] = response.data;
        console.log('✅ Cursos precargados en caché para institución:', institutionId, response.data.length);
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron precargar cursos:', error);
    }
  }

  /**
   * Limpiar caché de instituciones y cursos
   */
  clearEducationCache(): void {
    this._institutionCache = null;
    this._courseCache = {};
    console.log('🧹 Caché de educación limpiado');
  }

  /**
   * Verificar si hay datos en caché
   */
  hasCachedInstitutions(): boolean {
    return this._institutionCache !== null && this._institutionCache.length > 0;
  }

  /**
   * Verificar si hay cursos en caché para una institución
   */
  hasCachedCourses(institutionId: string): boolean {
    return this._courseCache[institutionId] && this._courseCache[institutionId].length > 0;
  }

  // ==========================================
  // MÉTODOS DE ESTUDIANTES
  // ==========================================

  async getStudents(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<StudentsResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status);

    const endpoint = `/students${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async getStudentById(id: string): Promise<any> {
    return await this.request(`/students/${id}`);
  }

  async createStudent(studentData: any): Promise<any> {
    return await this.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    });
  }

  async updateStudent(id: string, updates: any): Promise<any> {
    return await this.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async changeStudentPassword(studentId: string, newPassword: string): Promise<any> {
    return await this.request(`/students/${studentId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  async deleteStudent(id: string): Promise<any> {
    return await this.request(`/students/${id}`, {
      method: 'DELETE',
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
  }): Promise<TeachersResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status && params.status !== 'all') queryParams.append('status', params.status);

    const endpoint = `/teachers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

  async getTeacherById(id: string): Promise<any> {
    return await this.request(`/teachers/${id}`);
  }

  async createTeacher(teacherData: any): Promise<any> {
    return await this.request('/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    });
  }

  async updateTeacher(id: string, updates: any): Promise<any> {
    return await this.request(`/teachers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async changeTeacherPassword(teacherId: string, newPassword: string): Promise<any> {
    return await this.request(`/teachers/${teacherId}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  }

  async deleteTeacher(id: string): Promise<any> {
    return await this.request(`/teachers/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // MÉTODOS DE TRANSFERENCIAS
  // ==========================================

  async getAllUsers(params?: {
    search?: string;
    role?: string;
    institution?: string;
    limit?: number;
  }): Promise<UsersResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role && params.role !== 'all') queryParams.append('role', params.role);
    if (params?.institution && params.institution !== 'all') queryParams.append('institution', params.institution);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const endpoint = `/transfers/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await this.request(endpoint);
  }

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

// Tipos de TypeScript exportados
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