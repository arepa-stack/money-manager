'use client';

import React, { useState } from 'react';
import MonthSelector from '@/ui/molecules/MonthSelector';
import BudgetManager from '@/ui/organisms/BudgetManager';

export default function BudgetsTab() {
  const getInitialMonth = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  const [month, setMonth] = useState(getInitialMonth());

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section con título y selector de mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/20 border border-slate-900/60 p-6 rounded-3xl backdrop-blur-sm shadow-md">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-200">Presupuestos por Categoría</h2>
          <p className="text-xs text-slate-500">
            Establece límites mensuales para tus gastos y monitorea tu progreso.
          </p>
        </div>
        <MonthSelector value={month} onChange={setMonth} />
      </div>

      <BudgetManager month={month} />
    </div>
  );
}
