'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ImportAnalysisResult, ImportExecuteResult } from '@/lib/domain/types';
import { formatCents } from '@/lib/moneyUtils';

interface ImportPreviewProps {
  analysis: ImportAnalysisResult;
  file: File;
  provider: string;
  onCancel: () => void;
  onSuccess: (result: ImportExecuteResult) => void;
  onError: (msg: string) => void;
}

type TabType = 'summary' | 'distributions' | 'timeline' | 'transactions';

export default function ImportPreview({
  analysis,
  file,
  provider,
  onCancel,
  onSuccess,
  onError,
}: ImportPreviewProps) {
  const [isCommitting, setIsCommitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [selectedTimelineAccount, setSelectedTimelineAccount] = useState<string>('');

  // --- Filtros de la tabla de transacciones ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'duplicate' | 'reconciled'>('all');
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Mapeo de importHash -> manualTransactionId
  const [reconciliations, setReconciliations] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    analysis.previewTransactions.forEach((t) => {
      if (t.matchCandidate) {
        initial[t.importHash] = t.matchCandidate.id;
      }
    });
    return initial;
  });

  const toggleReconciliation = (importHash: string, manualId: string) => {
    setReconciliations((prev) => {
      const next = { ...prev };
      if (next[importHash]) {
        delete next[importHash];
      } else {
        next[importHash] = manualId;
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    setIsCommitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('provider', provider);
    formData.append('reconciliations', JSON.stringify(reconciliations));

    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al persistir la importación');
      }

      const result: ImportExecuteResult = await res.json();
      onSuccess(result);
    } catch (err: any) {
      onError(err.message || 'Error guardando transacciones.');
    } finally {
      setIsCommitting(false);
    }
  };

  // Calcular totales ajustados por las reconciliaciones
  const countReconciliations = Object.keys(reconciliations).length;
  const countNewInsertions = analysis.totalParsed - countReconciliations;

  // ==========================================
  // METRICAS Y LOGICA DE DIAGNOSTICO LOCAL (CLIENT-SIDE)
  // ==========================================

  // 1. Rango de Fechas
  const dateRange = useMemo(() => {
    const dates = analysis.previewTransactions.map(t => new Date(t.date).getTime());
    if (dates.length === 0) return null;
    return {
      min: new Date(Math.min(...dates)),
      max: new Date(Math.max(...dates))
    };
  }, [analysis.previewTransactions]);

  // 2. Agrupación por Divisas y Totales
  const summaryByCurrency = useMemo(() => {
    return analysis.previewTransactions.reduce((acc, t) => {
      if (!acc[t.currency]) {
        acc[t.currency] = { INCOME: 0, EXPENSE: 0, TRANSFER: 0, count: 0 };
      }
      if (t.type === 'INCOME') acc[t.currency].INCOME += t.amount;
      if (t.type === 'EXPENSE') acc[t.currency].EXPENSE += t.amount;
      if (t.type === 'TRANSFER') acc[t.currency].TRANSFER += t.amount;
      acc[t.currency].count += 1;
      return acc;
    }, {} as Record<string, { INCOME: number; EXPENSE: number; TRANSFER: number; count: number }>);
  }, [analysis.previewTransactions]);

  // Listado único de todas las cuentas involucradas en el archivo
  const allAccountsList = useMemo(() => {
    const list = new Set<string>();
    analysis.previewTransactions.forEach(t => {
      list.add(t.accountName);
      if (t.type === 'TRANSFER') {
        list.add(t.categoryName); // En transferencia, categoryName almacena la cuenta destino
      }
    });
    return Array.from(list).sort();
  }, [analysis.previewTransactions]);

  // Seleccionar la primera cuenta por defecto para el timeline
  useEffect(() => {
    if (!selectedTimelineAccount && allAccountsList.length > 0) {
      const defaultAcc = allAccountsList.find(a => 
        a.toLowerCase().includes('efectivo') || 
        a.toLowerCase().includes('cash')
      ) || allAccountsList[0];
      setSelectedTimelineAccount(defaultAcc);
    }
  }, [allAccountsList, selectedTimelineAccount]);

  // 3. Concentración de transacciones por Cuenta (para la tab de Distribuciones)
  const accountDistribution = useMemo(() => {
    const counts: Record<string, { in: number; out: number; total: number }> = {};
    allAccountsList.forEach(acc => {
      counts[acc] = { in: 0, out: 0, total: 0 };
    });

    analysis.previewTransactions.forEach(t => {
      if (counts[t.accountName]) {
        counts[t.accountName].out += 1;
        counts[t.accountName].total += 1;
      }
      if (t.type === 'TRANSFER' && counts[t.categoryName]) {
        counts[t.categoryName].in += 1;
        counts[t.categoryName].total += 1;
      }
    });
    return counts;
  }, [analysis.previewTransactions, allAccountsList]);

  // 4. Concentración de transacciones por Categoría
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, { count: number; totalBaseUsd: number; type: string }> = {};
    analysis.previewTransactions.forEach(t => {
      if (t.type !== 'TRANSFER') {
        if (!counts[t.categoryName]) {
          counts[t.categoryName] = { count: 0, totalBaseUsd: 0, type: t.type };
        }
        counts[t.categoryName].count += 1;
        counts[t.categoryName].totalBaseUsd += t.baseAmountUsd;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  }, [analysis.previewTransactions]);

  // 6. Alertas e Inconsistencias Generales
  const dataAnomalies = useMemo(() => {
    const list: { 
      id: string; 
      type: 'warning' | 'info' | 'error'; 
      message: string; 
      description: string;
      action?: { label: string; onClick: () => void };
    }[] = [];

    // Transacciones con importe 0
    const zeroTxs = analysis.previewTransactions.filter(t => t.amount === 0);
    if (zeroTxs.length > 0) {
      list.push({
        id: 'zero-amount',
        type: 'warning',
        message: `${zeroTxs.length} transacciones con importe de 0.00`,
        description: 'El archivo Excel contiene registros sin importe financiero. Se importarán pero no alterarán los balances.'
      });
    }

    // Fechas en el futuro o demasiado antiguas
    const now = new Date();
    const futureTxs = analysis.previewTransactions.filter(t => new Date(t.date) > new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const ancientTxs = analysis.previewTransactions.filter(t => new Date(t.date).getFullYear() < 2010);

    if (futureTxs.length > 0) {
      list.push({
        id: 'future-date',
        type: 'error',
        message: `${futureTxs.length} transacciones en fecha futura`,
        description: 'Existen registros con fechas posteriores al día de hoy. Verifica si la zona horaria o el parseador de fechas del Excel es correcto.'
      });
    }
    if (ancientTxs.length > 0) {
      list.push({
        id: 'ancient-date',
        type: 'warning',
        message: `${ancientTxs.length} transacciones anteriores al año 2010`,
        description: 'Hay registros muy antiguos en el extracto. Asegúrate de que no correspondan a celdas residuales o archivos incorrectos.'
      });
    }

    return list;
  }, [analysis.previewTransactions]);

  // 7. Simulación de Línea de Tiempo del Saldo de la Cuenta Seleccionada (en USD base)
  const accountTimelineData = useMemo(() => {
    if (!selectedTimelineAccount) return { timeline: [], finalBalanceUsd: 0 };

    const affectedTxs = analysis.previewTransactions.filter(t => {
      const isOrigin = t.accountName === selectedTimelineAccount;
      const isDest = t.type === 'TRANSFER' && t.categoryName === selectedTimelineAccount;
      return isOrigin || isDest;
    });

    // Ordenar cronológicamente
    const sorted = [...affectedTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalanceUsd = 0;
    const timeline = sorted.map(t => {
      const isOrigin = t.accountName === selectedTimelineAccount;
      const isDest = t.type === 'TRANSFER' && t.categoryName === selectedTimelineAccount;

      let changeUsd = 0;
      if (t.type === 'INCOME') {
        changeUsd = t.baseAmountUsd;
      } else if (t.type === 'EXPENSE') {
        changeUsd = -t.baseAmountUsd;
      } else if (t.type === 'TRANSFER') {
        if (isOrigin) changeUsd = -t.baseAmountUsd;
        if (isDest) changeUsd = t.baseAmountUsd;
      }

      runningBalanceUsd += changeUsd;

      // Calcular variación en moneda original
      let changeOriginal = 0;
      if (t.type === 'INCOME') {
        changeOriginal = t.amount;
      } else if (t.type === 'EXPENSE') {
        changeOriginal = -t.amount;
      } else if (t.type === 'TRANSFER') {
        if (isOrigin) changeOriginal = -t.amount;
        if (isDest) changeOriginal = t.amount;
      }

      return {
        hash: t.importHash,
        date: t.date,
        description: t.type === 'TRANSFER'
          ? `Transferencia ${isOrigin ? 'a ' + t.categoryName : 'desde ' + t.accountName}`
          : `${t.type === 'INCOME' ? 'Ingreso' : 'Gasto'}: ${t.categoryName}${t.subcategoryName ? ' > ' + t.subcategoryName : ''}`,
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        changeOriginal,
        changeUsd,
        runningBalanceUsd
      };
    });

    return {
      timeline,
      finalBalanceUsd: runningBalanceUsd
    };
  }, [selectedTimelineAccount, analysis.previewTransactions]);

  // 8. Filtrado de Transacciones para la tabla interactiva
  const filteredTransactions = useMemo(() => {
    return analysis.previewTransactions.filter(t => {
      // 1. Buscador global (nota, cuenta, categoría)
      const matchesSearch = searchQuery === '' || 
        String(t.note || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(t.accountName).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(t.categoryName).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(t.subcategoryName || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Filtro de tipo
      if (filterType !== 'all' && t.type !== filterType) return false;

      // 3. Filtro de cuenta
      if (filterAccount !== 'all') {
        const isInvolved = t.accountName === filterAccount || (t.type === 'TRANSFER' && t.categoryName === filterAccount);
        if (!isInvolved) return false;
      }

      // 4. Filtro de estado
      if (filterStatus !== 'all') {
        const isReconciled = !!reconciliations[t.importHash];
        if (filterStatus === 'duplicate' && !t.isDuplicate) return false;
        if (filterStatus === 'reconciled' && (!isReconciled || t.isDuplicate)) return false;
        if (filterStatus === 'new' && (t.isDuplicate || isReconciled)) return false;
      }

      return true;
    });
  }, [analysis.previewTransactions, searchQuery, filterType, filterAccount, filterStatus, reconciliations]);

  // Resetear página al filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterAccount, filterStatus]);

  // Paginación
  const paginatedTransactions = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in text-slate-100">
      
      {/* Cabecera del Archivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-900 p-5 rounded-3xl backdrop-blur-md">
        <div className="space-y-1">
          <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {provider}
          </span>
          <h2 className="text-lg font-bold truncate max-w-md text-slate-200" title={file.name}>
            {file.name}
          </h2>
          {dateRange && (
            <p className="text-xs text-slate-400">
              Período detectado: <span className="text-slate-300 font-semibold">{dateRange.min.toLocaleDateString()}</span> al <span className="text-slate-300 font-semibold">{dateRange.max.toLocaleDateString()}</span> ({analysis.totalRows} filas totales)
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block">Acción final</span>
            <span className="text-xs font-semibold text-emerald-400">
              {countNewInsertions} nuevas transacciones
            </span>
          </div>
          <button
            onClick={onCancel}
            disabled={isCommitting}
            className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-950/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer select-none"
          >
            Atrás
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCommitting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-650/20 flex items-center gap-2 cursor-pointer select-none"
          >
            {isCommitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              <>Importar {analysis.totalParsed} filas</>
            )}
          </button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex border-b border-slate-900 overflow-x-auto gap-2 scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
            activeTab === 'summary'
              ? 'border-indigo-500 text-slate-200 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Resumen &amp; Diagnósticos
        </button>
        <button
          onClick={() => setActiveTab('distributions')}
          className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
            activeTab === 'distributions'
              ? 'border-indigo-500 text-slate-200 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Concentración de Cuentas / Categorías
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
            activeTab === 'timeline'
              ? 'border-indigo-500 text-slate-200 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Línea de Tiempo del Saldo
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-indigo-500 text-slate-200 bg-indigo-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Inspeccionar Transacciones ({filteredTransactions.length})
        </button>
      </div>

      {/* ================= PESTAÑA 1: RESUMEN Y DIAGNOSTICOS ================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-fade-in">
          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Filas de Datos</span>
              <span className="text-2xl font-bold text-slate-200 mt-1">{analysis.totalRows}</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">A Importar</span>
              <span className="text-2xl font-bold text-emerald-400 mt-1">
                {countNewInsertions} <span className="text-xs text-slate-500 font-normal">+{countReconciliations} fus.</span>
              </span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Omitidas (Duplicadas)</span>
              <span className="text-2xl font-bold text-amber-400 mt-1">{analysis.totalSkippedDuplicates}</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">Nuevas Categorías</span>
              <span className="text-2xl font-bold text-indigo-400 mt-1">{analysis.newCategories.length}</span>
            </div>
          </div>

          {/* Caja de Anomalías e Inconsistencias (Diagnósticos principales) */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <span className="text-lg">🔍</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Alertas de Calidad de Datos (Diagnóstico Local)</h3>
                <p className="text-[11px] text-slate-500">Reglas de validación analizadas sobre la estructura del archivo Excel</p>
              </div>
            </div>

            {dataAnomalies.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-emerald-400 text-xs">
                <span>✓</span>
                <p>No se encontraron inconsistencias ni anomalías estructurales en este archivo. ¡Los datos se ven listos para importar!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dataAnomalies.map((ano) => (
                  <div 
                    key={ano.id} 
                    className={`p-4 rounded-2xl border text-xs flex gap-3 items-start leading-relaxed ${
                      ano.type === 'error' 
                        ? 'bg-rose-500/5 border-rose-500/10 text-rose-350'
                        : 'bg-amber-500/5 border-amber-500/10 text-amber-350'
                    }`}
                  >
                    <span className="text-base select-none mt-0.5 shrink-0">
                      {ano.type === 'error' ? '❌' : '⚠️'}
                    </span>
                    <div className="space-y-1 w-full">
                      <p className="font-bold text-slate-200">{ano.message}</p>
                      <p className="text-slate-400 text-[11px] leading-normal">{ano.description}</p>
                      {ano.action && (
                        <button
                          type="button"
                          onClick={ano.action.onClick}
                          className="mt-2 text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer block text-left text-[10px]"
                        >
                          {ano.action.label} →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totales Monetarios por Divisa */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <span className="text-lg">💵</span>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Flujos de Dinero por Divisa en el Excel</h3>
                <p className="text-[11px] text-slate-500">Montos totales acumulados en el archivo por cada divisa detectada</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(summaryByCurrency).map(([curr, data]) => (
                <div key={curr} className="bg-slate-950/40 border border-slate-900/80 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-1.5">
                    <span className="text-xs font-bold text-slate-300">{curr}</span>
                    <span className="text-[10px] text-slate-500">{data.count} transacciones</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 block uppercase">Ingresos</span>
                      <span className="font-semibold text-emerald-400">${formatCents(data.INCOME)}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 block uppercase">Gastos</span>
                      <span className="font-semibold text-slate-200">${formatCents(data.EXPENSE)}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 block uppercase">Neto (Flujo)</span>
                      <span className={`font-bold ${data.INCOME - data.EXPENSE >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {data.INCOME - data.EXPENSE >= 0 ? '+' : '-'}${formatCents(Math.abs(data.INCOME - data.EXPENSE))}
                      </span>
                    </div>
                  </div>
                  {data.TRANSFER > 0 && (
                    <div className="text-[10px] bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 px-2.5 py-1.5 rounded-xl flex justify-between items-center">
                      <span>Movimiento de transferencias internas:</span>
                      <span className="font-bold">${formatCents(data.TRANSFER)} {curr}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Entidades Nuevas */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Estructura del Sistema (Entidades Nuevas)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div className="space-y-2">
                <span className="font-semibold text-slate-400 block border-b border-slate-900 pb-1">Cuentas Nuevas ({analysis.newAccounts.length})</span>
                {analysis.newAccounts.length === 0 ? (
                  <p className="italic text-slate-650">Ninguna cuenta nueva</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {analysis.newAccounts.map(a => (
                      <span key={a} className="px-2 py-0.5 bg-slate-950 border border-slate-900 text-slate-300 rounded">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <span className="font-semibold text-slate-400 block border-b border-slate-900 pb-1">Categorías Nuevas ({analysis.newCategories.length})</span>
                {analysis.newCategories.length === 0 ? (
                  <p className="italic text-slate-650">Ninguna categoría nueva</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {analysis.newCategories.map(c => (
                      <span key={c.name} className="px-2 py-0.5 bg-slate-950 border border-slate-900 text-slate-300 rounded flex items-center gap-1">
                        {c.name}
                        <span className={`w-1 h-1 rounded-full ${c.type === 'INCOME' ? 'bg-emerald-400' : c.type === 'TRANSFER' ? 'bg-indigo-400' : 'bg-slate-400'}`}></span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <span className="font-semibold text-slate-400 block border-b border-slate-900 pb-1">Subcategorías Nuevas ({analysis.newSubcategories.length})</span>
                {analysis.newSubcategories.length === 0 ? (
                  <p className="italic text-slate-650">Ninguna subcategoría nueva</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {analysis.newSubcategories.map(s => (
                      <span key={`${s.categoryName}_${s.name}`} className="px-2 py-0.5 bg-slate-950 border border-slate-900 text-slate-300 rounded">
                        <span className="text-slate-500">{s.categoryName} &gt;</span> {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PESTAÑA 2: CONCENTRACIÓN DE CUENTAS / CATEGORIAS ================= */}
      {activeTab === 'distributions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          
          {/* Cuentas Involucradas */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">Distribución por Cuentas</h3>
            <div className="space-y-3">
              {Object.entries(accountDistribution).map(([accName, counts]) => {
                const totalInFile = analysis.previewTransactions.length;
                const percent = Math.round((counts.total / totalInFile) * 100) || 0;
                
                return (
                  <div key={accName} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-300">{accName}</span>
                      <span className="text-slate-500">
                        {counts.total} transacciones ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                      {counts.out > 0 && (
                        <div 
                          className="bg-slate-500 h-full" 
                          style={{ width: `${(counts.out / totalInFile) * 100}%` }}
                          title={`Gastos/Salidas: ${counts.out}`}
                        />
                      )}
                      {counts.in > 0 && (
                        <div 
                          className="bg-indigo-500 h-full" 
                          style={{ width: `${(counts.in / totalInFile) * 100}%` }}
                          title={`Ingresos/Transferencias entrantes: ${counts.in}`}
                        />
                      )}
                    </div>
                    <div className="flex gap-2 text-[10px] text-slate-500">
                      {counts.out > 0 && <span>Debitado: {counts.out}</span>}
                      {counts.in > 0 && <span>Acreditado: {counts.in}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Categorías más activas */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">Distribución por Categorías</h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {categoryDistribution.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-10">Solo hay transferencias internas en este archivo</p>
              ) : (
                categoryDistribution.map(([catName, data]) => {
                  const maxCount = categoryDistribution[0][1].count;
                  const relativeBarWidth = Math.round((data.count / maxCount) * 100);
                  
                  return (
                    <div key={catName} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-300 flex items-center gap-1.5">
                          {catName}
                          <span className={`w-1.5 h-1.5 rounded-full ${data.type === 'INCOME' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                        </span>
                        <span className="text-slate-500">
                          {data.count} txs (${formatCents(data.totalBaseUsd)} USD)
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${data.type === 'INCOME' ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                          style={{ width: `${relativeBarWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= PESTAÑA 3: LINEA DE TIEMPO DEL SALDO ================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Controles de la Línea de Tiempo */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-200">Simulador de Saldo Acumulado</h3>
              <p className="text-[11px] text-slate-400">
                Selecciona una cuenta para ver cómo evoluciona su saldo a lo largo del tiempo con los registros del Excel.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <label htmlFor="timeline-account-select" className="text-xs text-slate-400 shrink-0">Cuenta:</label>
              <select
                id="timeline-account-select"
                value={selectedTimelineAccount}
                onChange={(e) => setSelectedTimelineAccount(e.target.value)}
                className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-350 cursor-pointer"
              >
                {allAccountsList.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de evolución temporal del saldo */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-900/10">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Evolución Cronológica: {selectedTimelineAccount}
              </span>
              
              {/* Saldos finales simulados */}
              <div className="flex gap-2">
                <span 
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                    accountTimelineData.finalBalanceUsd >= 0 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}
                >
                  Saldo Final Estimado: {accountTimelineData.finalBalanceUsd >= 0 ? '+' : '-'}${formatCents(Math.abs(accountTimelineData.finalBalanceUsd))} USD
                </span>
              </div>
            </div>

            {accountTimelineData.timeline.length === 0 ? (
              <div className="text-center py-12 text-slate-500 italic text-xs">
                No hay transacciones registradas para esta cuenta en el archivo Excel.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/20 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900">
                      <th className="px-5 py-3">Fecha</th>
                      <th className="px-5 py-3">Transacción / Descripción</th>
                      <th className="px-5 py-3 text-right">Variación</th>
                      <th className="px-5 py-3 text-right">Saldo Acumulado (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-350">
                    {accountTimelineData.timeline.map((item, idx) => {
                      const isNegative = item.runningBalanceUsd < 0;
                      
                      return (
                        <tr 
                          key={`${item.hash}-${idx}`} 
                          className={`hover:bg-slate-900/10 transition-colors ${
                            isNegative ? 'bg-rose-500/[0.02]' : ''
                          }`}
                        >
                          <td className="px-5 py-3 whitespace-nowrap text-slate-500 font-mono">
                            {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-200">
                            {item.description}
                          </td>
                          <td className="px-5 py-3 text-right whitespace-nowrap">
                            <span className={`font-semibold ${
                              item.changeOriginal > 0 
                                ? 'text-emerald-400' 
                                : item.type === 'TRANSFER' 
                                  ? 'text-indigo-400' 
                                  : 'text-slate-300'
                            }`}>
                              {item.changeOriginal > 0 ? '+' : ''}{formatCents(item.changeOriginal)} <span className="text-[9px] text-slate-500 font-normal">{item.currency}</span>
                            </span>
                            {item.currency !== 'USD' && (
                              <span className="block text-[9px] text-slate-400 font-medium">
                                ({item.changeUsd > 0 ? '+' : ''}${formatCents(item.changeUsd)} USD)
                              </span>
                            )}
                          </td>
                          <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${
                            isNegative ? 'text-rose-400' : 'text-slate-200'
                          }`}>
                            {isNegative ? '-' : ''}${formatCents(Math.abs(item.runningBalanceUsd))} <span className="text-[9px] text-slate-500 font-normal">USD</span>
                            {isNegative && (
                              <span className="block text-[8px] text-rose-500 font-semibold uppercase tracking-wider mt-0.5">
                                Saldo en Rojo ⚠️
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= PESTAÑA 4: INSPECCION DE TRANSACCIONES ================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Barra de Filtros e Inspección */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              
              {/* Buscador */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar nota, cuenta, categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-300"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-650 text-xs">🔍</span>
              </div>

              {/* Filtro Tipo */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-350 cursor-pointer"
              >
                <option value="all">Todos los Tipos</option>
                <option value="INCOME">Ingreso</option>
                <option value="EXPENSE">Gasto</option>
                <option value="TRANSFER">Transferencia</option>
              </select>

              {/* Filtro Cuenta */}
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-350 cursor-pointer"
              >
                <option value="all">Todas las Cuentas</option>
                {allAccountsList.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Filtro Estado */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-350 cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="new">Solo Nuevos</option>
                <option value="reconciled">Fusionados (Manual)</option>
                <option value="duplicate">Duplicados (Omitidos)</option>
              </select>
            </div>
          </div>

          {/* Tabla de Preview principal */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/20 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-900">
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Cuenta</th>
                    <th className="px-5 py-3">Categoría / Sub</th>
                    <th className="px-5 py-3">Importe</th>
                    <th className="px-5 py-3">Base (USD)</th>
                    <th className="px-5 py-3">Nota / Detalle</th>
                    <th className="px-5 py-3 text-center">Estado / Conciliación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-350">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-500 italic">
                        No se encontraron registros que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((t, idx) => {
                      const hasMatch = !!t.matchCandidate;
                      const isReconciled = hasMatch && !!reconciliations[t.importHash];

                      return (
                        <tr 
                          key={`${t.importHash}-${idx}`} 
                          className={`${t.isDuplicate ? 'opacity-40 bg-slate-950/20' : 'hover:bg-slate-900/10 transition-colors'}`}
                        >
                          <td className="px-5 py-3 whitespace-nowrap text-slate-500 font-mono">
                            {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-200 whitespace-nowrap">{t.accountName}</td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className="text-slate-200">{t.categoryName}</span>
                            {t.subcategoryName && (
                              <span className="text-[10px] text-slate-500 block">&gt; {t.subcategoryName}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span className={`font-semibold ${
                              t.type === 'INCOME' ? 'text-emerald-400' : t.type === 'TRANSFER' ? 'text-indigo-400' : 'text-slate-200'
                            }`}>
                              {t.type === 'EXPENSE' ? '-' : t.type === 'INCOME' ? '+' : ''}
                              {formatCents(t.amount)}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1">{t.currency}</span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-300">
                            ${formatCents(t.baseAmountUsd)}
                          </td>
                          <td className="px-5 py-3 max-w-[150px] truncate text-slate-400" title={t.note || ''}>
                            {t.note || '-'}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap text-center">
                            {t.isDuplicate ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Duplicado (Omitido)
                              </span>
                            ) : hasMatch ? (
                              <button
                                type="button"
                                onClick={() => toggleReconciliation(t.importHash, t.matchCandidate!.id)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all cursor-pointer select-none ${
                                  isReconciled
                                    ? 'bg-indigo-600 text-indigo-100 border-indigo-500/30'
                                    : 'bg-slate-950 text-slate-450 border-slate-900 hover:text-slate-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isReconciled}
                                  onChange={() => {}} // event handled by button click
                                  className="w-2.5 h-2.5 rounded text-indigo-500 border-slate-700 bg-slate-950 pointer-events-none"
                                />
                                <span>Fusionar con Manual</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                                Nuevo
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador */}
            {filteredTransactions.length > 0 && (
              <div className="px-5 py-3.5 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500 bg-slate-950/20">
                <div>
                  Mostrando <span className="font-semibold text-slate-350">{Math.min(filteredTransactions.length, (currentPage - 1) * itemsPerPage + 1)}</span> a <span className="font-semibold text-slate-350">{Math.min(filteredTransactions.length, currentPage * itemsPerPage)}</span> de <span className="font-semibold text-slate-350">{filteredTransactions.length}</span> transacciones filtradas.
                </div>
                
                <div className="flex items-center gap-3 self-center sm:self-auto">
                  <div className="flex items-center gap-1.5">
                    <span>Ver:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-950 border border-slate-900 rounded px-1.5 py-0.5 focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 border border-slate-900 bg-slate-950 rounded hover:bg-slate-900 disabled:opacity-30 cursor-pointer select-none"
                    >
                      ←
                    </button>
                    <span className="px-2">Pág. <span className="font-semibold text-slate-350">{currentPage}</span> de {totalPages}</span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 border border-slate-900 bg-slate-950 rounded hover:bg-slate-900 disabled:opacity-30 cursor-pointer select-none"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
