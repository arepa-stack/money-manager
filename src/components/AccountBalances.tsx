'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MonthlyEvolutionChart from './MonthlyEvolutionChart';
import { formatCents } from '@/lib/moneyUtils';

interface AccountBalance {
  accountId: string;
  accountName: string;
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

interface AccountBalancesProps {
  onSelectAccount?: (accountId: string) => void;
}

export default function AccountBalances({ onSelectAccount }: AccountBalancesProps) {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reconcile states
  const [reconcileAccountId, setReconcileAccountId] = useState<string | null>(null);
  const [reconcileTarget, setReconcileTarget] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState(false);

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
        body: JSON.stringify({ accountId: reconcileAccountId, targetBalance })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al conciliar');
      
      setReconcileAccountId(null);
      setReconcileTarget('');
      fetchBalances();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsReconciling(false);
    }
  };

  // Aggregated totals of all accounts
  const grandTotal = balances.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Header local con Refresh */}
      <div className="flex justify-between items-center">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              Una vez que importes tu primer extracto de Money Manager, las cuentas aparecerán aquí con sus saldos actualizados.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {balances.map((acc) => (
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
                    <h3 className="font-bold text-slate-300 text-lg group-hover:text-indigo-400 transition-colors line-clamp-2">
                      {acc.accountName}
                    </h3>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-800/40 border border-slate-850 px-1.5 py-0.5 rounded">
                        Cuenta
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setReconcileAccountId(acc.accountId);
                          setReconcileTarget((acc.balance / 100).toFixed(2));
                        }}
                        className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 px-2 py-1 rounded-md transition-all cursor-pointer shadow-sm shadow-indigo-500/10 flex items-center gap-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                        </svg>
                        Ajustar
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">Saldo Disponible</span>
                    <p className={`text-2xl font-black tracking-tight mt-1 ${
                      acc.balance > 0 ? 'text-emerald-400' : acc.balance < 0 ? 'text-rose-400' : 'text-slate-400'
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
                    <span className="text-slate-300 font-medium">-${formatCents(acc.totalExpense)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 border-t border-slate-850/50 pt-2 text-[10px]">
                    <span>Transacciones:</span>
                    <span>{acc.transactionCount} registros</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gráfico de Evolución Mensual */}
          <MonthlyEvolutionChart />

          {/* Gran Total */}
          <div className="bg-gradient-to-r from-slate-900/80 to-indigo-950/20 border border-slate-900 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-md font-bold text-slate-200">Patrimonio Consolidado Total</h4>
              <p className="text-xs text-slate-500 mt-0.5">Suma neta total de todas tus cuentas bancarias guardadas</p>
            </div>
            <div>
              <p className={`text-3xl font-black tracking-tight ${grandTotal >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                {grandTotal >= 0 ? '+' : ''}${formatCents(grandTotal)} <span className="text-sm font-semibold text-slate-500">USD</span>
              </p>
            </div>
          </div>
        </div>
      )}

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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-7 pr-4 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
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
