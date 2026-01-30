'use client';

import { useEffect, useState } from 'react';
import { Package, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({
    totalProductos: 0,
    totalCategorias: 0,
    totalProveedores: 0,
    productosStockBajo: [],
    movimientosRecientes: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch en paralelo para mejor performance
      const [productosRes, categoriasRes, proveedoresRes, movimientosRes] = await Promise.all([
        fetch('/api/productos'),
        fetch('/api/categorias'),
        fetch('/api/proveedores'),
        fetch('/api/movimientos')
      ]);

      const [productos, categorias, proveedores, movimientos] = await Promise.all([
        productosRes.json(),
        categoriasRes.json(),
        proveedoresRes.json(),
        movimientosRes.json()
      ]);

      // Filtrar productos con stock bajo
      const productosStockBajo = productos.filter(p => p.stock <= p.stockMinimo);

      setStats({
        totalProductos: productos.length,
        totalCategorias: categorias.length,
        totalProveedores: proveedores.length,
        productosStockBajo: productosStockBajo,
        movimientosRecientes: movimientos.slice(0, 5)
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard - Control de Stock</h1>
      
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Productos</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalProductos}</p>
            </div>
            <Package className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Categorías</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalCategorias}</p>
            </div>
            <Package className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Proveedores</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalProveedores}</p>
            </div>
            <Package className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Productos con stock bajo */}
      {stats.productosStockBajo.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-red-800">
              Productos con Stock Bajo ({stats.productosStockBajo.length})
            </h2>
          </div>
          <div className="space-y-2">
            {stats.productosStockBajo.map((producto) => (
              <div key={producto.id} className="bg-white p-3 rounded border border-red-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">{producto.nombre}</p>
                    <p className="text-sm text-gray-600">{producto.categoria.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-600 font-bold">Stock: {producto.stock}</p>
                    <p className="text-xs text-gray-500">Mínimo: {producto.stockMinimo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movimientos recientes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Últimos Movimientos</h2>
        <div className="space-y-2">
          {stats.movimientosRecientes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay movimientos registrados</p>
          ) : (
            stats.movimientosRecientes.map((movimiento) => (
              <div key={movimiento.id} className="flex items-center justify-between p-3 border-b hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  {movimiento.tipo === 'ENTRADA' ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-800">{movimiento.producto.nombre}</p>
                    <p className="text-sm text-gray-600">{movimiento.motivo || 'Sin motivo especificado'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${movimiento.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                    {movimiento.tipo === 'ENTRADA' ? '+' : '-'}{movimiento.cantidad}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(movimiento.createdAt).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}