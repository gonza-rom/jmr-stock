'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Calendar, Package } from 'lucide-react';
import PageWrapper from '@/components/PageWrapper';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Devuelve [inicioISO, finISO] para un período dado
function calcularRango(periodo) {
  const hoy = new Date();
  const inicio = new Date();
  switch (periodo) {
    case 'hoy':      break; // inicio = hoy
    case 'semana':   inicio.setDate(hoy.getDate() - 7);   break;
    case 'mes':      inicio.setDate(hoy.getDate() - 30);  break;
    case 'trimestre':inicio.setDate(hoy.getDate() - 90);  break;
    case 'anio':     inicio.setFullYear(hoy.getFullYear() - 1); break;
  }
  return [inicio.toISOString().split('T')[0], hoy.toISOString().split('T')[0]];
}

export default function EstadisticasPage() {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes');

  // Estado único para el rango de fechas
  const [rango, setRango] = useState(() => calcularRango('mes'));
  const [fechaInicio, fechaFin] = rango;

  const fetchEstadisticas = useCallback(async (inicio, fin) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/estadisticas?fechaInicio=${inicio}&fechaFin=${fin}`);
      const data = await res.json();
      setEstadisticas(data);
    } catch {
      console.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Un solo useEffect — se dispara una única vez cuando el rango cambia
  useEffect(() => {
    fetchEstadisticas(fechaInicio, fechaFin);
  }, [fechaInicio, fechaFin, fetchEstadisticas]);

  const cambiarPeriodo = (periodo) => {
    setPeriodoSeleccionado(periodo);
    setRango(calcularRango(periodo)); // un solo setState → un solo re-render → un solo fetch
  };

  const cambiarFechaManual = (campo, valor) => {
    setPeriodoSeleccionado(''); // desmarcar período predefinido
    setRango((prev) =>
      campo === 'inicio' ? [valor, prev[1]] : [prev[0], valor]
    );
  };

  if (loading || !estadisticas) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600 dark:text-gray-400">Cargando estadísticas...</div>
      </div>
    );
  }

  const periodos = [
    { key: 'hoy',       label: 'Hoy'              },
    { key: 'semana',    label: 'Última Semana'     },
    { key: 'mes',       label: 'Último Mes'        },
    { key: 'trimestre', label: 'Último Trimestre'  },
    { key: 'anio',      label: 'Último Año'        },
  ];

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-8 h-8" />
            Estadísticas de Ventas
          </h1>
        </div>

        {/* Selector de período */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {periodos.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => cambiarPeriodo(key)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  periodoSeleccionado === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => cambiarFechaManual('inicio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => cambiarFechaManual('fin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Ingresos Totales</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  ${estadisticas.resumen.ingresoTotal.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total de Ventas</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{estadisticas.resumen.totalVentas}</p>
              </div>
              <ShoppingCart className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Promedio por Venta</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  ${estadisticas.resumen.promedioVenta.toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Ventas por Día
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={estadisticas.ventasPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="fecha" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#f3f4f6' }} />
                <Legend />
                <Line type="monotone" dataKey="total"    stroke="#8884d8" name="Ingresos ($)" />
                <Line type="monotone" dataKey="cantidad" stroke="#82ca9d" name="N° Ventas" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Métodos de Pago</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={estadisticas.ventasPorMetodo}
                  cx="50%" cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.metodo}: $${entry.total.toFixed(0)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {estadisticas.ventasPorMetodo.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#f3f4f6' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Ventas por Categoría</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={estadisticas.ventasPorCategoria}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="nombre" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#f3f4f6' }} />
                <Legend />
                <Bar dataKey="ingreso" fill="#8884d8" name="Ingresos ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {estadisticas.ventasPorMes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Ventas Mensuales</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={estadisticas.ventasPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="mes" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#f3f4f6' }} />
                  <Legend />
                  <Bar dataKey="total" fill="#82ca9d" name="Ingresos ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top 10 productos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" /> Top 10 Productos Más Vendidos
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cantidad Vendida</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ingreso Generado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {estadisticas.productosMasVendidos.map((item, index) => (
                  <tr key={item.producto.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{item.producto.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.producto.categoria.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-semibold">{item.cantidadVendida} unidades</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold">${item.ingresoGenerado.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}