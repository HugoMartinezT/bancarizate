import { useState } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { validateRUT, formatRUTOnInput } from '../../utils/rutValidator';

interface LoginFormProps {
  onSubmit: (run: string, password: string) => Promise<boolean>;
}

const LoginForm = ({ onSubmit }: LoginFormProps) => {
  const [run, setRun] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ run?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleRunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRUTOnInput(e.target.value);
    setRun(formatted);
    if (errors.run) {
      setErrors(prev => ({ ...prev, run: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validaciones
    const newErrors: typeof errors = {};

    if (!run) {
      newErrors.run = 'El RUN es requerido';
    } else if (!validateRUT(run)) {
      newErrors.run = 'El RUN ingresado no es válido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    const success = await onSubmit(run, password);
    
    if (!success) {
      setErrors({ general: 'RUN o contraseña incorrectos' });
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="run" className="block text-sm font-medium text-gray-700 mb-2">
          RUN (Rol Único Nacional)
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            id="run"
            type="text"
            value={run}
            onChange={handleRunChange}
            placeholder="12345678-9"
            className={`input-field pl-10 ${errors.run ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={loading}
          />
        </div>
        {errors.run && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.run}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors(prev => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="••••••••"
            className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.password}
          </p>
        )}
      </div>

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{errors.general}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Iniciando sesión...</span>
          </>
        ) : (
          'Iniciar Sesión'
        )}
      </button>

      <div className="text-center">
        <a href="#" className="text-sm text-bank-secondary hover:text-bank-primary transition-colors">
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </form>
  );
};

export default LoginForm;