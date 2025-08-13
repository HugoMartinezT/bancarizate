import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, BookOpen, XCircle, School, Sparkles, Building, Heart, Loader2, CheckCircle } from 'lucide-react';
import { validateRUT, formatRUTOnInput } from '../../utils/rutValidator';
import { apiService } from '../../services/api';

interface FormData {
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  institutionId: string;
  courseId: string;
  gender: string;
  status: 'active' | 'inactive' | 'graduated';
}

// NUEVAS INTERFACES para las opciones de select
interface InstitutionOption {
  value: string;
  label: string;
}

interface CourseOption {
  value: string;
  label: string;
}

interface CreateStudentResponse {
  status: string;
  message: string;
  data: {
    student: {
      id: string;
      userId: string;
      run: string;
      firstName: string;
      lastName: string;
      email: string;
      tempPassword: string;
    };
  };
}

const CreateStudent = () => {
  const [formData, setFormData] = useState<FormData>({
    run: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    institutionId: '',
    courseId: '',
    gender: '',
    status: 'active'
  });
  
  // NUEVOS ESTADOS para dropdowns dinámicos
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdStudent, setCreatedStudent] = useState<CreateStudentResponse['data']['student'] | null>(null);

  // NUEVO: Cargar instituciones al montar el componente
  useEffect(() => {
    loadInstitutions();
  }, []);

  // NUEVO: Cargar cursos cuando cambia la institución
  useEffect(() => {
    if (formData.institutionId) {
      loadCourses(formData.institutionId);
    } else {
      setCourses([]);
      setFormData(prev => ({ ...prev, courseId: '' }));
    }
  }, [formData.institutionId]);

  // NUEVA FUNCIÓN: Cargar instituciones activas
  const loadInstitutions = async () => {
    try {
      setIsLoadingInstitutions(true);
      console.log('🏫 Cargando instituciones...');
      
      const response = await apiService.getActiveInstitutions();
      
      if (response.status === 'success') {
        const institutionOptions = apiService.formatInstitutionsForSelect(response);
        setInstitutions(institutionOptions);
        console.log('✅ Instituciones cargadas:', institutionOptions.length);
      }
    } catch (error: any) {
      console.error('❌ Error cargando instituciones:', error);
      setErrors(prev => ({ 
        ...prev, 
        general: 'Error al cargar instituciones. Verifique su conexión.' 
      }));
    } finally {
      setIsLoadingInstitutions(false);
    }
  };

  // NUEVA FUNCIÓN: Cargar cursos por institución
  const loadCourses = async (institutionId: string) => {
    try {
      setIsLoadingCourses(true);
      console.log('📚 Cargando cursos para institución:', institutionId);
      
      const response = await apiService.getCoursesByInstitutionId(institutionId);
      
      if (response.status === 'success') {
        const courseOptions = apiService.formatCoursesForSelect(response);
        setCourses(courseOptions);
        console.log('✅ Cursos cargados:', courseOptions.length);
      }
    } catch (error: any) {
      console.error('❌ Error cargando cursos:', error);
      setErrors(prev => ({ 
        ...prev, 
        courseId: 'Error al cargar cursos disponibles' 
      }));
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!validateRUT(formData.run)) newErrors.run = 'RUN inválido';
    if (!formData.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'Apellido requerido';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
    if (formData.phone && !/^(\+56)?9\d{8}$/.test(formData.phone.replace(/\s/g, ''))) newErrors.phone = 'Teléfono inválido';
    if (!formData.birthDate) newErrors.birthDate = 'Fecha de nacimiento requerida';
    if (!formData.institutionId) newErrors.institutionId = 'Institución requerida';
    if (!formData.courseId) newErrors.courseId = 'Curso requerido';
    if (!formData.gender) newErrors.gender = 'Género requerido';

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setSuccess(false);
    setCreatedStudent(null);

    try {
      const response: CreateStudentResponse = await apiService.createStudent({
        ...formData,
        run: formData.run.replace(/[\.-]/g, '') // Enviar RUN limpio
      });

      if (response.status === 'success') {
        setSuccess(true);
        setCreatedStudent(response.data.student);
      }
    } catch (error: any) {
      console.error('Error creando estudiante:', error);
      setErrors({ general: error.message || 'Error al crear estudiante' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form or navigate back
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Crear Nuevo Estudiante</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* RUN */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              RUN
            </label>
            <input
              name="run"
              value={formData.run}
              onChange={(e) => {
                const formatted = formatRUTOnInput(e.target.value);
                setFormData(prev => ({ ...prev, run: formatted }));
                setErrors(prev => ({ ...prev, run: '' }));
              }}
              placeholder="Ej: 12.345.678-9"
              disabled={isLoading}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.run 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.run && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.run}
              </p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nombre
            </label>
            <input
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Nombre del estudiante"
              disabled={isLoading}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.firstName 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.firstName}
              </p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Apellido
            </label>
            <input
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Apellido del estudiante"
              disabled={isLoading}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.lastName 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.lastName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@ejemplo.com"
              disabled={isLoading}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.email 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Teléfono (opcional)
            </label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+56912345678"
              disabled={isLoading}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.phone 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Fecha de Nacimiento */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Fecha de Nacimiento
            </label>
            <input
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.birthDate 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.birthDate && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.birthDate}
              </p>
            )}
          </div>

          {/* Género */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Género
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.gender 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">Seleccionar género</option>
              <option value="male">Masculino</option>
              <option value="female">Femenino</option>
              <option value="other">Otro</option>
            </select>
            {errors.gender && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.gender}
              </p>
            )}
          </div>

          {/* Institución */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Institución
            </label>
            <select
              name="institutionId"
              value={formData.institutionId}
              onChange={handleChange}
              disabled={isLoading || isLoadingInstitutions}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.institutionId 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading || isLoadingInstitutions ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">
                {isLoadingInstitutions 
                  ? 'Cargando instituciones...' 
                  : 'Seleccionar institución'}
              </option>
              {institutions.map(inst => (
                <option key={inst.value} value={inst.value}>
                  {inst.label}
                </option>
              ))}
            </select>
            {errors.institutionId && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.institutionId}
              </p>
            )}
          </div>

          {/* Curso */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Curso
            </label>
            <select
              name="courseId"
              value={formData.courseId}
              onChange={handleChange}
              disabled={isLoading || isLoadingCourses || !formData.institutionId}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                errors.courseId 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-200 focus:border-blue-300'
              } ${isLoading || isLoadingCourses || !formData.institutionId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <option value="">
                {isLoadingCourses 
                  ? 'Cargando cursos...'
                  : courses.length === 0
                  ? 'No hay cursos disponibles'
                  : 'Seleccionar curso'
                }
              </option>
              {courses.map(course => (
                <option key={course.value} value={course.value}>
                  {course.label}
                </option>
              ))}
            </select>
            {errors.courseId && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {errors.courseId}
              </p>
            )}
            {/* Indicador de carga de cursos */}
            {isLoadingCourses && (
              <p className="mt-1 text-xs text-blue-600 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Cargando cursos...
              </p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={isLoading}
              className={`w-full px-3 py-2.5 text-sm border rounded-lg shadow-sm transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="graduated">Graduado</option>
            </select>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStudent;