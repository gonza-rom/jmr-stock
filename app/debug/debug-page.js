'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugPage() {
  const { user, loading } = useAuth();
  const [productos, setProductos] = useState(null);
  const [categorias, setCategorias] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    testAPIs();
  }, []);

  const testAPIs = async () => {
    try {
      // Test productos
      const prodRes = await fetch('/api/productos');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProductos(prodData);
        console.log('Productos:', prodData);
      } else {
        console.error('Error productos:', await prodRes.text());
      }

      // Test categorías
      const catRes = await fetch('/api/categorias');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategorias(catData);
        console.log('Categorías:', catData);
      } else {
        console.error('Error categorías:', await catRes.text());
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Debug - Estado del Sistema</h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
        <h2 className="text-xl font-semibold">Usuario Autenticado</h2>
        <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto">
          {JSON.stringify({ user, loading }, null, 2)}
        </pre>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
        <h2 className="text-xl font-semibold">Productos</h2>
        {productos ? (
          <div>
            <p className="text-green-600 font-semibold">✅ {productos.length} productos cargados</p>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(productos, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500">Cargando productos...</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
        <h2 className="text-xl font-semibold">Categorías</h2>
        {categorias ? (
          <div>
            <p className="text-green-600 font-semibold">✅ {categorias.length} categorías cargadas</p>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(categorias, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-gray-500">Cargando categorías...</p>
        )}
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p>{error}</p>
        </div>
      )}

      <div className="bg-blue-100 dark:bg-blue-900/20 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-blue-600 mb-4">Instrucciones</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Verifica que el usuario esté cargado correctamente</li>
          <li>Verifica que los productos y categorías se carguen</li>
          <li>Abre la consola del navegador (F12) para ver los logs</li>
          <li>Si ves errores, copia el mensaje completo</li>
        </ol>
      </div>
    </div>
  );
}