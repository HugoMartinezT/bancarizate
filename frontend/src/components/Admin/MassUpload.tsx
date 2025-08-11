import { useState, useRef, useEffect } from 'react';
import { Upload, Download, Users, UserCheck, AlertCircle, CheckCircle, XCircle, Loader2, FileText, Eye, EyeOff, RefreshCw, X, Bug } from 'lucide-react';
import { apiService, MassUploadValidation, MassUploadResult } from '../../services/api';

interface UploadData {
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

const MassUpload = () => {
  const [userType, setUserType] = useState<'student' | 'teacher'>('student');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<UploadData[]>([]);
  const [validationResult, setValidationResult] = useState<MassUploadValidation | null>(null);
  const [uploadResult, setUploadResult] = useState<MassUploadResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  
  // ✅ NUEVOS ESTADOS PARA DEBUGGING Y CONTROL
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [validationAttempts, setValidationAttempts] = useState(0);
  const [lastValidationTime, setLastValidationTime] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estados de la UI
  const [currentStep, setCurrentStep] = useState<'select' | 'validate' | 'review' | 'execute' | 'complete'>('select');

  // ✅ LIMPIAR ESTADOS COMPLETAMENTE
  const resetForm = () => {
    // Cancelar cualquier timeout activo
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
    
    setFile(null);
    setCsvData([]);
    setValidationResult(null);
    setUploadResult(null);
    setCurrentStep('select');
    setError(null);
    setSuccess(null);
    setDebugInfo(null);
    setIsValidating(false);
    setIsUploading(false);
    setValidationAttempts(0);
    setLastValidationTime(0);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    console.log('🧹 Formulario completamente reiniciado');
  };

  // ✅ CANCELAR VALIDACIÓN ACTIVA
  const cancelValidation = () => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
    
    setIsValidating(false);
    setCurrentStep('select');
    
    console.log('❌ Validación cancelada por el usuario');
  };

  // Descargar plantilla CSV
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      setError(null);
      
      console.log(`📥 Descargando plantilla para ${userType}s...`);
      
      const blob = await apiService.getCSVTemplate(userType);
      
      // Crear URL del blob y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `plantilla_${userType}s.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccess(`Plantilla CSV para ${userType}s descargada exitosamente`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('❌ Error descargando plantilla:', error);
      setError(error.message || 'Error al descargar plantilla');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA PARSEAR CSV
  const parseCSVContent = (csvText: string): UploadData[] => {
    try {
      console.log('📋 === INICIANDO PARSING CSV ===');
      console.log('📄 Contenido raw (primeros 200 chars):', csvText.substring(0, 200));
      console.log('📏 Longitud total:', csvText.length);
      
      // Limpiar el texto y dividir en líneas
      const cleanText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const allLines = cleanText.split('\n');
      
      console.log('📊 Total de líneas encontradas:', allLines.length);
      allLines.forEach((line, i) => {
        console.log(`Línea ${i + 1}: "${line}"`);
      });
      
      // Filtrar líneas vacías pero mantener registro
      const lines = allLines.filter(line => line.trim().length > 0);
      console.log('📊 Líneas no vacías:', lines.length);
      
      if (lines.length < 2) {
        throw new Error(`El archivo debe tener al menos 2 líneas (header + datos). Encontradas: ${lines.length}`);
      }

      // Procesar headers
      const headerLine = lines[0];
      console.log('📋 Línea de headers:', headerLine);
      
      // ✅ PARSEO MEJORADO DE HEADERS
      const headers = [];
      let currentField = '';
      let inQuotes = false;
      
      for (let i = 0; i < headerLine.length; i++) {
        const char = headerLine[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          headers.push(currentField.trim().replace(/^"|"$/g, ''));
          currentField = '';
        } else {
          currentField += char;
        }
      }
      
      // Agregar último campo
      if (currentField) {
        headers.push(currentField.trim().replace(/^"|"$/g, ''));
      }
      
      console.log('📋 Headers procesados:', headers);

      // Validar headers requeridos
      const requiredHeaders = userType === 'student' 
        ? ['run', 'firstName', 'lastName', 'email', 'birthDate', 'institution', 'course', 'gender']
        : ['run', 'firstName', 'lastName', 'email', 'birthDate', 'institution', 'courses', 'gender'];

      const missingHeaders = requiredHeaders.filter(req => !headers.includes(req));
      if (missingHeaders.length > 0) {
        throw new Error(`Headers faltantes: ${missingHeaders.join(', ')}`);
      }

      // ✅ PROCESAR DATOS LÍNEA POR LÍNEA
      const data: UploadData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        console.log(`📝 Procesando línea ${i + 1}: "${line}"`);
        
        if (!line.trim()) {
          console.log(`⚠️ Línea ${i + 1} está vacía, saltando...`);
          continue;
        }

        // ✅ PARSEO MEJORADO DE DATOS CON SOPORTE PARA COMILLAS
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim().replace(/^"|"$/g, ''));
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        
        // Agregar último valor
        if (currentValue !== undefined) {
          values.push(currentValue.trim().replace(/^"|"$/g, ''));
        }
        
        console.log(`📊 Línea ${i + 1} - Valores encontrados:`, values);
        console.log(`📊 Línea ${i + 1} - Cantidad: ${values.length}, Esperada: ${headers.length}`);

        if (values.length !== headers.length) {
          console.warn(`⚠️ Línea ${i + 1}: tiene ${values.length} valores, esperaba ${headers.length}`);
          console.warn(`⚠️ Headers:`, headers);
          console.warn(`⚠️ Valores:`, values);
          // Continuar en lugar de saltar - permitir filas con diferente cantidad
        }

        // Crear objeto de datos
        const row: any = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || ''; // Usar string vacío si no existe el valor
          
          // Convertir valores numéricos
          if (header === 'initialBalance' || header === 'overdraftLimit') {
            const numValue = parseFloat(value) || 0;
            row[header] = numValue;
            console.log(`💰 Campo ${header}: "${value}" → ${numValue}`);
          } else {
            row[header] = value;
          }
        });

        console.log(`✅ Objeto fila ${i + 1}:`, row);
        data.push(row);
      }

      console.log(`✅ === PARSING COMPLETADO ===`);
      console.log(`📊 Total de filas procesadas: ${data.length}`);
      
      // ✅ DEBUGGING INFO DETALLADO
      setDebugInfo({
        parsing: {
          totalLines: allLines.length,
          nonEmptyLines: lines.length,
          headers: headers,
          dataRows: data.length,
          headerCount: headers.length,
          userType: userType,
          sampleRows: data.slice(0, 3) // Primeras 3 filas como muestra
        },
        timestamp: new Date().toISOString()
      });

      return data;
      
    } catch (error) {
      console.error('❌ === ERROR EN PARSING CSV ===');
      console.error('Error:', error);
      
      setDebugInfo({
        parsing: {
          error: error.message,
          timestamp: new Date().toISOString(),
          userType: userType
        }
      });
      
      throw error;
    }
  };

  // Leer archivo CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // ✅ RESET COMPLETO AL CAMBIAR ARCHIVO
    resetForm();

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV válido');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);

    console.log('📁 === LEYENDO ARCHIVO CSV ===');
    console.log('📄 Nombre:', selectedFile.name);
    console.log('📏 Tamaño:', selectedFile.size, 'bytes');
    console.log('🕒 Última modificación:', new Date(selectedFile.lastModified));

    // Leer contenido del archivo
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        const data = parseCSVContent(csvText);
        
        if (data.length === 0) {
          setError('El archivo CSV no contiene datos válidos para procesar');
          return;
        }

        console.log(`✅ Archivo cargado exitosamente: ${data.length} registros`);
        setCsvData(data);
        setCurrentStep('validate');
        
      } catch (error: any) {
        console.error('❌ Error procesando CSV:', error);
        setError(error.message || 'Error al procesar el archivo CSV');
      }
    };

    reader.onerror = (error) => {
      console.error('❌ Error leyendo archivo:', error);
      setError('Error al leer el archivo. Intenta de nuevo.');
    };

    reader.readAsText(selectedFile);
  };

  // ✅ FUNCIÓN DE VALIDACIÓN CON TIMEOUT REAL
  const handleValidate = async () => {
    if (csvData.length === 0) {
      setError('No hay datos para validar');
      return;
    }

    // Verificar si ya hay una validación reciente (evitar duplicados)
    const now = Date.now();
    if (now - lastValidationTime < 2000) { // 2 segundos
      console.log('⚠️ Validación muy reciente, ignorando...');
      return;
    }

    // ✅ CREAR ABORT CONTROLLER PARA CANCELACIÓN REAL
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout;

    try {
      setIsValidating(true);
      setError(null);
      setValidationAttempts(prev => prev + 1);
      setLastValidationTime(now);
      
      console.log(`🔍 === INICIANDO VALIDACIÓN INTENTO ${validationAttempts + 1} ===`);
      console.log(`📊 Datos a validar: ${csvData.length} registros`);
      console.log(`👤 Tipo de usuario: ${userType}`);
      console.log('📄 Muestra del primer registro:', csvData[0]);
      
      // ✅ TIMEOUT QUE REALMENTE CANCELA LA REQUEST
      timeoutId = setTimeout(() => {
        console.log('⏰ TIMEOUT ALCANZADO - CANCELANDO REQUEST');
        controller.abort();
      }, 15000); // Reducido a 15 segundos

      // ✅ HACER REQUEST CON ABORT SIGNAL
      console.log('🌐 Enviando request de validación...');
      
      const requestStart = Date.now();
      
      // Usar fetch directamente con AbortController
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación. Inicia sesión de nuevo.');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/mass-upload/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: csvData,
          userType: userType
        }),
        signal: controller.signal // ✅ ESTO ES CLAVE PARA QUE FUNCIONE EL TIMEOUT
      });

      // Limpiar timeout si la request fue exitosa
      clearTimeout(timeoutId);
      
      const requestTime = Date.now() - requestStart;
      console.log(`📡 Request completada en ${requestTime}ms con status ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        if (response.status === 403) {
          throw new Error('No tienes permisos para realizar carga masiva. Solo administradores pueden hacerlo.');
        } else if (response.status === 400) {
          throw new Error(errorData?.message || 'Datos inválidos en el archivo CSV.');
        } else if (response.status === 500) {
          throw new Error('Error interno del servidor. Intenta de nuevo en unos momentos.');
        } else {
          throw new Error(errorData?.message || `Error ${response.status}`);
        }
      }

      const result = await response.json();
      
      console.log('✅ === VALIDACIÓN COMPLETADA ===');
      console.log('📊 Resultado:', result);
      
      setValidationResult(result);
      setCurrentStep('review');
      
      // Actualizar debugging info
      setDebugInfo(prev => ({
        ...prev,
        validation: {
          attempt: validationAttempts + 1,
          result: {
            valid: result.data.valid,
            errors: result.data.errors,
            totalProcessed: result.data.summary.totalRows,
            processingTime: requestTime
          },
          timestamp: new Date().toISOString(),
          requestDetails: {
            url: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/mass-upload/validate`,
            method: 'POST',
            status: response.status,
            timeMs: requestTime
          }
        }
      }));
        
    } catch (error: any) {
      // Limpiar timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('❌ === ERROR EN VALIDACIÓN ===');
      console.error('Error:', error);
      
      let errorMessage = 'Error al validar datos';
      
      if (error.name === 'AbortError') {
        errorMessage = 'La validación fue cancelada debido a timeout (>15s). El servidor está tardando mucho en responder.';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = 'Error de conexión. Verifica que el servidor backend esté funcionando en http://localhost:5000';
      } else {
        errorMessage = error.message || 'Error desconocido en la validación';
      }
      
      setError(errorMessage);
      
      // Actualizar debug info con el error
      setDebugInfo(prev => ({
        ...prev,
        validation: {
          attempt: validationAttempts + 1,
          error: {
            message: error.message,
            name: error.name,
            timestamp: new Date().toISOString(),
            dataLength: csvData.length,
            userType: userType,
            isTimeout: error.name === 'AbortError',
            isNetworkError: error.message.includes('Failed to fetch')
          }
        }
      }));
      
    } finally {
      setIsValidating(false);
    }
  };

  // Ejecutar carga masiva
  const handleExecute = async () => {
    if (!validationResult || validationResult.data.validData.length === 0) {
      setError('No hay datos válidos para cargar');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      console.log(`⬆️ Ejecutando carga de ${validationResult.data.validData.length} ${userType}s...`);
      
      const result = await apiService.executeMassUpload(
        validationResult.data.validData, 
        userType, 
        true // skipDuplicates
      );
      
      console.log('✅ Carga completada:', result.data);
      setUploadResult(result);
      setCurrentStep('complete');
      
    } catch (error: any) {
      console.error('❌ Error en carga masiva:', error);
      setError(error.message || 'Error al ejecutar carga masiva');
    } finally {
      setIsUploading(false);
    }
  };

  // ✅ CLEANUP AL DESMONTAR COMPONENTE
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // ✅ RESET AUTOMÁTICO AL CAMBIAR TIPO DE USUARIO
  useEffect(() => {
    if (file || csvData.length > 0) {
      console.log('🔄 Tipo de usuario cambiado, reseteando...');
      resetForm();
    }
  }, [userType]);

  // Renderizar step selector
  const renderStepIndicator = () => {
    const steps = [
      { id: 'select', label: 'Seleccionar', icon: Upload },
      { id: 'validate', label: 'Validar', icon: CheckCircle },
      { id: 'review', label: 'Revisar', icon: Eye },
      { id: 'execute', label: 'Ejecutar', icon: Users },
      { id: 'complete', label: 'Completado', icon: UserCheck }
    ];

    const stepIndex = steps.findIndex(step => step.id === currentStep);

    return (
      <div className="flex items-center justify-center mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= stepIndex;
          const isCurrent = index === stepIndex;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                isActive 
                  ? isCurrent 
                    ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white' 
                    : 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`ml-2 text-xs font-medium ${
                isActive ? 'text-blue-700' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-3 ${
                  index < stepIndex ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <Upload className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Carga Masiva de Usuarios</h1>
              <p className="text-blue-200 text-xs">Importa múltiples usuarios desde archivo CSV</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Intentos de validación</p>
            <p className="text-base font-bold">{validationAttempts}</p>
          </div>
        </div>
      </div>

      {/* ✅ PANEL DE DEBUG MEJORADO */}
      {debugInfo && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              <Bug className="w-4 h-4" />
              {showDebug ? 'Ocultar' : 'Mostrar'} Debug ({Object.keys(debugInfo).length} secciones)
            </button>
            
            {debugInfo.parsing?.error && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                Error de Parsing
              </span>
            )}
            
            {debugInfo.validation?.error && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                Error de Validación
              </span>
            )}
          </div>
          
          {showDebug && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debugInfo.parsing && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-2">📋 Parsing CSV:</h4>
                    <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(debugInfo.parsing, null, 2)}
                    </pre>
                  </div>
                )}
                
                {debugInfo.validation && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 mb-2">🔍 Validación:</h4>
                    <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-x-auto">
                      {JSON.stringify(debugInfo.validation, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensajes de estado */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800 text-xs shadow-sm">
          <CheckCircle className="w-4 h-4" />
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs shadow-sm">
          <AlertCircle className="w-4 h-4" />
          <div className="flex-1">
            <p>{error}</p>
            {debugInfo && (
              <button
                onClick={() => setShowDebug(true)}
                className="mt-1 text-xs underline hover:no-underline"
              >
                Ver información técnica detallada
              </button>
            )}
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Indicador de pasos */}
      {renderStepIndicator()}

      {/* Contenido principal */}
      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        
        {/* Step 1: Selección de tipo y archivo */}
        {currentStep === 'select' && (
          <div className="p-6">
            <div className="text-center mb-6">
              <Users className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">Seleccionar Tipo de Usuario</h2>
              <p className="text-sm text-gray-600">Primero selecciona el tipo de usuarios que deseas cargar</p>
            </div>

            {/* Selector de tipo */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
              <button
                onClick={() => setUserType('student')}
                className={`p-4 rounded-lg border-2 transition-all text-sm font-medium ${
                  userType === 'student'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2" />
                Estudiantes
              </button>
              <button
                onClick={() => setUserType('teacher')}
                className={`p-4 rounded-lg border-2 transition-all text-sm font-medium ${
                  userType === 'teacher'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200'
                }`}
              >
                <UserCheck className="w-6 h-6 mx-auto mb-2" />
                Docentes
              </button>
            </div>

            {/* Descargar plantilla */}
            <div className="text-center mb-6">
              <button
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isDownloadingTemplate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Descargar Plantilla CSV
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Descarga la plantilla y agrega AL MENOS UNA fila de datos de ejemplo
              </p>
            </div>

            {/* ✅ INFORMACIÓN DETALLADA SOBRE EL FORMATO */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-bold text-blue-800 mb-3">📋 Formato del archivo CSV:</h3>
              <div className="text-xs text-blue-700 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="font-medium mb-1">✅ Estructura requerida:</p>
                    <ul className="space-y-1 ml-2">
                      <li>• Primera fila: headers/títulos</li>
                      <li>• Segunda fila en adelante: datos</li>
                      <li>• Mínimo 2 filas total</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1">📝 Formatos de datos:</p>
                    <ul className="space-y-1 ml-2">
                      <li>• RUN: "12345678-9"</li>
                      <li>• Fechas: "1985-03-15"</li>
                      <li>• Teléfono: "+56912345678"</li>
                      <li>• Cursos: "Mat,Física" (solo docentes)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Subir archivo */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {file ? (
                <div className="space-y-4">
                  <FileText className="w-12 h-12 text-green-600 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB • {csvData.length} registros detectados
                    </p>
                    {debugInfo?.parsing && (
                      <p className="text-xs text-blue-600">
                        Headers: {debugInfo.parsing.headerCount} • Líneas: {debugInfo.parsing.nonEmptyLines}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-blue-600 border border-blue-600 rounded text-xs hover:bg-blue-50"
                    >
                      Cambiar archivo
                    </button>
                    <button
                      onClick={handleValidate}
                      disabled={isValidating || csvData.length === 0}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                          Validando...
                        </>
                      ) : (
                        'Validar Datos'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Selecciona un archivo CSV</p>
                    <p className="text-xs text-gray-500">Debe contener headers + al menos 1 fila de datos</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Seleccionar Archivo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Validación en progreso - ✅ MEJORADO */}
        {currentStep === 'validate' && (
          <div className="p-6">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">Validando Datos</h2>
              <p className="text-sm text-gray-600 mb-2">
                Procesando {csvData.length} registros de {userType}s...
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Intento #{validationAttempts + 1} - Timeout en 25 segundos
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelValidation}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar Validación
                </button>
                
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
                >
                  Empezar de Nuevo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Revisión de resultados */}
        {currentStep === 'review' && validationResult && (
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Resultado de Validación</h2>
              <p className="text-sm text-gray-600">Revisa los resultados antes de proceder</p>
              
              {debugInfo?.validation?.result?.processingTime && (
                <p className="text-xs text-gray-500 mt-1">
                  Tiempo de procesamiento: {debugInfo.validation.result.processingTime}ms
                </p>
              )}
            </div>

            {/* Resumen de validación */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Válidos</p>
                    <p className="text-lg font-bold text-green-700">{validationResult.data.valid}</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-600 font-medium">Con Errores</p>
                    <p className="text-lg font-bold text-red-700">{validationResult.data.errors}</p>
                  </div>
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-yellow-600 font-medium">Duplicados</p>
                    <p className="text-lg font-bold text-yellow-700">
                      {validationResult.data.duplicates.inDatabase.runs.length}
                    </p>
                  </div>
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Total</p>
                    <p className="text-lg font-bold text-blue-700">
                      {validationResult.data.summary.totalRows}
                    </p>
                  </div>
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Errores de validación */}
            {validationResult.data.validationErrors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-red-700 mb-3">
                  Errores Encontrados ({validationResult.data.validationErrors.length}):
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {validationResult.data.validationErrors.slice(0, 10).map((error, index) => (
                    <div key={index} className="text-xs mb-2 last:mb-0">
                      <span className="font-medium text-red-800">Fila {error.row}:</span>
                      <span className="text-red-600 ml-2">{error.errors.join(', ')}</span>
                    </div>
                  ))}
                  {validationResult.data.validationErrors.length > 10 && (
                    <p className="text-xs text-red-600 font-medium mt-2">
                      Y {validationResult.data.validationErrors.length - 10} errores más...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-gray-700 bg-gray-200 hover:bg-gray-300"
              >
                Empezar de Nuevo
              </button>
              
              {validationResult.data.valid > 0 && (
                <button
                  onClick={handleExecute}
                  disabled={isUploading}
                  className="flex-1 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Procesando...
                    </>
                  ) : (
                    `Cargar ${validationResult.data.valid} Usuario${validationResult.data.valid > 1 ? 's' : ''}`
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Resultado final */}
        {currentStep === 'complete' && uploadResult && (
          <div className="p-6">
            <div className="text-center mb-6">
              <UserCheck className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">¡Carga Completada!</h2>
              <p className="text-sm text-gray-600">
                Tasa de éxito: {uploadResult.data.summary.successRate}
              </p>
            </div>

            {/* Resumen final */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                <p className="text-xs text-green-600 font-medium">Creados</p>
                <p className="text-lg font-bold text-green-700">{uploadResult.data.summary.created}</p>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                <p className="text-xs text-red-600 font-medium">Fallidos</p>
                <p className="text-lg font-bold text-red-700">{uploadResult.data.summary.failed}</p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                <p className="text-xs text-gray-600 font-medium">Omitidos</p>
                <p className="text-lg font-bold text-gray-700">{uploadResult.data.summary.skipped}</p>
              </div>
            </div>

            {/* Usuarios creados con contraseñas */}
            {uploadResult.data.created.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-green-700">Usuarios Creados</h3>
                  <button
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPasswords ? 'Ocultar' : 'Mostrar'} contraseñas
                  </button>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-60 overflow-y-auto">
                  {uploadResult.data.created.map((user, index) => (
                    <div key={index} className="text-xs mb-2 last:mb-0 flex justify-between items-center">
                      <span className="font-medium text-green-800">
                        {user.firstName} {user.lastName} ({user.run})
                      </span>
                      {showPasswords && (
                        <span className="text-green-600 font-mono bg-white px-2 py-1 rounded">
                          {user.tempPassword}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                
                {showPasswords && (
                  <p className="text-xs text-yellow-600 mt-2 font-medium">
                    ⚠️ Guarda estas contraseñas temporales antes de continuar
                  </p>
                )}
              </div>
            )}

            {/* Botón para nueva carga */}
            <button
              onClick={resetForm}
              className="w-full py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Nueva Carga Masiva
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MassUpload;