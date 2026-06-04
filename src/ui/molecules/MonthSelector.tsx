'use client';

import React from 'react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface MonthSelectorProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
}

export default function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const formatYearMonth = (yearMonthStr: string): string => {
    const [yearStr, monthStr] = yearMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return yearMonthStr;
    return `${MONTH_NAMES[monthIdx]} ${year}`;
  };

  const handlePrev = () => {
    const [yearStr, monthStr] = value.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    onChange(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNext = () => {
    const [yearStr, monthStr] = value.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    onChange(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleGoToCurrentMonth = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    onChange(`${yyyy}-${mm}`);
  };

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Botón Ir al mes actual */}
      <button
        onClick={handleGoToCurrentMonth}
        className="px-3 py-1.5 text-xs font-semibold bg-slate-900/50 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 rounded-lg cursor-pointer transition-all shadow-sm"
        title="Volver al mes actual"
      >
        Hoy
      </button>

      <div className="flex items-center bg-slate-900/40 border border-slate-900 rounded-lg p-0.5 shadow-sm">
        {/* Flecha Anterior */}
        <button
          onClick={handlePrev}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors cursor-pointer"
          aria-label="Mes anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Mes / Año */}
        <span className="px-4 text-sm font-semibold text-slate-200 min-w-[120px] text-center">
          {formatYearMonth(value)}
        </span>

        {/* Flecha Siguiente */}
        <button
          onClick={handleNext}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-md transition-colors cursor-pointer"
          aria-label="Mes siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
