'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MonthlyEvolutionChart from '@/ui/molecules/MonthlyEvolutionChart';
import ConfirmModal from '@/ui/atoms/ConfirmModal';
import { formatCents } from '@/lib/moneyUtils';

interface AccountBalance {
  accountId: string;
  accountName: string;
  accountType: string;
  accountCurrency: string;
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

interface AccountBalancesProps {
  onSelectAccount?: (accountId: string) => void;
  onQuickAction?: (actionType: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
}

export default function AccountBalances({ onSelectAccount, onQuickAction }: AccountBalancesProps) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reconcile states
  const [reconcileAccountId, setReconcileAccountId] = useState<string | null>(null);
  const [reconcileTarget, setReconcileTarget] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState(false);

  // Error modal state
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const fetchBalances = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounts/balances');
      if (!res.ok) {
        throw new Error('Error al consultar los saldos del servidor');
      }
      const data = await res.json();
      setBalances(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudieron cargar los saldos por cuenta.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleReconcile = async () => {
    if (!reconcileAccountId || !reconcileTarget) return;

    setIsReconciling(true);
    try {
      const targetBalance = parseFloat(reconcileTarget);
      if (isNaN(targetBalance)) throw new Error('El monto ingresado no es válido');

      const res = await fetch('/api/accounts/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: reconcileAccountId,
          targetBalance,
          clientDate: new Date().toISOString()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conciliar');

      setReconcileAccountId(null);
      setReconcileTarget('');
      fetchBalances();
    } catch (err: any) {
      setErrorModal({
        isOpen: true,
        title: 'Error de Conciliación',
        message: err.message || 'No se pudo realizar la conciliación de saldo.',
      });
    } finally {
      setIsReconciling(false);
    }
  };

  // Cuentas de tipo pasivo (tarjeta de crédito) restan del patrimonio neto
  const grandTotal = balances.reduce((acc, curr) => {
    if (curr.accountType === 'CREDIT_CARD') {
      return acc - curr.balance;
    }
    return acc + curr.balance;
  }, 0);

  // Gráfico de distribución patrimonial (activos activos con saldo > 0)
  const activeAssets = balances.filter(b => b.accountType !== 'CREDIT_CARD' && b.balance > 0);
  const totalAssets = activeAssets.reduce((sum, b) => sum + b.balance, 0);

  const COLOR_PALETTE = [
    { stroke: '#6366f1', text: 'text-indigo-400', bg: 'bg-indigo-500/10' }, // indigo
    { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10' }, // emerald
    { stroke: '#f59e0b', text: 'text-amber-400', bg: 'bg-amber-500/10' }, // amber
    { stroke: '#06b6d4', text: 'text-cyan-400', bg: 'bg-cyan-500/10' }, // cyan
    { stroke: '#ec4899', text: 'text-pink-400', bg: 'bg-pink-500/10' }, // pink
    { stroke: '#8b5cf6', text: 'text-violet-400', bg: 'bg-violet-500/10' }, // violet
  ];

  const ACCOUNT_META: Record<string, { icon: string; label: string; bgClass: string }> = {
    CASH: { icon: '💵', label: 'Efectivo', bgClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
    BANK: { icon: '🏦', label: 'Banco / Débito', bgClass: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
    CREDIT_CARD: { icon: '💳', label: 'Tarjeta de Crédito (Pasivo)', bgClass: 'bg-rose-500/10 border-rose-500/20 text-rose-450' },
    INVESTMENT: { icon: '📈', label: 'Inversión', bgClass: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
  };

  // Dibujar donut
  let accumulatedPercent = 0;
  const radius = 38;
  const strokeWidth = 8;
  const circ = 2 * Math.PI * radius; // 238.76

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">

      {/* Header local con Refresh */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-200">Resumen Financiero por Cuenta</h2>
          <p className="text-xs text-slate-500 mt-0.5">Saldos agregados acumulados en dólares (USD)</p>
        </div>
        <button
          onClick={fetchBalances}
          disabled={isLoading}
          className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Refrescar saldos
        </button>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-500/30 text-rose-200 p-4 rounded-xl flex items-center justify-between">
          <span className="text-sm font-medium">{error}</span>
          <button
            onClick={fetchBalances}
            className="text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Grid de Cuentas */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-slate-900/30 border border-slate-900 p-6 rounded-3xl space-y-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded-md w-1/3"></div>
              <div className="h-8 bg-slate-800 rounded-md w-2/3"></div>
              <div className="space-y-2 pt-2">
                <div className="h-3 bg-slate-800 rounded-md w-3/4"></div>
                <div className="h-3 bg-slate-800 rounded-md w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : balances.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-slate-800 rounded-3xl p-6 bg-slate-900/10">
          <div className="p-3 bg-slate-900 border border-slate-850 text-slate-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-350">Sin cuentas o registros guardados</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Ingresa a la pestaña Cuentas para crear tus cuentas de efectivo, débito o crédito y empezar a registrar datos.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Fila superior: Resumen de Patrimonio + Acciones Rápidas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Tarjeta de Patrimonio Neto */}
            <div className="lg:col-span-2 bg-gradient-to-r from-slate-900/80 to-indigo-950/20 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between shadow-lg animate-fade-in gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-200">Patrimonio Neto Consolidado</h4>
                <p className="text-xs text-slate-500 mt-0.5">Suma neta total de activos (efectivo/bancos) menos pasivos (tarjetas de crédito)</p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-4xl font-black tracking-tight ${grandTotal >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                  {grandTotal >= 0 ? '+' : ''}${formatCents(grandTotal)}
                </p>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">USD</span>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-4.5 flex flex-col justify-between gap-3 backdrop-blur-md shadow-lg animate-fade-in">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Acciones Rápidas</span>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => onQuickAction?.('EXPENSE')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 hover:text-rose-250 transition-all cursor-pointer shadow-sm active:scale-95 select-none"
                >
                  <span className="text-xl mb-1">💸</span>
                  <span className="text-[9px] font-bold tracking-tight">Gasto</span>
                </button>
                <button
                  onClick={() => onQuickAction?.('INCOME')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 hover:text-emerald-250 transition-all cursor-pointer shadow-sm active:scale-95 select-none"
                >
                  <span className="text-xl mb-1">💰</span>
                  <span className="text-[9px] font-bold tracking-tight">Ingreso</span>
                </button>
                <button
                  onClick={() => onQuickAction?.('TRANSFER')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-400 hover:text-indigo-250 transition-all cursor-pointer shadow-sm active:scale-95 select-none"
                >
                  <span className="text-xl mb-1">🔄</span>
                  <span className="text-[9px] font-bold tracking-tight">Transferir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Gráfico Donut de Distribución de Activos */}
          {activeAssets.length > 0 && totalAssets > 0 && (
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-8 backdrop-blur-md shadow-lg animate-fade-in">
              <div className="relative flex items-center justify-center shrink-0 w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#0f172a" strokeWidth={strokeWidth} />
                  {activeAssets.map((acc, idx) => {
                    const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
                    const pct = (acc.balance / totalAssets) * 100;
                    const strokeDash = (pct / 100) * circ;
                    const strokeOffset = - (accumulatedPercent / 100) * circ;
                    accumulatedPercent += pct;

                    return (
                      <circle
                        key={acc.accountId}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="transparent"
                        stroke={color.stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${strokeDash} ${circ}`}
                        strokeDashoffset={strokeOffset}
                        className="transition-all duration-700 ease-out hover:stroke-[10px] cursor-pointer"
                      >
                        <title>{`${acc.accountName}: ${pct.toFixed(1)}%`}</title>
                      </circle>
                    );
                  })}
                </svg>
                <div className="absolute flex flex-col items-center text-center select-none">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Activos</span>
                  <span className="text-sm font-extrabold text-slate-200 mt-0.5">${formatCents(totalAssets).split('.')[0]}</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Distribución de Activos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeAssets.map((acc, idx) => {
                    const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
                    const pct = (acc.balance / totalAssets) * 100;
                    return (
                      <div key={acc.accountId} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/20 border border-slate-900">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color.stroke }} />
                          <span className="text-slate-300 font-semibold truncate">{acc.accountName}</span>
                        </div>
                        <span className="font-bold text-slate-400 shrink-0 ml-2">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Gráfico de Evolución Mensual */}
          <MonthlyEvolutionChart />

          {/* Lista de Cuentas */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 pl-1">
              Desglose por Cuenta
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {balances.map((acc) => {
                const meta = ACCOUNT_META[acc.accountType] || { icon: '💰', label: 'Cuenta', bgClass: 'bg-slate-800 text-slate-400' };
                const isNegative = acc.balance < 0 && acc.accountType !== 'CREDIT_CARD';

                return (
                  <div
                    key={acc.accountId}
                    onClick={() => onSelectAccount?.(acc.accountId)}
                    className={`bg-slate-900/60 backdrop-blur-md border border-slate-900 p-6 rounded-3xl flex flex-col justify-between shadow-lg transition-all duration-300 group ${
                      onSelectAccount
                        ? 'cursor-pointer hover:border-indigo-500/50 hover:shadow-indigo-500/5 hover:scale-[1.01] active:scale-[0.99]'
                        : ''
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-350 text-base group-hover:text-indigo-400 transition-colors line-clamp-2" title={acc.accountName}>
                            {acc.accountName}
                          </h3>
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mt-1 block">
                            {meta.label}
                          </span>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-md shrink-0 ${meta.bgClass}`}>
                            {meta.icon}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReconcileAccountId(acc.accountId);
                              setReconcileTarget((acc.balance / 100).toFixed(2));
                            }}
                            className="text-[9px] font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 px-2 py-0.5 rounded transition-all cursor-pointer"
                          >
                            Ajustar
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">Saldo Disponible</span>
                        <p className={`text-2xl font-black tracking-tight mt-1 ${
                          isNegative
                            ? 'text-rose-400'
                            : acc.accountType === 'CREDIT_CARD'
                              ? 'text-slate-300'
                              : acc.balance > 0
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                        }`}>
                          {acc.balance >= 0 ? '+' : ''}${formatCents(acc.balance)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-850 mt-6 pt-4 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Ingresos Totales:</span>
                        <span className="text-emerald-500 font-medium">+${formatCents(acc.totalIncome)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Gastos/Transf.:</span>
                        <span className="text-slate-350 font-medium">-${formatCents(acc.totalExpense)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 border-t border-slate-850/50 pt-2 text-[10px]">
                        <span>Transacciones:</span>
                        <span>{acc.transactionCount} registros</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Error de Conciliación */}
      <ConfirmModal
        isOpen={errorModal.isOpen}
        title={errorModal.title}
        message={errorModal.message}
        onConfirm={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        onlyConfirm={true}
        confirmText="Entendido"
        isDestructive={false}
      />

      {/* Modal de Conciliación */}
      {reconcileAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-xl font-bold text-slate-200 mb-2">Ajuste de Saldo</h3>
            <p className="text-xs text-slate-400 mb-6">
              Ingresa el saldo real actual de tu banco. El sistema insertará un movimiento de ajuste automático.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Saldo Real (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={reconcileTarget}
                    onChange={(e) => setReconcileTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-885 border-slate-800 rounded-xl py-2.5 pl-7 pr-4 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setReconcileAccountId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isReconciling && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isReconciling ? 'Ajustando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
