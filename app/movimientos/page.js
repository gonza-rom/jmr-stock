'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart, Plus, TrendingUp, TrendingDown, Search, X, UserCircle, Ban,
  AlertTriangle, Calendar, Filter, DollarSign, CreditCard, Edit, Save,
  Minus, Trash2, ChevronLeft, ChevronRight, Package, Tag
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PageWrapper from '@/components/PageWrapper';
import Image from 'next/image';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE_POS = 12;

export default function MovimientosPage() {
  const { isAdmin } = useAuth();

  // ── Historial ──
  const [movimientos, setMovimientos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Modo formulario: 'ENTRADA' | 'SALIDA' | 'VENTA' | null ──
  const [modoFormulario, setModoFormulario] = useState(null);

  // ── Formulario ENTRADA / SALIDA ──
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const busquedaProductoDebounced = useDebounce(busquedaProducto, 350);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [buscandoSugerencias, setBuscandoSugerencias] = useState(false);
  const [formData, setFormData] = useState({
    productoId: '', productoNombre: '', tipo: 'ENTRADA',
    cantidad: '', motivo: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().slice(0, 5),
    horaAuto: true,
    usuarioId: ''
  });

  // ── Paginación historial ──
  const [paginacion, setPaginacion] = useState({ page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [paginaMovimientos, setPaginaMovimientos] = useState(1);

  // ── POS (VENTA) ──
  const [posProductos, setPosProductos] = useState([]);
  const [posTotalProductos, setPosTotalProductos] = useState(0);
  const [posTotalPaginas, setPosTotalPaginas] = useState(1);
  const [posPaginaActual, setPosPaginaActual] = useState(1);
  const [posLoadingProductos, setPosLoadingProductos] = useState(false);
  const [posBusqueda, setPosBusqueda] = useState('');
  const posBusquedaDebounced = useDebounce(posBusqueda, 400);
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [fechaVenta, setFechaVenta] = useState(new Date().toISOString().split('T')[0]);
  const [horaVenta, setHoraVenta] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [horaVentaAuto, setHoraVentaAuto] = useState(true);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [ventaUsuarioId, setVentaUsuarioId] = useState('');
  const [modalManualPos, setModalManualPos] = useState(false);
  const [itemManualDesc, setItemManualDesc] = useState('');
  const [itemManualPrecio, setItemManualPrecio] = useState('');
  const [itemManualCant, setItemManualCant] = useState('1');

  // ── Modales ──
  const [modalCancelar, setModalCancelar] = useState(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [cancelando, setCancelando] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  // ── Filtros historial ──
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // ════════════════════════════════════════
  // Carga inicial
  // ════════════════════════════════════════
    const fetchMovimientos = async (pagina = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/movimientos?page=${pagina}&pageSize=30`);
      const data = await res.json();
      setMovimientos(data.movimientos ?? []);
      setPaginacion(data.pagination ?? { page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false });
      setPaginaMovimientos(pagina);
    } catch { console.error('Error al cargar movimientos'); }
    finally { setLoading(false); }
  };

  // Por esto:
  useEffect(() => {
    fetchMovimientos();
    if (isAdmin()) fetchUsuarios();
  }, []);
  
  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      const data = await res.json();
      setUsuarios(data.filter(u => u.activo));
    } catch { console.error('Error al cargar usuarios'); }
  };

  // ════════════════════════════════════════
  // POS — productos
  // ════════════════════════════════════════
  const fetchPosProductos = useCallback(async (pagina = 1, busq = '') => {
    setPosLoadingProductos(true);
    try {
      const params = new URLSearchParams({ page: pagina, pageSize: PAGE_SIZE_POS });
      if (busq.trim()) params.set('busqueda', busq.trim());
      const res = await fetch(`/api/productos?${params}`);
      const data = await res.json();
      setPosProductos(data.productos ?? []);
      setPosTotalProductos(data.pagination?.total ?? 0);
      setPosTotalPaginas(data.pagination?.totalPages ?? 1);
    } catch { console.error('Error cargando productos POS'); }
    finally { setPosLoadingProductos(false); }
  }, []);

  // Cargar productos cuando se abre el POS
  useEffect(() => {
    if (modoFormulario === 'VENTA') fetchPosProductos(1, '');
  }, [modoFormulario, fetchPosProductos]);

  // Búsqueda debounced en POS
  useEffect(() => {
    if (modoFormulario !== 'VENTA') return;
    setPosPaginaActual(1);
    fetchPosProductos(1, posBusquedaDebounced);
  }, [posBusquedaDebounced, modoFormulario, fetchPosProductos]);

  const irAPaginaPos = (p) => {
    setPosPaginaActual(p);
    fetchPosProductos(p, posBusquedaDebounced);
  };

  // ════════════════════════════════════════
  // POS — carrito
  // ════════════════════════════════════════
  const agregarAlCarrito = (producto) => {
    const item = carrito.find(i => i.productoId === producto.id);
    if (item) {
      if (item.cantidad >= producto.stock) { alert('No hay suficiente stock disponible'); return; }
      setCarrito(carrito.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i));
    } else {
      if (producto.stock === 0) { alert('Producto sin stock'); return; }
      setCarrito([...carrito, {
        productoId: producto.id, nombre: producto.nombre,
        precioUnit: producto.precio, cantidad: 1, stock: producto.stock,
        imagen: producto.imagenes?.[0] || producto.imagen || null,
        esManual: false,
      }]);
    }
  };

  // ── Agregar ítem manual al carrito (POS) ──
  const agregarItemManualPos = () => {
    const precio = parseFloat(itemManualPrecio);
    const cant = parseInt(itemManualCant);
    if (!itemManualDesc.trim()) { alert('Escribí una descripción'); return; }
    if (!precio || precio <= 0) { alert('Ingresá un precio válido'); return; }
    if (!cant || cant <= 0) { alert('Ingresá una cantidad válida'); return; }
    const idTemporal = `manual_${Date.now()}_${Math.random()}`;
    setCarrito(prev => [...prev, {
      id: idTemporal,
      productoId: null,
      nombre: itemManualDesc.trim(),
      precioUnit: precio,
      cantidad: cant,
      stock: Infinity,
      esManual: true,
      descripcion: itemManualDesc.trim(),
      imagen: null,
    }]);
    setItemManualDesc('');
    setItemManualPrecio('');
    setItemManualCant('1');
    setModalManualPos(false);
  };

  const actualizarCantidad = (idItem, nuevaCantidad) => {
    const item = carrito.find(i => (i.esManual ? i.id : i.productoId) === idItem);
    if (nuevaCantidad <= 0) { eliminarDelCarrito(idItem); return; }
    if (!item.esManual && nuevaCantidad > item.stock) { alert('No hay suficiente stock disponible'); return; }
    setCarrito(carrito.map(i => (i.esManual ? i.id : i.productoId) === idItem ? { ...i, cantidad: nuevaCantidad } : i));
  };

  const eliminarDelCarrito = (idItem) => setCarrito(carrito.filter(i => (i.esManual ? i.id : i.productoId) !== idItem));
  const calcularTotal = () => carrito.reduce((sum, i) => sum + i.precioUnit * i.cantidad, 0);

  // ════════════════════════════════════════
  // POS — finalizar venta
  // ════════════════════════════════════════
  const finalizarVenta = async () => {
    if (!carrito.length) { alert('El carrito está vacío'); return; }
    setProcesandoVenta(true);
    try {
      const payload = {
        items: carrito.map(i => i.esManual
          ? { esManual: true, descripcion: i.descripcion, precioUnit: i.precioUnit, cantidad: i.cantidad }
          : { productoId: i.productoId, precioUnit: i.precioUnit, cantidad: i.cantidad }
        ),
        metodoPago,
        clienteNombre: clienteNombre || null,
        clienteDni: clienteDni || null,
        fecha: fechaVenta,
        hora: horaVentaAuto ? null : horaVenta,
      };
      if (isAdmin() && ventaUsuarioId) {
        payload.usuarioIdSeleccionado = ventaUsuarioId;
      }
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const venta = await res.json();
      alert(`✅ Venta #${venta.id} registrada!\nTotal: $${venta.total.toFixed(2)}`);
      // Reset POS
      setCarrito([]);
      setClienteNombre('');
      setClienteDni('');
      setFechaVenta(new Date().toISOString().split('T')[0]);
      setMetodoPago('EFECTIVO');
      setVentaUsuarioId('');
      setHoraVenta(new Date().toTimeString().slice(0, 5));
      setHoraVentaAuto(true);
      setPosBusqueda('');
      setModoFormulario(null);
      fetchMovimientos();
      fetchPosProductos(1, '');
    } catch (err) {
      alert(err.message || 'Error al procesar la venta');
    } finally { setProcesandoVenta(false); }
  };

  // ════════════════════════════════════════
  // Formulario ENTRADA / SALIDA
  // ════════════════════════════════════════
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
    } catch { }
    finally { setBuscandoSugerencias(false); }
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

  const handleSubmitMovimiento = async (e) => {
    e.preventDefault();
    if (!formData.productoId) { alert('Selecciona un producto'); return; }
    try {
      const payload = {
        productoId: formData.productoId,
        tipo: modoFormulario,
        cantidad: formData.cantidad,
        motivo: formData.motivo,
        fecha: formData.fecha,
        hora: formData.horaAuto ? null : formData.hora,
      };
      if (isAdmin() && formData.usuarioId) {
        payload.usuarioIdSeleccionado = formData.usuarioId;
      }
      const res = await fetch('/api/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setFormData({
        productoId: '', productoNombre: '', tipo: 'ENTRADA',
        cantidad: '', motivo: '',
        fecha: new Date().toISOString().split('T')[0],
        usuarioId: ''
      });
      setBusquedaProducto('');
      setModoFormulario(null);
      fetchMovimientos();
      alert('Movimiento registrado correctamente');
    } catch (err) {
      alert(err.message || 'Error al registrar movimiento');
    }
  };

  // ════════════════════════════════════════
  // Cancelar / Editar movimientos
  // ════════════════════════════════════════
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
      fetchMovimientos(paginaMovimientos);
    } catch (err) {
      alert(err.message || 'Error al cancelar movimiento');
    } finally { setCancelando(false); }
  };

  const abrirEdicion = (movimiento) => {
    if (movimiento.cancelado) { alert('No se puede editar un movimiento cancelado'); return; }
    setModalEditar(movimiento);
    const fechaAR = new Date(new Date(movimiento.createdAt).toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    setEditForm({
      cantidad: movimiento.cantidad.toString(),
      motivo: movimiento.motivo || '',
      fecha: fechaAR.toISOString().split('T')[0],
      hora: `${String(fechaAR.getHours()).padStart(2, '0')}:${String(fechaAR.getMinutes()).padStart(2, '0')}`,
      usuarioId: movimiento.usuarioId?.toString() || '',
    });

  };

  const guardarEdicion = async () => {
    if (!editForm.cantidad || parseInt(editForm.cantidad) <= 0) { alert('La cantidad debe ser mayor a 0'); return; }
    setGuardandoEdicion(true);
    try {
      const res = await fetch(`/api/movimientos/${modalEditar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cantidad: parseInt(editForm.cantidad),
          motivo: editForm.motivo,
          fecha: editForm.fecha,
          hora: editForm.hora || null,
          usuarioId: editForm.usuarioId ? parseInt(editForm.usuarioId) : null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setModalEditar(null);
      fetchMovimientos(paginaMovimientos);
      alert('Movimiento actualizado correctamente');
    } catch (err) {
      alert(err.message || 'Error al actualizar movimiento');
    } finally { setGuardandoEdicion(false); }
  };

  // ════════════════════════════════════════
  // Filtros historial
  // ════════════════════════════════════════
  const movimientosFiltrados = movimientos.filter(m => {
    if (busquedaInput.trim()) {
      const t = busquedaInput.toLowerCase();
      if (!m.producto.nombre.toLowerCase().includes(t) &&
          !m.producto.categoria.nombre.toLowerCase().includes(t) &&
          !(m.motivo && m.motivo.toLowerCase().includes(t))) return false;
    }
    if (filtroFechaInicio) {
      if (new Date(m.createdAt).toISOString().split('T')[0] < filtroFechaInicio) return false;
    }
    if (filtroFechaFin) {
      if (new Date(m.createdAt).toISOString().split('T')[0] > filtroFechaFin) return false;
    }
    if (filtroTipo && m.tipo !== filtroTipo) return false;
    return true;
  });

  const limpiarFiltros = () => {
    setFiltroFechaInicio(''); setFiltroFechaFin(''); setFiltroTipo(''); setBusquedaInput('');
  };

  const hayFiltrosActivos = filtroFechaInicio || filtroFechaFin || filtroTipo || busquedaInput;

  const cerrarFormulario = () => {
    setModoFormulario(null);
    setCarrito([]);
    setPosBusqueda('');
    setVentaUsuarioId('');
    setBusquedaProducto('');
    setFormData({
      productoId: '', productoNombre: '', tipo: 'ENTRADA',
      cantidad: '', motivo: '',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().slice(0, 5),
      horaAuto: true,
      usuarioId: ''
    });
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl text-gray-600 dark:text-gray-400">Cargando movimientos...</div>
    </div>
  );

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7" /> Movimientos de Stock
          </h1>

          {/* Botones de acción */}
          {!modoFormulario && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setModoFormulario('VENTA')}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
              >
                <DollarSign className="w-4 h-4" /> Nueva Venta
              </button>
              <button
                onClick={() => setModoFormulario('ENTRADA')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
              >
                <TrendingUp className="w-4 h-4" /> Entrada de Stock
              </button>
              <button
                onClick={() => setModoFormulario('SALIDA')}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
              >
                <TrendingDown className="w-4 h-4" /> Salida de Stock
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            FORMULARIO POS (VENTA)
        ══════════════════════════════════════════ */}
        {modoFormulario === 'VENTA' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Cabecera del POS */}
            <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                <DollarSign className="w-6 h-6" /> Registrar Venta
              </h2>
              <button onClick={cerrarFormulario} className="text-white/80 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Panel izquierdo — catálogo */}
              <div className="lg:col-span-2 space-y-4">
                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    value={posBusqueda}
                    onChange={e => setPosBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                    autoFocus
                  />
                  {posBusqueda && (
                    <button onClick={() => setPosBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Paginación */}
                {posTotalPaginas > 1 && (
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{posTotalProductos} productos</span>
                    <div className="flex gap-1 items-center">
                      <button onClick={() => irAPaginaPos(Math.max(1, posPaginaActual - 1))} disabled={posPaginaActual === 1}
                        className="p-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2">{posPaginaActual}/{posTotalPaginas}</span>
                      <button onClick={() => irAPaginaPos(Math.min(posTotalPaginas, posPaginaActual + 1))} disabled={posPaginaActual === posTotalPaginas}
                        className="p-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Grilla de productos */}
                {posLoadingProductos ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="border dark:border-gray-700 rounded-lg p-3 animate-pulse">
                        <div className="w-full h-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : posProductos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    No se encontraron productos
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
                    {posProductos.map(producto => (
                      <div
                        key={producto.id}
                        onClick={() => producto.stock > 0 && agregarAlCarrito(producto)}
                        className={`border dark:border-gray-700 rounded-lg p-2 transition-all relative ${
                          producto.stock === 0
                            ? 'bg-gray-50 dark:bg-gray-900/50 cursor-not-allowed opacity-60'
                            : 'hover:shadow-md hover:border-green-400 dark:hover:border-green-500 cursor-pointer'
                        }`}
                      >
                        <div className="relative w-full h-20 mb-2 bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                          {(producto.imagenes?.[0] || producto.imagen) ? (
                            <Image
                              src={producto.imagenes?.[0] || producto.imagen}
                              alt={producto.nombre} fill className="object-cover" sizes="120px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          {producto.stock === 0 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-xs font-bold bg-red-600 px-1.5 py-0.5 rounded">SIN STOCK</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">{producto.nombre}</p>
                        {producto.codigoProducto && (
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium truncate">{producto.codigoProducto}</p>
                        )}
                        <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-0.5">${producto.precio.toFixed(2)}</p>
                        <p className={`text-xs mt-0.5 ${producto.stock <= producto.stockMinimo && producto.stock > 0 ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          Stock: {producto.stock}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel derecho — carrito y pago */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" /> Carrito ({carrito.length})
                  </h3>

                  {/* Items del carrito */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {carrito.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                        Seleccioná productos del catálogo
                      </p>
                    ) : carrito.map(item => {
                      const itemId = item.esManual ? item.id : item.productoId;
                      return (
                      <div key={itemId} className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-md p-2 shadow-sm">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                            {item.esManual && <Tag className="w-3 h-3 text-orange-500 flex-shrink-0" />}
                            {item.nombre}
                          </p>
                          <p className="text-xs text-gray-500">${item.precioUnit.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => actualizarCantidad(itemId, item.cantidad - 1)}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 p-0.5 rounded">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold">{item.cantidad}</span>
                          <button onClick={() => actualizarCantidad(itemId, item.cantidad + 1)}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 p-0.5 rounded">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 w-14 text-right whitespace-nowrap">
                          ${(item.precioUnit * item.cantidad).toFixed(2)}
                        </p>
                        <button onClick={() => eliminarDelCarrito(itemId)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      );
                    })}
                  </div>

                  {/* Total */}
                  <div className="border-t dark:border-gray-600 pt-2 flex justify-between items-center font-bold">
                    <span className="text-gray-800 dark:text-gray-100">TOTAL:</span>
                    <span className="text-green-600 dark:text-green-400 text-xl">${calcularTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Botón ítem manual */}
                <button onClick={() => setModalManualPos(true)}
                  className="w-full border-2 border-dashed border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                  <Tag className="w-4 h-4" />
                  + Ítem manual (Varios)
                </button>

                {/* Método de pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <CreditCard className="w-4 h-4" /> Método de Pago
                  </label>
                  <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 text-sm">
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="TARJETA_DEBITO">💳 Tarjeta de Débito</option>
                    <option value="TARJETA_CREDITO">💳 Tarjeta de Crédito</option>
                    <option value="TRANSFERENCIA">🏦 Transferencia</option>
                    <option value="QR">📱 Código QR</option>
                  </select>
                </div>

                {/* Fecha y Hora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Fecha de Venta
                  </label>
                  <input type="date" value={fechaVenta} onChange={e => setFechaVenta(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">🕐 Hora</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={horaVenta}
                      onChange={e => { setHoraVenta(e.target.value); setHoraVentaAuto(false); }}
                      disabled={horaVentaAuto}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 text-sm disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const ahora = new Date().toTimeString().slice(0, 5);
                        setHoraVenta(ahora);
                        setHoraVentaAuto(prev => !prev);
                      }}
                      className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                        horaVentaAuto
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {horaVentaAuto ? '⚡ Ahora' : 'Manual'}
                    </button>
                  </div>
                </div>

                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <UserCircle className="w-4 h-4" /> Cliente (opcional)
                  </label>
                  <input type="text" placeholder="Nombre" value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 text-sm mb-2" />
                  <input type="text" placeholder="DNI" value={clienteDni} onChange={e => setClienteDni(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 text-sm" />
                </div>

                {/* Selector vendedor — solo admin */}
                {isAdmin() && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                      <UserCircle className="w-4 h-4 text-purple-600" /> Vendedor
                    </label>
                    <select value={ventaUsuarioId} onChange={e => setVentaUsuarioId(e.target.value)}
                      className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 text-sm">
                      <option value="">Yo (usuario actual)</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre} — {u.rol === 'ADMINISTRADOR' ? 'Admin' : 'Empleado'}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Botón finalizar */}
                <button
                  onClick={finalizarVenta}
                  disabled={carrito.length === 0 || procesandoVenta}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <DollarSign className="w-5 h-5" />
                  {procesandoVenta ? 'Procesando...' : `Confirmar Venta — $${calcularTotal().toFixed(2)}`}
                </button>

                <button onClick={cerrarFormulario}
                  className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 py-2 rounded-lg text-sm transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            FORMULARIO ENTRADA / SALIDA
        ══════════════════════════════════════════ */}
        {(modoFormulario === 'ENTRADA' || modoFormulario === 'SALIDA') && (
          <form onSubmit={handleSubmitMovimiento} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Cabecera */}
            <div className={`px-6 py-4 flex items-center justify-between ${modoFormulario === 'ENTRADA' ? 'bg-blue-600' : 'bg-orange-500'}`}>
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                {modoFormulario === 'ENTRADA'
                  ? <><TrendingUp className="w-6 h-6" /> Entrada de Stock</>
                  : <><TrendingDown className="w-6 h-6" /> Salida de Stock</>
                }
              </h2>
              <button type="button" onClick={cerrarFormulario} className="text-white/80 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Buscador de producto */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar Producto *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="text" value={busquedaProducto}
                    onChange={e => { setBusquedaProducto(e.target.value); if (formData.productoId) limpiarSeleccion(); }}
                    placeholder="Nombre, código de producto o código de barras..."
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                    autoFocus
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad *</label>
                  <input type="number" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })}
                    required min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Fecha *
                  </label>
                  <input type="date" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    required max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    🕐 Hora
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={formData.hora}
                      onChange={e => setFormData({ ...formData, hora: e.target.value, horaAuto: false })}
                      disabled={formData.horaAuto}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const ahora = new Date().toTimeString().slice(0, 5);
                        setFormData({ ...formData, hora: ahora, horaAuto: !formData.horaAuto });
                      }}
                      className={`px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${
                        formData.horaAuto
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {formData.horaAuto ? '⚡ Ahora' : 'Manual'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
                  <input type="text" value={formData.motivo} onChange={e => setFormData({ ...formData, motivo: e.target.value })}
                    placeholder={modoFormulario === 'ENTRADA' ? 'Ej: Compra a proveedor...' : 'Ej: Ajuste, pérdida...'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
              </div>

              {/* Selector de usuario (solo admin) */}
              {isAdmin() && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <UserCircle className="w-4 h-4" /> Usuario que registra
                  </label>
                  <select value={formData.usuarioId} onChange={e => setFormData({ ...formData, usuarioId: e.target.value })}
                    className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700 text-sm">
                    <option value="">Yo (usuario actual)</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{u.nombre} — {u.rol === 'ADMINISTRADOR' ? 'Admin' : 'Empleado'}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={!formData.productoId}
                  className={`flex-1 text-white py-3 px-4 rounded-md transition-colors font-semibold disabled:bg-gray-400 ${modoFormulario === 'ENTRADA' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                  {modoFormulario === 'ENTRADA' ? '📦 Registrar Entrada' : '📤 Registrar Salida'}
                </button>
                <button type="button" onClick={cerrarFormulario}
                  className="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-3 px-4 rounded-md transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════
            HISTORIAL / FILTROS
        ══════════════════════════════════════════ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input type="text" placeholder="Filtrar por producto, categoría o motivo..."
                value={busquedaInput} onChange={e => setBusquedaInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
              {busquedaInput && (
                <button onClick={() => setBusquedaInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
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
                  <input type="date" value={filtroFechaInicio} onChange={e => setFiltroFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha hasta</label>
                  <input type="date" value={filtroFechaFin} onChange={e => setFiltroFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                  <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
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
                  {/* ── Paginación ── */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Página {paginacion.page} de {paginacion.totalPages} ({paginacion.total} movimientos)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchMovimientos(paginaMovimientos - 1)}
                        disabled={!paginacion.hasPrev}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => fetchMovimientos(paginaMovimientos + 1)}
                        disabled={!paginacion.hasNext}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>{paginacion.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {paginacion.total} movimientos — Página {paginacion.page} de {paginacion.totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => fetchMovimientos(paginacion.page - 1)}
                disabled={!paginacion.hasPrev}
                className="p-1.5 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {paginacion.page}/{paginacion.totalPages}
              </span>
              <button
                onClick={() => fetchMovimientos(paginacion.page + 1)}
                disabled={!paginacion.hasNext}
                className="p-1.5 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {movimientosFiltrados.length} de {movimientos.length} movimientos
          </div>
        </div>

        {/* ══════════════════════════════════════════
            TABLA DE HISTORIAL
        ══════════════════════════════════════════ */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Precio</th>
                    {isAdmin() && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {movimientosFiltrados.map((m) => (
                    <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${m.cancelado ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(m.createdAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })}
                        {m.cancelado && <div className="text-xs text-red-500 mt-0.5">Cancelado {m.canceladoAt ? new Date(m.canceladoAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : ''}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.producto.nombre}</div>
                        {m.producto.codigoProducto && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{m.producto.codigoProducto}</div>
                        )}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {m.tipo === 'VENTA' && m.venta?.total != null ? (
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            +${Number(m.venta.total).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {isAdmin() && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!m.cancelado ? (
                            <div className="flex gap-2">
                              <button onClick={() => abrirEdicion(m)}
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-700 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
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

        {/* ══════════════════════════════════════════
            MODAL EDITAR MOVIMIENTO
        ══════════════════════════════════════════ */}
        {modalEditar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full flex-shrink-0">
                  <Edit className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Editar Movimiento</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Producto: {modalEditar.producto.nombre}</p>
                </div>
                <button onClick={() => setModalEditar(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad *</label>
                  <input type="number" value={editForm.cantidad} onChange={e => setEditForm({ ...editForm, cantidad: e.target.value })}
                    min="1" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
                  <input type="text" value={editForm.motivo} onChange={e => setEditForm({ ...editForm, motivo: e.target.value })}
                    placeholder="Opcional" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                  <input type="date" value={editForm.fecha} onChange={e => setEditForm({ ...editForm, fecha: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                  <input type="time" value={editForm.hora || ''} onChange={e => setEditForm({ ...editForm, hora: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                  <select value={editForm.usuarioId} onChange={e => setEditForm({ ...editForm, usuarioId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                    <option value="">Sin usuario asignado</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
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

        {/* ══════════════════════════════════════════
            MODAL CANCELAR MOVIMIENTO
        ══════════════════════════════════════════ */}
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
                <input type="text" value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)}
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

      {/* ── Modal ítem manual POS ── */}
      {modalManualPos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Tag className="w-5 h-5 text-orange-500" /> Ítem manual — Varios
              </h2>
              <button onClick={() => setModalManualPos(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Se registra en la categoría <strong>Varios</strong> y suma al total de ingresos y ventas.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción *</label>
                <input
                  type="text"
                  placeholder="Ej: Anillos, Aritos, Trabas..."
                  value={itemManualDesc}
                  onChange={e => setItemManualDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && agregarItemManualPos()}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={itemManualPrecio}
                    onChange={e => setItemManualPrecio(e.target.value)}
                    min="0" step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    value={itemManualCant}
                    onChange={e => setItemManualCant(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                  />
                </div>
              </div>
              {itemManualPrecio && itemManualCant && (
                <p className="text-sm text-center font-semibold text-orange-600 dark:text-orange-400">
                  Subtotal: ${(parseFloat(itemManualPrecio || 0) * parseInt(itemManualCant || 1)).toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={agregarItemManualPos}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md transition-colors font-semibold flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Agregar al carrito
              </button>
              <button onClick={() => setModalManualPos(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-md transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}


      </div>
    </PageWrapper>
  );
}