'use client';

import { useEffect, useState } from 'react';
import { FolderTree, Plus } from 'lucide-react';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  });

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const response = await fetch('/api/categorias');
      const data = await response.json();
      setCategorias(data);
    } catch (err) {
      console.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/categorias', {
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

      const newCategoria = await response.json();
      setCategorias([...categorias, newCategoria]);
      setFormData({ nombre: '', descripcion: '' });
      setShowForm(false);
      alert('Categoría creada correctamente');
    } catch (err) {
      alert(err.message || 'Error al crear categoría');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Cargando categorías...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FolderTree className="w-8 h-8" />
          Categorías
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Categoría
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Crear Categoría
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ nombre: '', descripcion: '' });
              }}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {categorias.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <FolderTree className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No hay categorías registradas</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Crear primera categoría
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categorias.map((categoria) => (
            <div
              key={categoria.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-semibold text-gray-800">{categoria.nombre}</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                  {categoria._count.productos} productos
                </span>
              </div>
              {categoria.descripcion && (
                <p className="text-gray-600 text-sm mt-2">{categoria.descripcion}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}