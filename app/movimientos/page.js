'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, TrendingUp, TrendingDown, Search, X, UserCircle, Ban, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PageWrapper from '@/components/PageWrapper';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function MovimientosPage() {
  const { isAdmin } = useAuth();
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const busquedaProductoDebounced = useDebounce(busquedaProducto, 350);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const [formData, setFormData] = useState({ productoId: '', productoNombre: '', tipo: 'ENTRADA', cantidad: '', motivo: '' });
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => { fetchMovimientos(); }, []);

  useEffect(() => {
    if (!busquedaProductoDebounced.trim()) { setSugerencias([]); setMostrarSugerencias(false); return; }
    buscarSugerencias(busquedaProductoDebounced);
  }, [busquedaProductoDebounced]);

  const buscarSugerencias = async (query) => {
    setBuscandoSugerencias(true);
    try {
      const res = await fetch(`/api/productos?busqueda=${encodeURIComponent(query)}&pageSize=8`);
      const data = await res.json();
      const lista = Array.isArray(data) ? data : (data.productos ?? []);
      setSugerencias(lista);
      setMostrarSugerencias(lista.length > 0);
    } catch { /* silencioso */ }
    finally { setBuscandoSugerencias(false); }
  };

  const fetchMovimientos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/movimientos');
      const data = await res.json();
      setMovimientos(data);
    } catch { console.error('Error al cargar movimientos'); }
    finally { setLoading(false); }
  };

  const seleccionarProducto = (p) => {
    setFormData({ ...formData, productoId: p.id, productoNombre: p.nombre });
    setBusquedaProducto(p.nombre);
    setMostrarSugerencias(false);
  };

  const limpiarSeleccion = () => {
    setFormData({ ...formData, productoId: '', productoNombre: '' });
    setBusquedaProducto('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productoId) { alert('Selecciona un producto'); return; }
    try {
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId: formData.productoId, tipo: formData.tipo, cantidad: formData.cantidad, motivo: formData.motivo }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setFormData({ productoId: '', productoNombre: '', tipo: 'ENTRADA', cantidad: '', motivo: '' });
      setBusquedaProducto('');
      setShowForm(false);
      fetchMovimientos();
    } catch (err) { alert(err.message || 'Error al registrar movimiento'); }
  };

  const confirmarCancelacion = async () => {
    if (!modalCancelar) return;
    setCancelando(true);
    try {
      const res = await fetch(`/api/movimientos/${modalCancelar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoCancelacion: motivoCancelacion || 'Cancelado por administrador' }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setModalCancelar(null);
      setMotivoCancelacion('');
      fetchMovimientos();
    } catch (err) {
      alert(err.message || 'Error al cancelar movimiento');
    } finally { setCancelando(false); }
  };

  const movimientosFiltrados = busquedaInput.trim()
    ? movimientos.filter(m =>
        m.producto.nombre.toLowerCase().includes(busquedaInput.toLowerCase()) ||
        m.producto.categoria.nombre.toLowerCase().includes(busquedaInput.toLowerCase()) ||
        (m.motivo && m.motivo.toLowerCase().includes(busquedaInput.toLowerCase()))
      )
    : movimientos;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-gray-600 dark:text-gray-400">Cargando movimientos...</div>
    </div>
  );

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7" /> Movimientos de Stock
          </h1>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors flex-shrink-0">
            <Plus className="w-4 h-4" /> Registrar Movimiento
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar Producto *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type="text" value={busquedaProducto}
                  onChange={(e) => { setBusquedaProducto(e.target.value); if (formData.productoId) limpiarSeleccion(); }}
                  placeholder="Nombre, código de producto o código de barras..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                />
                {buscandoSugerencias && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {busquedaProducto && !buscandoSugerencias && (
                  <button type="button" onClick={limpiarSeleccion} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {mostrarSugerencias && sugerencias.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {sugerencias.map(p => (
                    <button key={p.id} type="button" onClick={() => seleccionarProducto(p)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 border-b dark:border-gray-600 last:border-b-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{p.nombre}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {p.codigoProducto && `Código: ${p.codigoProducto} | `}Stock: {p.stock}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo *</label>
                <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                  <option value="ENTRADA">Entrada de Stock</option>
                  <option value="SALIDA">Salida de Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad *</label>
                <input type="number" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  required min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
              <input type="text" value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Ej: Compra, Devolución, Ajuste..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
            </div>

            <div className="flex gap-4">
              <button type="submit" disabled={!formData.productoId}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors">
                Registrar Movimiento
              </button>
              <button type="button"
                onClick={() => { setShowForm(false); setFormData({ productoId: '', productoNombre: '', tipo: 'ENTRADA', cantidad: '', motivo: '' }); setBusquedaProducto(''); }}
                className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-md transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Filtrar por producto, categoría o motivo..."
              value={busquedaInput} onChange={(e) => setBusquedaInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            />
            {busquedaInput && (
              <button onClick={() => setBusquedaInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {movimientosFiltrados.length === 0 ? (
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cantidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Motivo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                    {isAdmin() && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acción</th>}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {movimientosFiltrados.map((m) => (
                    <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${m.cancelado ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(m.createdAt).toLocaleString('es-AR')}
                        {m.cancelado && <div className="text-xs text-red-500 mt-0.5">Cancelado {m.canceladoAt ? new Date(m.canceladoAt).toLocaleDateString('es-AR') : ''}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.producto.nombre}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{m.producto.categoria.nombre}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {m.cancelado ? (
                          <span className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <Ban className="w-3 h-3" /> Cancelado
                          </span>
                        ) : m.tipo === 'ENTRADA' ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">Entrada</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">Salida</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-bold ${m.cancelado ? 'text-gray-400 line-through' : m.tipo === 'ENTRADA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {m.cancelado && m.motivoCancelacion
                          ? <span className="text-red-500">↩ {m.motivoCancelacion}</span>
                          : (m.motivo || 'Sin motivo')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {m.usuario ? (
                          <div className="flex items-center gap-2">
                            <UserCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-gray-100">{m.usuario.nombre}</span>
                          </div>
                        ) : <span className="text-sm text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {m.producto.stock}
                      </td>
                      {isAdmin() && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!m.cancelado ? (
                            <button onClick={() => { setModalCancelar(m); setMotivoCancelacion(''); }}
                              className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-700 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Ban className="w-3 h-3" /> Cancelar
                            </button>
                          ) : <span className="text-xs text-gray-400 italic">—</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal cancelación */}
        {modalCancelar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Cancelar Movimiento</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Esto revertirá el efecto sobre el stock del producto.</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 text-sm space-y-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">{modalCancelar.producto.nombre}</div>
                <div className="text-gray-600 dark:text-gray-400">
                  {modalCancelar.tipo === 'ENTRADA' ? '📥 Entrada' : '📤 Salida'} de {modalCancelar.cantidad} unidades
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {modalCancelar.tipo === 'ENTRADA'
                    ? `El stock bajará ${modalCancelar.cantidad} unidades`
                    : `El stock subirá ${modalCancelar.cantidad} unidades`}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo de cancelación (opcional)</label>
                <input type="text" value={motivoCancelacion} onChange={(e) => setMotivoCancelacion(e.target.value)}
                  placeholder="Ej: Error de carga, devolución rechazada..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={confirmarCancelacion} disabled={cancelando}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors font-semibold">
                  {cancelando ? 'Cancelando...' : 'Sí, cancelar movimiento'}
                </button>
                <button onClick={() => { setModalCancelar(null); setMotivoCancelacion(''); }}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-md transition-colors">
                  No, volver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}