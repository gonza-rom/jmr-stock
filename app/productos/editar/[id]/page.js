// app/productos/editar/[id]/page.js - VERSIÓN CORREGIDA

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import MultipleImageUpload from '@/components/MultipleImageUpload';

export default function EditarProductoPage({ params }) {
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    codigoProducto: '',
    precio: '',
    stock: '',
    stockMinimo: '',
    imagenes: [], // ⭐ CORREGIDO: Solo usamos imagenes (array)
    categoriaId: '',
    proveedorId: '',
  });

  useEffect(() => {
    const unwrapParams = async () => {
      const unwrappedParams = await params;
      setProductId(unwrappedParams.id);
    };
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (productId) {
      fetchProducto();
      fetchCategorias();
      fetchProveedores();
    }
  }, [productId]);

  const fetchProducto = async () => {
    try {
      const response = await fetch(`/api/productos/${productId}`);
      if (!response.ok) throw new Error('Producto no encontrado');
      const data = await response.json();
      
      // ⭐ LÓGICA CORREGIDA: Priorizar imagenes (array), fallback a imagen
      let imagenesArray = [];
      
      if (data.imagenes && Array.isArray(data.imagenes) && data.imagenes.length > 0) {
        // Si tiene array de imágenes, usarlo
        imagenesArray = data.imagenes;
      } else if (data.imagen) {
        // Si solo tiene imagen principal (legacy), convertirla a array
        imagenesArray = [data.imagen];
      }
      
      setFormData({
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        codigoProducto: data.codigoProducto || '',
        precio: data.precio.toString(),
        stock: data.stock.toString(),
        stockMinimo: data.stockMinimo.toString(),
        imagenes: imagenesArray, // ⭐ Solo imagenes
        categoriaId: data.categoriaId.toString(),
        proveedorId: data.proveedorId.toString(),
      });
    } catch (err) {
      alert('Error al cargar el producto');
      router.push('/productos');
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
      console.error('Error al cargar categorías:', err);
    }
  };

  const fetchProveedores = async () => {
    try {
      const response = await fetch('/api/proveedores');
      const data = await response.json();
      setProveedores(data);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const dataToSend = {
        ...formData,
        // ⭐ IMPORTANTE: Sincronizar imagen principal con el primer elemento del array
        imagen: formData.imagenes[0] || null,
        imagenes: formData.imagenes || [],
      };

      const response = await fetch(`/api/productos/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar producto');
      }

      alert('✅ Producto actualizado correctamente');
      router.push('/productos');
    } catch (err) {
      alert(err.message || 'Error al actualizar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600 dark:text-gray-400">Cargando producto...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/productos" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Editar Producto</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
        {/* Componente de múltiples imágenes */}
        <MultipleImageUpload
          value={formData.imagenes}
          onChange={(imagenes) => setFormData({ ...formData, imagenes })}
        />

        <div className="border-t dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Información del Producto</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descripción
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Package className="w-4 h-4 inline mr-1" />
                Código de Producto
              </label>
              <input
                type="text"
                name="codigoProducto"
                value={formData.codigoProducto}
                onChange={handleChange}
                placeholder="Ej: ABC123, PROD-001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría *
                </label>
                <select
                  name="categoriaId"
                  value={formData.categoriaId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                >
                  <option value="">Seleccionar...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proveedor *
                </label>
                <select
                  name="proveedorId"
                  value={formData.proveedorId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                >
                  <option value="">Seleccionar...</option>
                  {proveedores.map((prov) => (
                    <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Precio *
                </label>
                <input
                  type="number"
                  name="precio"
                  value={formData.precio}
                  onChange={handleChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  name="stockMinimo"
                  value={formData.stockMinimo}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 dark:bg-gray-700"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t dark:border-gray-700">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md disabled:bg-gray-400 transition-colors font-semibold"
          >
            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
          <Link
            href="/productos"
            className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 py-3 px-4 rounded-md text-center transition-colors font-semibold"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}