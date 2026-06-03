'use client';

import React from 'react';

interface TableSkeletonProps {
  rowsCount?: number;
}

export default function TableSkeleton({ rowsCount = 5 }: TableSkeletonProps) {
  const list = Array.from({ length: rowsCount });

  return (
    <div className="w-full space-y-4">
      {/* Vista de Escritorio (Tabla Simulada con animate-pulse) */}
      <div className="hidden md:block overflow-hidden rounded-3xl border border-slate-900 bg-slate-950/20 backdrop-blur-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/40 border-b border-slate-900">
              <th className="px-6 py-4"><div className="h-3 bg-slate-800/60 rounded w-10 animate-pulse"></div></th>
              <th className="px-6 py-4"><div className="h-3 bg-slate-800/60 rounded w-28 animate-pulse"></div></th>
              <th className="px-6 py-4"><div className="h-3 bg-slate-800/60 rounded w-20 animate-pulse"></div></th>
              <th className="px-6 py-4"><div className="h-3 bg-slate-800/60 rounded w-24 animate-pulse"></div></th>
              <th className="px-6 py-4"><div className="h-3 bg-slate-800/60 rounded w-32 animate-pulse"></div></th>
              <th className="px-6 py-4 text-right"><div className="h-3 bg-slate-800/60 rounded w-16 ml-auto animate-pulse"></div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-sm">
            {list.map((_, idx) => (
              <tr key={idx} className="hover:bg-slate-900/10">
                {/* Hora */}
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="h-3 bg-slate-800/50 rounded w-10 animate-pulse"></div>
                </td>
                {/* Cuenta / Categoría */}
                <td className="px-6 py-5 whitespace-nowrap space-y-2">
                  <div className="h-3.5 bg-slate-800/60 rounded w-24 animate-pulse"></div>
                  <div className="h-3 bg-slate-900/60 rounded w-32 animate-pulse"></div>
                </td>
                {/* Importe */}
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="h-3.5 bg-slate-800/60 rounded w-16 animate-pulse"></div>
                </td>
                {/* Equivalente USD */}
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="h-3.5 bg-slate-800/60 rounded w-14 animate-pulse"></div>
                </td>
                {/* Nota / Descripción */}
                <td className="px-6 py-5 whitespace-nowrap space-y-1.5">
                  <div className="h-3 bg-slate-800/50 rounded w-40 animate-pulse"></div>
                </td>
                {/* Acciones */}
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <div className="w-7 h-7 bg-slate-900/80 border border-slate-850 rounded-lg animate-pulse"></div>
                    <div className="w-7 h-7 bg-slate-900/80 border border-slate-850 rounded-lg animate-pulse"></div>
                    <div className="w-7 h-7 bg-slate-900/80 border border-slate-850 rounded-lg animate-pulse"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Móvil (Tarjetas Simuladas con animate-pulse) */}
      <div className="md:hidden space-y-3 p-1">
        {list.map((_, idx) => (
          <div
            key={idx}
            className="bg-slate-900/15 border border-slate-900/50 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse"
          >
            <div className="flex-1 space-y-2.5">
              {/* Línea Superior (Cuenta y Categoría) */}
              <div className="flex items-center gap-2">
                <div className="h-3.5 bg-slate-800/60 rounded w-20"></div>
                <span className="text-slate-800/50 text-[10px]">•</span>
                <div className="h-3 bg-slate-900/60 rounded w-28"></div>
              </div>
              {/* Línea Inferior (Hora y Nota) */}
              <div className="flex items-center gap-2">
                <div className="h-3 bg-slate-900/60 rounded w-10"></div>
                <span className="text-slate-800/50">•</span>
                <div className="h-3 bg-slate-900/60 rounded w-20"></div>
              </div>
            </div>
            {/* Importe */}
            <div className="text-right space-y-1.5 shrink-0">
              <div className="h-3.5 bg-slate-800/60 rounded w-14 ml-auto"></div>
              <div className="h-2.5 bg-slate-900/60 rounded w-8 ml-auto"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
