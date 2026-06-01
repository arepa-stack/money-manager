'use client';

import React from 'react';
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
  groupByDate = false,
}: TransactionTableProps) {
  const activeColumnsCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalColumnsCount = activeColumnsCount + (onEditTransaction ? 1 : 0);

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

  const renderRow = (t: Transaction) => (
    <tr key={t.id} className="group hover:bg-slate-900/15 transition-colors">
      {visibleColumns.time && (
        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-medium">
          {new Date(t.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </td>
      )}
      {visibleColumns.account && (
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="font-semibold text-slate-200">{t.account.name}</div>
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
      {onEditTransaction && (
        <td className="px-6 py-4 whitespace-nowrap text-right sticky right-0 bg-slate-950 group-hover:bg-slate-900/90 transition-colors z-10 border-l border-slate-850/80 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.5)]">
          <button
            onClick={() => onEditTransaction(t)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-indigo-400 hover:border-slate-700 cursor-pointer transition-all inline-flex items-center"
            title="Editar transacción"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
          </button>
        </td>
      )}
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-900">
            {visibleColumns.time && <th className="px-6 py-4">Hora</th>}
            {visibleColumns.account && <th className="px-6 py-4">Cuenta / Categoría</th>}
            {visibleColumns.amount && <th className="px-6 py-4">Importe Original</th>}
            {visibleColumns.usdAmount && <th className="px-6 py-4">Equivalente base (USD)</th>}
            {visibleColumns.note && <th className="px-6 py-4">Nota / Descripción</th>}
            {onEditTransaction && (
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
  );
}
