import { DollarSign, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';

// Definir el tipo User directamente aquí
interface User {
  id: string;
  run: string;
  firstName: string;
  lastName: string;
  email: string;
  balance: number;
  overdraftLimit: number;
}

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Saldo Disponible */}
      <div className="bg-gray-50 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-green-600" />
        </div>
        <div className="absolute top-4 right-4">
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
        <div className="mt-16">
          <p className="text-sm text-gray-600 mb-1">Saldo Disponible</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(user.balance)}</p>
          <p className="text-xs text-gray-500 mt-1">Actualizado hoy</p>
        </div>
      </div>

      {/* Línea de Sobregiro */}
      <div className="bg-gray-50 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-blue-600" />
        </div>
        <div className="mt-16">
          <p className="text-sm text-gray-600 mb-1">Línea de Sobregiro</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(user.overdraftLimit)}</p>
          <p className="text-xs text-gray-500 mt-1">Sin uso actual</p>
        </div>
      </div>

      {/* Total Disponible */}
      <div className="bg-gray-50 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-purple-600" />
        </div>
        <div className="mt-16">
          <p className="text-sm text-gray-600 mb-1">Total Disponible</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(availableBalance)}</p>
          <p className="text-xs text-gray-500 mt-1">Incluye línea de crédito</p>
        </div>
      </div>

      {/* Estado de Cuenta */}
      <div className="bg-gray-50 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-green-600" />
        </div>
        <div className="mt-16">
          <p className="text-sm text-gray-600 mb-1">Estado de Cuenta</p>
          <p className="text-xl font-bold text-green-600">Al día</p>
          <p className="text-xs text-gray-500 mt-1">Sin deudas pendientes</p>
        </div>
      </div>
    </div>
  );
};

export default AccountSummary;