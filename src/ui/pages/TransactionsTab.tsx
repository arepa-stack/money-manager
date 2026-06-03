import React from 'react';
import TransactionFilters from '@/ui/molecules/TransactionFilters';
import TransactionActions from '@/ui/molecules/TransactionActions';
import StatCard from '@/ui/atoms/StatCard';
import CategoryDistribution from '@/ui/molecules/CategoryDistribution';
import CalendarView from '@/ui/organisms/CalendarView';
import TransactionTable from '@/ui/organisms/TransactionTable';
import LoadingSpinner from '@/ui/atoms/LoadingSpinner';
import EmptyState from '@/ui/atoms/EmptyState';
import { formatCents } from '@/lib/moneyUtils';
import { getLocalDateString } from '@/lib/dateUtils';

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

interface TransactionsTabProps {
  // Data
  transactions: Transaction[];
  accounts: { id: string; name: string; currency: string; type: string }[];
  allCategories: { id: string; name: string; type: string }[];
  availableNotes: string[];
  isLoadingTxs: boolean;

  // Filter States & Setters
  selectedAccountId: string;
  setSelectedAccountId: (value: string) => void;
  selectedCategoryId: string;
  setSelectedCategoryId: (value: string) => void;
  selectedTransactionType: string;
  setSelectedTransactionType: (value: string) => void;
  startDate: string;
  endDate: string;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  handleClearFilters: () => void;

  // Action States & Setters
  viewMode: 'list' | 'calendar';
  setViewMode: (mode: 'list' | 'calendar') => void;
  showAnalytics: boolean;
  setShowAnalytics: (value: boolean) => void;
  visibleColumns: {
    time: boolean;
    account: boolean;
    category: boolean;
    amount: boolean;
    usdAmount: boolean;
    note: boolean;
  };
  onToggleColumn: (col: 'time' | 'account' | 'category' | 'amount' | 'usdAmount' | 'note') => void;

  // Handlers
  onNewTransaction: () => void;
  onRefresh: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDuplicateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;

  // Stats
  totalBalanceUsd: number;
  totalIncomeUsd: number;
  totalExpenseUsd: number;
}

export default function TransactionsTab({
  transactions,
  accounts,
  allCategories,
  availableNotes,
  isLoadingTxs,
  selectedAccountId,
  setSelectedAccountId,
  selectedCategoryId,
  setSelectedCategoryId,
  selectedTransactionType,
  setSelectedTransactionType,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  searchQuery,
  setSearchQuery,
  handleClearFilters,
  viewMode,
  setViewMode,
  showAnalytics,
  setShowAnalytics,
  visibleColumns,
  onToggleColumn,
  onNewTransaction,
  onRefresh,
  onEditTransaction,
  onDuplicateTransaction,
  onDeleteTransaction,
  totalBalanceUsd,
  totalIncomeUsd,
  totalExpenseUsd,
}: TransactionsTabProps) {

  // Date range preset helper
  const setPreset = (preset: '1w' | '1m' | 'thisMonth' | '1y') => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === '1w') {
      start.setDate(now.getDate() - 7);
    } else if (preset === '1m') {
      start.setDate(now.getDate() - 30);
    } else if (preset === '1y') {
      start.setDate(now.getDate() - 365);
    } else if (preset === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    setStartDate(getLocalDateString(start));
    setEndDate(getLocalDateString(end));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/10 p-4 rounded-2xl border border-slate-900/30">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-200">Búsqueda Avanzada</h2>
          <p className="text-xs text-slate-500">Acciones rápidas y filtros sobre el historial transaccional</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onNewTransaction}
            className="text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-500 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10 h-[34px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Registrar Movimiento
          </button>

          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer h-[34px] ${
              showAnalytics
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'
                : 'bg-slate-800 border-slate-750 text-slate-350 hover:bg-slate-700 hover:text-slate-100'
            }`}
          >
            {showAnalytics ? 'Ocultar Análisis' : 'Mostrar Análisis'}
          </button>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setPreset('1w')}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-850 hover:border-slate-700 text-slate-300 transition-all cursor-pointer"
              title="Última semana"
            >
              1S
            </button>
            <button
              onClick={() => setPreset('thisMonth')}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-850 hover:border-slate-700 text-slate-300 transition-all cursor-pointer"
              title="Este mes"
            >
              Mes
            </button>
            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <TransactionFilters
        selectedAccountId={selectedAccountId}
        setSelectedAccountId={setSelectedAccountId}
        accounts={accounts}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        allCategories={allCategories}
        selectedTransactionType={selectedTransactionType}
        setSelectedTransactionType={setSelectedTransactionType}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        availableNotes={availableNotes}
      />

      {/* Colapsable Stats & Charts */}
      {showAnalytics && transactions.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Stats Panel (Filtered summary) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Balance del Período"
              value={`${totalBalanceUsd >= 0 ? '+' : ''}$${formatCents(totalBalanceUsd)}`}
              subtitle="Sumatoria neta filtrada en USD"
              valueColorClass={totalBalanceUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}
            />
            <StatCard
              title="Ingresos del Período"
              value={`$${formatCents(totalIncomeUsd)}`}
              subtitle="Ingresos en rango"
              titleColorClass="text-emerald-400"
              valueColorClass="text-emerald-300"
            />
            <StatCard
              title="Gastos del Período"
              value={`-$${formatCents(totalExpenseUsd)}`}
              subtitle="Gastos deducidos en rango"
              titleColorClass="text-rose-400"
              valueColorClass="text-rose-300"
            />
          </section>

          {/* Category spending distribution */}
          <CategoryDistribution transactions={transactions} />
        </div>
      )}

      {/* Transactions List Header and Actions */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-200">Resultados del Historial (SQLite)</h2>
          <TransactionActions
            viewMode={viewMode}
            setViewMode={setViewMode}
            onNewTransaction={onNewTransaction}
            onRefresh={onRefresh}
            visibleColumns={visibleColumns}
            onToggleColumn={onToggleColumn}
          />
        </div>

        {isLoadingTxs ? (
          <LoadingSpinner message="Cargando transacciones..." />
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No se encontraron movimientos"
            description="No hay transacciones guardadas en SQLite que coincidan con los filtros seleccionados."
            action={{ label: 'Limpiar Filtros', onClick: handleClearFilters }}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarView
            transactions={transactions}
            startDate={startDate}
            endDate={endDate}
            onEditTransaction={onEditTransaction}
            onDuplicateTransaction={onDuplicateTransaction}
            onDeleteTransaction={onDeleteTransaction}
          />
        ) : (
          <div className="bg-slate-900/20 border border-slate-900 rounded-3xl overflow-hidden backdrop-blur-sm">
            <TransactionTable
              transactions={transactions}
              visibleColumns={visibleColumns}
              onEditTransaction={onEditTransaction}
              onDuplicateTransaction={onDuplicateTransaction}
              onDeleteTransaction={onDeleteTransaction}
              groupByDate={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
