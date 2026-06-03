import React from 'react';
import ColumnSelector from '@/ui/molecules/ColumnSelector';

interface TransactionActionsProps {
  viewMode: 'list' | 'calendar';
  setViewMode: (mode: 'list' | 'calendar') => void;
  onNewTransaction: () => void;
  onRefresh: () => void;
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

export default function TransactionActions({
  viewMode,
  setViewMode,
  onNewTransaction,
  onRefresh,
  visibleColumns,
  onToggleColumn,
}: TransactionActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
      {/* Toggle Vista */}
      <div className="bg-slate-950 border border-slate-850 p-1 rounded-xl flex items-center gap-1">
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
            viewMode === 'list'
              ? 'bg-indigo-650 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Lista
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
            viewMode === 'calendar'
              ? 'bg-indigo-650 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Calendario
        </button>
      </div>

      <button
        onClick={onNewTransaction}
        className="text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer h-[34px] shadow-sm shadow-indigo-600/10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          className="w-3.5 h-3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nueva Transacción
      </button>

      <button
        onClick={onRefresh}
        className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer h-[34px]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-3.5 h-3.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        Refrescar
      </button>

      {/* Dropdown Selección Columnas */}
      <ColumnSelector visibleColumns={visibleColumns} onToggleColumn={onToggleColumn} />
    </div>
  );
}
