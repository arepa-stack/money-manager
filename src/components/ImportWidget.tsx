'use client';

import React, { useState, useRef } from 'react';
import { ImportAnalysisResult } from '@/lib/domain/types';

interface ImportWidgetProps {
  onAnalyzed: (result: ImportAnalysisResult, file: File) => void;
  onError: (msg: string) => void;
}

export default function ImportWidget({ onAnalyzed, onError }: ImportWidgetProps) {
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
    // Check extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xls' && extension !== 'xlsx' && extension !== 'csv') {
      onError('Por favor, selecciona un archivo válido (.xls, .xlsx, .csv)');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

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
      onAnalyzed(result, file);
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
    <div className="w-full max-w-2xl mx-auto">
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
        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-sm ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60'
        } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-300 font-medium text-lg animate-pulse">Analizando archivo de Money Manager...</p>
            <p className="text-slate-500 text-sm">Estamos verificando coherencia e idempotencia</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-6 space-y-4">
            <div className={`p-4 rounded-full bg-slate-800 text-indigo-400 transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-200 font-semibold text-lg">
                Arrastra tu archivo exportado de Money Manager
              </p>
              <p className="text-slate-400 mt-1">
                o haz clic para buscar en tu dispositivo (.xls, .xlsx, .csv)
              </p>
            </div>
            <div className="text-xs text-slate-500 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-800">
              Compatible con exportaciones multimoneda y seriales de Excel
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
