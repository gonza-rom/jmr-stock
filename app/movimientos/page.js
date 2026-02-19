'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Plus, TrendingUp, TrendingDown, Search, X, UserCircle, Ban, AlertTriangle, Calendar, Filter, DollarSign, CreditCard, Edit, Save } from 'lucide-react';
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
  const [usuarios, setUsuarios] = useState([]); // ✅ NUEVO
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const busquedaProductoDebounced = useDebounce(busquedaProducto, 350);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const [formData, setFormData] = useState({ 
    productoId: '', 
    productoNombre: '', 
    tipo: 'ENTRADA', 
    cantidad: '', 
    motivo: '',
    fecha: new Date().toISOString().split('T')[0],
    metodoPago: 'EFECTIVO',
    usuarioId: '' // ✅ NUEVO: Usuario seleccionado
  });
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // ✅ NUEVO: Estado para edición de movimientos
  const [modalEditar, setModalEditar] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // Filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => { 
    fetchMovimientos(); 
    // ✅ NUEVO: Cargar usuarios si es admin
    if (isAdmin()) {
      fetchUsuarios();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!busquedaProductoDebounced.trim()) { setSugerencias([]); setMostrarSugerencias(false); return; }
    buscarSugerencias(busquedaProductoDebounced);
  }, [busquedaProductoDebounced]);

  // ✅ NUEVO: Fetch usuarios
  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      setUsuarios(data.filter(u => u.activo)); // Solo usuarios activos
    } catch (err) {
      console.error('Error al cargar usuarios');
    }
  };

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
      const payload = { 
        productoId: formData.productoId, 
        tipo: formData.tipo, 
        cantidad: formData.cantidad, 
        motivo: formData.motivo,
        fecha: formData.fecha,
      };

      // ✅ NUEVO: Agregar usuarioId si el admin seleccionó uno
      if (isAdmin() && formData.usuarioId) {
        payload.usuarioIdSeleccionado = formData.usuarioId;
      }

      // Si es VENTA, agregar método de pago
      if (formData.tipo === 'VENTA') {
        payload.metodoPago = formData.metodoPago;
      }

      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      
      setFormData({ 
        productoId: '', 
        productoNombre: '', 
        tipo: 'ENTRADA', 
        cantidad: '', 
        motivo: '',
        fecha: new Date().toISOString().split('T')[0],
        metodoPago: 'EFECTIVO',
        usuarioId: ''
      });
      setBusquedaProducto('');
      setShowForm(false);
      fetchMovimientos();
      alert('Movimiento registrado correctamente');
    } catch (err) { 
      alert(err.message || 'Error al registrar movimiento'); 
    }
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

  // ✅ NUEVO: Abrir modal de edición
  const abrirEdicion = (movimiento) => {
    if (movimiento.cancelado) {
      alert('No se puede editar un movimiento cancelado');
      return;
    }
    setModalEditar(movimiento);
    setEditForm({
      cantidad: movimiento.cantidad.toString(),
      motivo: movimiento.motivo || '',
      fecha: new Date(movimiento.createdAt).toISOString().split('T')[0],
      usuarioId: movimiento.usuarioId?.toString() || '',
    });
  };

  // ✅ NUEVO: Guardar edición
  const guardarEdicion = async () => {
    if (!editForm.cantidad || parseInt(editForm.cantidad) <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    setGuardandoEdicion(true);
    try {
      const res = await fetch(`/api/movimientos/${modalEditar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: parseInt(editForm.cantidad),
          motivo: editForm.motivo,
          fecha: editForm.fecha,
          usuarioId: editForm.usuarioId ? parseInt(editForm.usuarioId) : null,
        }),
      });

      if (!res.ok) { 
        const e = await res.json(); 
        throw new Error(e.error); 
      }

      setModalEditar(null);
      fetchMovimientos();
      alert('Movimiento actualizado correctamente');
    } catch (err) {
      alert(err.message || 'Error al actualizar movimiento');
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const movimientosFiltrados = movimientos.filter(m => {
    if (busquedaInput.trim()) {
      const termino = busquedaInput.toLowerCase();
      const nombreCoincide = m.producto.nombre.toLowerCase().includes(termino);
      const categoriaCoincide = m.producto.categoria.nombre.toLowerCase().includes(termino);
      const motivoCoincide = m.motivo && m.motivo.toLowerCase().includes(termino);
      if (!nombreCoincide && !categoriaCoincide && !motivoCoincide) return false;
    }

    if (filtroFechaInicio) {
      const fechaMovimiento = new Date(m.createdAt).toISOString().split('T')[0];
      if (fechaMovimiento < filtroFechaInicio) return false;
    }

    if (filtroFechaFin) {
      const fechaMovimiento = new Date(m.createdAt).toISOString().split('T')[0];
      if (fechaMovimiento > filtroFechaFin) return false;
    }

    if (filtroTipo && m.tipo !== filtroTipo) return false;

    return true;
  });

  const limpiarFiltros = () => {
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    setFiltroTipo('');
    setBusquedaInput('');
  };

  const hayFiltrosActivos = filtroFechaInicio || filtroFechaFin || filtroTipo || busquedaInput;

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
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Nuevo Movimiento
            </h2>

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
                        {p.codigoProducto && `Código: ${p.codigoProducto} | `}Stock: {p.stock} | Precio: ${p.precio.toFixed(2)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Movimiento *</label>
                <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                  <option value="ENTRADA">📦 Entrada de Stock</option>
                  <option value="SALIDA">📤 Salida de Stock</option>
                  <option value="VENTA">💰 Venta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad *</label>
                <input type="number" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  required min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Fecha *
                </label>
                <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  required max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
              </div>
            </div>

            {/* ✅ NUEVO: Selector de usuario (solo para admin) */}
            {isAdmin() && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <UserCircle className="w-4 h-4" /> Usuario que registra el movimiento
                </label>
                <select 
                  value={formData.usuarioId} 
                  onChange={(e) => setFormData({ ...formData, usuarioId: e.target.value })}
                  className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                  <option value="">Yo (usuario actual)</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} - {u.rol === 'ADMINISTRADOR' ? 'Admin' : 'Empleado'}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Si no seleccionas ninguno, se registrará con tu usuario actual
                </p>
              </div>
            )}

            {/* Método de pago solo para VENTA */}
            {formData.tipo === 'VENTA' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Método de Pago *
                </label>
                <select value={formData.metodoPago} onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                  required={formData.tipo === 'VENTA'}
                  className="w-full px-3 py-2 border border-green-300 dark:border-green-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                  <option value="EFECTIVO">💵 Efectivo</option>
                  <option value="TARJETA_DEBITO">💳 Tarjeta de Débito</option>
                  <option value="TARJETA_CREDITO">💳 Tarjeta de Crédito</option>
                  <option value="TRANSFERENCIA">🏦 Transferencia</option>
                  <option value="QR">📱 Código QR</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motivo {formData.tipo === 'VENTA' ? '(opcional)' : ''}
              </label>
              <input type="text" value={formData.motivo} onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder={
                  formData.tipo === 'ENTRADA' ? 'Ej: Compra a proveedor, Devolución...' :
                  formData.tipo === 'SALIDA' ? 'Ej: Ajuste, Pérdida, Devolución...' :
                  'Ej: Cliente Juan Pérez...'
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
            </div>

            <div className="flex gap-4 pt-2">
              <button type="submit" disabled={!formData.productoId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md transition-colors font-semibold">
                {formData.tipo === 'VENTA' ? '💰 Registrar Venta' : '📝 Registrar Movimiento'}
              </button>
              <button type="button"
                onClick={() => { 
                  setShowForm(false); 
                  setFormData({ 
                    productoId: '', 
                    productoNombre: '', 
                    tipo: 'ENTRADA', 
                    cantidad: '', 
                    motivo: '',
                    fecha: new Date().toISOString().split('T')[0],
                    metodoPago: 'EFECTIVO',
                    usuarioId: ''
                  }); 
                  setBusquedaProducto(''); 
                }}
                className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-3 px-4 rounded-md transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
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
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
              <Filter className="w-5 h-5" />
              Filtros
              {hayFiltrosActivos && <span className="bg-blue-600 text-white rounded-full w-2 h-2" />}
            </button>
          </div>

          {mostrarFiltros && (
            <div className="border-t dark:border-gray-700 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha desde</label>
                  <input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha hasta</label>
                  <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                  <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                    <option value="">Todos</option>
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                    <option value="VENTA">Venta</option>
                  </select>
                </div>
              </div>
              {hayFiltrosActivos && (
                <button onClick={limpiarFiltros} className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-colors text-sm">
                  <X className="w-4 h-4" /> Limpiar filtros
                </button>
              )}
            </div>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {movimientosFiltrados.length} de {movimientos.length} movimientos
          </div>
        </div>

        {/* Tabla de movimientos */}
        {movimientosFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No hay movimientos registrados</p>
            {hayFiltrosActivos && (
              <button onClick={limpiarFiltros} className="mt-4 text-blue-600 hover:underline">Limpiar filtros</button>
            )}
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
                    {isAdmin() && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>}
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
                        ) : m.tipo === 'VENTA' ? (
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">Venta</span>
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
                            <div className="flex gap-2">
                              {/* ✅ NUEVO: Botón editar */}
                              <button 
                                onClick={() => abrirEdicion(m)}
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                title="Editar movimiento"
                              >
                                <Edit className="w-3 h-3" /> Editar
                              </button>
                              <button onClick={() => { setModalCancelar(m); setMotivoCancelacion(''); }}
                                className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-300 dark:border-red-700 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Ban className="w-3 h-3" /> Cancelar
                              </button>
                            </div>
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

        {/* ✅ NUEVO: Modal editar movimiento */}
        {modalEditar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full flex-shrink-0">
                  <Edit className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Editar Movimiento</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Producto: {modalEditar.producto.nombre}
                  </p>
                </div>
                <button onClick={() => setModalEditar(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad *</label>
                  <input 
                    type="number" 
                    value={editForm.cantidad} 
                    onChange={(e) => setEditForm({ ...editForm, cantidad: e.target.value })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
                  <input 
                    type="text" 
                    value={editForm.motivo} 
                    onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    value={editForm.fecha} 
                    onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                  <select 
                    value={editForm.usuarioId} 
                    onChange={(e) => setEditForm({ ...editForm, usuarioId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                    <option value="">Sin usuario asignado</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={guardarEdicion} 
                  disabled={guardandoEdicion}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors font-semibold flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button 
                  onClick={() => setModalEditar(null)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-md transition-colors">
                  Cancelar
                </button>
              </div>
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
                  {modalCancelar.tipo === 'ENTRADA' ? '📥 Entrada' : modalCancelar.tipo === 'VENTA' ? '💰 Venta' : '📤 Salida'} de {modalCancelar.cantidad} unidades
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