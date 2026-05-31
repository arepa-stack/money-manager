'use client';

import React, { useState } from 'react';
import { ImportAnalysisResult, ImportExecuteResult } from '@/lib/domain/types';

interface ImportPreviewProps {
  analysis: ImportAnalysisResult;
  file: File;
  onCancel: () => void;
  onSuccess: (result: ImportExecuteResult) => void;
  onError: (msg: string) => void;
}

export default function ImportPreview({ analysis, file, onCancel, onSuccess, onError }: ImportPreviewProps) {
  const [isCommitting, setIsCommitting] = useState(false);

  const handleConfirm = async () => {
    setIsCommitting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al persistir la importación');
      }

      const result: ImportExecuteResult = await res.json();
      onSuccess(result);
    } catch (err: any) {
      onError(err.message || 'Error guardando transacciones.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Resumen Superior */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <p className="text-sm font-medium text-slate-400">Total Filas</p>
          <p className="text-3xl font-bold text-slate-100 mt-2">{analysis.totalRows}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <p className="text-sm font-medium text-emerald-400">Nuevas Transacciones</p>
          <p className="text-3xl font-bold text-emerald-300 mt-2">{analysis.totalParsed}</p>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <p className="text-sm font-medium text-amber-400">Duplicadas (Omitidas)</p>
          <p className="text-3xl font-bold text-amber-300 mt-2">{analysis.totalSkippedDuplicates}</p>
        </div>
        <div className="bg-indigo-950/40 border border-indigo-900/40 p-5 rounded-2xl flex flex-col justify-between">
          <p className="text-sm font-medium text-indigo-400">Archivo Cargado</p>
          <p className="text-sm font-semibold text-indigo-200 mt-2 truncate" title={file.name}>
            {file.name}
          </p>
        </div>
      </div>

      {/* Cambios en Entidades */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-md font-semibold text-slate-200 border-b border-slate-850 pb-2">
          Entidades Nuevas a Crear Dinámicamente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cuentas */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cuentas ({analysis.newAccounts.length})</span>
            {analysis.newAccounts.length === 0 ? (
              <p className="text-sm text-slate-500 mt-1 italic">Ninguna cuenta nueva</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {analysis.newAccounts.map(acc => (
                  <span key={acc} className="text-xs bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-full">
                    {acc}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Categorías */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Categorías ({analysis.newCategories.length})</span>
            {analysis.newCategories.length === 0 ? (
              <p className="text-sm text-slate-500 mt-1 italic">Ninguna categoría nueva</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {analysis.newCategories.map(cat => (
                  <span key={cat.name} className="text-xs bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                    {cat.name}
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      cat.type === 'INCOME' ? 'bg-emerald-400' : cat.type === 'TRANSFER' ? 'bg-indigo-400' : 'bg-rose-400'
                    }`}></span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Subcategorías */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Subcategorías ({analysis.newSubcategories.length})</span>
            {analysis.newSubcategories.length === 0 ? (
              <p className="text-sm text-slate-500 mt-1 italic">Ninguna subcategoría nueva</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {analysis.newSubcategories.map(sub => (
                  <span key={`${sub.categoryName}_${sub.name}`} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full">
                    <span className="text-slate-500">{sub.categoryName} &gt; </span>{sub.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Preview */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
          <h3 className="text-md font-semibold text-slate-200">Previsualización de Transacciones (Primeras 10)</h3>
          <span className="text-xs text-slate-500">Mostrando registros del archivo</span>
        </div>
        <div className="overflow-x-auto max-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/20 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Cuenta</th>
                <th className="px-6 py-3">Categoría / Sub</th>
                <th className="px-6 py-3">Importe</th>
                <th className="px-6 py-3">Moneda Base (USD)</th>
                <th className="px-6 py-3">Nota</th>
                <th className="px-6 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
              {analysis.previewTransactions.slice(0, 10).map((t, idx) => (
                <tr key={idx} className={`${t.isDuplicate ? 'opacity-50 bg-slate-950/20' : 'hover:bg-slate-800/10'}`}>
                  <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-400">
                    {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-3 font-medium whitespace-nowrap text-slate-200">{t.accountName}</td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className="text-slate-200">{t.categoryName}</span>
                    {t.subcategoryName && (
                      <span className="text-slate-400 text-xs block">&gt; {t.subcategoryName}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`font-semibold ${
                      t.type === 'INCOME' ? 'text-emerald-400' : t.type === 'TRANSFER' ? 'text-indigo-400' : 'text-slate-200'
                    }`}>
                      {t.type === 'EXPENSE' ? '-' : t.type === 'INCOME' ? '+' : ''}
                      {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{t.currency}</span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-slate-300">
                    ${t.baseAmountUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3 max-w-[200px] truncate text-slate-400" title={t.note || ''}>
                    {t.note || '-'}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-center">
                    {t.isDuplicate ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Duplicado (Omitir)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Nuevo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={onCancel}
          disabled={isCommitting}
          className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium cursor-pointer disabled:opacity-50"
        >
          Cancelar y Volver
        </button>

        <button
          onClick={handleConfirm}
          disabled={isCommitting}
          className="px-8 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
        >
          {isCommitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Importando transacciones...
            </>
          ) : (
            <>
              Confirmar Importación ({analysis.totalParsed})
            </>
          )}
        </button>
      </div>
    </div>
  );
}
