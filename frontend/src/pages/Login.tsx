import { useState, useRef, useEffect } from 'react';
import { Shield, Building2, Lock, Award, TrendingUp, Users, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
  onLogin: (run: string, password: string) => Promise<boolean>;
}

const Login = ({ onLogin }: LoginProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [run, setRun] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const runRef = useRef<HTMLInputElement>(null);

  // Función para formatear el RUN chileno
  const formatRun = (value: string) => {
    // Eliminar todos los caracteres no numéricos excepto 'k' y 'K'
    const cleanValue = value.replace(/[^\dkK]/gi, '');
    
    // Si la longitud es suficiente para formatear (más de 1 dígito)
    if (cleanValue.length > 1) {
      // Tomar todos los dígitos excepto el último
      const base = cleanValue.slice(0, -1);
      // Tomar el último dígito (dígito verificador)
      const dv = cleanValue.slice(-1).toUpperCase();
      // Devolver el valor formateado con guión
      return `${base}-${dv}`;
    }
    return cleanValue;
  };

  // Manejar cambios en el campo RUN
  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setRun(formatRun(inputValue));
  };

  // Enfocar automáticamente el campo RUN al cargar
  useEffect(() => {
    if (runRef.current) {
      runRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // IMPORTANTE: Mantener el RUN con formato para el backend
      const success = await onLogin(run, password);
      if (!success) {
        setError('Credenciales incorrectas. Por favor, intente nuevamente.');
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intente más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Panel izquierdo - Formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden"
        >
          {/* Encabezado con gradiente */}
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="w-12 h-12 text-white mr-3" />
              <h1 className="text-3xl font-bold text-white tracking-tight">BANCARIZATE</h1>
            </div>
            <p className="text-blue-200 font-light">Bienvenido a su banca digital segura</p>
          </div>
          
          {/* Formulario */}
          <div className="p-8">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="run">
                  RUT
                </label>
                <div className="relative">
                  <input
                    id="run"
                    type="text"
                    value={run}
                    onChange={handleRunChange}
                    ref={runRef}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="12345678-9"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                    Recordar dispositivo
                  </label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-blue-700 hover:text-blue-600">
                    ¿Olvidó su contraseña?
                  </a>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Ingresando...
                  </>
                ) : (
                  'Ingresar a mi cuenta'
                )}
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                ¿No tiene una cuenta?{' '}
                <a href="#" className="font-medium text-blue-700 hover:text-blue-600">
                  Solicite su cuenta digital
                </a>
              </p>
            </div>
          </div>
          
          {/* Información de seguridad */}
          <div className="bg-blue-50 p-6 border-t border-blue-100">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-blue-700" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800 font-medium">Su seguridad es nuestra prioridad</p>
                <p className="mt-1 text-xs text-blue-600">
                  Utilizamos encriptación de 256 bits y autenticación de múltiples factores para proteger sus datos.
                  Nunca compartimos ni solicitamos su contraseña por otros medios.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Panel derecho - Información */}
      <div className="hidden lg:block lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 relative overflow-hidden">
        {/* Patrón de seguridad */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDUwIDUwIj4KICA8cGF0aCBkPSJNMjUgMWEyNCAyNCAwIDEgMCAwIDQ4IDI0IDI0IDAgMSAwIDAtNDh6IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMSIgLz4KICA8cGF0aCBkPSJNMTggMTloMTR2MTJIMTh6IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMSIgLz4KICA8cGF0aCBkPSJNMjUgMTV2LTQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4K')]"></div>
        </div>
        
        <div className="h-full flex items-center justify-center p-12 relative z-10">
          <div className="max-w-xl text-white">
            <div className="mb-10">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-5xl font-bold mb-6 tracking-tight"
              >
                Su futuro financiero,<br />a solo un clic
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-xl mb-8 text-blue-100 leading-relaxed"
              >
                Acceda a la plataforma bancaria más segura y completa del mercado.
                Gestione sus finanzas con confianza y comodidad.
              </motion.p>
            </div>

            {/* Características */}
            <div className="space-y-8">
              {[
                { 
                  icon: <Lock className="w-7 h-7 text-blue-200" />, 
                  title: "Seguridad de nivel bancario", 
                  description: "Protección avanzada con encriptación AES-256 y autenticación multifactor" 
                },
                { 
                  icon: <TrendingUp className="w-7 h-7 text-blue-200" />, 
                  title: "Control financiero total", 
                  description: "Analice sus gastos, inversiones y ahorros con herramientas avanzadas" 
                },
                { 
                  icon: <Users className="w-7 h-7 text-blue-200" />, 
                  title: "Atención personalizada", 
                  description: "Ejecutivos dedicados disponibles 24/7 para asistencia financiera" 
                },
                { 
                  icon: <Award className="w-7 h-7 text-blue-200" />, 
                  title: "Premiado por excelencia", 
                  description: "Reconocido como el mejor banco digital por 5 años consecutivos" 
                }
              ].map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + (index * 0.1), duration: 0.5 }}
                  className="flex items-center gap-5"
                >
                  <div className="flex-shrink-0 bg-blue-800/30 backdrop-blur-sm p-3 rounded-xl border border-blue-700/50">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-1">{feature.title}</h3>
                    <p className="text-blue-200">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="mt-16 pt-6 border-t border-blue-700"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm text-blue-300">
                  © 2025 Bancarizate. Todos los derechos reservados.
                </p>
                <div className="flex space-x-4">
                  <a href="#" className="text-blue-300 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                  <a href="#" className="text-blue-300 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a href="#" className="text-blue-300 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;