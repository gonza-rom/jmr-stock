'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image } from 'lucide-react';

export default function ImageUpload({ value, onChange, onRemove }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen.');
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede ser mayor a 2MB.');
      return;
    }

    setUploading(true);

    // Convertir a base64 para almacenar directamente
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result);
      setUploading(false);
    };
    reader.onerror = () => {
      alert('Error al leer la imagen.');
      setUploading(false);
    };
    reader.readAsDataURL(file);

    // Resetear input para permitir reseleccionar el mismo archivo
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Imagen del producto</label>

      {value ? (
        // Preview de imagen existente
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {/* Botones sobre la imagen */}
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700"
              title="Cambiar imagen"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="bg-red-600 text-white p-1.5 rounded-md hover:bg-red-700"
              title="Eliminar imagen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        // Zona de drop / clic para subir
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 flex flex-col items-center justify-center gap-2 transition-colors"
        >
          <Image className="w-8 h-8 text-gray-400" />
          <span className="text-xs text-gray-500 text-center leading-tight px-1">
            {uploading ? 'Cargando...' : 'Agregar imagen'}
          </span>
        </button>
      )}

      {/* Input oculto de archivo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}