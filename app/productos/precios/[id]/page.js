'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function PreciosProductoPage({ params }) {
  const router = useRouter();
  const [productId, setProductId] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    precioNuevo: '',
    motivo: '',
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
      fetchData();
    }
  }, [productId]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/precios/${productId}`);
      if (!response.ok) throw new Error('Error al cargar datos');
      const result = await response.json();
      setData(result);
      setFormData({ precioNuevo: result.producto.precio.toString(), motivo: '' });
    } catch (err) {
      alert('Error al cargar historial de precios');
      router.push('/productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const precioNuevo = parseFloat(formData.precioNuevo);
    const precioActual = data.producto.precio;

    if (precioNuevo === precioActual) {
      alert('El nuevo precio es igual al actual');
      return;
    }

    if (precioNuevo <= 0) {
      alert('El precio debe ser mayor a 0');
      return;
    }

    try {
      const response = await fetch(`/api/productos/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precio: precioNuevo,
          motivoCambioPrecio: formData.motivo || 'Actualización manual de precio',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      alert('Precio actualizado correctamente');
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error al actualizar precio');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!data) return null;

  const calcularCambio = (viejo, nuevo) => {
    const diferencia = nuevo - viejo;
    const porcentaje = ((diferencia / viejo) * 100).toFixed(2);
    return { diferencia, porcentaje };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/productos" className="text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Precios</h1>
          <p className="text-gray-600">{data.producto.nombre}</p>
        </div>
      </div>

      {/* Precio actual */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">Precio Actual</p>
            <p className="text-4xl font-bold text-green-600">
              ${data.producto.precio.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Cancelar' : 'Actualizar Precio'}
          </button>
        </div>

        {/* Formulario de actualización */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo Precio *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={formData.precioNuevo}
                    onChange={(e) => setFormData({ ...formData, precioNuevo: e.target.value })}
                    required
                    step="0.01"
                    min="0.01"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del cambio
                </label>
                <input
                  type="text"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  placeholder="Ej: Aumento de proveedor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              Confirmar Cambio de Precio
            </button>
          </form>
        )}
      </div>

      {/* Historial de cambios */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Historial de Cambios ({data.historial.length})
        </h2>

        {data.historial.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay cambios de precio registrados</p>
        ) : (
          <div className="space-y-3">
            {data.historial.map((cambio) => {
              const { diferencia, porcentaje } = calcularCambio(cambio.precioViejo, cambio.precioNuevo);
              const esAumento = diferencia > 0;

              return (
                <div
                  key={cambio.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 line-through">
                            ${cambio.precioViejo.toFixed(2)}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-xl font-bold text-gray-900">
                            ${cambio.precioNuevo.toFixed(2)}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          esAumento ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {esAumento ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {esAumento ? '+' : ''}{porcentaje}%
                          </span>
                        </div>
                      </div>

                      {cambio.motivo && (
                        <p className="text-sm text-gray-600 mb-1">
                          <span className="font-medium">Motivo:</span> {cambio.motivo}
                        </p>
                      )}

                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(cambio.createdAt).toLocaleString('es-AR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-bold ${esAumento ? 'text-red-600' : 'text-green-600'}`}>
                        {esAumento ? '+' : ''}${diferencia.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <Link
          href="/productos"
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md text-center transition-colors"
        >
          Volver a Productos
        </Link>
      </div>
    </div>
  );
}