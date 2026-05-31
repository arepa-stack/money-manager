'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AccountBalance {
  accountId: string;
  accountName: string;
  balance: number;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

export default function AccountBalances() {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                className="bg-slate-900/60 backdrop-blur-md border border-slate-900 hover:border-slate-800 p-6 rounded-3xl flex flex-col justify-between shadow-lg hover:shadow-indigo-500/5 hover:scale-[1.01] transition-all duration-300 group"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-300 text-lg group-hover:text-indigo-400 transition-colors">
                      {acc.accountName}
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800/40 border border-slate-850 px-2 py-0.5 rounded">
                      Cuenta
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold tracking-wider">Saldo Disponible</span>
                    <p className={`text-2xl font-black tracking-tight mt-1 ${
                      acc.balance > 0 ? 'text-emerald-400' : acc.balance < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {acc.balance >= 0 ? '+' : ''}${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-850 mt-6 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Ingresos Totales:</span>
                    <span className="text-emerald-500 font-medium">+${acc.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Gastos/Transf.:</span>
                    <span className="text-slate-300 font-medium">-${acc.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 border-t border-slate-850/50 pt-2 text-[10px]">
                    <span>Transacciones:</span>
                    <span>{acc.transactionCount} registros</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gran Total */}
          <div className="bg-gradient-to-r from-slate-900/80 to-indigo-950/20 border border-slate-900 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="text-md font-bold text-slate-200">Patrimonio Consolidado Total</h4>
              <p className="text-xs text-slate-500 mt-0.5">Suma neta total de todas tus cuentas bancarias guardadas</p>
            </div>
            <div>
              <p className={`text-3xl font-black tracking-tight ${grandTotal >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                {grandTotal >= 0 ? '+' : ''}${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-semibold text-slate-500">USD</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
