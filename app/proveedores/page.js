'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Mail, Phone, MapPin } from 'lucide-react';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
  });

  useEffect(() => {
    fetchProveedores();
  }, []);

  const fetchProveedores = async () => {
    try {
      const response = await fetch('/api/proveedores');
      const data = await response.json();
      setProveedores(data);
    } catch (err) {
      console.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/proveedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const newProveedor = await response.json();
      setProveedores([...proveedores, newProveedor]);
      setFormData({ nombre: '', telefono: '', email: '', direccion: '' });
      setShowForm(false);
      alert('Proveedor creado correctamente');
    } catch (err) {
      alert(err.message || 'Error al crear proveedor');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Cargando proveedores...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-8 h-8" />
          Proveedores
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Proveedor
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <textarea
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Crear Proveedor
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ nombre: '', telefono: '', email: '', direccion: '' });
              }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {proveedores.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay proveedores registrados</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Crear primer proveedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {proveedores.map((proveedor) => (
            <div
              key={proveedor.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{proveedor.nombre}</h3>
                <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                  {proveedor._count.productos} productos
                </span>
              </div>
              
              <div className="space-y-2">
                {proveedor.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{proveedor.telefono}</span>
                  </div>
                )}
                {proveedor.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{proveedor.email}</span>
                  </div>
                )}
                {proveedor.direccion && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{proveedor.direccion}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}