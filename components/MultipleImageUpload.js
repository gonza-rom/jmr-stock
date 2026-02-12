'use client';

import { useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Componente para subir múltiples imágenes a Cloudinary
 * VERSIÓN MEJORADA con mejor debugging y manejo de errores
 */
export default function MultipleImageUpload({ value = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const imagenes = Array.isArray(value) ? value : [];

  /**
   * Sube una imagen a Cloudinary con mejor manejo de errores
   */
  const subirImagenACloudinary = async (file) => {
    // ⚠️ VALIDAR VARIABLES DE ENTORNO
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || 'jmr-stock-products';

    if (!cloudName) {
      throw new Error('❌ CLOUDINARY_CLOUD_NAME no está configurado en variables de entorno');
    }

    console.log('🌐 Subiendo a Cloudinary:', {
      cloudName,
      uploadPreset,
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'jmr-stock/');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Error de Cloudinary:', data);
        throw new Error(data.error?.message || 'Error al subir imagen a Cloudinary');
      }

      console.log('✅ Imagen subida:', data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error('❌ Error en upload:', error);
      throw error;
    }
  };

  /**
   * Maneja la subida de múltiples archivos
   */
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Validar cantidad
    if (files.length > 10) {
      setError('Máximo 10 imágenes por vez');
      return;
    }

    // Validar tamaño total
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
      setError('El tamaño total no puede superar 20MB');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const urls = [];
      const errores = [];
      
      // Subir imágenes una por una
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar tipo
        if (!file.type.startsWith('image/')) {
          console.warn(`⚠️ ${file.name} no es una imagen, saltando...`);
          errores.push(`${file.name}: no es una imagen`);
          continue;
        }

        // Validar tamaño individual (5MB)
        if (file.size > 5 * 1024 * 1024) {
          console.warn(`⚠️ ${file.name} muy grande (>5MB), saltando...`);
          errores.push(`${file.name}: muy grande (>5MB)`);
          continue;
        }

        try {
          const url = await subirImagenACloudinary(file);
          urls.push(url);
          setUploadProgress(((i + 1) / files.length) * 100);
        } catch (err) {
          console.error(`❌ Error subiendo ${file.name}:`, err);
          errores.push(`${file.name}: ${err.message}`);
        }
      }

      // Agregar nuevas URLs al array existente
      if (urls.length > 0) {
        const nuevasImagenes = [...imagenes, ...urls];
        onChange(nuevasImagenes);
        console.log(`✅ ${urls.length} imágenes subidas correctamente`);
      }

      // Mostrar errores si hubo
      if (errores.length > 0) {
        setError(`Algunos archivos fallaron:\n${errores.join('\n')}`);
      }

      if (urls.length === 0 && errores.length > 0) {
        throw new Error('No se pudo subir ninguna imagen');
      }
    } catch (error) {
      setError(`Error: ${error.message}`);
      console.error('❌ Error en upload:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Elimina una imagen del array
   */
  const eliminarImagen = (index) => {
    const nuevasImagenes = imagenes.filter((_, i) => i !== index);
    onChange(nuevasImagenes);
  };

  /**
   * Establece una imagen como principal (mueve al inicio)
   */
  const establecerComoPrincipal = (index) => {
    const nuevasImagenes = [...imagenes];
    const [imagenPrincipal] = nuevasImagenes.splice(index, 1);
    nuevasImagenes.unshift(imagenPrincipal);
    onChange(nuevasImagenes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Imágenes del Producto
        </label>
        {imagenes.length > 0 && (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {imagenes.length} imagen(es)
          </span>
        )}
      </div>

      {/* Zona de upload */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
        <input
          type="file"
          id="multiple-images-upload"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
        <label
          htmlFor="multiple-images-upload"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          {uploading ? (
            <>
              <Loader className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Subiendo imágenes... {Math.round(uploadProgress)}%
              </p>
              <div className="w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Click para subir múltiples imágenes
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PNG, JPG, WebP (máx. 5MB cada una, hasta 10 imágenes)
                </p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Mensajes de error con más detalle */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                Error al subir imágenes
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 whitespace-pre-line">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview de imágenes */}
      {imagenes.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {imagenes.map((url, index) => (
              <div key={index} className="relative group">
                <div className="relative w-full h-32 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 group-hover:border-blue-400 dark:group-hover:border-blue-500 transition-colors">
                  <img
                    src={url}
                    alt={`Imagen ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {index === 0 && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded font-semibold shadow-lg flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Principal
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </div>

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => establecerComoPrincipal(index)}
                      className="bg-white text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
                      title="Establecer como principal"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => eliminarImagen(index)}
                    className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                    title="Eliminar imagen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• La primera imagen es la que se muestra en el listado de productos</p>
            <p>• Click en una imagen y luego en el ícono <ImageIcon className="w-3 h-3 inline" /> para establecerla como principal</p>
          </div>
        </div>
      )}

      {imagenes.length === 0 && !uploading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ImageIcon className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm">No hay imágenes cargadas</p>
          <p className="text-xs mt-1">Sube al menos una imagen del producto</p>
        </div>
      )}
    </div>
  );
}