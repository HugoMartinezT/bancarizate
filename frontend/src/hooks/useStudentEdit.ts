// hooks/useStudentEdit.ts - CORREGIDO para deployment

import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiService } from '../services/api';

// ✅ INTERFACES BÁSICAS PARA TIPADO
interface Institution {
  id: string;
  name: string;
  type?: string;
  is_active?: boolean;
}

interface Course {
  id: string;
  name: string;
  institution_id?: string;
  level?: string;
  is_active?: boolean;
}

interface Student {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  birthDate: string;
  institution: string;
  course: string;
  gender: string;
  status: string;
  balance: number;
  overdraftLimit: number;
  isActive: boolean;
}

interface UseStudentEditReturn {
  // Datos
  student: Student | null;
  institutions: Array<{value: string, label: string}>;
  courses: Array<{value: string, label: string}>;
  formData: any;
  
  // Estados
  isLoading: boolean;
  isLoadingCourses: boolean;
  isSaving: boolean;
  isChangingPassword: boolean;
  
  // Errores y éxito
  error: string | null;
  errors: Record<string, string>;
  success: string | null;
  
  // Acciones
  setFormData: (data: any) => void;
  setErrors: (errors: Record<string, string>) => void;
  updateStudent: (updates: any) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  loadCoursesForInstitution: (institutionId: string) => Promise<void>;
  
  // Mapas optimizados
  institutionMap: Map<string, string>;
  courseMap: Map<string, string>;
}

export const useStudentEdit = (studentId: string): UseStudentEditReturn => {
  // Estados principales
  const [student, setStudent] = useState<Student | null>(null);
  const [rawInstitutions, setRawInstitutions] = useState<Institution[]>([]);
  const [rawCourses, setRawCourses] = useState<Course[]>([]);
  const [formData, setFormData] = useState<any>({});
  
  // Estados de carga
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Estados de error y éxito
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  // ✅ OPTIMIZACIÓN: Mapas memoizados para búsquedas O(1)
  const institutionMap = useMemo(() => {
    return new Map(rawInstitutions.map((inst: Institution) => [inst.name, inst.id]));
  }, [rawInstitutions]);

  const courseMap = useMemo(() => {
    return new Map(rawCourses.map((course: Course) => [course.name, course.id]));
  }, [rawCourses]);

  // ✅ OPTIMIZACIÓN: Arrays formateados para selects (memoizados)
  const institutions = useMemo(() => {
    return rawInstitutions.map((inst: Institution) => ({
      value: inst.id,
      label: inst.name
    }));
  }, [rawInstitutions]);

  const courses = useMemo(() => {
    return rawCourses.map((course: Course) => ({
      value: course.id,
      label: course.name
    }));
  }, [rawCourses]);

  // ✅ CARGAR DATOS INICIALES - Método alternativo compatible
  const loadInitialData = useCallback(async () => {
    if (!studentId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 Cargando datos del estudiante:', studentId);

      // ✅ CORRECCIÓN: Usar métodos correctos del API Service
      const [studentResponse, institutionsResponse] = await Promise.all([
        apiService.getStudentById(studentId),
        apiService.getInstitutions({ limit: 100 })
      ]);

      if (studentResponse.status === 'success' && institutionsResponse.status === 'success') {
        const studentData = studentResponse.data.student as Student;
        const institutionsData = institutionsResponse.data.institutions as Institution[];

        setStudent(studentData);
        setRawInstitutions(institutionsData);

        // Cargar cursos para la institución actual del estudiante
        if (studentData.institution) {
          const institutionId = institutionsData.find((inst: Institution) => inst.name === studentData.institution)?.id;
          if (institutionId) {
            await loadCoursesForInstitution(institutionId);
          }
        }

        // Mapear form data
        const institutionId = institutionsData.find((inst: Institution) => inst.name === studentData.institution)?.id || '';

        setFormData({
          run: studentData.run,
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          email: studentData.email,
          phone: studentData.phone || '',
          birthDate: studentData.birthDate,
          institutionId,
          courseId: '', // Se cargará cuando se seleccione institución
          gender: studentData.gender,
          status: studentData.status,
          balance: studentData.balance,
          overdraftLimit: studentData.overdraftLimit,
          isActive: studentData.isActive
        });
      }

    } catch (error: any) {
      console.error('❌ Error cargando datos:', error);
      setError(error.message || 'Error al cargar datos del estudiante');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  // ✅ CARGAR CURSOS PARA INSTITUCIÓN ESPECÍFICA
  const loadCoursesForInstitution = useCallback(async (institutionId: string) => {
    if (!institutionId) {
      setRawCourses([]);
      return;
    }

    try {
      setIsLoadingCourses(true);
      console.log('📚 Cargando cursos para institución:', institutionId);
      
      // ✅ CORRECCIÓN: Usar método correcto del API Service
      const response = await apiService.getCourses({ institution: institutionId, limit: 100 });
      
      if (response.status === 'success') {
        const coursesData = response.data.courses as Course[];
        setRawCourses(coursesData);
        console.log('✅ Cursos cargados:', coursesData.length);
      }
    } catch (error: any) {
      console.error('❌ Error cargando cursos:', error);
      setErrors(prev => ({ ...prev, courseId: 'Error al cargar cursos' }));
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  // ✅ UPDATE ESTUDIANTE
  const updateStudent = useCallback(async (updates: any) => {
    if (!studentId) return;

    try {
      setIsSaving(true);
      setErrors({});
      setSuccess(null);

      // Convertir IDs a nombres para el backend
      const selectedInstitution = rawInstitutions.find((inst: Institution) => inst.id === updates.institutionId);
      const selectedCourse = rawCourses.find((course: Course) => course.id === updates.courseId);
      
      const updateData = {
        ...updates,
        institution: selectedInstitution?.name || updates.institutionId,
        course: selectedCourse?.name || updates.courseId
      };
      
      console.log('💾 Actualizando estudiante:', updateData);
      
      // ✅ CORRECCIÓN: Usar método básico del API
      const response = await apiService.updateStudent(studentId, updateData);
      
      if (response.status === 'success') {
        setSuccess('Estudiante actualizado exitosamente');
        // Recargar datos para mostrar cambios
        setTimeout(() => loadInitialData(), 500);
      }
      
    } catch (error: any) {
      console.error('❌ Error actualizando estudiante:', error);
      setErrors({ general: error.message || 'Error al actualizar estudiante' });
    } finally {
      setIsSaving(false);
    }
  }, [studentId, rawInstitutions, rawCourses, loadInitialData]);

  // ✅ CAMBIO DE CONTRASEÑA
  const changePassword = useCallback(async (newPassword: string) => {
    if (!studentId) return;

    try {
      setIsChangingPassword(true);
      setErrors({});

      console.log('🔑 Cambiando contraseña del estudiante');
      
      // ✅ CORRECCIÓN: Usar método básico del API
      const response = await apiService.changeStudentPassword(studentId, newPassword);
      
      if (response.status === 'success') {
        setSuccess('Contraseña actualizada exitosamente');
      }
      
    } catch (error: any) {
      console.error('❌ Error cambiando contraseña:', error);
      setErrors({ password: error.message || 'Error al cambiar contraseña' });
    } finally {
      setIsChangingPassword(false);
    }
  }, [studentId]);

  // ✅ CARGAR DATOS AL MONTAR
  useEffect(() => {
    loadInitialData();

    // ✅ CORRECCIÓN: Eliminar abortRequest que no existe
    // Cleanup básico sin métodos no implementados
    return () => {
      console.log('🧹 Cleanup del hook useStudentEdit');
    };
  }, [loadInitialData]);

  // ✅ LIMPIAR MENSAJES DE ÉXITO AUTOMÁTICAMENTE
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return {
    // Datos
    student,
    institutions,
    courses,
    formData,
    
    // Estados
    isLoading,
    isLoadingCourses,
    isSaving,
    isChangingPassword,
    
    // Errores y éxito
    error,
    errors,
    success,
    
    // Acciones
    setFormData,
    setErrors,
    updateStudent,
    changePassword,
    loadCoursesForInstitution,
    
    // Mapas optimizados
    institutionMap,
    courseMap
  };
};