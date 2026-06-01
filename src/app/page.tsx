'use client';

import React, { useState, useEffect, useRef } from 'react';
import ImportWidget from '@/components/ImportWidget';
import ImportPreview from '@/components/ImportPreview';
import AccountBalances from '@/components/AccountBalances';
import DateRangePicker from '@/components/DateRangePicker';
import CategoryManager from '@/components/CategoryManager';
import { ImportAnalysisResult, ImportExecuteResult } from '@/lib/domain/types';
import { formatCents } from '@/lib/moneyUtils';
import CalendarView from '@/components/CalendarView';
import EditTransactionModal from '@/components/EditTransactionModal';
import TransactionTable from '@/components/TransactionTable';
import BcvRates from '@/components/BcvRates';
import CategoryDistribution from '@/components/CategoryDistribution';

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

// Timezone-safe local date YYYY-MM-DD formatter
const getLocalDateString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function Dashboard() {
  const [currentTab, setCurrentTab] = useState<'import' | 'transactions' | 'balances' | 'categories' | 'bcv'>('import');
  const [importState, setImportState] = useState<'upload' | 'preview' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImportAnalysisResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ImportExecuteResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [hasLoadedDefaultTab, setHasLoadedDefaultTab] = useState(false);
  const [isResolvingDefaultTab, setIsResolvingDefaultTab] = useState(true);
  
  // Filtering states
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [availableNotes, setAvailableNotes] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isLoadingTxs, setIsLoadingTxs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [adjustedAccounts, setAdjustedAccounts] = useState<Record<string, boolean>>({});
  const [adjustingAccountId, setAdjustingAccountId] = useState<string | null>(null);
  const [adjustmentValues, setAdjustmentValues] = useState<Record<string, string>>({});

  const [visibleColumns, setVisibleColumns] = useState({
    time: true,
    account: true,
    category: true,
    amount: true,
    usdAmount: true,
    note: true
  });
  const [isColDropdownOpen, setIsColDropdownOpen] = useState(false);
  const colDropdownRef = useRef<HTMLDivElement>(null);

  // Load columns preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('money_manager_visible_columns');
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading visible columns:', e);
      }
    }
  }, []);

  // Click outside listener for column selector dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target as Node)) {
        setIsColDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (col: keyof typeof visibleColumns) => {
    const updated = { ...visibleColumns, [col]: !visibleColumns[col] };
    setVisibleColumns(updated);
    localStorage.setItem('money_manager_visible_columns', JSON.stringify(updated));
  };


  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initialize dates to current month, load accounts
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(getLocalDateString(firstDay));
    setEndDate(getLocalDateString(lastDay));
    
    fetchAccountsList();
    fetchAvailableNotes();
  }, []);

  // Initialize adjustment values for all accounts
  useEffect(() => {
    if (executeResult?.accountBalances) {
      const initials: Record<string, string> = {};
      executeResult.accountBalances.forEach((acc) => {
        initials[acc.accountId] = '0.00';
      });
      setAdjustmentValues(initials);
    }
  }, [executeResult]);

  const fetchAccountsList = async () => {
    try {
      const res = await fetch('/api/accounts/balances');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.map((a: any) => ({ id: a.accountId, name: a.accountName })));
        
        // Auto-switch default active tab on initial mount
        setHasLoadedDefaultTab((loaded) => {
          if (!loaded) {
            if (data.length > 0) {
              setCurrentTab('transactions');
            } else {
              setCurrentTab('import');
            }
          }
          return true;
        });
        setIsResolvingDefaultTab(false);
      } else {
        setIsResolvingDefaultTab(false);
      }
    } catch (err) {
      console.error('Error al cargar cuentas:', err);
      setIsResolvingDefaultTab(false);
    }
  };

  const fetchAvailableNotes = async () => {
    try {
      const res = await fetch('/api/transactions/notes');
      if (res.ok) {
        const data = await res.json();
        setAvailableNotes(data);
      }
    } catch (err) {
      console.error('Error al cargar notas para autocompletado:', err);
    }
  };

  const fetchTransactions = async () => {
    if (!startDate || !endDate) return;
    setIsLoadingTxs(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId) params.append('accountId', selectedAccountId);
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('timezoneOffset', new Date().getTimezoneOffset().toString());
      if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error('Error al cargar transacciones:', err);
    } finally {
      setIsLoadingTxs(false);
    }
  };

  // Re-fetch transactions on filter changes
  useEffect(() => {
    fetchTransactions();
  }, [selectedAccountId, startDate, endDate, debouncedSearchQuery]);

  const handleAnalyzed = (result: ImportAnalysisResult, uploadedFile: File) => {
    setAnalysisResult(result);
    setFile(uploadedFile);
    setImportState('preview');
    setError(null);
  };

  const handleSuccess = (result: ImportExecuteResult) => {
    setExecuteResult(result);
    setImportState('success');
    fetchTransactions();
    fetchAccountsList();
    fetchAvailableNotes();
    setError(null);
  };

  const handleCancel = () => {
    setImportState('upload');
    setFile(null);
    setAnalysisResult(null);
    setError(null);
  };

  const handleReset = () => {
    setImportState('upload');
    setFile(null);
    setAnalysisResult(null);
    setExecuteResult(null);
    setError(null);
    setAdjustedAccounts({});
  };

  const handleApplyAdjustment = async (accountId: string, targetBalance: number) => {
    setAdjustingAccountId(accountId);
    setError(null);
    try {
      const res = await fetch('/api/accounts/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, targetBalance, clientDate: new Date().toISOString() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al aplicar el ajuste.');
      }
      setAdjustedAccounts(prev => ({ ...prev, [accountId]: true }));
      // Refrescar transacciones y cuentas
      fetchTransactions();
      fetchAccountsList();
    } catch (err: any) {
      setError(err.message || 'Error de red al aplicar el ajuste.');
    } finally {
      setAdjustingAccountId(null);
    }
  };

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

  const handleClearFilters = () => {
    setSelectedAccountId('');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(getLocalDateString(firstDay));
    setEndDate(getLocalDateString(lastDay));
  };

  const handleEditSuccess = () => {
    fetchTransactions();
    fetchAccountsList();
  };

  const handleClearDatabase = async () => {

    if (!window.confirm('¿Estás seguro de que deseas borrar por completo la base de datos local? Se eliminarán todas las transacciones, cuentas y categorías. Esta acción no se puede deshacer.')) {
      return;
    }
    
    setIsLoadingTxs(true);
    try {
      const res = await fetch('/api/db/clear', { method: 'POST' });
      if (res.ok) {
        alert('Base de datos limpiada con éxito.');
        handleClearFilters();
        fetchTransactions();
        fetchAccountsList();
        handleReset();
        setCurrentTab('import'); // Regresar a pestaña importador al vaciar base de datos
      } else {
        const data = await res.json();
        setError(data.error || 'Error al intentar limpiar la base de datos.');
      }
    } catch (err: any) {
      setError('Error de red al intentar limpiar la base de datos: ' + err.message);
    } finally {
      setIsLoadingTxs(false);
    }
  };

  // Aggregated Stats from loaded (filtered) transactions
  const totalBalanceUsd = transactions.reduce((acc, t) => {
    if (t.transactionType === 'INCOME') return acc + t.baseAmountUsd;
    if (t.transactionType === 'EXPENSE') return acc - t.baseAmountUsd;
    return acc;
  }, 0);

  const totalIncomeUsd = transactions
    .filter(t => t.transactionType === 'INCOME')
    .reduce((acc, t) => acc + t.baseAmountUsd, 0);

  const totalExpenseUsd = transactions
    .filter(t => t.transactionType === 'EXPENSE')
    .reduce((acc, t) => acc + t.baseAmountUsd, 0);

  if (isResolvingDefaultTab) {
    return (
      <main className="min-h-screen bg-slate-955 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-950 to-slate-900 text-slate-100 font-sans flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden relative bg-slate-955 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-950 to-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* Background decoration elements */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 py-8 relative z-10 space-y-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-900 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              Money Manager Import Engine
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Consolida, mapea y analiza tus registros financieros mediante SQLite.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={handleClearDatabase}
              className="text-xs font-semibold text-rose-450 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/25 hover:border-rose-500/40 px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Borrar todos los datos de SQLite"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Limpiar Base de Datos
            </button>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                Base Local: SQLite
              </span>
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-200 p-4 rounded-xl flex items-center justify-between animate-shake">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-rose-400 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-100 transition-colors p-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-900 gap-6 overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
          <button
            onClick={() => setCurrentTab('import')}
            className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
              currentTab === 'import' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Consola de Importación
            {currentTab === 'import' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setCurrentTab('transactions')}
            className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
              currentTab === 'transactions' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Historial de Movimientos
            {currentTab === 'transactions' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setCurrentTab('balances')}
            className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
              currentTab === 'balances' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Saldos y Evolución
            {currentTab === 'balances' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setCurrentTab('categories')}
            className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
              currentTab === 'categories' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Categorías
            {currentTab === 'categories' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => setCurrentTab('bcv')}
            className={`pb-4 text-sm font-semibold transition-all relative cursor-pointer ${
              currentTab === 'bcv' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tasas de Cambio
            {currentTab === 'bcv' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Tab Contents */}
        {currentTab === 'bcv' && (
          <BcvRates />
        )}
        {currentTab === 'import' && (
          <section className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
            {importState === 'upload' && (
              <div className="space-y-4">
                <div className="text-center max-w-xl mx-auto space-y-2 mb-4">
                  <h2 className="text-xl font-bold text-slate-200">Importar Extracto de Money Manager</h2>
                  <p className="text-slate-400 text-sm">
                    Carga el archivo Excel `.xls` o `.xlsx` exportado por Money Manager. El motor identificará duplicados e ingresará al vuelo cuentas y categorías nuevas.
                  </p>
                </div>
                <ImportWidget onAnalyzed={handleAnalyzed} onError={setError} />
              </div>
            )}

            {importState === 'preview' && analysisResult && file && (
              <ImportPreview
                analysis={analysisResult}
                file={file}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
                onError={setError}
              />
            )}

            {importState === 'success' && executeResult && (
              <div className="flex flex-col items-center justify-center py-10 max-w-md mx-auto text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-100">¡Importación Exitosa!</h3>
                  <p className="text-slate-400 text-sm">
                    Se ha consolidado el extracto de forma transaccional en la base de datos local SQLite.
                  </p>
                </div>

                <div className="w-full bg-slate-950/50 border border-slate-900 p-5 rounded-2xl text-left space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-900 pb-1.5">Resumen de Escritura</h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div className="text-slate-400">Transacciones Insertadas:</div>
                    <div className="font-semibold text-emerald-400 text-right">{executeResult.totalInserted}</div>

                    <div className="text-slate-400">Duplicados Omitidos:</div>
                    <div className="font-semibold text-amber-400 text-right">{executeResult.totalSkipped}</div>

                    <div className="text-slate-400">Nuevas Cuentas:</div>
                    <div className="font-semibold text-slate-200 text-right">{executeResult.newAccountsCreatedCount}</div>

                    <div className="text-slate-400">Nuevas Categorías:</div>
                    <div className="font-semibold text-slate-200 text-right">{executeResult.newCategoriesCreatedCount}</div>

                    <div className="text-slate-400">Nuevas Subcategorías:</div>
                    <div className="font-semibold text-slate-200 text-right">{executeResult.newSubcategoriesCreatedCount}</div>
                  </div>
                </div>
                       {/* Estados de Cuenta y Ajustes */}
                {executeResult.accountBalances && executeResult.accountBalances.length > 0 && (
                  <div className="w-full bg-slate-900/40 border border-slate-900 p-5 rounded-2xl text-left space-y-3 animate-fade-in">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 shrink-0 text-indigo-400">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <h4 className="text-xs font-bold uppercase tracking-wider">Ajuste de Saldo de Apertura por Cuenta</h4>
                    </div>
                    
                    <p className="text-xs text-slate-400">
                      Puedes ingresar un saldo objetivo personalizado para conciliar de forma automática la apertura de tus cuentas (las cuentas con saldo negativo se destacan en rojo):
                    </p>

                    <div className="space-y-2.5 pt-1">
                      {executeResult.accountBalances.map((acc) => {
                        const isAdjusted = adjustedAccounts[acc.accountId];
                        const isAdjusting = adjustingAccountId === acc.accountId;
                        const isNegative = acc.currentBalanceUsd < 0;
                        
                        return (
                          <div 
                            key={acc.accountId} 
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl gap-3 transition-colors ${
                              isNegative
                                ? 'bg-rose-500/5 border border-rose-500/20'
                                : 'bg-slate-950/40 border border-slate-900'
                            }`}
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-slate-200 block truncate">{acc.accountName}</span>
                              <span className={`text-xs font-bold block mt-0.5 ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {isNegative ? '-' : '+'}${formatCents(Math.abs(acc.currentBalanceUsd))} USD
                              </span>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">Saldo obj:</span>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={adjustmentValues[acc.accountId] ?? '0.00'}
                                  onChange={(e) => setAdjustmentValues(prev => ({ ...prev, [acc.accountId]: e.target.value }))}
                                  disabled={isAdjusted || isAdjusting}
                                  className="w-20 bg-slate-900 border border-slate-850 rounded pl-4.5 pr-1.5 py-1 text-center text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0.00"
                                />
                              </div>
                              <button
                                onClick={() => {
                                  const val = parseFloat(adjustmentValues[acc.accountId] || '0.00');
                                  handleApplyAdjustment(acc.accountId, val);
                                }}
                                disabled={isAdjusted || isAdjusting || isNaN(parseFloat(adjustmentValues[acc.accountId] || ''))}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none shrink-0 ${
                                  isAdjusted
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default'
                                    : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 hover:border-indigo-400 text-white disabled:opacity-55'
                                }`}
                              >
                                {isAdjusting && adjustingAccountId === acc.accountId ? '...' : isAdjusted ? 'Ajustado' : 'Ajustar'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="px-8 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99] transition-all font-semibold w-full cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  Cargar Otro Archivo
                </button>
              </div>
            )}
          </section>
        )}

        {currentTab === 'transactions' && (
          <div className="space-y-8 animate-fade-in">
            {/* Advanced Filters Panel */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl backdrop-blur-md shadow-xl space-y-4 relative z-50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-200">Filtros de Búsqueda</h2>
                  <p className="text-xs text-slate-500">Filtra tus movimientos por cuenta bancaria y rango de fechas</p>
                </div>
                {/* Preset quick buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPreset('1w')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-850 hover:border-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    1 Semana
                  </button>
                  <button
                    onClick={() => setPreset('1m')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-850 hover:border-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    1 Mes
                  </button>
                  <button
                    onClick={() => setPreset('thisMonth')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 transition-all cursor-pointer"
                  >
                    Este Mes
                  </button>
                  <button
                    onClick={() => setPreset('1y')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-850 hover:border-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    1 Año
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Free Text Search with Autocomplete */}
              <div className="relative w-full pt-1">
                <div className="relative w-full flex items-center">
                  <span className="absolute left-3 text-slate-500 flex items-center pointer-events-none mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    placeholder="Buscar movimientos por nota..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setShowSuggestions(false);
                      }}
                      className="absolute right-3 text-slate-500 hover:text-slate-250 transition-colors p-1"
                      title="Limpiar búsqueda"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Custom Autocomplete Suggestions Menu */}
                {showSuggestions && searchQuery && (
                  (() => {
                    const matches = availableNotes
                      .filter((n) => n.toLowerCase().includes(searchQuery.toLowerCase()) && n.toLowerCase() !== searchQuery.toLowerCase())
                      .slice(0, 6);
                    
                    if (matches.length === 0) return null;

                    return (
                      <div className="absolute left-0 right-0 mt-1 bg-slate-950/95 border border-slate-850/85 rounded-xl shadow-2xl z-55 max-h-48 overflow-y-auto backdrop-blur-md divide-y divide-slate-900/50">
                        {matches.map((note) => (
                          <button
                            key={note}
                            type="button"
                            onMouseDown={() => {
                              setSearchQuery(note);
                              setShowSuggestions(false);
                            }}
                            className="w-full px-3.5 py-2 text-xs text-slate-350 hover:text-slate-100 hover:bg-slate-900/50 cursor-pointer transition-colors text-left font-medium block truncate"
                          >
                            {note}
                          </button>
                        ))}
                      </div>
                    );
                  })()
                )}

                {/* Search Mode Warning Badge */}
                {searchQuery && (
                  <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg uppercase tracking-wider w-fit animate-fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Búsqueda global activa: filtros de fecha y cuenta ignorados
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Account selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Cuenta Bancaria</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">Todas las cuentas</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Picker */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400">Rango de Fechas</label>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(start, end) => {
                      setStartDate(start);
                      setEndDate(end);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats Panel (Filtered summary) */}
            {transactions.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/40 border border-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-sm shadow-md">
                  <p className="text-sm font-medium text-slate-400">Balance del Período</p>
                  <p className={`text-3xl font-extrabold mt-2 ${totalBalanceUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalBalanceUsd >= 0 ? '+' : ''}${formatCents(totalBalanceUsd)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-2 block">Sumatoria neta filtrada en USD</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-sm shadow-md">
                  <p className="text-sm font-medium text-emerald-400">Ingresos del Período</p>
                  <p className="text-3xl font-extrabold text-emerald-300 mt-2">
                    ${formatCents(totalIncomeUsd)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-2 block">Ingresos en rango</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-sm shadow-md">
                  <p className="text-sm font-medium text-rose-400">Gastos del Período</p>
                  <p className="text-3xl font-extrabold text-rose-300 mt-2">
                    -${formatCents(totalExpenseUsd)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-2 block">Gastos deducidos en rango</span>
                </div>
              </section>
            )}

            {/* Category spending distribution */}
            {transactions.length > 0 && (
              <CategoryDistribution transactions={transactions} />
            )}

            {/* Transactions List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-200">Resultados del Historial (SQLite)</h2>
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
                    onClick={fetchTransactions}
                    className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer h-[34px]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Refrescar
                  </button>

                  {/* Dropdown Selección Columnas */}
                  <div className="relative" ref={colDropdownRef}>
                    <button
                      onClick={() => setIsColDropdownOpen(!isColDropdownOpen)}
                      className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer h-[34px]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-9-15h12A2.25 2.25 0 0121 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5A2.25 2.25 0 012.25 17.25V6.75A2.25 2.25 0 014.5 4.5z" />
                      </svg>
                      Columnas
                    </button>
                    
                    {isColDropdownOpen && (
                      <div className="absolute right-0 mt-2 bg-slate-950 border border-slate-850 p-3 rounded-xl shadow-2xl z-55 w-48 space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-900 mb-1">
                          Mostrar Columnas
                        </p>
                        {Object.entries({
                          time: 'Hora',
                          account: 'Cuenta / Categoría',
                          amount: 'Importe Original',
                          usdAmount: 'Importe USD',
                          note: 'Nota / Descripción'
                        }).map(([key, label]) => (
                          <label 
                            key={key} 
                            className="flex items-center gap-2 text-xs text-slate-350 text-slate-300 hover:text-slate-100 cursor-pointer select-none py-1 hover:bg-slate-900/30 px-1 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns[key as keyof typeof visibleColumns]}
                              onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                              className="rounded border-slate-800 bg-slate-950 text-indigo-650 focus:ring-indigo-650 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {isLoadingTxs ? (
                <div className="bg-slate-900/20 border border-slate-900 rounded-3xl py-20 flex flex-col items-center justify-center space-y-3 backdrop-blur-sm">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-sm">Cargando transacciones...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="bg-slate-900/20 border border-slate-900 rounded-3xl py-16 px-6 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto backdrop-blur-sm">
                  <div className="p-4 bg-slate-900 border border-slate-850 text-indigo-400/80 rounded-full shadow-inner animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-200 text-md">No se encontraron movimientos</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      No hay transacciones guardadas en SQLite que coincidan con los filtros seleccionados.
                    </p>
                  </div>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl transition-all cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              ) : viewMode === 'calendar' ? (
                <CalendarView
                  transactions={transactions}
                  startDate={startDate}
                  endDate={endDate}
                  onEditTransaction={setEditingTransaction}
                />
              ) : (
                <div className="bg-slate-900/20 border border-slate-900 rounded-3xl overflow-hidden backdrop-blur-sm">
                  <TransactionTable
                    transactions={transactions}
                    visibleColumns={visibleColumns}
                    onEditTransaction={setEditingTransaction}
                    groupByDate={true}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'balances' && (
          <div className="animate-fade-in">
            <AccountBalances onSelectAccount={(accId) => {
              setSelectedAccountId(accId);
              setCurrentTab('transactions');
            }} />
          </div>
        )}

        {currentTab === 'categories' && (
          <div className="animate-fade-in">
            <CategoryManager />
          </div>
        )}
        {editingTransaction && (
          <EditTransactionModal
            transaction={editingTransaction}
            accounts={accounts}
            onClose={() => setEditingTransaction(null)}
            onSuccess={handleEditSuccess}
          />
        )}
      </div>
    </main>
  );
}
