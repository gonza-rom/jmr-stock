'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Scan, Barcode, X, Sparkles } from 'lucide-react';

export default function BarcodeInput({ value, onChange, onScanned }) {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const quaggaRef = useRef(null);
  const containerRef = useRef(null);

  // Limpiar recursos
  const stopScanning = useCallback(() => {
    if (quaggaRef.current) {
      try { quaggaRef.current.stop(); } catch (e) {}
      quaggaRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => stopScanning();
  }, [stopScanning]);

  // Cargar quagga2 desde CDN
  const loadQuagga = () => {
    return new Promise((resolve, reject) => {
      if (window.Quagga) { resolve(window.Quagga); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/quagga2@0.7.10/dist/quagga.min.js';
      script.onload = () => resolve(window.Quagga);
      script.onerror = () => reject(new Error('No se pudo cargar el scanner'));
      document.head.appendChild(script);
    });
  };

  const startScanning = async () => {
    setCameraError('');
    setScanning(true);

    try {
      // Solicitar cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      // Esperar a que el video se monte en el DOM
      await new Promise((r) => setTimeout(r, 400));

      const video = videoRef.current;
      if (!video) { throw new Error('Video no disponible'); }
      video.srcObject = stream;
      video.play();

      const Quagga = await loadQuagga();

      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: video,
          },
          decoder: {
            readers: ['ean13_reader', 'ean8_reader', 'upc_a_reader', 'code_128_reader', 'code_39_reader'],
          },
          locator: { plocate: true, locate: true },
        },
        (err) => {
          if (err) {
            setCameraError('Error al iniciar el escáner.');
            stopScanning();
            return;
          }
          quaggaRef.current = Quagga;
          Quagga.start();

          Quagga.onDetected((result) => {
            if (result.codeResult?.code) {
              const codigo = result.codeResult.code;
              stopScanning();
              if (onScanned) onScanned(codigo);
            }
          });
        }
      );
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Permiso de cámara negado. Habilítalo en la configuración del navegador.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No se encontró cámara en este dispositivo.');
      } else {
        setCameraError('Error al abrir la cámara.');
      }
      stopScanning();
    }
  };

  // Generar código de 10 dígitos aleatorio
  const generarCodigo = () => {
    const codigo = String(Math.floor(Math.random() * 9000000000) + 1000000000);
    onChange(codigo);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Código de Barras</label>

      <div className="flex gap-2">
        {/* Input del código */}
        <div className="flex-1 relative">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Código de barras (opcional)"
            className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Botón Scan */}
        <button
          type="button"
          onClick={startScanning}
          disabled={scanning}
          className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center gap-1.5"
          title="Escanear código de barras con la cámara"
        >
          <Scan className="w-5 h-5" />
          <span className="text-sm font-medium">Scan</span>
        </button>

        {/* Botón generar automático */}
        <button
          type="button"
          onClick={generarCodigo}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center gap-1.5"
          title="Generar código de barras automático"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium">Auto</span>
        </button>
      </div>

      {/* Mensaje de error de cámara */}
      {cameraError && <p className="text-red-600 text-xs">{cameraError}</p>}

      {/* Vista de cámara activa para escaneo */}
      {scanning && (
        <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-black" style={{ maxHeight: 280 }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
            style={{ maxHeight: 280, objectFit: 'cover' }}
          />
          {/* Línea de escaneo animada */}
          <div className="absolute inset-x-0 top-1/2 h-0.5 bg-green-400 opacity-70 animate-pulse" />
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={stopScanning}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
          >
            <X className="w-4 h-4" />
          </button>
          {/* Instrucción */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <span className="bg-black bg-opacity-60 text-white text-xs px-3 py-1 rounded-full">
              Apunta el código de barras a la cámara
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Escanea con cámara, ingresa manualmente o genera uno automático. Es opcional.
      </p>
    </div>
  );
}