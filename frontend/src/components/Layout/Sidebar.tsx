import React, { useState, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  SendHorizontal, 
  BarChart3, 
  Clock, 
  Settings, 
  ChevronLeft, 
  LogOut,
  Building2,
  ChevronDown,
  Shield, // Nuevo ícono para administración
} from 'lucide-react';
import clsx from 'clsx';

// --- Interfaces ---
interface User {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
  overdraftLimit: number;
  role: string; // Importante para verificar si es admin
}

interface SidebarProps {
  user: User;
  onLogout: () => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

interface MenuItem {
  label: string;
  icon: ReactNode;
  path?: string;
  children?: SubMenuItem[];
  requiresAdmin?: boolean; // Nueva propiedad para items que requieren permisos de admin
}

interface SubMenuItem {
    label: string;
    path: string;
    icon?: ReactNode;
}

// --- Componente Tooltip (para modo colapsado en escritorio) ---
const Tooltip = ({ children, text }: { children: ReactNode, text:string }) => (
  <div className="relative group flex items-center">
    {children}
    <div className="absolute left-full ml-3 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none z-50">
      {text}
    </div>
  </div>
);

// --- Componente Sidebar ---
const Sidebar = ({ user, onLogout, isSidebarOpen, setSidebarOpen }: SidebarProps) => {
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  const location = useLocation();
  const navigate = useNavigate();

  const isExpanded = isPinned || isHovered;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (window.innerWidth < 768) {
        setSidebarOpen(false);
    }
  };
  
  const menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard' },
    {
      label: 'Estudiantes',
      icon: <GraduationCap size={18} />,
      children: [
        { label: 'Crear Estudiante', path: '/students/create' },
        { label: 'Ver Listado', path: '/students/list' }
      ]
    },
    {
      label: 'Docentes',
      icon: <Users size={18} />,
      children: [
        { label: 'Crear Docente', path: '/teachers/create' },
        { label: 'Ver Listado', path: '/teachers/list' }
      ]
    },
    { label: 'Transferencias', icon: <SendHorizontal size={18} />, path: '/transfers' },
    { label: 'Estadísticas', icon: <BarChart3 size={18} />, path: '/statistics' },
    { label: 'Actividad', icon: <Clock size={18} />, path: '/activity' },
    // NUEVO: Panel de Administración
    {
      label: 'Administración',
      icon: <Shield size={18} />,
      path: '/admin',
      requiresAdmin: true // Solo visible para administradores
    }
  ];

  // Filtrar items según el rol del usuario
  const filteredMenuItems = menuItems.filter(item => {
    if (item.requiresAdmin) {
      return user.role === 'admin';
    }
    return true;
  });

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]);
  };

  const isActive = (path?: string) => path && location.pathname.startsWith(path);
  const isParentActive = (children?: MenuItem['children']) => children?.some(child => isActive(child.path));

  const activeClasses = "bg-blue-900 text-white font-semibold";
  const inactiveClasses = "text-gray-300 hover:bg-blue-700 hover:text-white";

  return (
    <aside
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'bg-blue-800 text-white fixed inset-y-0 left-0 z-40 transform transition-all duration-300 ease-in-out md:relative md:translate-x-0 overflow-x-hidden',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        isExpanded ? 'md:w-60' : 'md:w-[72px]'
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-3 flex items-center justify-between border-b border-blue-700/50 flex-shrink-0 h-[61px]">
            <div className="flex items-center gap-3">
              <Building2 className="w-7 h-7 text-cyan-400 flex-shrink-0" />
              <div className={clsx("overflow-hidden transition-opacity duration-200", isExpanded ? "opacity-100" : "opacity-0")}>
                <h1 className="font-bold text-base whitespace-nowrap">Mi Banco</h1>
              </div>
            </div>
            <button 
              onClick={() => setIsPinned(prev => !prev)} 
              className="hidden md:block p-1.5 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <ChevronLeft size={16} className={clsx('transition-transform duration-300', !isPinned && 'rotate-180')} />
            </button>
        </div>
        
        <nav className="flex-1 p-2 space-y-1">
          {filteredMenuItems.map((item) => {
            const parentActive = isParentActive(item.children);
            const itemKey = item.label.toLowerCase();
            const isSubmenuExpanded = expandedItems.includes(itemKey);
            const baseClasses = "flex items-center w-full text-left p-2.5 rounded-lg transition-colors duration-200";

            if (item.children) {
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleExpanded(itemKey)}
                    className={clsx(baseClasses, parentActive ? activeClasses : inactiveClasses, !isExpanded && "justify-center")}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    <div className={clsx("flex-1 ml-3 overflow-hidden transition-opacity duration-200 whitespace-nowrap flex justify-between items-center", isExpanded ? "opacity-100" : "opacity-0")}>
                      <span className="text-sm font-medium">{item.label}</span>
                      <ChevronDown size={16} className={clsx("transition-transform", isSubmenuExpanded && "rotate-180")} />
                    </div>
                  </button>
                  {isExpanded && isSubmenuExpanded && (
                    <ul className="pl-8 pt-1 space-y-1">
                      {item.children.map(child => (
                        <li key={child.path}>
                          <button onClick={() => handleNavigation(child.path)} className={clsx("flex items-center w-full text-left p-2 rounded-lg transition-colors duration-200 text-xs", isActive(child.path) ? "text-white font-medium" : "text-gray-400 hover:text-white")}>
                            <div className={clsx("w-1.5 h-1.5 rounded-full mr-3 transition-colors", isActive(child.path) ? 'bg-cyan-400' : 'bg-gray-500')}></div>
                            <span className="font-medium">{child.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            }
            
            return (
              <button 
                key={item.label} 
                onClick={() => item.path && handleNavigation(item.path)} 
                className={clsx(
                  baseClasses, 
                  isActive(item.path) ? activeClasses : inactiveClasses, 
                  !isExpanded && "justify-center",
                  // Estilo especial para el item de Administración
                  item.requiresAdmin && "border border-orange-400/30 bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20"
                )}
              >
                <div className="flex-shrink-0">
                  {isExpanded ? item.icon : <Tooltip text={item.label}>{item.icon}</Tooltip>}
                </div>
                <div className={clsx("flex-1 ml-3 overflow-hidden transition-opacity duration-200 whitespace-nowrap", isExpanded ? "opacity-100" : "opacity-0")}>
                  <span className="text-sm font-medium">{item.label}</span>
                  {/* Badge para indicar que requiere permisos de admin */}
                  {item.requiresAdmin && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-200 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
        
        <div className="p-2 border-t border-blue-700/50 flex-shrink-0">
          <div className={clsx("overflow-hidden transition-all duration-300", isExpanded ? "max-h-40" : "max-h-0")}>
            <div className="p-2 mb-1 bg-blue-900/50 rounded-lg">
              <p className="font-semibold text-xs truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[11px] text-blue-300 truncate">{user.email}</p>
              {/* Mostrar el rol del usuario */}
              <p className="text-[10px] text-cyan-300 font-medium">
                {user.role === 'admin' ? '👑 Administrador' : 
                 user.role === 'teacher' ? '👨‍🏫 Docente' : 
                 '🎓 Estudiante'}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <button onClick={() => handleNavigation('/settings')} className={clsx("flex items-center w-full text-left p-2.5 rounded-lg transition-colors duration-200", isActive('/settings') ? activeClasses : inactiveClasses, !isExpanded && "justify-center")}>
              <div className="flex-shrink-0">{isExpanded ? <Settings size={18} /> : <Tooltip text="Configuración"><Settings size={18} /></Tooltip>}</div>
              <div className={clsx("flex-1 ml-3 overflow-hidden transition-opacity duration-200 whitespace-nowrap", isExpanded ? "opacity-100" : "opacity-0")}><span className="text-sm font-medium">Configuración</span></div>
            </button>
            <button onClick={onLogout} className={clsx("flex items-center w-full text-left p-2.5 rounded-lg transition-colors duration-200 text-red-400 hover:bg-red-500/20 hover:text-red-300", !isExpanded && "justify-center")}>
              <div className="flex-shrink-0">{isExpanded ? <LogOut size={18} /> : <Tooltip text="Cerrar Sesión"><LogOut size={18} /></Tooltip>}</div>
              <div className={clsx("flex-1 ml-3 overflow-hidden transition-opacity duration-200 whitespace-nowrap", isExpanded ? "opacity-100" : "opacity-0")}><span className="text-sm font-medium">Cerrar Sesión</span></div>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;