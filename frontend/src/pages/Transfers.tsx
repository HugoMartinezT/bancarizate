import { useState, useEffect, useCallback } from 'react';
import { Send, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, User, Calendar, DollarSign, Search, X, UserCircle, Star, School, TrendingUp, Shield, Sparkles, Wallet, AlertCircle, Users, Calculator, Divide, Loader2, RefreshCw, Filter, ChevronLeft, ChevronRight, SortAsc, SortDesc, Check } from 'lucide-react';
import { apiService } from "../services/api";
import type { User as ApiUser, Transfer, UserStats } from '../services/api';

// Definición local de SelectedRecipient
interface SelectedRecipient extends ApiUser {
  name: string;
  displayRole: string;
  amount?: number;
  favorite?: boolean;
}

// Nuevo tipo extendido para incluir 'name' explícitamente (resuelve TS2339)
interface ExtendedUser extends ApiUser {
  name: string;
}

const Transfers = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [transferMode, setTransferMode] = useState<'single' | 'multiple'>('single');
  const [distributionMode, setDistributionMode] = useState<'equal' | 'custom'>('equal');
  
  const [users, setUsers] = useState<ExtendedUser[]>([]); // Usar ExtendedUser[] para resolver TS errors
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [userStats, setUserStats] = useState<UserStats['data'] | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [roleFilter, setRoleFilter] = useState('all');
  const [transferTypeFilter, setTransferTypeFilter] = useState<'all' | 'sent' | 'received'>('all');
  
  // ESTADOS PARA FILTROS AVANZADOS Y PAGINACIÓN
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  const [formData, setFormData] = useState({
    amount: '',
    description: ''
  });

  const loadUserStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await apiService.getUserStats();
      setUserStats(response.data);
    } catch (error: any) {
      console.error('Error cargando estadísticas:', error);
      setErrors(prev => ({ ...prev, stats: error.message }));
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setErrors(prev => ({ ...prev, users: '' }));
    
    try {
      console.log('🔍 Cargando usuarios para transferencias...', { 
        search: searchTerm, 
        role: roleFilter 
      });
      
      const response = await apiService.getAllUsers({
        search: searchTerm || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        limit: 100
      });
      
      console.log('✅ Usuarios cargados:', response.data);
      
      // Asegurar que cada usuario tenga el campo name
      const usersWithName: ExtendedUser[] = response.data.users.map((user: any) => ({
        ...user,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
      }));
      
      setUsers(usersWithName);
      
      if (usersWithName.length === 0) {
        console.warn('⚠️ No se encontraron usuarios disponibles');
        setErrors(prev => ({ ...prev, users: 'No hay usuarios disponibles para transferir' }));
      }
      
    } catch (error: any) {
      console.error('❌ Error cargando usuarios:', error);
      
      // Manejo específico de errores
      if (error.message.includes('fetch') || error.message.includes('conectar')) {
        setErrors(prev => ({ ...prev, users: 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.' }));
      } else if (error.message.includes('403') || error.message.includes('autorizado')) {
        setErrors(prev => ({ ...prev, users: 'No tienes permisos para ver esta información. Contacta al administrador.' }));
      } else if (error.message.includes('401')) {
        setErrors(prev => ({ ...prev, users: 'Tu sesión ha expirado. Redirigiendo al login...' }));
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 3000);
      } else {
        setErrors(prev => ({ ...prev, users: error.message || 'Error al cargar usuarios' }));
      }
    } finally {
      setIsLoadingUsers(false);
    }
  }, [searchTerm, roleFilter]);

  const loadTransferHistory = useCallback(async () => {
    setIsLoadingTransfers(true);
    try {
      const response = await apiService.getTransferHistory({
        type: transferTypeFilter,
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      setTransfers(response.data.transfers);
      setPagination(response.data.pagination);
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      setErrors(prev => ({ ...prev, transfers: error.message }));
    } finally {
      setIsLoadingTransfers(false);
    }
  }, [transferTypeFilter, pagination.page, pagination.limit, filters]);

  useEffect(() => {
    loadUserStats();
    const savedFavorites = localStorage.getItem('transfer_favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, [loadUserStats]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadTransferHistory();
    }
  }, [activeTab, loadTransferHistory]);

  // Cargar usuarios cuando se abre el modal o cambian los filtros
  useEffect(() => {
    if (activeTab === 'new' || showRecipientModal) {
      console.log('🔄 Disparando carga de usuarios por cambio en filtros');
      loadUsers();
    }
  }, [activeTab, showRecipientModal, searchTerm, roleFilter]);

  // Efecto para recargar cuando cambian los filtros
  useEffect(() => {
    if (activeTab === 'history') {
      setPagination(prev => ({ ...prev, page: 1 }));
      loadTransferHistory();
    }
  }, [transferTypeFilter, filters]);

  const toggleFavorite = (userId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(userId)) {
      newFavorites.delete(userId);
    } else {
      newFavorites.add(userId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('transfer_favorites', JSON.stringify([...newFavorites]));
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.run.includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const favoriteUsers = filteredUsers.filter(u => favorites.has(u.id));
  const otherUsers = filteredUsers.filter(u => !favorites.has(u.id));

  const isRecipientSelected = (user: ExtendedUser) => selectedRecipients.some(r => r.id === user.id);

  const toggleRecipientSelection = (user: ExtendedUser) => {
    const displayRole = getDisplayRole(user.role);
    
    if (transferMode === 'single') {
      setSelectedRecipients([{ ...user, name: user.name, displayRole, favorite: favorites.has(user.id) }]);
      setShowRecipientModal(false);
      setSearchTerm('');
    } else {
      setSelectedRecipients(prev => isRecipientSelected(user) ? prev.filter(r => r.id !== user.id) : [...prev, { ...user, name: user.name, displayRole, favorite: favorites.has(user.id) }]);
    }
    setErrors(prev => ({ ...prev, recipient: '' }));
  };

  const removeRecipient = (recipientId: string) => setSelectedRecipients(prev => prev.filter(r => r.id !== recipientId));

  const updateRecipientAmount = (recipientId: string, amount: string) => {
    const numericValue = amount.replace(/\D/g, '');
    setSelectedRecipients(prev => prev.map(r => r.id === recipientId ? { ...r, amount: parseInt(numericValue || '0') } : r));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newValue = name === 'amount' ? value.replace(/\D/g, '') : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const calculateAmountPerPerson = () => (!formData.amount || selectedRecipients.length === 0) ? 0 : Math.floor(parseInt(formData.amount) / selectedRecipients.length);
  const calculateTotalAmount = () => distributionMode === 'equal' ? parseInt(formData.amount || '0') : selectedRecipients.reduce((sum, r) => sum + (r.amount || 0), 0);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (selectedRecipients.length === 0) newErrors.recipient = 'Debes seleccionar al menos un destinatario';
    const totalAmount = calculateTotalAmount();
    if (totalAmount <= 0) newErrors.amount = 'El monto debe ser mayor a 0';
    if (totalAmount > 5000000) newErrors.amount = 'El monto total no puede superar $5.000.000';
    if (userStats && totalAmount > userStats.user.availableBalance) newErrors.amount = 'Saldo insuficiente para realizar la transferencia';
    if (!formData.description.trim()) newErrors.description = 'La descripción es requerida';
    return newErrors;
  };

  const handleSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmTransfer = async () => {
    setIsCreatingTransfer(true);
    setShowConfirmModal(false);
    try {
      const transferData = {
        recipientIds: selectedRecipients.map(r => r.id),
        description: formData.description.trim(),
        distributionMode,
        ...(distributionMode === 'equal' 
          ? { amount: parseInt(formData.amount) }
          : { recipientAmounts: selectedRecipients.map(r => r.amount || 0) }
        )
      };
      const response = await apiService.createTransfer(transferData);
      setFormData({ amount: '', description: '' });
      setSelectedRecipients([]);
      await loadUserStats();
      setActiveTab('history');
      setTransferTypeFilter('all');
      alert(`✅ ${response.message}\nNuevo saldo: ${formatCurrency(response.data.newBalance)}`);
    } catch (error: any) {
      console.error('❌ Error en transferencia:', error);
      setErrors({ transfer: error.message });
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsCreatingTransfer(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Helper functions
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  const formatDate = (date: string | Date) => new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(typeof date === 'string' ? new Date(date) : date);
  const getStatusIcon = (status: Transfer['status']) => ({ completed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />, pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />, failed: <XCircle className="w-3.5 h-3.5 text-red-500" /> }[status]);
  const getStatusLabel = (status: Transfer['status']) => ({ completed: 'Completada', pending: 'Pendiente', failed: 'Fallida' }[status]);
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColors = (name: string) => {
    const colors = [{ bg: 'bg-purple-100', text: 'text-purple-700' }, { bg: 'bg-blue-100', text: 'text-blue-700' }, { bg: 'bg-green-100', text: 'text-green-700' }, { bg: 'bg-yellow-100', text: 'text-yellow-700' }, { bg: 'bg-pink-100', text: 'text-pink-700' }];
    return colors[name.charCodeAt(0) % colors.length];
  };
  const getRoleBadgeColor = (role: string) => ({ student: 'bg-blue-100 text-blue-700', teacher: 'bg-green-100 text-green-700', admin: 'bg-purple-100 text-purple-700' }[role] || 'bg-gray-100 text-gray-700');
  const getDisplayRole = (role: string) => ({ student: 'Estudiante', teacher: 'Docente', admin: 'Administrador' }[role] || role);
  
  // Componente para renderizar la lista de usuarios en el modal
  const UserListItem = ({ user, isSelected, onToggleSelection, onToggleFavorite }: {
    user: ExtendedUser;
    isSelected: boolean;
    onToggleSelection: (user: ExtendedUser) => void;
    onToggleFavorite: (userId: string) => void;
  }) => {
    const colors = getAvatarColors(user.name);
    return (
      <div className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => onToggleSelection(user)}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center text-sm font-medium ${colors.text}`}>
            {getInitials(user.name)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.run} • {getDisplayRole(user.role)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(user.id); }} className="p-1">
            <Star className={`w-4 h-4 ${favorites.has(user.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
          </button>
          {transferMode === 'multiple' && (
            <div className={`w-4 h-4 rounded-full border-2 ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      {/* Tabs para Nueva Transferencia / Historial */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'new' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
        >
          Nueva Transferencia
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
        >
          Historial
        </button>
      </div>

      {/* Contenido de Nueva Transferencia */}
      {activeTab === 'new' && (
        <div className="mt-4 space-y-4">
          {/* Estadísticas de Usuario */}
          {isLoadingStats ? (
            <div className="text-center">Cargando estadísticas...</div>
          ) : userStats ? (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p>Saldo disponible: {formatCurrency(userStats.user.availableBalance)}</p>
              {/* ... más stats */}
            </div>
          ) : (
            <div>Error cargando stats</div>
          )}

          {/* Selector de Modo (Single/Multiple) */}
          <div className="flex gap-2">
            <button onClick={() => setTransferMode('single')} className={transferMode === 'single' ? 'bg-blue-500 text-white' : 'bg-gray-200'}>
              Individual
            </button>
            <button onClick={() => setTransferMode('multiple')} className={transferMode === 'multiple' ? 'bg-blue-500 text-white' : 'bg-gray-200'}>
              Múltiple
            </button>
          </div>

          {/* Botón para Abrir Modal de Destinatarios */}
          <button onClick={() => setShowRecipientModal(true)} className="bg-blue-500 text-white p-2 rounded">
            Seleccionar Destinatario{transferMode === 'multiple' ? 's' : ''}
          </button>

          {/* Campo de Monto */}
          <input
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="Monto"
            className="border p-2 rounded w-full"
          />

          {/* Campo de Descripción */}
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descripción"
            className="border p-2 rounded w-full"
          />

          {/* Botón de Enviar */}
          <button onClick={handleSubmit} className="bg-green-500 text-white p-2 rounded">
            Enviar Transferencia
          </button>
        </div>
      )}

      {/* Contenido de Historial */}
      {activeTab === 'history' && (
        <div className="mt-4">
          {/* Filtros */}
          <div className="space-y-2">
            <input
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Buscar en historial..."
              className="border p-2 rounded w-full"
            />
            {/* ... más filtros */}
          </div>

          {/* Lista de Transferencias */}
          {isLoadingTransfers ? (
            <div>Cargando historial...</div>
          ) : transfers.length > 0 ? (
            transfers.map(transfer => (
              <div key={transfer.id} className="border p-2 rounded mb-2">
                {transfer.amount} a {transfer.recipients?.[0]?.name || 'Múltiple'}
              </div>
            ))
          ) : (
            <div>No hay transferencias</div>
          )}

          {/* Paginación */}
          <div className="flex justify-between">
            <button disabled={!pagination.hasPrevPage} onClick={() => handlePageChange(pagination.page - 1)}>
              Anterior
            </button>
            <button disabled={!pagination.hasNextPage} onClick={() => handlePageChange(pagination.page + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE SELECCIÓN DE DESTINATARIOS */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md h-[80vh] flex flex-col">
            {/* Cabecera */}
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Seleccionar {transferMode === 'multiple' ? 'Destinatarios' : 'Destinatario'}</h3>
              <button onClick={() => setShowRecipientModal(false)}><X className="w-5 h-5" /></button>
            </div>

            {/* Filtros */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Buscar por nombre, RUN o email..." 
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
              </div>
              <select 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)} 
                className="w-full mt-2 p-2 border rounded-lg"
              >
                <option value="all">Todos los roles</option>
                <option value="student">Estudiantes</option>
                <option value="teacher">Docentes</option>
                <option value="admin">Administradores</option>
              </select>
            </div>

            {/* Lista de Usuarios */}
            <div className="flex-grow overflow-y-auto">
              {isLoadingUsers ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                  <p>Cargando usuarios...</p>
                </div>
              ) : errors.users ? (
                <div className="p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                  <p>{errors.users}</p>
                </div>
              ) : (
                <>
                  {favoriteUsers.length > 0 && (
                    <div>
                      <h4 className="p-2 text-sm font-bold">Favoritos</h4>
                      {favoriteUsers.map(user => <UserListItem key={user.id} user={user} isSelected={isRecipientSelected(user)} onToggleSelection={toggleRecipientSelection} onToggleFavorite={toggleFavorite} />)}
                    </div>
                  )}
                  {otherUsers.length > 0 && (
                    <div>
                      <h4 className="p-2 text-sm font-bold">Todos los Contactos</h4>
                      {otherUsers.map(user => <UserListItem key={user.id} user={user} isSelected={isRecipientSelected(user)} onToggleSelection={toggleRecipientSelection} onToggleFavorite={toggleFavorite} />)}
                    </div>
                  )}
                  {filteredUsers.length === 0 && (
                    <div className="p-4 text-center">
                      <UserCircle className="w-8 h-8 mx-auto" />
                      <p>No se encontraron personas</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pie para Múltiple */}
            {transferMode === 'multiple' && (
              <div className="p-4 border-t">
                <button onClick={() => setShowRecipientModal(false)} disabled={selectedRecipients.length === 0} className="w-full p-2 bg-blue-500 text-white rounded">
                  Confirmar ({selectedRecipients.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-sm w-full">
            <h3 className="text-lg font-bold">Confirmar Transferencia</h3>
            <div className="mt-2">
              {/* Detalles de la transferencia */}
              <p>Monto: {formatCurrency(calculateTotalAmount())}</p>
              <p>Destinatario{selectedRecipients.length > 1 ? 's' : ''}: {selectedRecipients.map(r => r.name).join(', ')}</p>
              <p>Descripción: {formData.description}</p>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 p-2 bg-gray-200 rounded">
                Cancelar
              </button>
              <button onClick={confirmTransfer} disabled={isCreatingTransfer} className="flex-1 p-2 bg-blue-500 text-white rounded">
                {isCreatingTransfer ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Procesando...
                  </span>
                ) : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfers;