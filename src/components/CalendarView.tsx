'use client';

import React, { useState, useEffect } from 'react';
import { formatCents } from '@/lib/moneyUtils';
import TransactionTable from './TransactionTable';

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

interface CalendarViewProps {
  transactions: Transaction[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onEditTransaction?: (tx: Transaction) => void;
  onDuplicateTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (tx: Transaction) => void;
}

// Timezone-safe local date YYYY-MM-DD formatter
const getLocalDateString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function CalendarView({ transactions, startDate, endDate, onEditTransaction, onDuplicateTransaction, onDeleteTransaction }: CalendarViewProps) {
  // 1. Parse start and end dates
  const startParts = startDate.split('-').map(Number);
  const endParts = endDate.split('-').map(Number);
  
  const startYear = startParts[0] || new Date().getFullYear();
  const startMonth = (startParts[1] ? startParts[1] - 1 : new Date().getMonth());
  
  const endYear = endParts[0] || new Date().getFullYear();
  const endMonth = (endParts[1] ? endParts[1] - 1 : new Date().getMonth());

  // 2. Generate list of months in range
  const monthsList: { year: number; month: number }[] = [];
  let currYear = startYear;
  let currMonth = startMonth;

  while (
    currYear < endYear || 
    (currYear === endYear && currMonth <= endMonth)
  ) {
    monthsList.push({ year: currYear, month: currMonth });
    currMonth++;
    if (currMonth > 11) {
      currMonth = 0;
      currYear++;
    }
  }

  // Fallback in case of invalid list
  if (monthsList.length === 0) {
    monthsList.push({ year: new Date().getFullYear(), month: new Date().getMonth() });
  }

  // 3. Find initial month index (prefer current month if it's within range)
  const getInitialIndex = () => {
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = today.getMonth();
    
    const index = monthsList.findIndex(m => m.year === tYear && m.month === tMonth);
    return index !== -1 ? index : 0;
  };

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    time: true,
    account: true,
    category: true,
    amount: true,
    usdAmount: true,
    note: true
  });

  // Sync visible columns from localStorage when component mounts or modal opens
  useEffect(() => {
    const saved = localStorage.getItem('money_manager_visible_columns');
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading visible columns in CalendarView:', e);
      }
    }
  }, [selectedDate]);

  // Sync index when range shifts or resets
  useEffect(() => {
    setCurrentIdx(getInitialIndex());
    setSelectedDate(null);
  }, [startDate, endDate]);

  const { year, month } = monthsList[currentIdx] || monthsList[0];

  const getFormattedSelectedDate = () => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const formattedDate = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capitalizedWeekday}, ${formattedDate}`;
  };

  // 4. Group transactions of the entire list by local date string
  const dailyTotals: {
    [key: string]: {
      income: number;
      expense: number;
      transfer: number;
      txCount: number;
    };
  } = {};

  transactions.forEach((t) => {
    const date = new Date(t.transactionDate);
    const dateKey = getLocalDateString(date);
    if (!dailyTotals[dateKey]) {
      dailyTotals[dateKey] = { income: 0, expense: 0, transfer: 0, txCount: 0 };
    }
    
    dailyTotals[dateKey].txCount += 1;
    if (t.transactionType === 'INCOME') {
      dailyTotals[dateKey].income += t.baseAmountUsd;
    } else if (t.transactionType === 'EXPENSE') {
      dailyTotals[dateKey].expense += t.baseAmountUsd;
    } else if (t.transactionType === 'TRANSFER') {
      dailyTotals[dateKey].transfer += t.baseAmountUsd;
    }
  });

  // Calendar Math for the currently selected month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  const formatDateStr = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // Trailing days of previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const d = daysInPrevMonth - i;
    cells.push({
      dateStr: formatDateStr(prevYear, prevMonth, d),
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      dateStr: formatDateStr(year, month, d),
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Leading days of next month to fill the grid (usually 35 or 42 cells)
  const remaining = cells.length <= 35 ? 35 - cells.length : 42 - cells.length;
  const targetCells = cells.length + remaining;
  const finalCellsCount = targetCells < 42 && cells.length > 35 ? 42 : targetCells;
  
  const nextRemaining = finalCellsCount - cells.length;
  for (let d = 1; d <= nextRemaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({
      dateStr: formatDateStr(nextYear, nextMonth, d),
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-900">
        <div>
          <h3 className="text-xl font-bold text-slate-100">
            {monthNames[month]} {year}
          </h3>
          {monthsList.length > 1 && (
            <p className="text-xs text-slate-550 mt-0.5">
              Mes {currentIdx + 1} de {monthsList.length} en el rango filtrado
            </p>
          )}
        </div>
        
        {monthsList.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className={`p-2 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-all cursor-pointer ${
                currentIdx === 0 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              title="Mes anterior en rango"
            >
              <svg xmlns="http://www.w3.org/2050/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setCurrentIdx(prev => Math.min(monthsList.length - 1, prev + 1))}
              disabled={currentIdx === monthsList.length - 1}
              className={`p-2 rounded-xl bg-slate-950 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-all cursor-pointer ${
                currentIdx === monthsList.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
              }`}
              title="Mes siguiente en rango"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 text-center text-[10px] md:text-xs font-bold uppercase tracking-wider text-slate-500">
        <div>Dom</div>
        <div>Lun</div>
        <div>Mar</div>
        <div>Mié</div>
        <div>Jue</div>
        <div>Vie</div>
        <div>Sáb</div>
      </div>

      {/* Grid of Days */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {cells.map((cell) => {
          const totals = dailyTotals[cell.dateStr];
          const isDateInRange = cell.dateStr >= startDate && cell.dateStr <= endDate;
          
          // Formato especial para día de hoy
          const isToday = getLocalDateString(new Date()) === cell.dateStr;

          const hasTransactions = totals && totals.txCount > 0;
          const isInteractive = hasTransactions && isDateInRange;

          return (
            <div
              key={cell.dateStr}
              onClick={isInteractive ? () => setSelectedDate(cell.dateStr) : undefined}
              className={`min-h-[65px] md:min-h-[110px] p-1.5 md:p-2 rounded-xl md:rounded-2xl border flex flex-col justify-between transition-all relative ${
                !cell.isCurrentMonth
                  ? 'bg-slate-950/20 border-slate-950/40 text-slate-600 opacity-40'
                  : 'bg-slate-950/40 border-slate-900 text-slate-300'
              } ${
                isToday ? 'ring-2 ring-indigo-500/50 border-indigo-500/50' : ''
              } ${
                !isDateInRange && cell.isCurrentMonth
                  ? 'opacity-30 border-dashed bg-slate-950/10'
                  : ''
              } ${
                isInteractive
                  ? 'cursor-pointer hover:border-indigo-500/40 hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/5 hover:bg-slate-950/60 active:scale-[0.99]'
                  : ''
              }`}
            >
              {/* Day number */}
              <div className="flex justify-between items-start">
                <span
                  className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${
                    isToday
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : cell.isCurrentMonth
                      ? 'text-slate-400'
                      : 'text-slate-600'
                  }`}
                >
                  {cell.dayNum}
                </span>
                
                {totals && totals.txCount > 0 && isDateInRange && (
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-900 border border-slate-850 px-1 md:px-1.5 py-0.2 rounded-full">
                    {totals.txCount}<span className="hidden sm:inline"> {totals.txCount === 1 ? 'mov' : 'movs'}</span>
                  </span>
                )}
              </div>

              {/* Totals inside cell (Desktop) */}
              <div className="hidden md:block space-y-1 mt-2 text-[10px] font-semibold">
                {isDateInRange && totals ? (
                  <>
                    {totals.income > 0 && (
                      <div className="flex items-center justify-between text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded-lg border border-emerald-500/10">
                        <span>Ingreso</span>
                        <span>+${formatCents(totals.income)}</span>
                      </div>
                    )}
                    {totals.expense > 0 && (
                      <div className="flex items-center justify-between text-rose-400 bg-rose-500/5 px-1.5 py-0.5 rounded-lg border border-rose-500/10">
                        <span>Gasto</span>
                        <span>-${formatCents(totals.expense)}</span>
                      </div>
                    )}
                    {totals.transfer > 0 && (
                      <div className="flex items-center justify-between text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded-lg border border-indigo-500/10">
                        <span>Transf</span>
                        <span>↔ ${formatCents(totals.transfer)}</span>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Totals inside cell (Mobile Dots) */}
              <div className="md:hidden flex gap-1 justify-center mt-1.5">
                {isDateInRange && totals ? (
                  <>
                    {totals.income > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`Ingreso: +$${formatCents(totals.income)}`} />
                    )}
                    {totals.expense > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title={`Gasto: -$${formatCents(totals.expense)}`} />
                    )}
                    {totals.transfer > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title={`Transferencia: ↔ $${formatCents(totals.transfer)}`} />
                    )}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalle Diario */}
      {selectedDate && (
        <div 
          className="fixed inset-0 bg-slate-955/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedDate(null)}
        >
          <div 
            className="bg-slate-950 border border-slate-850 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-900">
              <div>
                <h4 className="text-lg font-bold text-slate-100">Detalle de Movimientos</h4>
                <p className="text-xs text-indigo-400 font-semibold mt-0.5">{getFormattedSelectedDate()}</p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 cursor-pointer transition-all"
                title="Cerrar modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const dayTxs = transactions.filter(t => {
                  const date = new Date(t.transactionDate);
                  return getLocalDateString(date) === selectedDate;
                });

                if (dayTxs.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500">
                      No hay transacciones registradas para este día.
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-900 rounded-2xl overflow-hidden bg-slate-900/10">
                    <TransactionTable
                      transactions={dayTxs}
                      visibleColumns={visibleColumns}
                      onEditTransaction={onEditTransaction}
                      onDuplicateTransaction={onDuplicateTransaction}
                      onDeleteTransaction={onDeleteTransaction}
                      groupByDate={false}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t border-slate-900 flex justify-end">
              <button
                onClick={() => setSelectedDate(null)}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-850 text-slate-300 hover:text-slate-100 hover:bg-slate-850 cursor-pointer transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
