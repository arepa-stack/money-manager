'use client';

import React, { useState, useEffect } from 'react';
import TabButton from '@/ui/atoms/TabButton';
import ErrorAlert from '@/ui/atoms/ErrorAlert';
import ConfirmModal from '@/ui/atoms/ConfirmModal';
import ToastContainer, { ToastMessage } from '@/ui/molecules/ToastContainer';
import EditTransactionModal from '@/ui/organisms/EditTransactionModal';

// Pages
import BalancesTab from '@/ui/pages/BalancesTab';
import TransactionsTab from '@/ui/pages/TransactionsTab';
import ImportTab from '@/ui/pages/ImportTab';
import AccountsTab from '@/ui/pages/AccountsTab';
import CategoriesTab from '@/ui/pages/CategoriesTab';
import BcvTab from '@/ui/pages/BcvTab';
import AuditTab from '@/ui/pages/AuditTab';
import BackupTab from '@/ui/pages/BackupTab';
import BudgetsTab from '@/ui/pages/BudgetsTab';

import { ImportAnalysisResult, ImportExecuteResult } from '@/lib/domain/types';
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
  isOpeningBalance?: boolean;
}

export default function DashboardLayout() {
  const [currentTab, setCurrentTab] = useState<'import' | 'transactions' | 'balances' | 'categories' | 'accounts' | 'bcv' | 'audit' | 'backup' | 'budgets'>('balances');
  const [importState, setImportState] = useState<'upload' | 'preview' | 'success'>('upload');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialModalType, setInitialModalType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER' | undefined>(undefined);
  const [selectedProvider, setSelectedProvider] = useState<string>('MONEY_MANAGER');
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImportAnalysisResult | null>(null);
  const [executeResult, setExecuteResult] = useState<ImportExecuteResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; name: string; currency: string; type: string; isArchived?: boolean }[]>([]);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [hasLoadedDefaultTab, setHasLoadedDefaultTab] = useState(false);
  const [isResolvingDefaultTab, setIsResolvingDefaultTab] = useState(true);
  
  // Filtering states
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [availableNotes, setAvailableNotes] = useState<string[]>([]);
  const [showAnalytics, setShowAnalytics] = useState<boolean>(true);
  const [isLoadingTxs, setIsLoadingTxs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDatabaseEmpty, setIsDatabaseEmpty] = useState<boolean>(true);
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success',
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, actionLabel, onAction }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const [visibleColumns, setVisibleColumns] = useState({
    time: true,
    account: true,
    category: true,
    amount: true,
    usdAmount: true,
    note: true
  });

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
    fetchCategoriesList();
    fetchAvailableNotes();
    checkDatabaseEmpty();
  }, []);

  const fetchCategoriesList = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setAllCategories(data.map((c: any) => ({ id: c.id, name: c.name, type: c.type })));
      }
    } catch (err) {
      console.error('Error al cargar categorías para filtros:', err);
    }
  };

  const fetchAccountsList = async () => {
    try {
      const res = await fetch('/api/accounts/balances');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.map((a: any) => ({
          id: a.accountId,
          name: a.accountName,
          currency: a.accountCurrency,
          type: a.accountType,
          isArchived: a.isArchived
        })));
        
        // Auto-switch default active tab on initial mount
        setHasLoadedDefaultTab((loaded) => {
          if (!loaded) {
            if (data.length > 0) {
              setCurrentTab('balances');
            } else {
              setCurrentTab('accounts');
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

  const checkDatabaseEmpty = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setIsDatabaseEmpty(data.length === 0);
      }
    } catch (err) {
      console.error('Error al verificar si la base de datos está vacía:', err);
    }
  };

  const fetchTransactions = async () => {
    if (!startDate || !endDate) return;
    setIsLoadingTxs(true);
    try {
      const params = new URLSearchParams();
      if (selectedAccountId) params.append('accountId', selectedAccountId);
      if (selectedCategoryId) params.append('categoryId', selectedCategoryId);
      if (selectedTransactionType) params.append('transactionType', selectedTransactionType);
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
  }, [selectedAccountId, selectedCategoryId, selectedTransactionType, startDate, endDate, debouncedSearchQuery]);

  const handleClearFilters = () => {
    setSelectedAccountId('');
    setSelectedCategoryId('');
    setSelectedTransactionType('');
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
    checkDatabaseEmpty();
    showToast('Movimiento registrado/actualizado con éxito.', 'success');
  };

  const handleDuplicateTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsDuplicate(true);
    showToast('Movimiento cargado en el editor para duplicar.', 'info');
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    setConfirmState({
      isOpen: true,
      title: 'Eliminar Movimiento',
      message: '¿Estás seguro de que deseas eliminar permanentemente este movimiento? Se ajustarán los saldos automáticamente.',
      isDestructive: true,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          setIsLoadingTxs(true);
          const res = await fetch(`/api/transactions/${tx.id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchTransactions();
            fetchAccountsList();
            showToast(
              'Movimiento eliminado correctamente.',
              'success',
              'Deshacer',
              async () => {
                try {
                  setIsLoadingTxs(true);
                  const restoreRes = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      transactionDate: tx.transactionDate,
                      accountId: tx.accountId,
                      transactionType: tx.transactionType,
                      amount: tx.amount / 100,
                      currency: tx.currency,
                      baseAmountUsd: tx.baseAmountUsd / 100,
                      categoryId: tx.categoryId,
                      subcategoryId: tx.subcategoryId,
                      destinationAccountId: tx.destinationAccountId,
                      note: tx.note,
                      description: tx.description,
                      isOpeningBalance: tx.isOpeningBalance
                    })
                  });
                  if (restoreRes.ok) {
                    fetchTransactions();
                    fetchAccountsList();
                    showToast('Movimiento restaurado con éxito.', 'success');
                  } else {
                    const data = await restoreRes.json();
                    showToast(data.error || 'Error al restaurar la transacción.', 'error');
                  }
                } catch (err: any) {
                  showToast('Error de red al restaurar la transacción.', 'error');
                } finally {
                  setIsLoadingTxs(false);
                }
              }
            );
          } else {
            const data = await res.json();
            setError(data.error || 'Error al eliminar la transacción.');
            showToast(data.error || 'Error al eliminar la transacción.', 'error');
            setIsLoadingTxs(false);
          }
        } catch (err: any) {
          setError('Error de red al eliminar la transacción: ' + err.message);
          showToast('Error de red al eliminar la transacción.', 'error');
          setIsLoadingTxs(false);
        } finally {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleClearDatabase = () => {
    setConfirmState({
      isOpen: true,
      title: 'Limpiar Base de Datos',
      message: '¿Estás seguro de que deseas borrar por completo la base de datos local SQLite? Se eliminarán TODAS las transacciones, cuentas y categorías de forma irreversible.',
      isDestructive: true,
      confirmText: 'Borrar Todo',
      onConfirm: async () => {
        setIsLoadingTxs(true);
        try {
          const res = await fetch('/api/db/clear', { method: 'POST' });
          if (res.ok) {
            handleClearFilters();
            fetchTransactions();
            fetchAccountsList();
            setIsDatabaseEmpty(true);
            setImportState('upload');
            setFile(null);
            setAnalysisResult(null);
            setExecuteResult(null);
            setCurrentTab('import');
            showToast('Base de datos SQLite restablecida por completo.', 'success');
          } else {
            const data = await res.json();
            setError(data.error || 'Error al intentar limpiar la base de datos.');
            showToast('Error al intentar limpiar la base de datos.', 'error');
          }
        } catch (err: any) {
          setError('Error de red al intentar limpiar la base de datos: ' + err.message);
          showToast('Error de red al intentar limpiar la base de datos.', 'error');
        } finally {
          setIsLoadingTxs(false);
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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
      <main className="min-h-screen bg-slate-955 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-955 to-slate-900 text-slate-100 font-sans flex flex-col items-center justify-center space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest animate-pulse">Cargando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden relative bg-slate-955 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-slate-955 to-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
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
          <ErrorAlert message={error} onDismiss={() => setError(null)} />
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-900 gap-6 overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
          <TabButton label="Saldos y Evolución" isActive={currentTab === 'balances'} onClick={() => setCurrentTab('balances')} />
          <TabButton label="Historial de Movimientos" isActive={currentTab === 'transactions'} onClick={() => setCurrentTab('transactions')} />
          <TabButton label="Presupuestos" isActive={currentTab === 'budgets'} onClick={() => setCurrentTab('budgets')} />
          <TabButton label="Consola de Importación" isActive={currentTab === 'import'} onClick={() => setCurrentTab('import')} />
          <TabButton label="Cuentas" isActive={currentTab === 'accounts'} onClick={() => setCurrentTab('accounts')} />
          <TabButton label="Categorías" isActive={currentTab === 'categories'} onClick={() => setCurrentTab('categories')} />
          <TabButton label="Tasas de Cambio" isActive={currentTab === 'bcv'} onClick={() => setCurrentTab('bcv')} />
          <TabButton label="Auditoría" isActive={currentTab === 'audit'} onClick={() => setCurrentTab('audit')} />
          <TabButton label="Respaldos" isActive={currentTab === 'backup'} onClick={() => setCurrentTab('backup')} />
        </div>

        {/* Tab Contents */}
        {currentTab === 'balances' && (
          <BalancesTab
            onSelectAccount={(accId) => {
              setSelectedAccountId(accId);
              setCurrentTab('transactions');
            }}
            onQuickAction={(actionType) => {
              setInitialModalType(actionType);
              setIsCreateModalOpen(true);
            }}
            showToast={showToast}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsTab
            transactions={transactions}
            accounts={accounts}
            allCategories={allCategories}
            availableNotes={availableNotes}
            isLoadingTxs={isLoadingTxs}
            selectedAccountId={selectedAccountId}
            setSelectedAccountId={setSelectedAccountId}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            selectedTransactionType={selectedTransactionType}
            setSelectedTransactionType={setSelectedTransactionType}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleClearFilters={handleClearFilters}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showAnalytics={showAnalytics}
            setShowAnalytics={setShowAnalytics}
            visibleColumns={visibleColumns}
            onToggleColumn={toggleColumn}
            onNewTransaction={() => setIsCreateModalOpen(true)}
            onRefresh={fetchTransactions}
            onEditTransaction={setEditingTransaction}
            onDuplicateTransaction={handleDuplicateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            totalBalanceUsd={totalBalanceUsd}
            totalIncomeUsd={totalIncomeUsd}
            totalExpenseUsd={totalExpenseUsd}
          />
        )}

        {currentTab === 'import' && (
          <ImportTab
            importState={importState}
            setImportState={setImportState}
            file={file}
            setFile={setFile}
            analysisResult={analysisResult}
            setAnalysisResult={setAnalysisResult}
            executeResult={executeResult}
            setExecuteResult={setExecuteResult}
            selectedProvider={selectedProvider}
            setSelectedProvider={setSelectedProvider}
            fetchTransactions={() => {
              fetchTransactions();
              checkDatabaseEmpty();
            }}
            fetchAccountsList={fetchAccountsList}
            fetchAvailableNotes={fetchAvailableNotes}
            handleClearFilters={handleClearFilters}
            setCurrentTab={setCurrentTab}
            setError={setError}
            showToast={showToast}
            isDatabaseEmpty={isDatabaseEmpty}
          />
        )}

        {currentTab === 'accounts' && (
          <AccountsTab
            onChange={() => {
              fetchAccountsList();
              fetchTransactions();
            }}
          />
        )}

        {currentTab === 'categories' && (
          <CategoriesTab
            onChange={fetchTransactions}
          />
        )}

        {currentTab === 'bcv' && (
          <BcvTab />
        )}

        {currentTab === 'audit' && (
          <AuditTab />
        )}

        {currentTab === 'backup' && (
          <BackupTab
            showToast={showToast}
            setConfirmState={setConfirmState}
            onRefreshData={() => {
              fetchTransactions();
              fetchAccountsList();
              checkDatabaseEmpty();
            }}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsTab />
        )}

        {/* Global Modals */}
        {editingTransaction && (
          <EditTransactionModal
            transaction={editingTransaction}
            accounts={accounts}
            isDuplicate={isDuplicate}
            onClose={() => {
              setEditingTransaction(null);
              setIsDuplicate(false);
            }}
            onSuccess={handleEditSuccess}
          />
        )}
        {isCreateModalOpen && (
          <EditTransactionModal
            accounts={accounts}
            initialType={initialModalType}
            onClose={() => {
              setIsCreateModalOpen(false);
              setInitialModalType(undefined);
            }}
            onSuccess={handleEditSuccess}
          />
        )}
        
        <ConfirmModal 
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
          isDestructive={confirmState.isDestructive}
          confirmText={confirmState.confirmText}
        />

        <ToastContainer 
          toasts={toasts}
          onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
        />
      </div>
    </main>
  );
}
