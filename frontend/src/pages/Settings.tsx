import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Users, Lock, Eye, EyeOff, Save, AlertCircle, CheckCircle, Shield, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

interface UserData {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: 'student' | 'teacher' | 'admin';
  balance: number;
  overdraftLimit: number;
  birthDate: string;
  institution: string;
  course?: string;
  courses?: string[];
  gender: string;
  isActive: boolean;
}

type AlertType = 'success' | 'error' | 'info';

interface Alert {
  type: AlertType;
  message: string;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);

  const [userData, setUserData] = useState<UserData | null>(null);

  const [personalForm, setPersonalForm] = useState({
    email: '',
    phone: '',
    birthDate: '',
    gender: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await apiService.verifyToken();

      console.log('📋 Respuesta completa de verifyToken:', response);

      if (response?.data?.user) {
        const user = response.data.user;
        console.log('👤 Datos del usuario:', user);
        console.log('🏫 Institución:', user.institution);
        console.log('📚 Curso:', user.course);
        console.log('📚 Cursos (teacher):', user.courses);

        setUserData(user);

        setPersonalForm({
          email: user.email || '',
          phone: user.phone || '',
          birthDate: user.birthDate || '',
          gender: user.gender || ''
        });
      }
    } catch (error: any) {
      console.error('Error cargando datos del usuario:', error);
      showAlert('error', 'Error al cargar los datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type: AlertType, message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string): boolean => {
    if (!phone) return true;
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^\+569\d{8}$/;
    return phoneRegex.test(cleanPhone);
  };

  const isValidBirthDate = (date: string): boolean => {
    if (!date) return false;
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 15 && age - 1 <= 70;
    }

    return age >= 15 && age <= 70;
  };

  const handleSavePersonalInfo = async () => {
    try {
      if (!personalForm.email) {
        showAlert('error', 'El email es requerido');
        return;
      }

      if (!isValidEmail(personalForm.email)) {
        showAlert('error', 'Email inválido');
        return;
      }

      if (personalForm.phone && !isValidPhone(personalForm.phone)) {
        showAlert('error', 'Teléfono inválido. Formato: +56 9 XXXX XXXX');
        return;
      }

      if (!personalForm.birthDate) {
        showAlert('error', 'La fecha de nacimiento es requerida');
        return;
      }

      if (!isValidBirthDate(personalForm.birthDate)) {
        showAlert('error', 'Edad debe estar entre 15 y 70 años');
        return;
      }

      if (!personalForm.gender) {
        showAlert('error', 'Por favor selecciona un género');
        return;
      }

      setSaving(true);

      const updateData = {
        email: personalForm.email,
        phone: personalForm.phone || '',
        birthDate: personalForm.birthDate,
        gender: personalForm.gender
      };

      // Todos los usuarios (estudiantes, docentes y admins) usan el mismo endpoint
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const apiResponse = await fetch(`${baseURL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.message || `Error ${apiResponse.status}`);
      }

      if (data.status === 'success') {
        showAlert('success', 'Información actualizada correctamente');
        await loadUserData();
      }
    } catch (error: any) {
      console.error('Error actualizando información:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar la información';
      showAlert('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!passwordForm.currentPassword) {
        showAlert('error', 'Ingresa tu contraseña actual');
        return;
      }

      if (!passwordForm.newPassword) {
        showAlert('error', 'Ingresa una nueva contraseña');
        return;
      }

      if (passwordForm.newPassword.length < 6) {
        showAlert('error', 'La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        showAlert('error', 'Las contraseñas no coinciden');
        return;
      }

      if (passwordForm.currentPassword === passwordForm.newPassword) {
        showAlert('error', 'La nueva contraseña debe ser diferente a la actual');
        return;
      }

      setSaving(true);

      // Llamada directa al endpoint de cambio de contraseña
      const token = localStorage.getItem('token');
      const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      const response = await fetch(`${baseURL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error ${response.status}`);
      }

      if (data.status === 'success') {
        showAlert('success', 'Contraseña actualizada correctamente');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswords({ current: false, new: false, confirm: false });
      }
    } catch (error: any) {
      console.error('Error cambiando contraseña:', error);
      const errorMessage = error.message || 'Error al cambiar la contraseña';
      showAlert('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#193cb8] animate-spin mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold">Configuración</h1>
              <p className="text-blue-200 text-xs">Gestiona tu información personal y seguridad</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs mb-0.5">Usuario</p>
            <p className="text-base font-bold">
              {userData?.firstName} {userData?.lastName}
            </p>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-xs shadow-sm ${
            alert.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : alert.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <p className="font-medium">{alert.message}</p>
        </div>
      )}

      {/* Información de Solo Lectura */}
      <div className="bg-white rounded-lg shadow border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-sm font-bold text-gray-800">Información de Cuenta</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-1">RUN</p>
            <p className="font-semibold text-gray-900 text-sm">{userData?.run || 'No disponible'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-1">Nombre Completo</p>
            <p className="font-semibold text-gray-900 text-sm">
              {userData?.firstName} {userData?.lastName}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-1">Rol</p>
            <p className="font-semibold text-gray-900 text-sm capitalize">
              {userData?.role === 'student' ? 'Estudiante' : userData?.role === 'teacher' ? 'Docente' : 'Administrador'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-1">Balance</p>
            <p className="font-semibold text-gray-900 text-sm">
              ${(userData?.balance || 0).toLocaleString('es-CL')}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-1">Institución</p>
            <p className="font-semibold text-gray-900 text-sm">
              {userData?.institution || 'No asignado'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-1">
              {userData?.role === 'teacher' ? 'Cursos' : 'Curso'}
            </p>
            <p className="font-semibold text-gray-900 text-sm">
              {userData?.role === 'teacher'
                ? (userData?.courses && userData.courses.length > 0 ? userData.courses.join(', ') : 'No asignado')
                : (userData?.course || 'No asignado')}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-gray-600 text-xs">
            <strong>Nota:</strong> Nombre, Institución y Curso solo pueden ser modificados por un administrador.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-100">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 px-4 py-3 text-xs font-semibold transition-all ${
                activeTab === 'personal'
                  ? 'text-[#193cb8] border-b-2 border-[#193cb8] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                <span>Información Personal</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 px-4 py-3 text-xs font-semibold transition-all ${
                activeTab === 'security'
                  ? 'text-[#193cb8] border-b-2 border-[#193cb8] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Seguridad</span>
              </div>
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Tab: Información Personal */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={personalForm.email}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, email: e.target.value })
                    }
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
                    placeholder="ejemplo@correo.com"
                    disabled={saving}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Asegúrate de usar un email válido
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    value={personalForm.phone}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, phone: e.target.value })
                    }
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
                    placeholder="+56 9 1234 5678"
                    disabled={saving}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Formato: +56 9 XXXX XXXX
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha de Nacimiento *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={personalForm.birthDate}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, birthDate: e.target.value })
                    }
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
                    disabled={saving}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Edad permitida: entre 15 y 70 años
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Género *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={personalForm.gender}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, gender: e.target.value })
                    }
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
                    disabled={saving}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                    <option value="Prefiero no decir">Prefiero no decir</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleSavePersonalInfo}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Seguridad */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-800 mb-1">
                      Importante sobre el cambio de contraseña
                    </p>
                    <p className="text-xs text-yellow-700">
                      Debes ingresar tu contraseña actual para poder cambiarla por una nueva.
                      La nueva contraseña debe tener al menos 6 caracteres.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contraseña Actual *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className="w-full pl-10 pr-12 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
                    placeholder="Ingresa tu contraseña actual"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    className="w-full pl-10 pr-12 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
                    placeholder="Mínimo 6 caracteres"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {passwordForm.newPassword && passwordForm.newPassword.length < 6 && (
                  <p className="mt-1 text-xs text-red-600">
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirmar Nueva Contraseña *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    className="w-full pl-10 pr-12 py-2.5 text-sm border border-gray-200 rounded-lg shadow-sm focus:border-blue-300 focus:ring-1 focus:ring-blue-300 transition-colors"
                    placeholder="Repite la nueva contraseña"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {passwordForm.newPassword && passwordForm.confirmPassword && (
                <div className="text-xs">
                  {passwordForm.newPassword === passwordForm.confirmPassword ? (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg p-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Las contraseñas coinciden</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Las contraseñas no coinciden</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cambiando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Cambiar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
