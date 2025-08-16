import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Transfers from './pages/Transfers';
import Statistics from './pages/Statistics';
import ActivityComponent from './pages/Activity';
import Settings from './pages/Settings';
// ✅ NUEVA IMPORTACIÓN: Panel Administrativo
import Admin from './pages/Admin';
import DashboardLayout from './components/Layout/DashboardLayout';
import LoadingScreen from './components/Auth/LoadingScreen';
import { apiService } from './services/api';
import { User } from './types/types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [loadingUser, setLoadingUser] = useState<User | null>(null); // 🎯 NUEVO: Usuario para LoadingScreen
  const [loginCompleted, setLoginCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Loading inicial

  useEffect(() => {
    // Verificar si hay una sesión válida al cargar la app
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('🔍 Token encontrado, verificando...');
          
          // Verificar token con el backend
          const response = await apiService.verifyToken();
          
          if (response.status === 'success') {
            console.log('✅ Token válido, usuario autenticado');
            console.log(`👤 Usuario: ${response.data.user.firstName} ${response.data.user.lastName} (${response.data.user.role})`);
            setUser(response.data.user);
          } else {
            console.log('❌ Token inválido, limpiando localStorage');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('❌ Error verificando token:', error);
        // Limpiar datos si hay error
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = async (run: string, password: string): Promise<boolean> => {
    try {
      console.log('🚀 Intentando login con backend...');
      console.log('📧 RUN:', run);
      
      // Llamada real al backend
      const response = await apiService.login(run, password);
      
      if (response.status === 'success') {
        console.log('✅ Login exitoso:', response.data.user);
        console.log(`🔑 Rol del usuario: ${response.data.user.role}`);
        
        // 🎯 PRIMERO: Guardar usuario para LoadingScreen
        setLoadingUser(response.data.user);
        
        // 🎯 SEGUNDO: Mostrar LoadingScreen con datos del usuario
        setShowLoadingScreen(true);
        
        // 🎯 TERCERO: Guardar usuario en estado principal y localStorage
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        setLoginCompleted(true);
        return true;
      } else {
        console.error('❌ Login fallido:', response.message);
        return false;
      }
      
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      
      // Mostrar mensaje de error más específico
      if (error.message.includes('fetch')) {
        console.error('🚨 Error de conexión: Verifica que el backend esté corriendo en http://localhost:5000');
        alert('Error de conexión: No se puede conectar con el servidor. ¿Está el backend corriendo?');
      } else {
        alert(error.message || 'Error al iniciar sesión');
      }
      
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Cerrando sesión...');
      await apiService.logout();
      console.log('✅ Sesión cerrada exitosamente');
    } catch (error) {
      console.error('⚠️ Error al cerrar sesión:', error);
      // Continuar con el logout local aunque falle el backend
    } finally {
      // Limpiar estado local
      setUser(null);
      setLoginCompleted(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      console.log('🧹 Estados locales limpiados');
    }
  };

  const handleLoadingComplete = () => {
    setShowLoadingScreen(false);
    setLoadingUser(null); // 🎯 Limpiar usuario de loading
  };

  // 🎯 FUNCIÓN PARA OBTENER EL NOMBRE COMPLETO DEL USUARIO
  const getUserDisplayName = (): string => {
    // Usar loadingUser si está disponible (para LoadingScreen), sino usar user normal
    const currentUser = loadingUser || user;
    
    if (!currentUser) return 'Usuario';
    
    // Si tiene firstName y lastName, usar nombre completo
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    
    // Si solo tiene firstName
    if (currentUser.firstName) {
      return currentUser.firstName;
    }
    
    // Si tiene email, usar la parte antes del @
    if (currentUser.email) {
      return currentUser.email.split('@')[0];
    }
    
    // Fallback por defecto
    return 'Usuario';
  };

  // Mostrar loading mientras se verifica la autenticación inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {showLoadingScreen && (
        <>
          {/* 🔍 DEBUG: Verificar nombre antes de pasarlo */}
          {console.log('🎯 LoadingScreen userName:', getUserDisplayName())}
          {console.log('🎯 loadingUser:', loadingUser)}
          {console.log('🎯 user:', user)}
          <LoadingScreen 
            onComplete={handleLoadingComplete}
            userName={getUserDisplayName()} // 🎯 AQUÍ ESTÁ EL CAMBIO PRINCIPAL
          />
        </>
      )}
      
      <Routes>
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } 
        />
        
        <Route
          path="/"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Navigate to="/dashboard" />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/dashboard"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Dashboard user={user} />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/students/*"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Students />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/teachers/*"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Teachers />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/transfers"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Transfers />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/statistics"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Statistics />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/activity"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout}>
                <ActivityComponent />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route
          path="/settings"
          element={
            user ? (
              <DashboardLayout user={user} onLogout={handleLogout}>
                <Settings />
              </DashboardLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* ✅ NUEVA RUTA: Panel Administrativo */}
        <Route
          path="/admin/*"
          element={
            user ? (
              user.role === 'admin' ? (
                <DashboardLayout user={user} onLogout={handleLogout}>
                  <Admin user={user} />
                </DashboardLayout>
              ) : (
                // Redirigir a dashboard si no es admin
                <Navigate to="/dashboard" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Ruta catch-all para 404 */}
        <Route 
          path="*" 
          element={
            user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;