'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, DollarSign, User, CreditCard } from 'lucide-react';
import Image from 'next/image';

export default function VentasPage() {
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    fetchProductos();
  }, []);

  useEffect(() => {
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      const filtrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(busquedaLower) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busquedaLower))
      );
      setProductosFiltrados(filtrados);
    } else {
      setProductosFiltrados(productos);
    }
  }, [busqueda, productos]);

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/productos');
      const data = await response.json();
      setProductos(data);
      setProductosFiltrados(data);
    } catch (err) {
      console.error('Error al cargar productos');
    }
  };

  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find(item => item.productoId === producto.id);
    
    if (itemExistente) {
      if (itemExistente.cantidad >= producto.stock) {
        alert('No hay suficiente stock disponible');
        return;
      }
      setCarrito(carrito.map(item =>
        item.productoId === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      if (producto.stock === 0) {
        alert('Producto sin stock');
        return;
      }
      setCarrito([...carrito, {
        productoId: producto.id,
        nombre: producto.nombre,
        precioUnit: producto.precio,
        cantidad: 1,
        stock: producto.stock
      }]);
    }
  };

  const actualizarCantidad = (productoId, nuevaCantidad) => {
    const item = carrito.find(i => i.productoId === productoId);
    
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(productoId);
      return;
    }

    if (nuevaCantidad > item.stock) {
      alert('No hay suficiente stock disponible');
      return;
    }

    setCarrito(carrito.map(item =>
      item.productoId === productoId
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ));
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(item => item.productoId !== productoId));
  };

  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + (item.precioUnit * item.cantidad), 0);
  };

  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    if (!metodoPago) {
      alert('Selecciona un método de pago');
      return;
    }

    setProcesando(true);

    try {
      const response = await fetch('/api/ventas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: carrito,
          metodoPago,
          clienteNombre: clienteNombre || null,
          clienteDni: clienteDni || null,
          observaciones: observaciones || null
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const venta = await response.json();
      
      alert(`Venta #${venta.id} realizada exitosamente!\nTotal: $${venta.total.toFixed(2)}`);
      
      // Limpiar formulario
      setCarrito([]);
      setClienteNombre('');
      setClienteDni('');
      setObservaciones('');
      setMetodoPago('EFECTIVO');
      setBusqueda('');
      
      // Recargar productos para actualizar stock
      fetchProductos();
    } catch (err) {
      alert(err.message || 'Error al procesar la venta');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
        <ShoppingCart className="w-8 h-8" />
        Punto de Venta
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo: Búsqueda de productos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Búsqueda */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar producto por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-lg"
                autoFocus
              />
            </div>
          </div>

          {/* Grid de productos */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Productos Disponibles</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
              {productosFiltrados.map((producto) => (
                <div
                  key={producto.id}
                  onClick={() => agregarAlCarrito(producto)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    producto.stock === 0
                      ? 'bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'hover:shadow-lg hover:border-blue-500'
                  }`}
                >
                  <div className="relative w-full h-32 mb-2 bg-gray-100 rounded-md overflow-hidden">
                    {producto.imagen ? (
                      <Image
                        src={producto.imagen}
                        alt={producto.nombre}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">
                    {producto.nombre}
                  </h3>
                  <p className="text-lg font-bold text-blue-600">${producto.precio.toFixed(2)}</p>
                  <p className={`text-xs ${producto.stock <= producto.stockMinimo ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                    Stock: {producto.stock}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho: Carrito */}
        <div className="space-y-4">
          {/* Carrito de compras */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrito ({carrito.length})
            </h2>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {carrito.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Carrito vacío</p>
              ) : (
                carrito.map((item) => (
                  <div key={item.productoId} className="flex items-center justify-between border-b pb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                      <p className="text-xs text-gray-500">${item.precioUnit.toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
                        className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.cantidad}</span>
                      <button
                        onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
                        className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => eliminarDelCarrito(item.productoId)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="ml-2 text-right">
                      <p className="font-semibold text-gray-900">
                        ${(item.precioUnit * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total */}
            <div className="border-t pt-4 mb-4">
              <div className="flex justify-between items-center text-2xl font-bold">
                <span>TOTAL:</span>
                <span className="text-green-600">${calcularTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Método de Pago
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </select>
            </div>

            {/* Datos del cliente (opcional) */}
            <div className="space-y-3 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                <User className="w-4 h-4 inline mr-1" />
                Cliente (opcional)
              </label>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <input
                type="text"
                placeholder="DNI"
                value={clienteDni}
                onChange={(e) => setClienteDni(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* Botón finalizar venta */}
            <button
              onClick={finalizarVenta}
              disabled={carrito.length === 0 || procesando}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              <DollarSign className="w-5 h-5" />
              {procesando ? 'Procesando...' : 'Finalizar Venta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}