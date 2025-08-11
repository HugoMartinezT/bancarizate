import { useState, useEffect, useCallback } from 'react';
import { Send, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, User, Calendar, DollarSign, Search, X, UserCircle, Star, School, TrendingUp, Shield, Sparkles, Wallet, AlertCircle, Users, Calculator, Divide, Loader2, RefreshCw, Filter, ChevronLeft, ChevronRight, SortAsc, SortDesc, Check } from 'lucide-react';
import { apiService } from "../services/api";
import type { User as ApiUser, Transfer, UserStats } from '../../services/api';

interface SelectedRecipient extends ApiUser {
  amount?: number;
  favorite?: boolean;
}

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

  const isRecipientSelected = (user: ApiUser) => selectedRecipients.some(r => r.id === user.id);

  const toggleRecipientSelection = (user: ApiUser) => {
    if (transferMode === 'single') {
      setSelectedRecipients([{ ...user, favorite: favorites.has(user.id) }]);
      setShowRecipientModal(false);
      setSearchTerm('');
    } else {
      setSelectedRecipients(prev => isRecipientSelected(user) ? prev.filter(r => r.id !== user.id) : [...prev, { ...user, favorite: favorites.has(user.id) }]);
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

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  const formatDate = (date: string) => new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
  const getStatusIcon = (status: Transfer['status']) => ({ completed: <CheckCircle className="w-3.5 h-3.5 text-green-500" />, pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />, failed: <XCircle className="w-3.5 h-3.5 text-red-500" /> }[status]);
  const getStatusLabel = (status: Transfer['status']) => ({ completed: 'Completada', pending: 'Pendiente', failed: 'Fallida' }[status]);
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getAvatarColors = (name: string) => {
    const colors = [{ bg: 'bg-purple-100', text: 'text-purple-700' }, { bg: 'bg-blue-100', text: 'text-blue-700' }, { bg: 'bg-green-100', text: 'text-green-700' }, { bg: 'bg-yellow-100', text: 'text-yellow-700' }, { bg: 'bg-pink-100', text: 'text-pink-700' }];
    return colors[name.charCodeAt(0) % colors.length];
  };
  const getRoleBadgeColor = (role: string) => ({ student: 'bg-blue-100 text-blue-700', teacher: 'bg-green-100 text-green-700', admin: 'bg-purple-100 text-purple-700' }[role] || 'bg-gray-100 text-gray-700');
  
  // Componente para renderizar la lista de usuarios en el modal
  const UserListItem = ({ user, isSelected, onToggleSelection, onToggleFavorite }: any) => {
    const colors = getAvatarColors(user.name);
    return (
        <div 
            key={user.id} 
            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors duration-200 ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            onClick={() => onToggleSelection(user)}
        >
            {transferMode === 'multiple' && (
                <div className="flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-[#193cb8] border-[#193cb8]' : 'border-gray-300 bg-white'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                </div>
            )}
            <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className={`text-sm font-bold ${colors.text}`}>{getInitials(user.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">{user.run}</p>
                    {/* ETIQUETA DE ROL AJUSTADA */}
                    <span className={`px-1.5 py-[1px] rounded text-[10px] font-normal ${getRoleBadgeColor(user.role)}`}>{user.displayRole}</span>
                </div>
            </div>
            <div className="flex-shrink-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(user.id); }} 
                    className="p-2 rounded-full hover:bg-yellow-100 transition-colors"
                >
                    <Star className={`w-5 h-5 transition-all ${favorites.has(user.id) ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-400'}`} />
                </button>
            </div>
        </div>
    );
};


  return (
    <div className="max-w-5xl mx-auto px-3 py-4">
      <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-3 mb-4 text-white shadow-md"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="p-1.5 bg-white/20 rounded"><Send className="w-4 h-4 text-white" /></div><div><h1 className="text-base font-bold">Transferencias</h1><p className="text-blue-200 text-xs">Envía dinero de forma rápida y segura</p></div></div><div className="text-right"><p className="text-blue-200 text-xs mb-0.5">Saldo disponible</p>{isLoadingStats ? <div className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /><span>Cargando...</span></div> : <p className="text-base font-bold">{userStats ? formatCurrency(userStats.user.balance) : '$0'}</p>}</div></div></div>
      <div className="bg-white rounded-lg shadow-sm mb-4"><div className="flex"><button onClick={() => setActiveTab('new')} className={`flex-1 px-3 py-2.5 font-medium text-xs rounded-l flex items-center justify-center gap-1 ${activeTab === 'new' ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Sparkles className="w-3.5 h-3.5" />Nueva</button><button onClick={() => setActiveTab('history')} className={`flex-1 px-3 py-2.5 font-medium text-xs rounded-r flex items-center justify-center gap-1 ${activeTab === 'history' ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Clock className="w-3.5 h-3.5" />Historial</button></div></div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md"><School className="w-3.5 h-3.5 text-white" /></div><h2 className="text-sm font-bold text-gray-800">Transferir dinero</h2></div><div className="flex bg-gray-100 rounded-lg p-0.5"><button onClick={() => { setTransferMode('single'); setSelectedRecipients(selectedRecipients.slice(0, 1)); }} className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${ transferMode === 'single' ? 'bg-white text-[#193cb8] shadow-sm' : 'text-gray-600' }`}><User className="w-3 h-3 inline mr-1" />Individual</button><button onClick={() => setTransferMode('multiple')} className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${ transferMode === 'multiple' ? 'bg-white text-[#193cb8] shadow-sm' : 'text-gray-600' }`}><Users className="w-3 h-3 inline mr-1" />Múltiple</button></div></div>
              <div className="space-y-4">
                <div><label className="block text-xs font-semibold text-gray-700 mb-1">{transferMode === 'single' ? 'Destinatario' : 'Destinatarios'}</label><button onClick={() => setShowRecipientModal(true)} className={`w-full text-left p-3 border rounded-lg transition-all shadow-sm ${ errors.recipient ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-blue-300 bg-white' }`}><div className="flex items-center gap-2"><div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">{transferMode === 'single' ? <UserCircle className="w-4 h-4 text-gray-400" /> : <Users className="w-4 h-4 text-gray-400" />}</div><span className="text-xs text-gray-500">{transferMode === 'single' ? 'Selecciona una persona' : `Selecciona personas (${selectedRecipients.length} seleccionados)`}</span></div></button>{selectedRecipients.length > 0 && <div className="mt-2 space-y-1.5">{selectedRecipients.map(recipient => { const colors = getAvatarColors(recipient.name); return <div key={recipient.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg"><div className={`w-6 h-6 ${colors.bg} rounded-full flex items-center justify-center`}><span className={`text-xxs font-bold ${colors.text}`}>{getInitials(recipient.name)}</span></div><div className="flex-1"><p className="text-xs font-semibold text-gray-900">{recipient.name}</p><div className="flex items-center gap-2"><p className="text-xxs text-gray-500">{recipient.run}</p><span className={`px-1.5 py-[1px] rounded text-[10px] font-normal ${getRoleBadgeColor(recipient.role)}`}>{recipient.displayRole}</span></div></div>{recipient.favorite && <Star className="w-3 h-3 text-yellow-500 fill-current" />}<button onClick={() => removeRecipient(recipient.id)} className="p-1 hover:bg-red-100 rounded"><X className="w-3 h-3 text-red-500" /></button></div> })}</div>}{errors.recipient && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" />{errors.recipient}</p>}</div>
                {transferMode === 'multiple' && selectedRecipients.length > 0 && <div><label className="block text-xs font-semibold text-gray-700 mb-1">Distribución del monto</label><div className="flex bg-gray-100 rounded-lg p-0.5"><button onClick={() => setDistributionMode('equal')} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${ distributionMode === 'equal' ? 'bg-white text-[#193cb8] shadow-sm' : 'text-gray-600' }`}><Divide className="w-3 h-3 inline mr-1" />Dividir equitativamente</button><button onClick={() => setDistributionMode('custom')} className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-all ${ distributionMode === 'custom' ? 'bg-white text-[#193cb8] shadow-sm' : 'text-gray-600' }`}><Calculator className="w-3 h-3 inline mr-1" />Montos personalizados</button></div></div>}
                {(transferMode === 'single' || distributionMode === 'equal') ? <div><label className="block text-xs font-semibold text-gray-700 mb-1">{transferMode === 'multiple' ? 'Monto total a dividir' : 'Monto a transferir'}</label><div className="relative"><div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><DollarSign className="w-4 h-4" /></div><input name="amount" type="text" value={formData.amount} onChange={handleChange} placeholder="0" className={`w-full pl-10 pr-3 py-2.5 text-base font-bold border rounded-lg shadow-sm ${ errors.amount ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300' }`} /></div>{formData.amount && selectedRecipients.length > 0 && <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm"><p className="text-xs text-gray-600">{transferMode === 'multiple' && distributionMode === 'equal' ? `Cada persona recibirá:` : 'Total a transferir:'}</p><p className="text-base font-bold text-green-700">{transferMode === 'multiple' && distributionMode === 'equal' ? formatCurrency(calculateAmountPerPerson()) : formatCurrency(parseInt(formData.amount || '0'))}</p>{transferMode === 'multiple' && distributionMode === 'equal' && <p className="text-xxs text-gray-600 mt-1">Total: {formatCurrency(parseInt(formData.amount || '0'))} ÷ {selectedRecipients.length} personas</p>}</div>}{errors.amount && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" />{errors.amount}</p>}</div> : <div><label className="block text-xs font-semibold text-gray-700 mb-1">Montos personalizados</label><div className="space-y-2">{selectedRecipients.map(recipient => { const colors = getAvatarColors(recipient.name); return <div key={recipient.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"><div className={`w-6 h-6 ${colors.bg} rounded-full flex items-center justify-center`}><span className={`text-xxs font-bold ${colors.text}`}>{getInitials(recipient.name)}</span></div><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-900 truncate">{recipient.name}</p></div><div className="relative"><DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" /><input type="text" value={recipient.amount || ''} onChange={e => updateRecipientAmount(recipient.id, e.target.value)} placeholder="0" className="w-24 pl-7 pr-2 py-1.5 text-xs font-bold border border-gray-200 rounded" /></div></div>})}{selectedRecipients.length > 0 && <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-xs text-gray-600">Total a transferir:</p><p className="text-base font-bold text-blue-700">{formatCurrency(calculateTotalAmount())}</p></div>}</div>{errors.amount && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" />{errors.amount}</p>}</div>}
                <div><label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label><textarea name="description" rows={2} value={formData.description} onChange={handleChange} placeholder="¿Para qué es esta transferencia?" className={`w-full px-3 py-2 text-xs border rounded-lg shadow-sm ${ errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-blue-300' }`} />{errors.description && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" />{errors.description}</p>}</div>
                {errors.transfer && <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-xs"><XCircle className="w-3.5 h-3.5" /><p>{errors.transfer}</p></div>}
                <button onClick={handleSubmit} disabled={isCreatingTransfer || selectedRecipients.length === 0 || (!formData.amount && distributionMode === 'equal')} className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-sm font-bold transition-all shadow-md ${ isCreatingTransfer ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : selectedRecipients.length > 0 && (formData.amount || distributionMode === 'custom') ? 'bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white hover:opacity-90' : 'bg-gray-200 text-gray-400 cursor-not-allowed' }`}>{isCreatingTransfer ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : <><Send className="w-4 h-4" />{selectedRecipients.length > 1 ? `Transferir a ${selectedRecipients.length} personas` : 'Realizar Transferencia'}</>}</button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-lg p-4 text-white shadow"><div className="flex items-center gap-2 mb-3"><Wallet className="w-4 h-4" /><h3 className="text-xs font-bold">Mi Billetera</h3></div>{isLoadingStats ? <div className="space-y-2"><div className="h-4 bg-white/20 rounded animate-pulse"></div><div className="h-6 bg-white/20 rounded animate-pulse"></div></div> : userStats ? <div className="space-y-2"><div><p className="text-blue-200 text-xs">Saldo disponible</p><p className="text-base font-bold">{formatCurrency(userStats.user.balance)}</p></div><div className="pt-2 border-t border-white/20"><div className="flex justify-between text-xs"><span className="text-blue-200">Transferido hoy</span><span>{formatCurrency(userStats.limits.transferredToday)}</span></div><div className="flex justify-between text-xs mt-1"><span className="text-blue-200">Disponible total</span><span className="text-green-300">{formatCurrency(userStats.user.availableBalance)}</span></div></div></div> : <p className="text-blue-200 text-xs">Error cargando información</p>}</div>
            <div className="bg-white rounded-lg shadow border border-gray-100 p-4"><div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-[#193cb8]" /><h3 className="text-xs font-bold text-gray-800">Límites Diarios</h3></div>{userStats && <div className="space-y-3"><div><div className="flex justify-between text-xs mb-1"><span className="text-gray-600">Usado hoy</span><span>{userStats.limits.usagePercentage.toFixed(1)}%</span></div><div className="w-full bg-gray-200 rounded-full h-1.5 shadow-inner"><div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] h-1.5 rounded-full" style={{width: `${Math.min(userStats.limits.usagePercentage, 100)}%`}}></div></div></div><div className="space-y-1 text-xs"><div className="flex justify-between py-1"><span className="text-gray-600">Por operación</span><span>{formatCurrency(userStats.limits.maxPerTransfer)}</span></div><div className="flex justify-between py-1"><span className="text-gray-600">Límite diario</span><span>{formatCurrency(userStats.limits.dailyLimit)}</span></div></div></div>}</div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-sm"><div className="flex gap-2"><Shield className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" /><div><h4 className="font-bold text-yellow-800 text-xs mb-1">Transferencias Seguras</h4><ul className="text-xs text-yellow-700 space-y-1"><li className="flex items-start gap-1"><span className="text-yellow-600 mt-0.5">•</span><span>Verifica siempre los destinatarios</span></li><li className="flex items-start gap-1"><span className="text-yellow-600 mt-0.5">•</span><span>Las transferencias son inmediatas</span></li>{transferMode === 'multiple' && <li className="flex items-start gap-1"><span className="text-yellow-600 mt-0.5">•</span><span>Puedes transferir hasta 10 personas a la vez</span></li>}</ul></div></div></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><div className="p-1.5 bg-gradient-to-r from-[#193cb8] to-[#0e2167] rounded-md"><Clock className="w-3.5 h-3.5 text-white" /></div><h2 className="text-sm font-bold text-gray-800">Historial de Transferencias</h2></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs shadow-sm ${showAdvancedFilters ? 'bg-[#193cb8] text-white' : 'bg-gray-100 hover:bg-gray-200'}`}><Filter className="w-3.5 h-3.5" /><span>Filtros</span></button>
                <button onClick={loadTransferHistory} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 text-xs shadow-sm"><RefreshCw className={`w-3.5 h-3.5 ${isLoadingTransfers ? 'animate-spin' : ''}`} /><span>Actualizar</span></button>
              </div>
            </div>
            
            {/* Filtros básicos */}
            <div className="flex items-center gap-2 mb-3">
              <select value={transferTypeFilter} onChange={(e) => setTransferTypeFilter(e.target.value as 'all' | 'sent' | 'received')} className="px-2 py-1 bg-gray-100 rounded text-xs border-0"><option value="all">Todas</option><option value="sent">Enviadas</option><option value="received">Recibidas</option></select>
            </div>

            {/* Filtros avanzados */}
            {showAdvancedFilters && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar persona</label>
                    <input 
                      type="text" 
                      value={filters.search} 
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      placeholder="Nombre o RUN..."
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rol</label>
                    <select 
                      value={filters.role} 
                      onChange={(e) => handleFilterChange('role', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-300"
                    >
                      <option value="all">Todos</option>
                      <option value="student">Estudiantes</option>
                      <option value="teacher">Docentes</option>
                      <option value="admin">Administradores</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Desde</label>
                    <input 
                      type="date" 
                      value={filters.dateFrom} 
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Hasta</label>
                    <input 
                      type="date" 
                      value={filters.dateTo} 
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-300"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-semibold text-gray-700">Ordenar por:</label>
                    <select 
                      value={filters.sortBy} 
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-300"
                    >
                      <option value="date">Fecha</option>
                      <option value="amount">Monto</option>
                      <option value="name">Nombre</option>
                    </select>
                    <button 
                      onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'desc' ? 'asc' : 'desc')}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {filters.sortOrder === 'desc' ? <SortDesc className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />}
                    </button>
                  </div>
                  <button 
                    onClick={clearFilters}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {isLoadingTransfers ? <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" /></div> : transfers.length === 0 ? <div className="p-8 text-center"><Send className="w-12 h-12 mx-auto mb-4 text-gray-300" /><p className="text-sm text-gray-500">No hay transferencias</p></div> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] text-white">
                    <tr><th className="px-4 py-2 text-left text-xs font-bold uppercase">FECHA</th><th className="px-4 py-2 text-left text-xs font-bold uppercase">TIPO</th><th className="px-4 py-2 text-left text-xs font-bold uppercase">PERSONA</th><th className="px-4 py-2 text-left text-xs font-bold uppercase">DESCRIPCIÓN</th><th className="px-4 py-2 text-right text-xs font-bold uppercase">MONTO</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transfers.map((transfer) => {
                      const isIncoming = transfer.direction === 'received';
                      const otherPerson = transfer.otherPerson;
                      const colors = otherPerson ? getAvatarColors(otherPerson.name) : getAvatarColors('Unknown');
                      return (
                        <tr key={transfer.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap"><p className="text-xs text-gray-900">{formatDate(transfer.date)}</p></td>
                          <td className="px-4 py-2 whitespace-nowrap"><div className="flex items-center gap-1">{isIncoming ? (<><div className="p-1 bg-green-100 rounded shadow-sm"><ArrowDownLeft className="w-3 h-3 text-green-600" /></div><span className="text-xs text-green-600">Recibida</span></>) : (<><div className="p-1 bg-red-100 rounded shadow-sm"><ArrowUpRight className="w-3 h-3 text-red-600" /></div><span className="text-xs text-red-600">Enviada</span></>)}{transfer.isMultiple && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xxs rounded font-medium">{transfer.recipientCount > 0 ? `${transfer.recipientCount} personas` : 'Múltiple'}</span>}</div></td>
                          <td className="px-4 py-2 whitespace-nowrap">{otherPerson ? <div className="flex items-center gap-2"><div className={`w-7 h-7 ${colors.bg} rounded-full flex items-center justify-center shadow-sm`}><span className={`text-xs font-bold ${colors.text}`}>{getInitials(otherPerson.name)}</span></div><div><p className="text-xs font-semibold text-gray-900">{otherPerson.name}</p><div className="flex items-center gap-1"><p className="text-xxs text-gray-500">{otherPerson.run}</p><span className={`px-1.5 py-[1px] rounded text-[10px] font-normal ${getRoleBadgeColor(otherPerson.role)}`}>{otherPerson.displayRole}</span></div></div></div> : <div className="flex items-center gap-2"><div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"><Users className="w-3 h-3 text-gray-400" /></div><div><p className="text-xs font-semibold text-gray-900">{transfer.isMultiple ? 'Transferencia múltiple' : 'Desconocido'}</p><p className="text-xxs text-gray-500">{transfer.recipientCount > 0 && `${transfer.recipientCount} destinatarios`}</p></div></div>}</td>
                          <td className="px-4 py-2"><p className="text-xs text-gray-700">{transfer.description}</p></td>
                          <td className="px-4 py-2 whitespace-nowrap text-right"><span className={`text-xs font-bold ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>{isIncoming ? '+' : '-'}{formatCurrency(transfer.amount)}</span>{transfer.amount !== transfer.totalAmount && <p className="text-xxs text-gray-500">Total: {formatCurrency(transfer.totalAmount)}</p>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} transferencias
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-600">
                      Página {pagination.page} de {pagination.totalPages}
                    </span>
                    <button 
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* --- MODAL DE SELECCIÓN DE DESTINATARIOS MEJORADO V3 --- */}
      {showRecipientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Cabecera del Modal */}
                <div className="bg-gradient-to-r from-[#193cb8] to-[#0e2167] p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">{transferMode === 'single' ? 'Seleccionar Destinatario' : 'Seleccionar Destinatarios'}</h3>
                        <button onClick={() => setShowRecipientModal(false)} className="p-2 rounded-full text-blue-200 hover:bg-white/20 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="mt-4 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-200 w-4 h-4" />
                            <input 
                                type="text" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                placeholder="Buscar por nombre, RUN o email..." 
                                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/30 rounded-lg text-sm text-white placeholder-blue-100 focus:ring-2 focus:ring-white/50 focus:border-white/50 transition" 
                            />
                        </div>
                        <select 
                            value={roleFilter} 
                            onChange={(e) => setRoleFilter(e.target.value)} 
                            className="w-full pl-3 pr-8 py-2 bg-white/10 border border-white/30 rounded-lg text-sm text-white focus:ring-2 focus:ring-white/50 focus:border-white/50 transition appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2393c5fd' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                        >
                            <option value="all" className="bg-gray-700 text-white">Todos los roles</option>
                            <option value="student" className="bg-gray-700 text-white">Estudiantes</option>
                            <option value="teacher" className="bg-gray-700 text-white">Docentes</option>
                            <option value="admin" className="bg-gray-700 text-white">Administradores</option>
                        </select>
                    </div>
                </div>

                {/* Lista de Usuarios */}
                <div className="overflow-y-auto flex-grow bg-white">
                    {isLoadingUsers ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-[#193cb8]" />
                            <p className="mt-4 text-sm text-gray-600">Cargando usuarios...</p>
                        </div>
                    ) : (
                        <>
                            {favoriteUsers.length > 0 && (
                                <div className="pt-2">
                                    <h4 className="px-4 py-2 text-xs font-bold text-yellow-600 uppercase tracking-wider flex items-center gap-2"><Star className="w-4 h-4"/> Favoritos</h4>
                                    <div className="divide-y divide-gray-100">
                                      {favoriteUsers.map(user => <UserListItem key={user.id} user={user} isSelected={isRecipientSelected(user)} onToggleSelection={toggleRecipientSelection} onToggleFavorite={toggleFavorite} />)}
                                    </div>
                                </div>
                            )}
                            {otherUsers.length > 0 && (
                                <div className="pt-2">
                                    <h4 className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Todos los Contactos</h4>
                                    <div className="divide-y divide-gray-100">
                                      {otherUsers.map(user => <UserListItem key={user.id} user={user} isSelected={isRecipientSelected(user)} onToggleSelection={toggleRecipientSelection} onToggleFavorite={toggleFavorite} />)}
                                    </div>
                                </div>
                            )}
                            {filteredUsers.length === 0 && !isLoadingUsers && (
                                <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                                    <UserCircle className="w-16 h-16 text-gray-300" />
                                    <p className="mt-4 text-sm font-semibold text-gray-700">No se encontraron personas</p>
                                    <p className="mt-1 text-xs text-gray-500">Prueba con otro término de búsqueda o ajusta los filtros.</p>
                                </div>
                            )}
                        </>
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

      {showConfirmModal && selectedRecipients.length > 0 && ( <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-50"><div className="bg-white rounded-lg max-w-sm w-full shadow-lg max-h-[90vh] overflow-hidden"><div className="p-4"><div className="flex justify-center mb-3"><div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center shadow"><AlertCircle className="w-6 h-6 text-yellow-600" /></div></div><h3 className="text-base font-bold text-gray-900 text-center mb-2">Confirmar {selectedRecipients.length > 1 ? 'Transferencias' : 'Transferencia'}</h3><div className="space-y-3 mb-4"><p className="text-xs text-gray-600 text-center">{selectedRecipients.length > 1 ? `¿Transferir a ${selectedRecipients.length} personas?` : `¿Transferir a ${selectedRecipients[0].name}?`}</p><div className="bg-gray-50 rounded-lg p-3 space-y-2 shadow-sm max-h-48 overflow-y-auto">{selectedRecipients.length === 1 ? <><div className="flex justify-between text-xs"><span className="text-gray-600">Destinatario:</span><span className="font-semibold">{selectedRecipients[0].name}</span></div><div className="flex justify-between text-xs"><span className="text-gray-600">RUN:</span><span className="font-semibold">{selectedRecipients[0].run}</span></div><div className="flex justify-between text-xs"><span className="text-gray-600">Monto:</span><span className="font-bold text-[#193cb8]">{formatCurrency(parseInt(formData.amount || '0'))}</span></div></> : <><p className="text-xs font-semibold text-gray-700 mb-1">Destinatarios:</p>{selectedRecipients.map(recipient => { const amountPerPerson = distributionMode === 'equal' ? calculateAmountPerPerson() : recipient.amount || 0; return <div key={recipient.id} className="flex justify-between text-xs py-1 border-b border-gray-200 last:border-0"><span className="text-gray-700">{recipient.name}</span><span className="font-semibold">{formatCurrency(amountPerPerson)}</span></div>})}<div className="flex justify-between text-xs pt-2 border-t border-gray-300"><span className="font-semibold text-gray-700">Total:</span><span className="font-bold text-[#193cb8]">{formatCurrency(calculateTotalAmount())}</span></div></>}<div className="flex justify-between text-xs pt-2"><span className="text-gray-600">Descripción:</span><span className="font-semibold">{formData.description}</span></div></div></div><div className="flex gap-2"><button onClick={() => setShowConfirmModal(false)} disabled={isCreatingTransfer} className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50">Cancelar</button><button onClick={confirmTransfer} disabled={isCreatingTransfer} className="flex-1 px-3 py-2 bg-gradient-to-r from-[#193cb8] to-[#0e2167] hover:opacity-90 text-white text-xs font-semibold rounded-lg shadow-md disabled:opacity-50 flex items-center justify-center gap-1">{isCreatingTransfer ? <><Loader2 className="w-3 h-3 animate-spin" />Procesando...</> : 'Confirmar'}</button></div></div></div></div>)}
    </div>
  );
};

export default Transfers;
