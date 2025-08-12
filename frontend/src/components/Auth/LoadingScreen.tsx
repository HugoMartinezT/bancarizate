import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { LoadingScreenProps } from '../../types/types';

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete, userName = 'Usuario', skipAnimation = false }) => {
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [showText, setShowText] = useState(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (skipAnimation) {
      onComplete?.();
      return;
    }

    console.log('🚀 Iniciando secuencia de éxito');
    
    // Mostrar checkmark después de 500ms
    const checkmarkTimer = setTimeout(() => {
      setShowCheckmark(true);
    }, 500);

    // Mostrar texto después de 1000ms
    const textTimer = setTimeout(() => {
      setShowText(true);
    }, 1000);

    // Completar después de 3000ms total
    const completeTimer = setTimeout(() => {
      if (!hasCompletedRef.current) {
        console.log('✅ Secuencia completada');
        hasCompletedRef.current = true;
        onComplete?.();
      }
    }, 3000);

    return () => {
      clearTimeout(checkmarkTimer);
      clearTimeout(textTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, skipAnimation]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-8 font-sans">
      
      {/* Checkmark circular */}
      <div className={`mb-8 transition-all duration-700 ${showCheckmark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
        <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <Check className="w-10 h-10 text-white stroke-[3]" />
        </div>
      </div>

      {/* Texto de saludo y éxito */}
      <div className={`text-center transition-all duration-700 delay-300 ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h1 className="text-gray-600 text-xl font-normal mb-2">
          Hola {userName}
        </h1>
        
        <h2 className="text-gray-700 text-2xl font-normal">
          Entrada registrada con{' '}
          <span className="text-blue-500 font-medium">éxito</span>
        </h2>
      </div>

    </div>
  );
};

export default LoadingScreen;