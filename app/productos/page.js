'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit, Trash2, Package, AlertTriangle, Search, Filter, X, DollarSign, Barcode, History } from 'lucide-react';

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados para filtros y búsqueda
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('nombre');
  const [ordenDireccion, setOrdenDireccion] = useState('asc');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Nuevos filtros
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [productos, busqueda, categoriaFiltro, ordenarPor, ordenDireccion, precioMin, precioMax, soloStockBajo]);

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/productos');
      if (!response.ok) throw new Error('Error al cargar productos');
      const data = await response.json();
      setProductos(data);
    } catch (err) {
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/categorias');
      const data = await response.json();
      setCategorias(data);
    } catch (err) {
      console.error('Error al cargar categorías');
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...productos];

    // Filtro por búsqueda (nombre, descripción o código de barras)
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(p => 
        p.nombre.toLowerCase().includes(busquedaLower) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busquedaLower)) ||
        (p.codigoBarras && p.codigoBarras.includes(busqueda))
      );
    }

    // Filtro por categoría
    if (categoriaFiltro) {
      resultado = resultado.filter(p => p.categoriaId === parseInt(categoriaFiltro));
    }

    // Filtro por rango de precios
    if (precioMin) {
      resultado = resultado.filter(p => p.precio >= parseFloat(precioMin));
    }
    if (precioMax) {
      resultado = resultado.filter(p => p.precio <= parseFloat(precioMax));
    }

    // Filtro solo stock bajo
    if (soloStockBajo) {
      resultado = resultado.filter(p => p.stock <= p.stockMinimo);
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      let valorA, valorB;

      switch (ordenarPor) {
        case 'nombre':
          valorA = a.nombre.toLowerCase();
          valorB = b.nombre.toLowerCase();
          break;
        case 'precio':
          valorA = a.precio;
          valorB = b.precio;
          break;
        case 'stock':
          valorA = a.stock;
          valorB = b.stock;
          break;
        default:
          return 0;
      }

      if (ordenDireccion === 'asc') {
        return valorA > valorB ? 1 : -1;
      } else {
        return valorA < valorB ? 1 : -1;
      }
    });

    setProductosFiltrados(resultado);
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setCategoriaFiltro('');
    setOrdenarPor('nombre');
    setOrdenDireccion('asc');
    setPrecioMin('');
    setPrecioMax('');
    setSoloStockBajo(false);
  };

  const hayFiltrosActivos = () => {
    return busqueda || categoriaFiltro || ordenarPor !== 'nombre' || 
           ordenDireccion !== 'asc' || precioMin || precioMax || soloStockBajo;
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      const response = await fetch(`/api/productos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar');

      setProductos(productos.filter(p => p.id !== id));
      alert('Producto eliminado correctamente');
    } catch (err) {
      alert('Error al eliminar el producto');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-8 h-8" />
          Productos
        </h1>
        <Link
          href="/productos/nuevo"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        {/* Búsqueda */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o código de barras..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtros
            {hayFiltrosActivos() && (
              <span className="bg-blue-600 text-white rounded-full w-2 h-2"></span>
            )}
          </button>
        </div>

        {/* Panel de filtros */}
        {mostrarFiltros && (
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordenar por
                </label>
                <select
                  value={ordenarPor}
                  onChange={(e) => setOrdenarPor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="nombre">Nombre</option>
                  <option value="precio">Precio</option>
                  <option value="stock">Stock</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden
                </label>
                <select
                  value={ordenDireccion}
                  onChange={(e) => setOrdenDireccion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="asc">Ascendente (A-Z, menor-mayor)</option>
                  <option value="desc">Descendente (Z-A, mayor-menor)</option>
                </select>
              </div>
            </div>

            {/* Rango de precios */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="w-4 h-4 inline" /> Rango de Precios
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Precio mínimo"
                  value={precioMin}
                  onChange={(e) => setPrecioMin(e.target.value)}
                  min="0"
                  step="0.01"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <input
                  type="number"
                  placeholder="Precio máximo"
                  value={precioMax}
                  onChange={(e) => setPrecioMax(e.target.value)}
                  min="0"
                  step="0.01"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            {/* Solo stock bajo */}
            <div className="flex items-center">
              <input
                id="solo-stock-bajo"
                type="checkbox"
                checked={soloStockBajo}
                onChange={(e) => setSoloStockBajo(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="solo-stock-bajo" className="ml-2 text-sm font-medium text-gray-700 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Mostrar solo productos con stock bajo
              </label>
            </div>

            {hayFiltrosActivos() && (
              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  className="w-full bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contador de resultados */}
        <div className="text-sm text-gray-600 flex items-center justify-between">
          <span>
            Mostrando {productosFiltrados.length} de {productos.length} productos
          </span>
          {soloStockBajo && (
            <span className="text-red-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Productos con stock bajo
            </span>
          )}
        </div>
      </div>

      {productosFiltrados.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          {productos.length === 0 ? (
            <>
              <p className="text-gray-600 text-lg">No hay productos registrados</p>
              <Link
                href="/productos/nuevo"
                className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Crear primer producto
              </Link>
            </>
          ) : (
            <>
              <p className="text-gray-600 text-lg">No se encontraron productos con los filtros aplicados</p>
              <button
                onClick={limpiarFiltros}
                className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Limpiar filtros
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imagen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productosFiltrados.map((producto) => (
                  <tr key={producto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {producto.imagen ? (
                          <Image
                            src={producto.imagen}
                            alt={producto.nombre}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                      {producto.descripcion && (
                        <div className="text-sm text-gray-500 line-clamp-1">{producto.descripcion}</div>
                      )}
                      {producto.codigoBarras && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Barcode className="w-3 h-3" />
                          {producto.codigoBarras}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {producto.categoria.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {producto.proveedor.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ${producto.precio.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {producto.stock <= producto.stockMinimo && (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`font-medium ${producto.stock <= producto.stockMinimo ? 'text-red-600' : 'text-gray-900'}`}>
                          {producto.stock}
                        </span>
                        <span className="text-xs text-gray-500">
                          (mín: {producto.stockMinimo})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Link
                          href={`/productos/editar/${producto.id}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <Link
                          href={`/productos/precios/${producto.id}`}
                          className="text-green-600 hover:text-green-900"
                          title="Historial de precios"
                        >
                          <History className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(producto.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
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