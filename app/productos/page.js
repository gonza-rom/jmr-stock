'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus, Edit, Trash2, Package, AlertTriangle, Search, Filter, X,
  DollarSign, Barcode, History, Copy, CheckSquare, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight
} from 'lucide-react';

const PAGE_SIZE = 20;

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ProductosPage() {
  // ── Datos del servidor ──
  const [productos, setProductos]       = useState([]);
  const [totalProductos, setTotal]      = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [paginaActual, setPagina]       = useState(1);
  const [loading, setLoading]           = useState(true);

  // ── Filtros ──
  const [busquedaInput, setBusquedaInput] = useState('');
  const busqueda = useDebounce(busquedaInput, 400);
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [ordenar, setOrdenar]                 = useState('nombre');
  const [mostrarFiltros, setMostrarFiltros]   = useState(false);

  // ── Datos auxiliares ──
  const [categorias, setCategorias]   = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [error, setError]             = useState('');

  // ── Selección masiva ──
  const [seleccionados, setSeleccionados]     = useState([]);
  const [modoSeleccion, setModoSeleccion]     = useState(false);
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false);
  const [accionMasiva, setAccionMasiva]       = useState('CAMBIAR_CATEGORIA');
  const [datosMasivos, setDatosMasivos]       = useState({
    categoriaId: '', proveedorId: '', tipoStock: 'SUMAR', cantidadStock: '', motivoStock: ''
  });

  // ── Fetch principal ──
  const fetchProductos = useCallback(async (pagina, busq, cat, ord) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page:     pagina,
        pageSize: PAGE_SIZE,
      });
      if (busq.trim())  params.set('busqueda',  busq.trim());
      if (cat)          params.set('categoria', cat);
      if (ord)          params.set('ordenar',   ord);

      const res  = await fetch(`/api/productos?${params}`);
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();

      setProductos(data.productos   ?? []);
      setTotal(data.pagination?.total      ?? 0);
      setTotalPaginas(data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError('Error al cargar los productos');
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchProductos(1, '', '', 'nombre');
    fetch('/api/categorias').then(r => r.json()).then(setCategorias).catch(console.error);
    fetch('/api/proveedores').then(r => r.json()).then(setProveedores).catch(console.error);
  }, [fetchProductos]);

  // Cuando cambia búsqueda o filtros → volver a página 1
  useEffect(() => {
    setPagina(1);
    fetchProductos(1, busqueda, categoriaFiltro, ordenar);
  }, [busqueda, categoriaFiltro, ordenar, fetchProductos]);

  const irAPagina = (p) => {
    const pagina = Math.max(1, Math.min(totalPaginas, p));
    setPagina(pagina);
    fetchProductos(pagina, busqueda, categoriaFiltro, ordenar);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const limpiarFiltros = () => {
    setBusquedaInput('');
    setCategoriaFiltro('');
    setOrdenar('nombre');
  };

  const hayFiltros = busquedaInput || categoriaFiltro || ordenar !== 'nombre';

  // ── Selección ──
  const toggleSeleccion = (id) =>
    setSeleccionados(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const toggleTodos = () =>
    setSeleccionados(prev => prev.length === productos.length ? [] : productos.map(p => p.id));

  // ── Acciones ──
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setSeleccionados(prev => prev.filter(s => s !== id));
      fetchProductos(paginaActual, busqueda, categoriaFiltro, ordenar);
      alert('Producto eliminado correctamente');
    } catch {
      alert('Error al eliminar el producto');
    }
  };

  const handleEliminarSeleccionados = async () => {
    if (!seleccionados.length) return;
    if (!confirm(`¿Eliminar ${seleccionados.length} productos?`)) return;
    try {
      await Promise.all(seleccionados.map(id => fetch(`/api/productos/${id}`, { method: 'DELETE' })));
      setSeleccionados([]);
      fetchProductos(paginaActual, busqueda, categoriaFiltro, ordenar);
      alert(`${seleccionados.length} productos eliminados`);
    } catch {
      alert('Error al eliminar productos');
    }
  };

  const handleDuplicarSeleccionados = async () => {
    if (!seleccionados.length) return;
    if (!confirm(`¿Duplicar ${seleccionados.length} productos?`)) return;
    try {
      const aDuplicar = productos.filter(p => seleccionados.includes(p.id));
      for (const p of aDuplicar) {
        await fetch('/api/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: `${p.nombre} (Copia)`, descripcion: p.descripcion,
            codigoProducto: null, codigoBarras: null,
            precio: p.precio, stock: 0, stockMinimo: p.stockMinimo,
            imagen: p.imagen, imagenes: p.imagenes || [],
            categoriaId: p.categoriaId, proveedorId: p.proveedorId,
          }),
        });
      }
      alert(`${seleccionados.length} productos duplicados`);
      setSeleccionados([]);
      fetchProductos(paginaActual, busqueda, categoriaFiltro, ordenar);
    } catch {
      alert('Error al duplicar productos');
    }
  };

  const handleActualizacionMasiva = async () => {
    if (!seleccionados.length) return;
    let datos = {};
    if (accionMasiva === 'CAMBIAR_CATEGORIA') {
      if (!datosMasivos.categoriaId) { alert('Selecciona una categoría'); return; }
      datos = { categoriaId: datosMasivos.categoriaId };
    } else if (accionMasiva === 'CAMBIAR_PROVEEDOR') {
      if (!datosMasivos.proveedorId) { alert('Selecciona un proveedor'); return; }
      datos = { proveedorId: datosMasivos.proveedorId };
    } else if (accionMasiva === 'AJUSTAR_STOCK') {
      if (!datosMasivos.cantidadStock) { alert('Ingresa una cantidad'); return; }
      datos = { tipo: datosMasivos.tipoStock, cantidad: datosMasivos.cantidadStock, motivo: datosMasivos.motivoStock };
    }
    try {
      const res = await fetch('/api/productos/masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productosIds: seleccionados, accion: accionMasiva, datos }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      alert(`${seleccionados.length} productos actualizados`);
      setMostrarModalMasivo(false);
      setSeleccionados([]);
      fetchProductos(paginaActual, busqueda, categoriaFiltro, ordenar);
    } catch (err) {
      alert(err.message || 'Error al actualizar productos');
    }
  };

  // ── Paginación: qué números mostrar ──
  const paginasVisibles = () => {
    const pages = [];
    const delta = 2;
    const left  = Math.max(1, paginaActual - delta);
    const right = Math.min(totalPaginas, paginaActual + delta);
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  };

  // ── Skeletons de carga ──
  const Skeleton = () => (
    <tr className="animate-pulse">
      {[...Array(modoSeleccion ? 8 : 7)].map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
        </td>
      ))}
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Package className="w-6 h-6" /> Productos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Total: {totalProductos} productos
            {hayFiltros && ` (filtrado)`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setModoSeleccion(!modoSeleccion); setSeleccionados([]); }}
            className={`px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              modoSeleccion
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            {modoSeleccion ? 'Cancelar' : 'Seleccionar'}
          </button>
          <Link
            href="/productos/nuevo"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" /> Nuevo Producto
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Barra selección masiva */}
      {modoSeleccion && seleccionados.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 flex items-center justify-between">
          <span className="font-medium text-purple-900 dark:text-purple-300">
            {seleccionados.length} producto(s) seleccionado(s)
          </span>
          <div className="flex gap-2">
            <button onClick={handleDuplicarSeleccionados} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
              <Copy className="w-4 h-4" /> Duplicar
            </button>
            <button onClick={handleEliminarSeleccionados} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
            <button onClick={() => setMostrarModalMasivo(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
              <Edit className="w-4 h-4" /> Editar Masivo
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción, código de producto o código de barras..."
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
            />
          </div>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Filter className="w-5 h-5" /> Filtros
            {hayFiltros && <span className="bg-blue-600 text-white rounded-full w-2 h-2" />}
          </button>
        </div>

        {mostrarFiltros && (
          <div className="border-t dark:border-gray-700 pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                  <option value="">Todas</option>
                  {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordenar por</label>
                <select value={ordenar} onChange={(e) => setOrdenar(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                  <option value="nombre">Nombre A-Z</option>
                  <option value="precio-asc">Precio menor a mayor</option>
                  <option value="precio-desc">Precio mayor a menor</option>
                  <option value="recientes">Más recientes</option>
                </select>
              </div>
            </div>
            {hayFiltros && (
              <button onClick={limpiarFiltros} className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-colors">
                <X className="w-4 h-4" /> Limpiar filtros
              </button>
            )}
          </div>
        )}

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {productos.length} de {totalProductos} productos
          {totalPaginas > 1 && ` — Página ${paginaActual} de ${totalPaginas}`}
        </div>
      </div>

      {/* Tabla */}
      {productos.length === 0 && !loading ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">No se encontraron productos</p>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="mt-4 text-blue-600 hover:underline">Limpiar filtros</button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {modoSeleccion && (
                      <th className="px-6 py-3 text-left">
                        <input type="checkbox"
                          checked={seleccionados.length === productos.length && productos.length > 0}
                          onChange={toggleTodos}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Imagen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Proveedor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Precio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
                    : productos.map((producto) => (
                        <tr key={producto.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          {modoSeleccion && (
                            <td className="px-6 py-4">
                              <input type="checkbox"
                                checked={seleccionados.includes(producto.id)}
                                onChange={() => toggleSeleccion(producto.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                              {(producto.imagenes?.[0] || producto.imagen) ? (
                                <Image
                                  src={producto.imagenes?.[0] || producto.imagen}
                                  alt={producto.nombre} fill className="object-cover" sizes="64px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{producto.nombre}</div>
                            {producto.descripcion && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{producto.descripcion}</div>
                            )}
                            {producto.codigoProducto && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                                <Package className="w-3 h-3" />{producto.codigoProducto}
                              </div>
                            )}
                            {producto.codigoBarras && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                                <Barcode className="w-3 h-3" />{producto.codigoBarras}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              {producto.categoria.nombre}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {producto.proveedor.nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-semibold">
                            ${producto.precio.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {producto.stock <= producto.stockMinimo && (
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              )}
                              <span className={`font-medium ${producto.stock <= producto.stockMinimo ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                {producto.stock}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">(mín: {producto.stockMinimo})</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <Link href={`/productos/editar/${producto.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300" title="Editar">
                                <Edit className="w-5 h-5" />
                              </Link>
                              <Link href={`/productos/precios/${producto.id}`} className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300" title="Precios">
                                <History className="w-5 h-5" />
                              </Link>
                              <button onClick={() => handleDelete(producto.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300" title="Eliminar">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-md">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando {(paginaActual - 1) * PAGE_SIZE + 1}–{Math.min(paginaActual * PAGE_SIZE, totalProductos)} de {totalProductos}
              </div>
              <div className="flex gap-1 items-center">
                <button onClick={() => irAPagina(1)} disabled={paginaActual === 1}
                  className="p-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={() => irAPagina(paginaActual - 1)} disabled={paginaActual === 1}
                  className="p-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {paginaActual > 3 && (
                  <span className="px-2 text-gray-400">...</span>
                )}

                {paginasVisibles().map(num => (
                  <button key={num} onClick={() => irAPagina(num)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      paginaActual === num
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}>
                    {num}
                  </button>
                ))}

                {paginaActual < totalPaginas - 2 && (
                  <span className="px-2 text-gray-400">...</span>
                )}

                <button onClick={() => irAPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}
                  className="p-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => irAPagina(totalPaginas)} disabled={paginaActual === totalPaginas}
                  className="p-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal edición masiva */}
      {mostrarModalMasivo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                Edición Masiva ({seleccionados.length} productos)
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Acción</label>
                  <select value={accionMasiva} onChange={(e) => setAccionMasiva(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                    <option value="CAMBIAR_CATEGORIA">Cambiar Categoría</option>
                    <option value="CAMBIAR_PROVEEDOR">Cambiar Proveedor</option>
                    <option value="AJUSTAR_STOCK">Ajustar Stock</option>
                  </select>
                </div>

                {accionMasiva === 'CAMBIAR_CATEGORIA' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva Categoría</label>
                    <select value={datosMasivos.categoriaId} onChange={(e) => setDatosMasivos({ ...datosMasivos, categoriaId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                      <option value="">Seleccionar...</option>
                      {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                    </select>
                  </div>
                )}

                {accionMasiva === 'CAMBIAR_PROVEEDOR' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nuevo Proveedor</label>
                    <select value={datosMasivos.proveedorId} onChange={(e) => setDatosMasivos({ ...datosMasivos, proveedorId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                      <option value="">Seleccionar...</option>
                      {proveedores.map(prov => <option key={prov.id} value={prov.id}>{prov.nombre}</option>)}
                    </select>
                  </div>
                )}

                {accionMasiva === 'AJUSTAR_STOCK' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                      <select value={datosMasivos.tipoStock} onChange={(e) => setDatosMasivos({ ...datosMasivos, tipoStock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700">
                        <option value="SUMAR">➕ Sumar</option>
                        <option value="RESTAR">➖ Restar</option>
                        <option value="ESTABLECER">📝 Establecer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                      <input type="number" value={datosMasivos.cantidadStock} min="0"
                        onChange={(e) => setDatosMasivos({ ...datosMasivos, cantidadStock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo (opcional)</label>
                      <input type="text" value={datosMasivos.motivoStock} placeholder="Ej: Inventario anual"
                        onChange={(e) => setDatosMasivos({ ...datosMasivos, motivoStock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button onClick={handleActualizacionMasiva} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
                    Aplicar Cambios
                  </button>
                  <button onClick={() => { setMostrarModalMasivo(false); setDatosMasivos({ categoriaId: '', proveedorId: '', tipoStock: 'SUMAR', cantidadStock: '', motivoStock: '' }); }}
                    className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-2 px-4 rounded-md transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}