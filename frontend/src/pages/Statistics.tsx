import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, GraduationCap, Calendar, ArrowUpRight, ArrowDownLeft, SendHorizontal } from 'lucide-react';

const Statistics = () => {
  // Datos de ejemplo para las estadísticas
  const monthlyData = [
    { month: 'Ene', ingresos: 3200000, egresos: 2100000 },
    { month: 'Feb', ingresos: 2800000, egresos: 2300000 },
    { month: 'Mar', ingresos: 3500000, egresos: 1900000 },
    { month: 'Abr', ingresos: 2900000, egresos: 2500000 },
    { month: 'May', ingresos: 3100000, egresos: 2200000 },
    { month: 'Jun', ingresos: 3300000, egresos: 2400000 },
  ];

  const categoryExpenses = [
    { category: 'Educación', amount: 1200000, percentage: 40 },
    { category: 'Servicios', amount: 600000, percentage: 20 },
    { category: 'Alimentación', amount: 450000, percentage: 15 },
    { category: 'Transporte', amount: 300000, percentage: 10 },
    { category: 'Entretenimiento', amount: 300000, percentage: 10 },
    { category: 'Otros', amount: 150000, percentage: 5 },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalIngresos = monthlyData.reduce((sum, item) => sum + item.ingresos, 0);
  const totalEgresos = monthlyData.reduce((sum, item) => sum + item.egresos, 0);
  const balance = totalIngresos - totalEgresos;

  // Calcular el máximo valor para el gráfico
  const maxValue = Math.max(...monthlyData.flatMap(d => [d.ingresos, d.egresos]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Estadísticas</h1>
        <div className="flex gap-3">
          <select className="input-field">
            <option>Últimos 6 meses</option>
            <option>Último año</option>
            <option>Todo el período</option>
          </select>
          <button className="btn-secondary flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Personalizar
          </button>
        </div>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <ArrowDownLeft className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-green-700 mb-1">Total Ingresos</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totalIngresos)}</p>
          <p className="text-xs text-green-600 mt-2">+12% vs período anterior</p>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-500 p-3 rounded-lg">
              <ArrowUpRight className="w-6 h-6 text-white" />
            </div>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-sm text-red-700 mb-1">Total Egresos</p>
          <p className="text-2xl font-bold text-red-900">{formatCurrency(totalEgresos)}</p>
          <p className="text-xs text-red-600 mt-2">-5% vs período anterior</p>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-sm text-blue-700 mb-1">Balance</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(balance)}</p>
          <p className="text-xs text-blue-600 mt-2">Ahorro promedio mensual</p>
        </div>
      </div>

      {/* Gráfico de ingresos vs egresos */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Ingresos vs Egresos</h2>
        <div className="space-y-4">
          {monthlyData.map((data) => (
            <div key={data.month} className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{data.month}</span>
                <span>{formatCurrency(data.ingresos - data.egresos)}</span>
              </div>
              <div className="flex gap-2 h-8">
                <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-green-500 rounded-lg transition-all duration-300"
                    style={{ width: `${(data.ingresos / maxValue) * 100}%` }}
                  />
                </div>
                <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-red-500 rounded-lg transition-all duration-300"
                    style={{ width: `${(data.egresos / maxValue) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">Egresos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por categoría */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Gastos por Categoría</h2>
          <div className="space-y-4">
            {categoryExpenses.map((category) => (
              <div key={category.category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{category.category}</span>
                  <span className="font-medium">{formatCurrency(category.amount)}</span>
                </div>
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full bg-bank-primary rounded-full transition-all duration-300"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Estadísticas del sistema */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Estadísticas del Sistema</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Estudiantes</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">156</p>
              <p className="text-xs text-gray-600 mt-1">+8 este mes</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Docentes</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">24</p>
              <p className="text-xs text-gray-600 mt-1">+2 este mes</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <SendHorizontal className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Transferencias</span>
              </div>
              <p className="text-2xl font-bold text-green-600">342</p>
              <p className="text-xs text-gray-600 mt-1">Este mes</p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Promedio/Día</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">11.4</p>
              <p className="text-xs text-gray-600 mt-1">Transferencias</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;