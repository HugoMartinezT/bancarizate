import { useState, useEffect, useCallback } from 'react';
import { Send, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, User, Calendar, DollarSign, Search, X, UserCircle, Star, School, TrendingUp, Shield, Sparkles, Wallet, AlertCircle, Users, Calculator, Divide, Loader2, RefreshCw, Filter, ChevronLeft, ChevronRight, SortAsc, SortDesc, Check } from 'lucide-react';
import { apiService } from "../services/api";
import type { User as ApiUser, Transfer, UserStats } from '../services/api';
import type { SelectedRecipient } from '../types/types';

const Transfers = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<SelectedRecipient[]>([]);
  const [transferMode, setTransferMode] = useState<'single' | 'multiple'>('single');
  const [distributionMode, setDistributionMode] = useState<'equal' | 'custom'>('equal');
  
  const [users, setUsers] = useState<ApiUser[]>([]);
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
  
  // NUEVOS ESTADOS PARA FILTROS AVANZADOS Y PAGINACIÓN
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
    try {
      const response = await apiService.getAllUsers({
        search: searchTerm,
        role: roleFilter,
        limit: 100
      });
      setUsers(response.data.users);
    } catch (error: any) {
      console.error('Error cargando usuarios:', error);
      setErrors(prev => ({ ...prev, users: error.message }));
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
    } else {
        loadUsers();
    }
  }, [activeTab, loadTransferHistory, loadUsers]);

  useEffect(() => {
    const delayedLoad = setTimeout(() => {
        if(activeTab === 'new' || showRecipientModal) {
            loadUsers();
        }
    }, 300);
    return () => clearTimeout(delayedLoad);
  }, [searchTerm, roleFilter, activeTab, showRecipientModal, loadUsers]);

  const getAvatarColors = (name: string) => {
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-orange-100', text: 'text-orange-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
      { bg: 'bg-indigo-100', text: 'text-indigo-700' }
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const toggleFavorite = (userId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(userId)) {
        newFavorites.delete(userId);
      } else {
        newFavorites.add(userId);
      }
      localStorage.setItem('transfer_favorites', JSON.stringify(Array.from(newFavorites)));
      return newFavorites;
    });
  };

  const isRecipientSelected = (user: ApiUser) => selectedRecipients.some(r => r.id === user.id);

  const handleRecipientSelect = (user: ApiUser) => {
    if (transferMode === 'single') {
      setSelectedRecipients([{ 
        ...user, 
        name: `${user.firstName} ${user.lastName}`,
        displayRole: user.role === 'student' ? 'Estudiante' : user.role === 'teacher' ? 'Docente' : user.role,
        favorite: favorites.has(user.id) 
      }]);
      setShowRecipientModal(false);
    } else {
      setSelectedRecipients(prev => 
        isRecipientSelected(user) 
          ? prev.filter(r => r.id !== user.id)
          : [...prev, { 
              ...user, 
              name: `${user.firstName} ${user.lastName}`,
              displayRole: user.role === 'student' ? 'Estudiante' : user.role === 'teacher' ? 'Docente' : user.role,
              favorite: favorites.has(user.id) 
            }]
      );
    }
  };

  const removeRecipient = (recipientId: string) => setSelectedRecipients(prev => prev.filter(r => r.id !== recipientId));

  const updateRecipientAmount = (recipientId: string, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setSelectedRecipients(prev => prev.map(r => 
      r.id === recipientId ? { ...r, amount: parseInt(numericValue || '0') } : r
    ));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const numericValue = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const calculateAmountPerPerson = () => {
    const total = parseInt(formData.amount || '0');
    return Math.floor(total / selectedRecipients.length);
  };

  const calculateTotalAmount = () => {
    if (transferMode === 'single' || distributionMode === 'equal') {
      return parseInt(formData.amount || '0');
    }
    return selectedRecipients.reduce((sum, r) => sum + (r.amount || 0), 0);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (selectedRecipients.length === 0) {
      newErrors.recipient = 'Selecciona al menos un destinatario';
    }

    const totalAmount = calculateTotalAmount();
    if (totalAmount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    } else if (userStats && totalAmount > userStats.limits.remainingToday) {
      newErrors.amount = `El monto excede el límite diario restante (${formatCurrency(userStats.limits.remainingToday)})`;
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const confirmTransfer = async () => {
    if (!validateForm()) return;

    setIsCreatingTransfer(true);
    try {
      const transferData: any = {
        recipientIds: selectedRecipients.map(r => r.id),
        description: formData.description
      };

      if (transferMode === 'single' || distributionMode === 'equal') {
        transferData.amount = calculateTotalAmount();
        transferData.distributionMode = 'equal';
      } else {
        transferData.distributionMode = 'custom';
        transferData.recipientAmounts = selectedRecipients.map(r => r.amount || 0);
      }

      const response = await apiService.createTransfer(transferData);
      
      if (response.status === 'success') {
        setShowConfirmModal(false);
        setSelectedRecipients([]);
        setFormData({ amount: '', description: '' });
        setActiveTab('history');
        loadTransferHistory();
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Error al procesar la transferencia' });
    } finally {
      setIsCreatingTransfer(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      student: 'bg-blue-100 text-blue-700',
      teacher: 'bg-green-100 text-green-700',
      admin: 'bg-purple-100 text-purple-700'
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status: Transfer['status']) => ({
    completed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
    pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
    failed: <XCircle className="w-3.5 h-3.5 text-red-500" />
  }[status]);

  const getStatusLabel = (status: Transfer['status']) => ({
    completed: 'Completada',
    pending: 'Pendiente',
    failed: 'Fallida'
  }[status]);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'new' 
              ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Nueva Transferencia
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'history' 
              ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white shadow-md' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Historial
        </button>
      </div>

      {activeTab === 'new' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          {/* Modo de transferencia */}
          <div className="flex gap-3">
            <button
              onClick={() => setTransferMode('single')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                transferMode === 'single'
                  ? 'bg-[#193cb8] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setTransferMode('multiple')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                transferMode === 'multiple'
                  ? 'bg-[#193cb8] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Múltiple
            </button>
          </div>

          {transferMode === 'multiple' && (
            <div className="flex gap-3">
              <button
                onClick={() => setDistributionMode('equal')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  distributionMode === 'equal'
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Divide className="w-3 h-3" />
                Igual
              </button>
              <button
                onClick={() => setDistributionMode('custom')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  distributionMode === 'custom'
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calculator className="w-3 h-3" />
                Personalizado
              </button>
            </div>
          )}

          {/* Formulario */}
          <div className="space-y-4">
            {/* Selección de destinatarios */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {transferMode === 'single' ? 'Destinatario' : 'Destinatarios'}
              </label>
              <button 
                onClick={() => setShowRecipientModal(true)} 
                className={`w-full text-left p-3 border rounded-lg transition-all shadow-sm ${
                  errors.recipient ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
                    {transferMode === 'single' ? (
                      <UserCircle className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Users className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {transferMode === 'single' 
                      ? 'Selecciona una persona' 
                      : `Selecciona personas (${selectedRecipients.length} seleccionados)`
                    }
                  </span>
                </div>
              </button>

              {/* Lista de destinatarios seleccionados */}
              {selectedRecipients.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {selectedRecipients.map(recipient => {
                    const colors = getAvatarColors(recipient.name);
                    return (
                      <div key={recipient.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                        <div className={`w-6 h-6 ${colors.bg} rounded-full flex items-center justify-center`}>
                          <span className={`text-xs font-bold ${colors.text}`}>
                            {getInitials(recipient.name)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900">{recipient.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500">{recipient.run}</p>
                            <span className={`px-1.5 py-[1px] rounded text-[10px] font-normal ${getRoleBadgeColor(recipient.role)}`}>
                              {recipient.displayRole}
                            </span>
                          </div>
                        </div>
                        {recipient.favorite && (
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        )}
                        <button 
                          onClick={() => removeRecipient(recipient.id)} 
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {errors.recipient && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {errors.recipient}
                </p>
              )}
            </div>

            {/* Campo de monto */}
            {(transferMode === 'single' || distributionMode === 'equal') ? (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {transferMode === 'multiple' ? 'Monto total a dividir' : 'Monto a transferir'}
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input 
                    name="amount" 
                    type="text" 
                    value={formData.amount} 
                    onChange={handleChange} 
                    placeholder="0" 
                    className={`w-full pl-10 pr-3 py-2.5 text-base font-bold border rounded-lg shadow-sm ${
                      errors.amount ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                    }`} 
                  />
                </div>
                
                {formData.amount && selectedRecipients.length > 0 && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-600">
                      {transferMode === 'multiple' && distributionMode === 'equal' 
                        ? 'Cada persona recibirá:' 
                        : 'Total a transferir:'
                      }
                    </p>
                    <p className="text-base font-bold text-green-700">
                      {transferMode === 'multiple' && distributionMode === 'equal' 
                        ? formatCurrency(calculateAmountPerPerson()) 
                        : formatCurrency(parseInt(formData.amount || '0'))
                      }
                    </p>
                    {transferMode === 'multiple' && distributionMode === 'equal' && (
                      <p className="text-xs text-gray-600 mt-1">
                        Total: {formatCurrency(parseInt(formData.amount || '0'))} ÷ {selectedRecipients.length} personas
                      </p>
                    )}
                  </div>
                )}

                {errors.amount && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.amount}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Montos personalizados</label>
                <div className="space-y-2">
                  {selectedRecipients.map(recipient => {
                    const colors = getAvatarColors(recipient.name);
                    return (
                      <div key={recipient.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className={`w-6 h-6 ${colors.bg} rounded-full flex items-center justify-center`}>
                          <span className={`text-xs font-bold ${colors.text}`}>
                            {getInitials(recipient.name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{recipient.name}</p>
                        </div>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                          <input 
                            type="text" 
                            value={recipient.amount || ''} 
                            onChange={e => updateRecipientAmount(recipient.id, e.target.value)} 
                            placeholder="0" 
                            className="w-24 pl-7 pr-2 py-1.5 text-xs font-bold border border-gray-200 rounded" 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedRecipients.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-gray-600">Total a transferir:</p>
                    <p className="text-base font-bold text-blue-700">{formatCurrency(calculateTotalAmount())}</p>
                  </div>
                )}

                {errors.amount && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errors.amount}
                  </p>
                )}
              </div>
            )}

            {/* Campo de descripción */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Motivo de la transferencia..."
                className={`w-full p-3 border rounded-lg shadow-sm resize-none h-20 text-sm ${
                  errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300'
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {errors.description}
                </p>
              )}
            </div>
          </div>

          {/* Botón de enviar */}
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={selectedRecipients.length === 0 || isCreatingTransfer}
            className="w-full py-3 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white text-sm font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            Confirmar Transferencia
          </button>

          {errors.submit && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{errors.submit}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Historial de Transferencias</h2>
            <button 
              onClick={loadTransferHistory}
              disabled={isLoadingTransfers}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingTransfers ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>

          {isLoadingTransfers ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <p className="text-xs font-medium">Cargando historial...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Clock className="w-8 h-8 mb-2" />
              <p className="text-xs font-medium">No hay transferencias recientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {transfers.map(transfer => (
                <div key={transfer.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
                    {getStatusIcon(transfer.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {transfer.description}
                      </p>
                      <p className={`text-sm font-bold ${transfer.type === 'sent' ? 'text-red-600' : 'text-green-600'}`}>
                        {transfer.type === 'sent' ? '-' : '+'}{formatCurrency(transfer.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(transfer.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 rounded-full font-medium">
                        {getStatusLabel(transfer.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={!pagination.hasPrevPage}
              className="flex items-center gap-1 hover:text-gray-900 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
            <span>Página {pagination.page} de {pagination.totalPages}</span>
            <button 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.hasNextPage}
              className="flex items-center gap-1 hover:text-gray-900 disabled:opacity-50"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de selección de destinatarios */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header del Modal */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                {transferMode === 'single' ? 'Seleccionar Destinatario' : 'Seleccionar Destinatarios'}
              </h3>
              <button onClick={() => setShowRecipientModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Búsqueda y Filtros */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o RUN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-300"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:border-blue-300"
                >
                  <option value="all">Todos los roles</option>
                  <option value="student">Estudiantes</option>
                  <option value="teacher">Docentes</option>
                </select>
              </div>
            </div>

            {/* Lista de Usuarios */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <p className="text-xs font-medium">Cargando personas...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs font-medium">No se encontraron personas</p>
                </div>
              ) : (
                users.map(user => {
                  const isSelected = isRecipientSelected(user);
                  const name = `${user.firstName} ${user.lastName}`;
                  const displayRole = user.role === 'student' ? 'Estudiante' : user.role === 'teacher' ? 'Docente' : user.role;
                  const colors = getAvatarColors(name);

                  return (
                    <div 
                      key={user.id} 
                      onClick={() => handleRecipientSelect(user)}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center`}>
                          <span className={`text-sm font-bold ${colors.text}`}>{getInitials(name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                            {favorites.has(user.id) && <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{user.run}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                              {displayRole}
                            </span>
                          </div>
                        </div>
                        {transferMode === 'multiple' && (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pie del Modal (solo para modo múltiple) */}
            {transferMode === 'multiple' && (
              <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                <button 
                  onClick={() => setShowRecipientModal(false)} 
                  className="w-full py-3 bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white text-sm font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={selectedRecipients.length === 0}
                >
                  Confirmar Selección ({selectedRecipients.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {showConfirmModal && selectedRecipients.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full shadow-lg max-h-[90vh] overflow-hidden">
            <div className="p-4">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center shadow">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
              
              <h3 className="text-base font-bold text-gray-900 text-center mb-2">
                Confirmar {selectedRecipients.length > 1 ? 'Transferencias' : 'Transferencia'}
              </h3>
              
              <div className="space-y-3 mb-4">
                <p className="text-xs text-gray-600 text-center">
                  {selectedRecipients.length > 1 
                    ? `¿Transferir a ${selectedRecipients.length} personas?` 
                    : `¿Transferir a ${selectedRecipients[0].name}?`
                  }
                </p>
                
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 shadow-sm max-h-48 overflow-y-auto">
                  {selectedRecipients.length === 1 ? (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Destinatario:</span>
                        <span className="font-semibold">{selectedRecipients[0].name}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">RUN:</span>
                        <span className="font-semibold">{selectedRecipients[0].run}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Monto:</span>
                        <span className="font-bold text-[#193cb8]">{formatCurrency(parseInt(formData.amount || '0'))}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Destinatarios:</p>
                      {selectedRecipients.map(recipient => {
                        const amountPerPerson = distributionMode === 'equal' ? calculateAmountPerPerson() : recipient.amount || 0;
                        return (
                          <div key={recipient.id} className="flex justify-between text-xs py-1 border-b border-gray-200 last:border-0">
                            <span className="text-gray-700">{recipient.name}</span>
                            <span className="font-semibold">{formatCurrency(amountPerPerson)}</span>
                          </div>
                        );
                      })}
                      <div className="flex justify-between text-xs pt-2 border-t border-gray-300">
                        <span className="font-semibold text-gray-700">Total:</span>
                        <span className="font-bold text-[#193cb8]">{formatCurrency(calculateTotalAmount())}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between text-xs pt-2">
                    <span className="text-gray-600">Descripción:</span>
                    <span className="font-semibold">{formData.description}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowConfirmModal(false)} 
                  disabled={isCreatingTransfer} 
                  className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmTransfer} 
                  disabled={isCreatingTransfer} 
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-[#193cb8] to-[#0e2167] hover:opacity-90 text-white text-xs font-semibold rounded-lg shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isCreatingTransfer ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transfers;