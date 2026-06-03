'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ColumnSelectorProps {
  visibleColumns: {
    time: boolean;
    account: boolean;
    category: boolean;
    amount: boolean;
    usdAmount: boolean;
    note: boolean;
  };
  onToggleColumn: (col: 'time' | 'account' | 'category' | 'amount' | 'usdAmount' | 'note') => void;
}

export default function ColumnSelector({ visibleColumns, onToggleColumn }: ColumnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const columnLabels = {
    time: 'Hora',
    account: 'Cuenta / Categoría',
    amount: 'Importe Original',
    usdAmount: 'Importe USD',
    note: 'Nota / Descripción',
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer h-[34px]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-3.5 h-3.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 4.5v15m6-15v15m-9-15h12A2.25 2.25 0 0121 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 17.25V6.75A2.25 2.25 0 014.5 4.5z"
          />
        </svg>
        Columnas
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-slate-950 border border-slate-850 p-3 rounded-xl shadow-2xl z-55 w-48 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-900 mb-1">
            Mostrar Columnas
          </p>
          {(Object.keys(columnLabels) as Array<keyof typeof columnLabels>).map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-slate-100 cursor-pointer select-none py-1 hover:bg-slate-900/30 px-1 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={visibleColumns[key]}
                onChange={() => onToggleColumn(key)}
                className="rounded border-slate-800 bg-slate-950 text-indigo-650 focus:ring-indigo-650 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
              />
              {columnLabels[key]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
