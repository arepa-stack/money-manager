'use client';

import React, { useState, useRef } from 'react';
import { ImportAnalysisResult } from '@/lib/domain/types';

interface ImportWidgetProps {
  onAnalyzed: (result: ImportAnalysisResult, file: File, provider: string) => void;
  onError: (msg: string) => void;
}

const PROVIDERS = [
  {
    id: 'MONEY_MANAGER',
    name: 'Money Manager',
    description: 'Importar exportación en Excel (.xls, .xlsx) de Money Manager',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    )
  },
  {
    id: 'FUTURE_PROVIDER',
    name: 'Nueva Integración',
    description: 'Próximamente: Sincroniza extractos bancarios o APIs de otras plataformas financieras',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    disabled: true
  }
];

export default function ImportWidget({ onAnalyzed, onError }: ImportWidgetProps) {
  const [selectedProvider, setSelectedProvider] = useState('MONEY_MANAGER');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xls' && extension !== 'xlsx' && extension !== 'csv') {
      onError('Por favor, selecciona un archivo válido (.xls, .xlsx, .csv)');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('provider', selectedProvider);

    try {
      const res = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al analizar el archivo');
      }

      const result: ImportAnalysisResult = await res.json();
      onAnalyzed(result, file, selectedProvider);
    } catch (err: any) {
      onError(err.message || 'Error durante la fase de análisis.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Selector de Proveedores */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">
          1. Selecciona el Proveedor de Origen
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => !provider.disabled && setSelectedProvider(provider.id)}
              disabled={provider.disabled}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                provider.disabled
                  ? 'opacity-40 border-slate-900 bg-slate-900/10 cursor-not-allowed'
                  : selectedProvider === provider.id
                    ? 'border-indigo-500 bg-indigo-500/5 text-slate-100 shadow-md shadow-indigo-500/5 cursor-pointer'
                    : 'border-slate-800 bg-slate-900/25 hover:bg-slate-900/40 hover:border-slate-700 text-slate-400 cursor-pointer'
              }`}
            >
              <div className={`p-2 rounded-xl border ${
                selectedProvider === provider.id && !provider.disabled
                  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400'
                  : 'bg-slate-950 border-slate-850 text-slate-500'
              }`}>
                {provider.icon}
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-sm block">{provider.name}</span>
                <span className="text-[11px] text-slate-500 leading-tight block">{provider.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Caja de Carga */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">
          2. Sube el Extracto Financiero
        </label>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xls,.xlsx,.csv"
          className="hidden"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`relative flex flex-col items-center justify-center w-full h-60 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-sm ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
          } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-300 font-medium text-base animate-pulse">Analizando archivo...</p>
              <p className="text-slate-500 text-xs">Verificando idempotencia y detectando conciliaciones</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-6 space-y-4">
              <div className={`p-3.5 rounded-full bg-slate-850 text-indigo-400 transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-200 font-semibold text-base">
                  Arrastra tu archivo aquí
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  o haz clic para buscar en tu dispositivo (.xls, .xlsx, .csv)
                </p>
              </div>
              <div className="text-[10px] text-slate-500 bg-slate-850/40 px-3 py-1 rounded-full border border-slate-800">
                Compatible con exportaciones de múltiples divisas
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
