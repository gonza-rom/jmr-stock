'use client';

import { useEffect, useState } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 5;

export default function Home() {
  const [stats, setStats] = useState({
    totalProductos: 0,
    totalCategorias: 0,
    totalProveedores: 0,
    productosStockBajo: [],
    movimientosRecientes: []
  });
  const [loading, setLoading] = useState(true);
  const [paginaStockBajo, setPaginaStockBajo] = useState(1);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // ✅ OPTIMIZADO: 3 fetches livianos en vez de 4 fetches pesados
      // Antes: /api/productos (todos) + /api/categorias + /api/proveedores + /api/movimientos
      // Ahora: /api/productos/stats (solo conteos + stock bajo) + /api/categorias + /api/movimientos
      const [productosStatsRes, categoriasRes, proveedoresRes, movimientosRes] = await Promise.all([
        fetch('/api/productos/stats'),   // Solo conteos y stock bajo — NO trae todos los productos
        fetch('/api/categorias'),
        fetch('/api/proveedores'),
        fetch('/api/movimientos')
      ]);

      const [productosStats, categorias, proveedores, movimientos] = await Promise.all([
        productosStatsRes.json(),
        categoriasRes.json(),
        proveedoresRes.json(),
        movimientosRes.json()
      ]);

      setStats({
        totalProductos: productosStats.totalProductos ?? 0,
        totalCategorias: categorias.length,
        totalProveedores: proveedores.length,
        productosStockBajo: productosStats.productosStockBajo ?? [],
        movimientosRecientes: movimientos.slice(0, 5)
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Paginación de stock bajo
  const totalPaginasStockBajo = Math.ceil(stats.productosStockBajo.length / ITEMS_PER_PAGE);
  const stockBajoPaginado = stats.productosStockBajo.slice(
    (paginaStockBajo - 1) * ITEMS_PER_PAGE,
    paginaStockBajo * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Marroquinería JMR - Control de Stock</p>
      </div>
      
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-jmr-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Productos</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.totalProductos}</p>
            </div>
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-jmr-primary" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-jmr-accent">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Categorías</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.totalCategorias}</p>
            </div>
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-jmr-accent" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border-l-4 border-jmr-secondary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Proveedores</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{stats.totalProveedores}</p>
            </div>
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-jmr-secondary" />
          </div>
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Últimos Movimientos</h2>
        <div className="space-y-2">
          {stats.movimientosRecientes.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">No hay movimientos registrados</p>
          ) : (
            stats.movimientosRecientes.map((movimiento) => (
              <div key={movimiento.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded">
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  {movimiento.tipo === 'ENTRADA' ? (
                    <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{movimiento.producto.nombre}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{movimiento.motivo || 'Sin motivo'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end space-x-4 ml-8 sm:ml-0">
                  <p className={`font-bold text-sm ${movimiento.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                    {movimiento.tipo === 'ENTRADA' ? '+' : '-'}{movimiento.cantidad}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(movimiento.createdAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Productos con stock bajo */}
      {stats.productosStockBajo.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 sm:p-6 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-400">
              Productos con Stock Bajo ({stats.productosStockBajo.length})
            </h2>
          </div>
          
          <div className="space-y-2">
            {stockBajoPaginado.map((producto) => (
              <div key={producto.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{producto.nombre}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{producto.categoria.nombre}</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-4">
                    <div className="text-right">
                      <p className="text-red-600 dark:text-red-400 font-bold text-sm">Stock: {producto.stock}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Mínimo: {producto.stockMinimo}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación stock bajo */}
          {totalPaginasStockBajo > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-red-200 dark:border-red-800">
              <div className="text-xs sm:text-sm text-red-700 dark:text-red-400">
                Página {paginaStockBajo} de {totalPaginasStockBajo}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaginaStockBajo(Math.max(1, paginaStockBajo - 1))}
                  disabled={paginaStockBajo === 1}
                  className="p-1 sm:p-2 border border-red-300 dark:border-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900/40"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={() => setPaginaStockBajo(Math.min(totalPaginasStockBajo, paginaStockBajo + 1))}
                  disabled={paginaStockBajo === totalPaginasStockBajo}
                  className="p-1 sm:p-2 border border-red-300 dark:border-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 dark:hover:bg-red-900/40"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}