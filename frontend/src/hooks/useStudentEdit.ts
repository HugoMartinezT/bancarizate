// hooks/useStudentEdit.ts - Custom hook optimizado para edición

import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiServiceOptimized } from '../services/api-optimized';

interface UseStudentEditReturn {
  // Datos
  student: any | null;
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
  const [student, setStudent] = useState<any | null>(null);
  const [rawInstitutions, setRawInstitutions] = useState<any[]>([]);
  const [rawCourses, setRawCourses] = useState<any[]>([]);
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
    return new Map(rawInstitutions.map(inst => [inst.name, inst.id]));
  }, [rawInstitutions]);

  const courseMap = useMemo(() => {
    return new Map(rawCourses.map(course => [course.name, course.id]));
  }, [rawCourses]);

  // ✅ OPTIMIZACIÓN: Arrays formateados para selects (memoizados)
  const institutions = useMemo(() => {
    return rawInstitutions.map(inst => ({
      value: inst.id,
      label: inst.name
    }));
  }, [rawInstitutions]);

  const courses = useMemo(() => {
    return rawCourses.map(course => ({
      value: course.id,
      label: course.name
    }));
  }, [rawCourses]);

  // ✅ OPTIMIZACIÓN: Cargar datos iniciales con Promise.all
  const loadInitialData = useCallback(async () => {
    if (!studentId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 Iniciando carga optimizada para estudiante:', studentId);
      const startTime = performance.now();

      // Usar el método optimizado que carga todo en paralelo
      const data = await apiServiceOptimized.getStudentEditData(studentId);
      
      const endTime = performance.now();
      console.log(`⚡ Datos cargados en ${Math.round(endTime - startTime)}ms`);

      // Actualizar estados
      setStudent(data.student);
      setRawInstitutions(data.institutions);
      setRawCourses(data.courses);

      // Mapear form data con IDs correctos
      const institutionId = data.institutionMap.get(data.student.institution) || '';
      const courseId = data.courseMap.get(data.student.course) || '';

      setFormData({
        run: data.student.run,
        firstName: data.student.firstName,
        lastName: data.student.lastName,
        email: data.student.email,
        phone: data.student.phone || '',
        birthDate: data.student.birthDate,
        institutionId,
        courseId,
        gender: data.student.gender,
        status: data.student.status,
        balance: data.student.balance,
        overdraftLimit: data.student.overdraftLimit,
        isActive: data.student.isActive
      });

      console.log('✅ Datos del formulario mapeados:', { institutionId, courseId });

    } catch (error: any) {
      console.error('❌ Error cargando datos:', error);
      setError(error.message || 'Error al cargar datos del estudiante');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  // ✅ OPTIMIZACIÓN: Cargar cursos para institución específica
  const loadCoursesForInstitution = useCallback(async (institutionId: string) => {
    if (!institutionId) {
      setRawCourses([]);
      return;
    }

    try {
      setIsLoadingCourses(true);
      console.log('📚 Cargando cursos para institución:', institutionId);
      
      const response = await apiServiceOptimized.getCoursesByInstitutionOptimized(institutionId);
      setRawCourses(response.data.courses);
      
      console.log('✅ Cursos cargados:', response.data.courses.length);
    } catch (error: any) {
      console.error('❌ Error cargando cursos:', error);
      setErrors(prev => ({ ...prev, courseId: 'Error al cargar cursos' }));
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  // ✅ OPTIMIZACIÓN: Update con debouncing implícito
  const updateStudent = useCallback(async (updates: any) => {
    if (!studentId) return;

    try {
      setIsSaving(true);
      setErrors({});
      setSuccess(null);

      // Convertir IDs a nombres para el backend
      const selectedInstitution = rawInstitutions.find(inst => inst.id === updates.institutionId);
      const selectedCourse = rawCourses.find(course => course.id === updates.courseId);
      
      const updateData = {
        ...updates,
        institution: selectedInstitution?.name || updates.institutionId,
        course: selectedCourse?.name || updates.courseId
      };
      
      console.log('💾 Actualizando estudiante:', updateData);
      
      await apiServiceOptimized.updateStudent(studentId, updateData);
      setSuccess('Estudiante actualizado exitosamente');
      
      // Recargar datos para mostrar cambios
      setTimeout(() => loadInitialData(), 500);
      
    } catch (error: any) {
      console.error('❌ Error actualizando estudiante:', error);
      setErrors({ general: error.message || 'Error al actualizar estudiante' });
    } finally {
      setIsSaving(false);
    }
  }, [studentId, rawInstitutions, rawCourses, loadInitialData]);

  // ✅ OPTIMIZACIÓN: Cambio de contraseña optimizado
  const changePassword = useCallback(async (newPassword: string) => {
    if (!studentId) return;

    try {
      setIsChangingPassword(true);
      setErrors({});

      console.log('🔑 Cambiando contraseña del estudiante');
      
      await apiServiceOptimized.changeStudentPassword(studentId, newPassword);
      setSuccess('Contraseña actualizada exitosamente');
      
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

    // Cleanup al desmontar
    return () => {
      apiServiceOptimized.abortRequest(`student_edit_${studentId}`);
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