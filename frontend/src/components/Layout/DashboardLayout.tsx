import React, { useState, ReactNode, useEffect } from 'react';
import Sidebar from './Sidebar'; // Asumiendo que Sidebar.tsx está en la misma carpeta
import { Menu } from 'lucide-react';
import type { User } from '../../types/types';

interface DashboardLayoutProps {
  user: User | null; // Puede ser null si el usuario no está logueado
  onLogout: () => void;
  children: ReactNode; // Usamos children como en tu código original
}

const DashboardLayout = ({ children, user, onLogout }: DashboardLayoutProps) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // Efecto para cerrar el sidebar en pantallas grandes si se redimensiona
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Si no hay usuario, no renderizamos el layout (tu App.tsx ya redirige)
  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-screen md:flex bg-gray-100">
      {/* Overlay para cerrar el menú en móvil */}
      {isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          aria-hidden="true"
        ></div>
      )}

      {/* El Sidebar recibe el estado para poder controlarse en móvil */}
      <Sidebar 
        user={user} 
        onLogout={onLogout} 
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
          {/* Cabecera para la vista móvil con el botón de menú */}
          <header className="bg-white shadow-sm p-4 flex items-center md:hidden flex-shrink-0">
              <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
                  <Menu size={24} />
              </button>
              <h1 className="ml-4 font-semibold text-lg">Menú</h1>
          </header>

          {/* Contenido principal de la página */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
              {/* Aquí se renderizan tus componentes de página como <Dashboard />, etc. */}
              {children}
          </main>
      </div>
    </div>
  );
}

export default DashboardLayout;