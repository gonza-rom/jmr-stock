'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, TrendingUp, TrendingDown, Search, X, UserCircle } from 'lucide-react';

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Búsqueda de productos
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  
  const [formData, setFormData] = useState({
    productoId: '',
    productoNombre: '',
    tipo: 'ENTRADA',
    cantidad: '',
    motivo: '',
  });

  useEffect(() => {
    fetchMovimientos();
    fetchProductos();
  }, []);

  useEffect(() => {
    if (busquedaProducto.trim()) {
      const busquedaLower = busquedaProducto.toLowerCase();
      const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(busquedaLower) ||
        (p.codigoProducto && p.codigoProducto.toLowerCase().includes(busquedaLower)) ||
        (p.codigoBarras && p.codigoBarras.includes(busquedaProducto))
      );
      setProductosFiltrados(filtrados);
      setMostrarSugerencias(true);
    } else {
      setProductosFiltrados([]);
      setMostrarSugerencias(false);
    }
  }, [busquedaProducto, productos]);

  const fetchMovimientos = async () => {
    try {
      const response = await fetch('/api/movimientos');
      const data = await response.json();
      setMovimientos(data);
    } catch (err) {
      console.error('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/productos');
      const data = await response.json();
      setProductos(data);
    } catch (err) {
      console.error('Error al cargar productos');
    }
  };

  const seleccionarProducto = (producto) => {
    setFormData({
      ...formData,
      productoId: producto.id,
      productoNombre: producto.nombre,
    });
    setBusquedaProducto(producto.nombre);
    setMostrarSugerencias(false);
  };

  const limpiarSeleccion = () => {
    setFormData({
      ...formData,
      productoId: '',
      productoNombre: '',
    });
    setBusquedaProducto('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productoId) {
      alert('Selecciona un producto de la lista');
      return;
    }

    try {
      const response = await fetch('/api/movimientos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productoId: formData.productoId,
          tipo: formData.tipo,
          cantidad: formData.cantidad,
          motivo: formData.motivo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const newMovimiento = await response.json();
      setMovimientos([newMovimiento, ...movimientos]);
      setFormData({ productoId: '', productoNombre: '', tipo: 'ENTRADA', cantidad: '', motivo: '' });
      setBusquedaProducto('');
      setShowForm(false);
      alert('Movimiento registrado correctamente');
      
      fetchMovimientos();
      fetchProductos();
    } catch (err) {
      alert(err.message || 'Error al registrar movimiento');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600 dark:text-gray-400">Cargando movimientos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <ShoppingCart className="w-8 h-8" />
          Movimientos de Stock
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Registrar Movimiento
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar Producto *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busquedaProducto}
                onChange={(e) => setBusquedaProducto(e.target.value)}
                onFocus={() => busquedaProducto && setMostrarSugerencias(true)}
                placeholder="Buscar por nombre, código de producto o código de barras..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
              {busquedaProducto && (
                <button
                  type="button"
                  onClick={limpiarSeleccion}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sugerencias */}
            {mostrarSugerencias && productosFiltrados.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {productosFiltrados.map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => seleccionarProducto(producto)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 border-b dark:border-gray-600 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100">{producto.nombre}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {producto.codigoProducto && `Código: ${producto.codigoProducto} | `}
                      Stock: {producto.stock}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {busquedaProducto && productosFiltrados.length === 0 && mostrarSugerencias && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-4 text-center text-gray-500 dark:text-gray-400">
                No se encontraron productos
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Movimiento *
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              >
                <option value="ENTRADA">Entrada de Stock</option>
                <option value="SALIDA">Salida de Stock</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cantidad *
              </label>
              <input
                type="number"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motivo
            </label>
            <input
              type="text"
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              placeholder="Ej: Compra, Devolución, Ajuste de inventario..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={!formData.productoId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors"
            >
              Registrar Movimiento
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ productoId: '', productoNombre: '', tipo: 'ENTRADA', cantidad: '', motivo: '' });
                setBusquedaProducto('');
              }}
              className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {productos.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-300">
            No hay productos disponibles. Crea productos primero para poder registrar movimientos.
          </p>
        </div>
      )}

      {movimientos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">No hay movimientos registrados</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stock Actual
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(movimiento.createdAt).toLocaleString('es-AR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{movimiento.producto.nombre}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{movimiento.producto.categoria.nombre}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {movimiento.tipo === 'ENTRADA' ? (
                          <>
                            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              Entrada
                            </span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                              Salida
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-bold ${movimiento.tipo === 'ENTRADA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {movimiento.tipo === 'ENTRADA' ? '+' : '-'}{movimiento.cantidad}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {movimiento.motivo || 'Sin motivo especificado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {movimiento.usuario ? (
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">{movimiento.usuario.nombre}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {movimiento.producto.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}