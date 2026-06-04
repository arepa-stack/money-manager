'use client';

import React, { useState } from 'react';
import { formatCents } from '@/lib/moneyUtils';

interface Transaction {
  id: string;
  transactionDate: string;
  amount: number;
  currency: string;
  baseAmountUsd: number;
  transactionType: string;
  note: string | null;
  description: string | null;
  accountId: string;
  categoryId: string;
  subcategoryId: string | null;
  destinationAccountId: string | null;
  account: { name: string };
  category: { name: string };
  subcategory: { name: string } | null;
  destinationAccount: { name: string } | null;
  isOpeningBalance?: boolean;
  excludeFromTotals?: boolean;
}

interface TransactionTableProps {
  transactions: Transaction[];
  visibleColumns: {
    time: boolean;
    account: boolean;
    category?: boolean;
    amount: boolean;
    usdAmount: boolean;
    note: boolean;
  };
  onEditTransaction?: (tx: Transaction) => void;
  onDuplicateTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (tx: Transaction) => void;
  groupByDate?: boolean;
}

const getLocalDateString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function TransactionTable({
  transactions,
  visibleColumns,
  onEditTransaction,
  onDuplicateTransaction,
  onDeleteTransaction,
  groupByDate = false,
}: TransactionTableProps) {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const activeColumnsCount = Object.values(visibleColumns).filter(Boolean).length;
  const hasActions = !!(onEditTransaction || onDuplicateTransaction || onDeleteTransaction);
  const totalColumnsCount = activeColumnsCount + (hasActions ? 1 : 0);

  // Group transactions by local date key (YYYY-MM-DD) if grouping is enabled
  const renderRows = () => {
    if (!groupByDate) {
      // Just render a simple flat list of rows
      return transactions.map((t) => renderRow(t));
    }

    // Grouping logic
    const grouped: { [key: string]: Transaction[] } = {};
    transactions.forEach((t) => {
      const date = new Date(t.transactionDate);
      const key = getLocalDateString(date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((dateKey) => {
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const formattedDate = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

      return (
        <React.Fragment key={dateKey}>
          {/* Day Header Group row */}
          <tr className="bg-slate-900/35 border-b border-slate-900 select-none">
            <td colSpan={totalColumnsCount} className="px-6 py-3.5">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-slate-200 tracking-tight text-sm">
                  {formattedDate}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full">
                  {capitalizedWeekday}
                </span>
              </div>
            </td>
          </tr>

          {/* Child rows */}
          {grouped[dateKey].map((t) => renderRow(t))}
        </React.Fragment>
      );
    });
  };

  const renderRow = (t: Transaction) => {
    const isExcluded = !!t.excludeFromTotals;
    return (
      <tr key={t.id} className={`group hover:bg-slate-900/15 transition-colors ${isExcluded ? 'opacity-45' : ''}`}>
        {visibleColumns.time && (
          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-medium">
            {new Date(t.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </td>
        )}
        {visibleColumns.account && (
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-200">{t.account.name}</span>
              {isExcluded && (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-700/50">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2 h-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Excluida
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {t.transactionType === 'TRANSFER' && t.destinationAccount
                ? `Transferencia (→ ${t.destinationAccount.name})`
                : t.category.name}
              {t.subcategory && (
                <span className="text-slate-500 font-medium"> › {t.subcategory.name}</span>
              )}
            </div>
          </td>
        )}
        {visibleColumns.amount && (
          <td className="px-6 py-4 whitespace-nowrap">
            <span className={`font-semibold ${
              t.transactionType === 'INCOME' ? 'text-emerald-400' : t.transactionType === 'TRANSFER' ? 'text-indigo-400' : 'text-slate-100'
            }`}>
              {t.transactionType === 'EXPENSE' ? '-' : t.transactionType === 'INCOME' ? '+' : ''}
              {formatCents(t.amount)}
            </span>
            <span className="text-xs text-slate-500 ml-1">{t.currency}</span>
            {t.currency.toUpperCase() !== 'USD' && t.baseAmountUsd > 0 && (
              <div className="text-[10px] text-slate-500 block mt-0.5 font-medium" title="Tasa de cambio implícita de registro">
                {t.currency.toUpperCase() === 'EUR'
                  ? `Tasa: ${(t.baseAmountUsd / t.amount).toFixed(4)} $/€`
                  : `Tasa: ${(t.amount / t.baseAmountUsd).toFixed(2)} ${t.currency.toUpperCase()}/$`}
              </div>
            )}
          </td>
        )}
        {visibleColumns.usdAmount && (
          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-200">
            ${formatCents(t.baseAmountUsd)}
          </td>
        )}
        {visibleColumns.note && (
          <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={t.note || t.description || ''}>
            <span>{t.note || '-'}</span>
            {t.description && (
              <span className="text-xs text-slate-500 block italic">{t.description}</span>
            )}
          </td>
        )}
        {hasActions && (
          <td className="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-slate-950 group-hover:bg-slate-900/90 transition-colors z-10 border-l border-slate-850/80 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.5)]">
            {isExcluded ? (
              // Cuenta eliminada: solo icono de candado, sin acciones
              <div className="flex items-center justify-end">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-slate-700">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2">
                {onDuplicateTransaction && (
                  <button
                    onClick={() => onDuplicateTransaction(t)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-emerald-450 hover:text-emerald-405 hover:text-emerald-400 hover:border-slate-700 cursor-pointer transition-all inline-flex items-center"
                    title="Duplicar transacción"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-8.25M8.25 16.5H18" />
                    </svg>
                  </button>
                )}
                {onEditTransaction && (
                  <button
                    onClick={() => onEditTransaction(t)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-indigo-400 hover:border-slate-700 cursor-pointer transition-all inline-flex items-center"
                    title="Editar transacción"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                )}
                {onDeleteTransaction && (
                  <button
                    onClick={() => onDeleteTransaction(t)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-rose-400 hover:border-slate-700 cursor-pointer transition-all inline-flex items-center"
                    title="Eliminar transacción"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </td>
        )}
      </tr>
    );
  };

  const renderMobileCard = (t: Transaction) => {
    const isExpanded = expandedTxId === t.id;
    const isExcluded = !!t.excludeFromTotals;
    return (
      <div 
        key={t.id} 
        onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
        className={`border border-slate-900/50 p-4 rounded-2xl flex flex-col gap-3 hover:bg-slate-900/35 transition-colors cursor-pointer select-none ${
          isExcluded ? 'bg-slate-950/30 opacity-50' : 'bg-slate-900/15'
        }`}
      >
        {/* Cabecera de la tarjeta: Siempre visible */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-1">
            {/* Superior: Cuenta y Categoría */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-200 text-sm">{t.account.name}</span>
              {isExcluded && (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-700/50">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2 h-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  Excluida
                </span>
              )}
              <span className="text-slate-600 text-[10px]">•</span>
              <span className="text-slate-400 text-xs truncate">
                {t.transactionType === 'TRANSFER' && t.destinationAccount
                  ? `Transferencia (→ ${t.destinationAccount.name})`
                  : t.category.name}
                {t.subcategory && ` › ${t.subcategory.name}`}
              </span>
            </div>

            {/* Inferior: Hora y Nota */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{new Date(t.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {t.note && (
                <>
                  <span className="text-slate-700">•</span>
                  <span className="truncate max-w-[150px] italic" title={t.note}>{t.note}</span>
                </>
              )}
            </div>
          </div>

          {/* Importe y Chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right">
              <span className={`font-bold text-sm ${
                t.transactionType === 'INCOME' ? 'text-emerald-400' : t.transactionType === 'TRANSFER' ? 'text-indigo-400' : 'text-slate-200'
              }`}>
                {t.transactionType === 'EXPENSE' ? '-' : t.transactionType === 'INCOME' ? '+' : ''}
                {formatCents(t.amount)}
              </span>
              <span className="text-[10px] text-slate-500 block">{t.currency}</span>
            </div>
            
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2.5} 
              stroke="currentColor" 
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>

        {/* Sección Expandible: Detalles adicionales y Acciones */}
        {isExpanded && (
          <div 
            className="border-t border-slate-900/60 pt-3.5 mt-1.5 space-y-4 animate-fade-in"
            onClick={(e) => e.stopPropagation() /* Evitar colapsar al hacer clic en las acciones */}
          >
            {/* Detalles de la transacción */}
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
              <div>
                <span className="text-slate-500 block font-semibold">Equivalente USD</span>
                <span className="text-slate-350 font-bold">${formatCents(t.baseAmountUsd)} USD</span>
              </div>
              {t.currency.toUpperCase() !== 'USD' && t.baseAmountUsd > 0 && (
                <div>
                  <span className="text-slate-500 block font-semibold">Tasa de Cambio</span>
                  <span className="text-slate-350 font-bold">
                    {t.currency.toUpperCase() === 'EUR'
                      ? `${(t.baseAmountUsd / t.amount).toFixed(4)} $/€`
                      : `${(t.amount / t.baseAmountUsd).toFixed(2)} ${t.currency.toUpperCase()}/$`}
                  </span>
                </div>
              )}
              {t.description && (
                <div className="col-span-2">
                  <span className="text-slate-500 block font-semibold">Descripción</span>
                  <p className="text-slate-350 italic mt-0.5 whitespace-pre-wrap">{t.description}</p>
                </div>
              )}
            </div>

            {/* Barra de Acciones Móviles */}
            {hasActions && !isExcluded && (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {onDuplicateTransaction && (
                  <button
                    onClick={() => onDuplicateTransaction(t)}
                    className="flex-1 min-w-[90px] py-2 px-3 rounded-xl bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-emerald-400 active:scale-98 transition-all font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-8.25M8.25 16.5H18" />
                    </svg>
                    Duplicar
                  </button>
                )}
                {onEditTransaction && (
                  <button
                    onClick={() => onEditTransaction(t)}
                    className="flex-1 min-w-[90px] py-2 px-3 rounded-xl bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-indigo-400 active:scale-98 transition-all font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                    Editar
                  </button>
                )}
                {onDeleteTransaction && (
                  <button
                    onClick={() => onDeleteTransaction(t)}
                    className="flex-1 min-w-[90px] py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 hover:border-rose-500/40 active:scale-98 transition-all font-semibold flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMobileList = () => {
    if (!groupByDate) {
      return (
        <div className="space-y-2">
          {transactions.map((t) => renderMobileCard(t))}
        </div>
      );
    }

    // Grouping logic for mobile
    const grouped: { [key: string]: Transaction[] } = {};
    transactions.forEach((t) => {
      const date = new Date(t.transactionDate);
      const key = getLocalDateString(date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
      <div className="space-y-6">
        {sortedKeys.map((dateKey) => {
          const [year, month, day] = dateKey.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          const formattedDate = date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
          const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

          return (
            <div key={dateKey} className="space-y-2">
              {/* Encabezado del día móvil */}
              <div className="flex items-center gap-2 px-1 py-1">
                <span className="font-extrabold text-slate-350 text-xs">{formattedDate}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md">
                  {capitalizedWeekday}
                </span>
              </div>

              {/* Tarjetas del día */}
              <div className="space-y-2">
                {grouped[dateKey].map((t) => renderMobileCard(t))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Vista de Escritorio / Tableta */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-900">
              {visibleColumns.time && <th className="px-6 py-4">Hora</th>}
              {visibleColumns.account && <th className="px-6 py-4">Cuenta / Categoría</th>}
              {visibleColumns.amount && <th className="px-6 py-4">Importe Original</th>}
              {visibleColumns.usdAmount && <th className="px-6 py-4">Equivalente base (USD)</th>}
              {visibleColumns.note && <th className="px-6 py-4">Nota / Descripción</th>}
              {hasActions && (
                <th className="px-6 py-4 text-right sticky right-0 bg-slate-900 border-l border-slate-850/80 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.5)] z-20">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 text-sm text-slate-300">
            {renderRows()}
          </tbody>
        </table>
      </div>

      {/* Vista Móvil */}
      <div className="md:hidden p-1 space-y-4">
        {renderMobileList()}
      </div>
    </>
  );
}
