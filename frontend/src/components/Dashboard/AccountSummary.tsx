import { DollarSign, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';
import { User } from '../../types/types';

interface AccountSummaryProps {
  user: User;
}

const AccountSummary = ({ user }: AccountSummaryProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const availableBalance = user.balance + user.overdraftLimit;
  const overdraftUsed = user.balance < 0 ? Math.abs(user.balance) : 0;
  const overdraftPercentage = (overdraftUsed / user.overdraftLimit) * 100;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Saldo Disponible */}
      <div className="card group hover:shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-green-100 p-3 rounded-lg group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <TrendingUp className="w-5 h-5 text-green-500" />
        </div>
        <p className="text-sm text-gray-600 mb-1">Saldo Disponible</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(user.balance)}</p>
        <p className="text-xs text-gray-500 mt-2">Actualizado hoy</p>
      </div>

      {/* Línea de Sobregiro */}
      <div className="card group hover:shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-blue-100 p-3 rounded-lg group-hover:scale-110 transition-transform">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          {overdraftUsed > 0 && (
            <AlertCircle className="w-5 h-5 text-orange-500" />
          )}
        </div>
        <p className="text-sm text-gray-600 mb-1">Línea de Sobregiro</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(user.overdraftLimit)}</p>
        {overdraftUsed > 0 ? (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Usado: {formatCurrency(overdraftUsed)}</span>
              <span>{overdraftPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(overdraftPercentage, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mt-2">Sin uso actual</p>
        )}
      </div>

      {/* Saldo Total Disponible */}
      <div className="card group hover:shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-purple-100 p-3 rounded-lg group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-1">Total Disponible</p>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(availableBalance)}</p>
        <p className="text-xs text-gray-500 mt-2">Incluye línea de crédito</p>
      </div>

      {/* Estado de la Cuenta */}
      <div className="card group hover:shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg group-hover:scale-110 transition-transform ${
            user.balance >= 0 ? 'bg-green-100' : 'bg-orange-100'
          }`}>
            <AlertCircle className={`w-6 h-6 ${
              user.balance >= 0 ? 'text-green-600' : 'text-orange-600'
            }`} />
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-1">Estado de Cuenta</p>
        <p className={`text-lg font-bold ${
          user.balance >= 0 ? 'text-green-600' : 'text-orange-600'
        }`}>
          {user.balance >= 0 ? 'Al día' : 'En sobregiro'}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          {user.balance >= 0 ? 'Sin deudas pendientes' : 'Regularizar pronto'}
        </p>
      </div>
    </div>
  );
};

export default AccountSummary;