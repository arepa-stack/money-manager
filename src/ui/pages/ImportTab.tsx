import React, { useState, useEffect } from 'react';
import ImportWidget from '@/ui/molecules/ImportWidget';
import ImportPreview from '@/ui/molecules/ImportPreview';
import MoneyManagerBackupTutorial from '@/ui/molecules/MoneyManagerBackupTutorial';
import { ImportAnalysisResult, ImportExecuteResult } from '@/lib/domain/types';
import { formatCents } from '@/lib/moneyUtils';

interface ImportTabProps {
  importState: 'upload' | 'preview' | 'success';
  setImportState: (state: 'upload' | 'preview' | 'success') => void;
  file: File | null;
  setFile: (file: File | null) => void;
  analysisResult: ImportAnalysisResult | null;
  setAnalysisResult: (res: ImportAnalysisResult | null) => void;
  executeResult: ImportExecuteResult | null;
  setExecuteResult: (res: ImportExecuteResult | null) => void;
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;
  
  // Callbacks to refresh parent data
  fetchTransactions: () => void;
  fetchAccountsList: () => void;
  fetchAvailableNotes: () => void;
  handleClearFilters: () => void;
  setCurrentTab: (tab: 'import' | 'transactions' | 'balances' | 'categories' | 'accounts' | 'bcv' | 'audit' | 'backup') => void;
  setError: (err: string | null) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  isDatabaseEmpty?: boolean;
}

export default function ImportTab({
  importState,
  setImportState,
  file,
  setFile,
  analysisResult,
  setAnalysisResult,
  executeResult,
  setExecuteResult,
  selectedProvider,
  setSelectedProvider,
  fetchTransactions,
  fetchAccountsList,
  fetchAvailableNotes,
  handleClearFilters,
  setCurrentTab,
  setError,
  showToast,
  isDatabaseEmpty = false,
}: ImportTabProps) {
  
  // Local states for adjustments (success screen)
  const [adjustedAccounts, setAdjustedAccounts] = useState<Record<string, boolean>>({});
  const [adjustingAccountId, setAdjustingAccountId] = useState<string | null>(null);
  const [adjustmentValues, setAdjustmentValues] = useState<Record<string, string>>({});

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

  const handleAnalyzed = (result: ImportAnalysisResult, uploadedFile: File, provider: string) => {
    setAnalysisResult(result);
    setFile(uploadedFile);
    setSelectedProvider(provider);
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
    showToast?.(`Importación completada. Insertados: ${result.totalInserted}, Duplicados: ${result.totalSkipped}.`, 'success');
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
      showToast?.('Ajuste de saldo aplicado con éxito.', 'success');
    } catch (err: any) {
      setError(err.message || 'Error de red al aplicar el ajuste.');
    } finally {
      setAdjustingAccountId(null);
    }
  };

  return (
    <section className="bg-slate-900/30 border border-slate-900 rounded-3xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden animate-fade-in">
      {importState === 'upload' && (
        <div className="space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-4">
            <h2 className="text-xl font-bold text-slate-200">Importar Extracto de Money Manager</h2>
            <p className="text-slate-400 text-sm">
              Carga el archivo Excel `.xls` o `.xlsx` exportado por Money Manager, o un archivo SQLite (`.sqlite`). El motor identificará duplicados e ingresará al vuelo cuentas y categorías nuevas.
            </p>
          </div>

          <div className="max-w-xl mx-auto mb-3 p-4 rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-350 text-xs flex flex-col gap-2 animate-fade-in text-left">
            <h3 className="font-bold text-slate-200 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
              Cuentas eliminadas y totales
            </h3>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400 mt-1">
              <li>Las cuentas que eliminaste en la app original se importarán en estado <strong>Eliminada</strong> (solo lectura).</li>
              <li>Los gastos o ingresos que hiciste exclusivamente en esas cuentas se marcan como <strong>Excluidos</strong> y no afectan tu patrimonio neto global.</li>
              <li><strong>Transferencias mixtas:</strong> Si pasaste dinero desde una cuenta eliminada hacia una cuenta activa (o viceversa), esto se registrará como un ingreso (o gasto) normal para que la cuenta activa mantenga su saldo matemáticamente perfecto.</li>
            </ul>
          </div>

          {/* Tutorial Acordeón */}
          <MoneyManagerBackupTutorial />

          <ImportWidget onAnalyzed={handleAnalyzed} onError={setError} />
          
          {isDatabaseEmpty && (
            <div className="max-w-xl mx-auto mt-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-slate-350 text-xs flex items-start gap-3.5 animate-fade-in">
              <span className="text-base shrink-0 select-none">💡</span>
              <div className="space-y-1">
                <p className="font-bold text-slate-200">¿Ya tienes una copia de seguridad?</p>
                <p className="text-slate-400 leading-relaxed">
                  Si configuras tu cuenta de Google Drive en la pestaña de respaldos, podemos buscar y restaurar tu última copia guardada en la nube de forma instantánea.
                </p>
                <button
                  onClick={() => setCurrentTab('backup')}
                  className="mt-1 text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer flex items-center gap-1 group"
                >
                  Configurar Google Drive en la pestaña de Respaldos
                  <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {importState === 'preview' && analysisResult && file && (
        <ImportPreview
          analysis={analysisResult}
          file={file}
          provider={selectedProvider}
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
  );
}
