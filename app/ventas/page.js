'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, DollarSign, User, CreditCard, PlusCircle, ChevronLeft, ChevronRight, Edit, AlertTriangle, X, Save, Calendar } from 'lucide-react';
import Image from 'next/image';
import PageWrapper from '@/components/PageWrapper';

const PAGE_SIZE = 12;

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function VentasPage() {
  const [productos, setProductos] = useState([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const busquedaDebounced = useDebounce(busqueda, 400);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [fechaVenta, setFechaVenta] = useState(new Date().toISOString().split('T')[0]); // ✅ NUEVO
  const [procesando, setProcesando] = useState(false);
  const [mostrarModalProducto, setMostrarModalProducto] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', codigoProducto: '', precio: '', categoriaId: '', proveedorId: '', stock: '1' });

  // ── Modal editar producto ──
  const [modalEditar, setModalEditar] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const fetchProductos = useCallback(async (pagina = 1, busq = '') => {
    setLoadingProductos(true);
    try {
      const params = new URLSearchParams({ page: pagina, pageSize: PAGE_SIZE });
      if (busq.trim()) params.set('busqueda', busq.trim());
      const res = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProductos(data); setTotalProductos(data.length); setTotalPaginas(1);
      } else {
        setProductos(data.productos ?? []);
        setTotalProductos(data.pagination?.total ?? 0);
        setTotalPaginas(data.pagination?.totalPages ?? 1);
      }
    } catch { console.error('Error cargando productos'); }
    finally { setLoadingProductos(false); }
  }, []);

  useEffect(() => {
    fetchProductos(1, '');
    fetch('/api/categorias').then(r => r.json()).then(setCategorias).catch(console.error);
    fetch('/api/proveedores').then(r => r.json()).then(setProveedores).catch(console.error);
  }, [fetchProductos]);

  useEffect(() => {
    setPaginaActual(1);
    fetchProductos(1, busquedaDebounced);
  }, [busquedaDebounced, fetchProductos]);

  const irAPagina = (p) => { setPaginaActual(p); fetchProductos(p, busquedaDebounced); };

  const agregarAlCarrito = (producto) => {
    const item = carrito.find(i => i.productoId === producto.id);
    if (item) {
      if (item.cantidad >= producto.stock) { alert('No hay suficiente stock disponible'); return; }
      setCarrito(carrito.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      if (producto.stock === 0) { alert('Producto sin stock'); return; }
      setCarrito([...carrito, { productoId: producto.id, nombre: producto.nombre, precioUnit: producto.precio, cantidad: 1, stock: producto.stock }]);
    }
  };

  const actualizarCantidad = (productoId, nuevaCantidad) => {
    const item = carrito.find(i => i.productoId === productoId);
    if (nuevaCantidad <= 0) { eliminarDelCarrito(productoId); return; }
    if (nuevaCantidad > item.stock) { alert('No hay suficiente stock disponible'); return; }
    setCarrito(carrito.map(i => i.productoId === productoId ? { ...i, cantidad: nuevaCantidad } : i));
  };

  const eliminarDelCarrito = (productoId) => setCarrito(carrito.filter(i => i.productoId !== productoId));
  const calcularTotal = () => carrito.reduce((sum, i) => sum + i.precioUnit * i.cantidad, 0);

  const finalizarVenta = async () => {
    if (!carrito.length) { alert('El carrito está vacío'); return; }
    setProcesando(true);
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: carrito, 
          metodoPago, 
          clienteNombre: clienteNombre || null, 
          clienteDni: clienteDni || null,
          fecha: fechaVenta // ✅ NUEVO: Enviar fecha
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const venta = await res.json();
      alert(`Venta #${venta.id} realizada!\nTotal: $${venta.total.toFixed(2)}\nFecha: ${new Date(venta.createdAt).toLocaleDateString('es-AR')}`);
      setCarrito([]); 
      setClienteNombre(''); 
      setClienteDni(''); 
      setFechaVenta(new Date().toISOString().split('T')[0]); // Reset fecha
      setBusqueda('');
      fetchProductos(paginaActual, busquedaDebounced);
    } catch (err) { alert(err.message || 'Error al procesar la venta'); }
    finally { setProcesando(false); }
  };

  // ── Abrir modal edición ──
  const abrirEdicion = (e, producto) => {
    e.stopPropagation();
    setModalEditar(producto);
    setEditForm({
      nombre: producto.nombre,
      codigoProducto: producto.codigoProducto || '',
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
    });
  };

  // ── Guardar edición ──
  const guardarEdicion = async () => {
    if (!editForm.nombre || !editForm.precio) { alert('Nombre y precio son requeridos'); return; }
    setGuardandoEdicion(true);
    try {
      const res = await fetch(`/api/productos/${modalEditar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editForm.nombre.trim(),
          codigoProducto: editForm.codigoProducto.trim() || null,
          precio: parseFloat(editForm.precio),
          stock: parseInt(editForm.stock) || 0,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setModalEditar(null);
      fetchProductos(paginaActual, busquedaDebounced);
    } catch (err) {
      alert(err.message || 'Error al guardar');
    } finally { setGuardandoEdicion(false); }
  };

  const handleCrearProductoRapido = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoProducto, stockMinimo: 5 }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const p = await res.json();
      alert('Producto creado');
      agregarAlCarrito(p);
      setMostrarModalProducto(false);
      setNuevoProducto({ nombre: '', codigoProducto: '', precio: '', categoriaId: '', proveedorId: '', stock: '1' });
      fetchProductos(paginaActual, busquedaDebounced);
    } catch (err) { alert(err.message || 'Error al crear producto'); }
  };

  return (
    <PageWrapper>
    <div className="space-y-4 sm:space-y-6 pb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8" /> Punto de Venta
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Panel productos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input type="text" placeholder="Buscar por nombre o código..." value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm sm:text-base"
                  autoFocus />
              </div>
              <button onClick={() => setMostrarModalProducto(true)}
                className="bg-jmr-primary hover:bg-jmr-secondary text-white px-3 sm:px-4 py-2 sm:py-3 rounded-md flex items-center gap-2 transition-colors">
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline text-sm">Nuevo</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100">
                Productos ({totalProductos})
              </h2>
              {totalPaginas > 1 && (
                <div className="flex gap-1 items-center">
                  <button onClick={() => irAPagina(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1}
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 py-1 text-xs sm:text-sm">{paginaActual}/{totalPaginas}</span>
                  <button onClick={() => irAPagina(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas}
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {loadingProductos ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border dark:border-gray-700 rounded-lg p-2 sm:p-3 animate-pulse">
                    <div className="w-full h-24 sm:h-32 mb-2 bg-gray-200 dark:bg-gray-700 rounded-md" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 max-h-[500px] sm:max-h-[600px] overflow-y-auto">
                {productos.length === 0 ? (
                  <div className="col-span-3 text-center py-8 text-gray-500 dark:text-gray-400">No se encontraron productos</div>
                ) : productos.map((producto) => (
                  <div key={producto.id}
                    onClick={() => producto.stock > 0 && agregarAlCarrito(producto)}
                    className={`border dark:border-gray-700 rounded-lg p-2 sm:p-3 transition-all relative group ${
                      producto.stock === 0
                        ? 'bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed'
                        : 'hover:shadow-lg hover:border-jmr-primary dark:hover:border-jmr-accent cursor-pointer'
                    }`}>

                    <button
                      onClick={(e) => abrirEdicion(e, producto)}
                      className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400"
                      title="Editar producto"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                    </button>

                    <div className="relative w-full h-24 sm:h-32 mb-2 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                      {producto.imagen ? (
                        <Image src={producto.imagen} alt={producto.nombre} fill className="object-cover" sizes="200px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                        </div>
                      )}
                      {producto.stock === 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-red-600 px-2 py-1 rounded">SIN STOCK</span>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">{producto.nombre}</h3>
                    {producto.codigoProducto && (
                      <p className="text-xs text-jmr-primary dark:text-jmr-accent font-medium mb-1 truncate">{producto.codigoProducto}</p>
                    )}
                    <p className="text-base sm:text-lg font-bold text-jmr-primary dark:text-jmr-accent">${producto.precio.toFixed(2)}</p>
                    <p className={`text-xs ${producto.stock === 0 ? 'text-red-600 font-bold' : producto.stock <= producto.stockMinimo ? 'text-orange-500 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                      Stock: {producto.stock}
                      {producto.stock === 0 && (
                        <button onClick={(e) => abrirEdicion(e, producto)}
                          className="ml-1 underline text-blue-600 dark:text-blue-400 hover:no-underline">
                          Editar
                        </button>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel carrito */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 sticky top-20">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" /> Carrito ({carrito.length})
            </h2>

            <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto mb-3 sm:mb-4">
              {carrito.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">Carrito vacío</p>
              ) : carrito.map((item) => (
                <div key={item.productoId} className="flex items-center justify-between border-b dark:border-gray-700 pb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-500">${item.precioUnit.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 p-1 rounded"><Minus className="w-3 h-3" /></button>
                    <span className="w-6 text-center font-semibold text-xs sm:text-sm">{item.cantidad}</span>
                    <button onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 p-1 rounded"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => eliminarDelCarrito(item.productoId)} className="text-red-600 p-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                  <p className="font-semibold text-xs sm:text-sm whitespace-nowrap">${(item.precioUnit * item.cantidad).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="border-t dark:border-gray-700 pt-3 mb-3">
              <div className="flex justify-between items-center text-xl sm:text-2xl font-bold">
                <span className="text-gray-800 dark:text-gray-100">TOTAL:</span>
                <span className="text-jmr-primary dark:text-jmr-accent">${calcularTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3 mb-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                <CreditCard className="w-3 h-3 inline mr-1" />Método de Pago
              </label>
              <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm">
                <option value="EFECTIVO">💵 Efectivo</option>
                <option value="TARJETA_DEBITO">💳 Tarjeta de Débito</option>
                <option value="TARJETA_CREDITO">💳 Tarjeta de Crédito</option>
                <option value="TRANSFERENCIA">🏦 Transferencia</option>
                <option value="QR">📱 Código QR</option>
              </select>
            </div>

            {/* ✅ NUEVO: Campo de fecha */}
            <div className="space-y-2 mb-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                <Calendar className="w-3 h-3 inline mr-1" />Fecha de Venta
              </label>
              <input 
                type="date" 
                value={fechaVenta} 
                onChange={(e) => setFechaVenta(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm" 
              />
            </div>

            <div className="space-y-2 mb-3">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                <User className="w-3 h-3 inline mr-1" />Cliente (opcional)
              </label>
              <input type="text" placeholder="Nombre" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm" />
              <input type="text" placeholder="DNI" value={clienteDni} onChange={(e) => setClienteDni(e.target.value)}
                className="w-full px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm" />
            </div>

            <button onClick={finalizarVenta} disabled={carrito.length === 0 || procesando}
              className="w-full bg-jmr-primary hover:bg-jmr-secondary text-white py-2 sm:py-3 rounded-lg font-semibold disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              {procesando ? 'Procesando...' : 'Finalizar Venta'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal editar producto */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" /> Editar Producto
              </h2>
              <button onClick={() => setModalEditar(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalEditar.stock === 0 && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Este producto no tiene stock. Actualizá el stock para poder venderlo.
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                <input type="text" value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código de Producto</label>
                <input type="text" value={editForm.codigoProducto} onChange={(e) => setEditForm({ ...editForm, codigoProducto: e.target.value })}
                  placeholder="Ej: ABC-001"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio *</label>
                  <input type="number" value={editForm.precio} onChange={(e) => setEditForm({ ...editForm, precio: e.target.value })}
                    step="0.01" min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stock {modalEditar.stock === 0 && <span className="text-red-500">⚠</span>}
                  </label>
                  <input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    min="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-gray-900 dark:text-gray-100 dark:bg-gray-700 ${
                      modalEditar.stock === 0
                        ? 'border-red-400 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                    }`} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={guardarEdicion} disabled={guardandoEdicion}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-md transition-colors font-semibold flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
              </button>
              <button onClick={() => setModalEditar(null)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-md transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear producto rápido */}
      {mostrarModalProducto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Crear Producto Rápido</h2>
              <form onSubmit={handleCrearProductoRapido} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                  <input type="text" value={nuevoProducto.nombre} onChange={(e) => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Código de Producto</label>
                  <input type="text" value={nuevoProducto.codigoProducto} onChange={(e) => setNuevoProducto({ ...nuevoProducto, codigoProducto: e.target.value })} placeholder="Ej: ABC123"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio *</label>
                    <input type="number" value={nuevoProducto.precio} onChange={(e) => setNuevoProducto({ ...nuevoProducto, precio: e.target.value })} required step="0.01" min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock</label>
                    <input type="number" value={nuevoProducto.stock} onChange={(e) => setNuevoProducto({ ...nuevoProducto, stock: e.target.value })} min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría *</label>
                  <select value={nuevoProducto.categoriaId} onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoriaId: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm">
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proveedor *</label>
                  <select value={nuevoProducto.proveedorId} onChange={(e) => setNuevoProducto({ ...nuevoProducto, proveedorId: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-jmr-primary dark:bg-gray-700 dark:text-gray-100 text-sm">
                    <option value="">Seleccionar...</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-jmr-primary hover:bg-jmr-secondary text-white py-2 px-4 rounded-md transition-colors text-sm">Crear y Agregar</button>
                  <button type="button" onClick={() => setMostrarModalProducto(false)}
                    className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-md transition-colors text-sm">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageWrapper>
  );
}