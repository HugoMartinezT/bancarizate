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
  const validationTimeoutRef = useRef<number | null>(null);

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
      const headers: string[] = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
      console.log('📋 Headers encontrados:', headers);
      
      // Validar headers requeridos
      const requiredHeaders = userType === 'student' 
        ? ['run', 'firstname', 'lastname', 'email', 'birthdate', 'institution', 'course', 'gender']
        : ['run', 'firstname', 'lastname', 'email', 'birthdate', 'institution', 'courses', 'gender'];
      
      const missingHeaders = requiredHeaders.filter(req => !headers.includes(req));
      if (missingHeaders.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
      }
      
      console.log('✅ Headers validados correctamente');

      // Parsear datos
      const data: UploadData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values: string[] = lines[i].split(',').map(v => v.trim());
        
        if (values.length < headers.length) {
          console.warn(`⚠️ Línea ${i + 1} incompleta: ${values.length} valores vs ${headers.length} headers`);
          continue;
        }
        
        const row: UploadData = {
          run: values[headers.indexOf('run')],
          firstName: values[headers.indexOf('firstname')],
          lastName: values[headers.indexOf('lastname')],
          email: values[headers.indexOf('email')],
          birthDate: values[headers.indexOf('birthdate')],
          institution: values[headers.indexOf('institution')],
          gender: values[headers.indexOf('gender')],
        };
        
        // Campos opcionales
        const phoneIndex = headers.indexOf('phone');
        if (phoneIndex !== -1) row.phone = values[phoneIndex];
        
        const statusIndex = headers.indexOf('status');
        if (statusIndex !== -1) row.status = values[statusIndex];
        
        const initialBalanceIndex = headers.indexOf('initialbalance');
        if (initialBalanceIndex !== -1) row.initialBalance = parseFloat(values[initialBalanceIndex]) || 0;
        
        const overdraftLimitIndex = headers.indexOf('overdraftlimit');
        if (overdraftLimitIndex !== -1) row.overdraftLimit = parseFloat(values[overdraftLimitIndex]) || 0;
        
        // Campos específicos por tipo
        if (userType === 'student') {
          row.course = values[headers.indexOf('course')];
        } else {
          row.courses = values[headers.indexOf('courses')];
        }
        
        data.push(row);
        console.log(`📝 Procesada fila ${i}:`, row);
      }
      
      console.log('🏆 Parsing completado. Total filas de datos:', data.length);
      return data;
      
    } catch (parseError: any) {
      console.error('❌ Error en parsing CSV:', parseError);
      throw parseError;
    }
  };

  // Manejar carga de archivo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setSuccess(null);
    setCsvData([]);
    setValidationResult(null);
    setCurrentStep('validate');
    setIsValidating(true);
    
    try {
      console.log('📂 Archivo seleccionado:', {
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type
      });
      
      const text = await selectedFile.text();
      const parsedData = parseCSVContent(text);
      setCsvData(parsedData);
      
      // Simular delay para validación (remover en producción)
      let timeoutId: number;
      await new Promise(resolve => {
        timeoutId = setTimeout(resolve, 1500) as unknown as number;
        validationTimeoutRef.current = timeoutId;
      });
      
      const response: MassUploadValidation = await apiService.validateMassUpload(userType, selectedFile);
      setValidationResult(response);
      
      // ✅ CORREGIDO: Tipado explícito para setDebugInfo
      setDebugInfo((prev: any) => ({
        ...prev,
        parseResult: {
          rows: parsedData.length,
          sample: parsedData[0]
        },
        apiResponse: response
      }));
      
      setCurrentStep('review');
      
    } catch (err: any) {
      console.error('❌ Error procesando archivo:', err);
      setError(err.message || 'Error al procesar el archivo CSV');
      setCurrentStep('select');
    } finally {
      setIsValidating(false);
      validationTimeoutRef.current = null;
      setValidationAttempts(prev => prev + 1);
      setLastValidationTime(Date.now());
    }
  };

  // Ejecutar carga masiva
  const handleExecute = async () => {
    if (!validationResult?.data.validData) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      console.log('🚀 Iniciando ejecución de carga masiva...');
      console.log('📊 Datos válidos a cargar:', validationResult.data.validData.length);
      
      // ✅ CORREGIDO: Ajustado para manejar la respuesta correctamente
      const response = await apiService.executeMassUpload(userType, validationResult.data.validData);
      
      // La respuesta ya viene como MassUploadResult desde el servicio API
      setUploadResult(response.data);
      
      // ✅ CORREGIDO: Tipado explícito para setDebugInfo
      setDebugInfo((prev: any) => ({
        ...prev,
        uploadResponse: response.data
      }));
      
      setCurrentStep('complete');
      
    } catch (err: any) {
      console.error('❌ Error en ejecución:', err);
      setError(err.message || 'Error al ejecutar la carga masiva');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Carga Masiva de Usuarios</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Step 1: Selección */}
        {currentStep === 'select' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setUserType('student')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                  userType === 'student' 
                    ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Estudiantes
              </button>
              <button
                onClick={() => setUserType('teacher')}
                className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                  userType === 'teacher' 
                    ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Docentes
              </button>
            </div>

            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">Cargar {userType === 'student' ? 'Estudiantes' : 'Docentes'}</h2>
              <p className="text-xs text-gray-500 mb-6">Sube un archivo CSV con los datos</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white text-sm font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity"
              >
                Seleccionar Archivo CSV
              </button>
              
              <button
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="mt-3 flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 mx-auto"
              >
                <Download className="w-4 h-4" />
                {isDownloadingTemplate ? 'Descargando...' : 'Descargar Plantilla CSV'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Validando */}
        {currentStep === 'validate' && (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Validando Archivo...</h2>
            <p className="text-xs text-gray-500 mb-6">Esto puede tardar unos momentos</p>
            
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '45%' }}></div>
            </div>
            
            <button
              onClick={cancelValidation}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Step 3: Revisión de validación */}
        {currentStep === 'review' && validationResult && (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">Resultados de Validación</h2>
              <p className="text-xs text-gray-500">Archivo: {file?.name}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                <p className="text-xs text-green-600 font-medium">Válidos</p>
                <p className="text-lg font-bold text-green-700">{validationResult.data.summary.validRows}</p>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                <p className="text-xs text-red-600 font-medium">Errores</p>
                <p className="text-lg font-bold text-red-700">{validationResult.data.summary.errorRows}</p>
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-center">
                <p className="text-xs text-yellow-600 font-medium">Duplicados</p>
                <p className="text-lg font-bold text-yellow-700">
                  {validationResult.data.summary.duplicateRuns + validationResult.data.summary.duplicateEmails}
                </p>
              </div>
            </div>

            {/* Detalles de errores */}
            {validationResult.data.validationErrors.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Errores Encontrados ({validationResult.data.validationErrors.length})
                </h3>
                
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {validationResult.data.validationErrors.slice(0, 10).map((err, index) => (
                    <div key={index} className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-xs font-medium text-red-700 mb-2">
                        Fila {err.row}: {err.data.firstName} {err.data.lastName} ({err.data.run})
                      </p>
                      <ul className="list-disc pl-4 space-y-1">
                        {err.errors.map((errorMsg, i) => (
                          <li key={i} className="text-xxs text-red-600">{errorMsg}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {validationResult.data.validationErrors.length > 10 && (
                    <p className="text-xs text-red-600 text-center mt-2">
                      + {validationResult.data.validationErrors.length - 10} errores más...
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
                  {uploadResult.data.created.map((user: any, index: number) => (
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