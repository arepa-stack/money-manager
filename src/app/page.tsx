'use client';

import React, { useState, useEffect } from 'react';
import ImportWidget from '@/components/ImportWidget';
import ImportPreview from '@/components/ImportPreview';
import AccountBalances from '@/components/AccountBalances';
import DateRangePicker from '@/components/DateRangePicker';
import { ImportAnalysisResult, ImportExecuteResult } from '@/lib/domain/types';

interface Transaction {
  id: string;
  transactionDate: string;
  amount: number;
  currency: string;
  baseAmountUsd: number;
  transactionType: string;
  note: string | null;
  description: string | null;
  account: { name: string };
  category: { name: string };
  subcategory: { name: string } | null;
}

// Timezone-safe local date YYYY-MM-DD formatter
const getLocalDateString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function Dashboard() {
  const [currentTab, setCurrentTab] = useState<'import' | 'transactions' | 'balances'>('import');
  const [importState, setImportState] = useState<'upload' | 'preview' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImportAnalysisResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ImportExecuteResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  
  // Filtering states
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoadingTxs, setIsLoadingTxs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize dates to current month, load accounts
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(getLocalDateString(firstDay));
    setEndDate(getLocalDateString(lastDay));
    
    fetchAccountsList();
  }, []);

  const fetchAccountsList = async () => {
    try {
      const res = await fetch('/api/accounts/balances');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.map((a: any) => ({ id: a.accountId, name: a.accountName })));
      }
    } catch (err) {
      console.error('Error al cargar cuentas:', err);
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
  }, [selectedAccountId, startDate, endDate]);

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
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(getLocalDateString(firstDay));
    setEndDate(getLocalDateString(lastDay));
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

  return (
    <main className="min-h-screen bg-slate-955 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-950 to-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
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
          
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
              Base Local: SQLite
            </span>
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
        <div className="flex border-b border-slate-900 gap-6">
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
        </div>

        {/* Tab Contents */}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
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
                <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl backdrop-blur-sm shadow-md">
                  <p className="text-sm font-medium text-slate-400">Balance del Período</p>
                  <p className={`text-3xl font-extrabold mt-2 ${totalBalanceUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {totalBalanceUsd >= 0 ? '+' : ''}${totalBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-2 block">Sumatoria neta filtrada en USD</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl backdrop-blur-sm shadow-md">
                  <p className="text-sm font-medium text-emerald-400">Ingresos del Período</p>
                  <p className="text-3xl font-extrabold text-emerald-300 mt-2">
                    ${totalIncomeUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-2 block">Ingresos en rango</span>
                </div>

                <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl backdrop-blur-sm shadow-md">
                  <p className="text-sm font-medium text-rose-400">Gastos del Período</p>
                  <p className="text-3xl font-extrabold text-rose-300 mt-2">
                    -${totalExpenseUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-2 block">Gastos deducidos en rango</span>
                </div>
              </section>
            )}

            {/* Transactions List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-200">Resultados del Historial (SQLite)</h2>
                <button 
                  onClick={fetchTransactions}
                  className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Refrescar
                </button>
              </div>

              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl overflow-hidden backdrop-blur-sm">
                {isLoadingTxs ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm">Cargando transacciones...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                    <div className="p-4 bg-slate-900 border border-slate-800 text-indigo-400/80 rounded-full shadow-inner animate-pulse">
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
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-900">
                          <th className="px-6 py-4">Fecha</th>
                          <th className="px-6 py-4">Cuenta</th>
                          <th className="px-6 py-4">Categoría / Sub</th>
                          <th className="px-6 py-4">Importe Original</th>
                          <th className="px-6 py-4">Equivalente base (USD)</th>
                          <th className="px-6 py-4">Nota / Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 text-sm text-slate-300">
                        {transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-900/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                              {new Date(t.transactionDate).toLocaleDateString()} {new Date(t.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-200 whitespace-nowrap">{t.account.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-slate-200">{t.category.name}</span>
                              {t.subcategory && (
                                <span className="text-xs text-slate-500 block">&gt; {t.subcategory.name}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`font-semibold ${
                                t.transactionType === 'INCOME' ? 'text-emerald-400' : t.transactionType === 'TRANSFER' ? 'text-indigo-400' : 'text-slate-100'
                              }`}>
                                {t.transactionType === 'EXPENSE' ? '-' : t.transactionType === 'INCOME' ? '+' : ''}
                                {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-xs text-slate-500 ml-1">{t.currency}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-200">
                              ${t.baseAmountUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={t.note || t.description || ''}>
                              <span>{t.note || '-'}</span>
                              {t.description && (
                                <span className="text-xs text-slate-500 block italic">{t.description}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
      </div>
    </main>
  );
}
