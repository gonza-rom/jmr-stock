'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditarProductoPage({ params }) {
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    stockMinimo: '',
    categoriaId: '',
    proveedorId: '',
  });

  useEffect(() => {
    fetchProducto();
    fetchCategorias();
    fetchProveedores();
  }, []);

  const fetchProducto = async () => {
    try {
      const response = await fetch(`/api/productos/${params.id}`);
      if (!response.ok) throw new Error('Producto no encontrado');
      const data = await response.json();
      setFormData({
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        precio: data.precio.toString(),
        stock: data.stock.toString(),
        stockMinimo: data.stockMinimo.toString(),
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
      const response = await fetch(`/api/productos/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar producto');
      }

      alert('Producto actualizado correctamente');
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
        <div className="text-xl text-gray-600">Cargando producto...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/productos" className="text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Editar Producto</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              name="categoriaId"
              value={formData.categoriaId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor *
            </label>
            <select
              name="proveedorId"
              value={formData.proveedorId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {proveedores.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock
            </label>
            <input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Mínimo
            </label>
            <input
              type="number"
              name="stockMinimo"
              value={formData.stockMinimo}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:bg-gray-400 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link
            href="/productos"
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md text-center transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}