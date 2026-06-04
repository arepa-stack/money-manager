'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ConfirmModal from '@/ui/atoms/ConfirmModal';

interface CategoryBudget {
  id: string;
  name: string;
  type: string;
  defaultBudgetUsd: number | null; // cents
  budgetUsd: number | null; // cents
  isCustom: boolean;
}

interface BudgetManagerProps {
  month: string; // "YYYY-MM"
}

// ─── Inline Edit Budget ───────────────────────────────────────────────────────

function BudgetInlineEdit({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: string;
  onSave: (val: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const err = await onSave(value.trim());
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="flex flex-col gap-1 w-full max-w-[200px]">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
          <input
            autoFocus
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            placeholder="0.00"
            className="w-full bg-slate-950 border border-indigo-500/50 focus:border-indigo-400 rounded-lg pl-6 pr-2 py-1 text-xs text-slate-100 outline-none transition-all shadow-inner"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-all cursor-pointer"
          title="Guardar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="shrink-0 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
          title="Cancelar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-rose-400 pl-1 animate-fade-in">{error}</p>
      )}
    </div>
  );
}

// ─── Budget Card ──────────────────────────────────────────────────────────────

function BudgetCard({
  item,
  spentCents,
  month,
  onBudgetUpdated,
  openConfirm,
}: {
  item: CategoryBudget;
  spentCents: number;
  month: string;
  onBudgetUpdated: (categoryId: string, newBudgetCents: number | null, isCustom: boolean) => void;
  openConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      isDestructive?: boolean;
      confirmText?: string;
      cancelText?: string;
      onlyConfirm?: boolean;
    }
  ) => void;
}) {
  const [editing, setEditing] = useState(false);

  const budgetCents = item.budgetUsd || 0;
  const hasBudget = budgetCents > 0;

  // Calculo de porcentajes y restante
  const percent = hasBudget ? Math.min(Math.round((spentCents / budgetCents) * 100), 200) : 0;
  const isOver = percent > 100;
  const isClose = percent > 80 && percent <= 100;

  const remainingCents = budgetCents - spentCents;

  const barColorClass = isOver
    ? 'bg-rose-500 animate-pulse'
    : isClose
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const progressBgClass = isOver ? 'bg-rose-500/10' : 'bg-slate-950';

  const handleSaveBudget = async (newVal: string): Promise<string | null> => {
    const val = newVal.trim();
    const numericValue = val === '' ? null : parseFloat(val);

    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0)) {
      return 'Monto inválido';
    }

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          categoryId: item.id,
          budgetUsd: numericValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return data.error || 'Error al guardar presupuesto';
      }

      onBudgetUpdated(
        item.id,
        numericValue !== null ? Math.round(numericValue * 100) : null,
        numericValue !== null
      );
      return null;
    } catch (e) {
      console.error(e);
      return 'Error de conexión';
    }
  };

  const handleRevertToDefault = () => {
    openConfirm(
      'Restaurar presupuesto',
      `¿Deseas revertir el presupuesto de "${item.name}" al valor por defecto ($${((item.defaultBudgetUsd || 0) / 100).toFixed(2)})?`,
      async () => {
        const err = await handleSaveBudget('');
        if (err) {
          openConfirm('Error', err, () => {}, { onlyConfirm: true, isDestructive: true });
        }
      }
    );
  };

  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900/30 backdrop-blur-sm px-5 py-4 flex flex-col gap-3 shadow-md hover:border-slate-800 transition-all">
      {/* Fila Superior: Nombre e Input/Display de Presupuesto */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-200 text-sm truncate">{item.name}</h4>
          {item.isCustom && (
            <span className="text-[9px] text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
              Personalizado este mes
            </span>
          )}
        </div>

        {editing ? (
          <BudgetInlineEdit
            initialValue={
              item.budgetUsd !== null
                ? (item.budgetUsd / 100).toString()
                : item.defaultBudgetUsd !== null
                  ? (item.defaultBudgetUsd / 100).toString()
                  : ''
            }
            onSave={handleSaveBudget}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Pto:</span>
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-bold text-slate-100 hover:text-indigo-400 bg-slate-950/40 border border-slate-900 hover:border-indigo-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              title="Click para editar presupuesto de este mes"
            >
              {item.budgetUsd !== null ? `$${(item.budgetUsd / 100).toFixed(2)}` : 'Establecer'}
            </button>
            {item.isCustom && (
              <button
                onClick={handleRevertToDefault}
                className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                title="Restaurar a presupuesto por defecto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fila Central: Detalle numérico de Gasto vs Presupuesto */}
      <div className="flex items-end justify-between text-xs">
        <div className="text-slate-400">
          Gasto: <strong className="text-slate-200">${(spentCents / 100).toFixed(2)}</strong>
        </div>
        {hasBudget ? (
          <div className="text-right">
            {remainingCents >= 0 ? (
              <span className="text-emerald-400 font-semibold">
                Disponible: ${(remainingCents / 100).toFixed(2)}
              </span>
            ) : (
              <span className="text-rose-400 font-bold">
                Excedido por: ${(Math.abs(remainingCents) / 100).toFixed(2)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-500 italic text-[11px]">Sin presupuesto</span>
        )}
      </div>

      {/* Fila Inferior: Barra de progreso */}
      {hasBudget && (
        <div className="space-y-1">
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900 flex items-center">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[9px] text-slate-500">
            <span>0%</span>
            <span className={isOver ? 'text-rose-400 font-bold' : isClose ? 'text-amber-400 font-medium' : ''}>
              {percent}% utilizado
            </span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BudgetManager({ month }: BudgetManagerProps) {
  const [items, setItems] = useState<CategoryBudget[]>([]);
  const [spendings, setSpendings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copying, setCopying] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmText?: string;
    cancelText?: string;
    onlyConfirm?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: false,
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onlyConfirm: false,
  });

  const openConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      isDestructive?: boolean;
      confirmText?: string;
      cancelText?: string;
      onlyConfirm?: boolean;
    }
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      isDestructive: options?.isDestructive ?? false,
      confirmText: options?.confirmText ?? 'Confirmar',
      cancelText: options?.cancelText ?? 'Cancelar',
      onlyConfirm: options?.onlyConfirm ?? false,
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cargar presupuestos del mes
      const budgetRes = await fetch(`/api/budgets?month=${month}`);
      if (!budgetRes.ok) throw new Error('Error al obtener presupuestos');
      const budgetData = await budgetRes.json();

      // 2. Cargar gastos del mes
      const spendRes = await fetch(`/api/categories/spending?month=${month}`);
      if (!spendRes.ok) throw new Error('Error al obtener gastos por categoría');
      const spendData = await spendRes.json();

      setItems(budgetData);
      setSpendings(spendData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBudgetUpdated = (categoryId: string, newBudgetCents: number | null, isCustom: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === categoryId
          ? {
              ...item,
              budgetUsd: newBudgetCents !== null ? newBudgetCents : item.defaultBudgetUsd,
              isCustom,
            }
          : item
      )
    );
  };

  // Copiar del mes anterior
  const handleCopyFromPreviousMonth = () => {
    // Calcular mes anterior
    const [yearStr, monthStr] = month.split('-');
    let year = parseInt(yearStr, 10);
    let prevMonthNum = parseInt(monthStr, 10) - 1;
    if (prevMonthNum < 1) {
      prevMonthNum = 12;
      year -= 1;
    }
    const prevMonth = `${year}-${String(prevMonthNum).padStart(2, '0')}`;

    openConfirm(
      'Copiar presupuestos',
      `¿Deseas clonar todos los presupuestos personalizados configurados en el mes anterior (${prevMonth}) a este mes (${month})? Esto reemplazará cualquier presupuesto personalizado que tengas en este mes.`,
      async () => {
        setCopying(true);
        try {
          // Obtener presupuestos del mes anterior
          const res = await fetch(`/api/budgets?month=${prevMonth}`);
          if (!res.ok) throw new Error('Error al cargar presupuestos del mes anterior');
          const prevBudgets: CategoryBudget[] = await res.json();

          // Filtrar los que tienen presupuestos personalizados o montos asignados
          const customPrev = prevBudgets.filter((b) => b.isCustom || b.budgetUsd !== null);

          // Si no hay nada personalizado, avisar
          if (customPrev.length === 0) {
            openConfirm(
              'Sin presupuestos personalizados',
              'El mes anterior no cuenta con presupuestos personalizados para copiar.',
              () => {},
              { onlyConfirm: true }
            );
            setCopying(false);
            return;
          }

          // Realizar las actualizaciones de manera secuencial (o concurrentemente pero controlada)
          // La base de categorías suele ser pequeña (menos de 20).
          const promises = customPrev.map((prevItem) =>
            fetch('/api/budgets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                month,
                categoryId: prevItem.id,
                budgetUsd: prevItem.budgetUsd !== null ? prevItem.budgetUsd / 100 : null,
              }),
            })
          );

          await Promise.all(promises);

          // Recargar datos
          await loadData();
        } catch (e: any) {
          console.error(e);
          openConfirm('Error de clonación', e.message || 'Error al clonar presupuestos.', () => {}, {
            onlyConfirm: true,
            isDestructive: true,
          });
        } finally {
          setCopying(false);
        }
      }
    );
  };

  // Filtrado de presupuestos
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Cálculos totales
  const totalBudgetedCents = items.reduce((acc, curr) => acc + (curr.budgetUsd || 0), 0);
  
  // Sumar solo los gastos de categorías que tienen un presupuesto activo (budgetUsd > 0)
  const totalSpentCents = items.reduce((acc, curr) => {
    if (curr.budgetUsd && curr.budgetUsd > 0) {
      return acc + (spendings[curr.id] || 0);
    }
    return acc;
  }, 0);

  // Gasto total real de todas las categorías de gasto de este mes
  const absoluteTotalSpentCents = Object.values(spendings).reduce((acc, curr) => acc + curr, 0);

  const totalRemainingCents = totalBudgetedCents - totalSpentCents;
  const overallPercent = totalBudgetedCents > 0
    ? Math.min(Math.round((totalSpentCents / totalBudgetedCents) * 100), 200)
    : 0;

  const overallOver = overallPercent > 100;
  const overallClose = overallPercent > 80 && overallPercent <= 100;

  const totalBarColorClass = overallOver
    ? 'bg-rose-500 animate-pulse'
    : overallClose
      ? 'bg-amber-500'
      : 'bg-indigo-500';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-xs">Cargando presupuestos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center">
        <p className="text-sm text-rose-400 font-semibold mb-2">Error al cargar datos</p>
        <p className="text-xs text-slate-500 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Panel de Resumen Global */}
      <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl backdrop-blur-md shadow-xl flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900/60 pb-3">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">Resumen Financiero del Mes</h3>
            <p className="text-[11px] text-slate-500">
              Comparativa agregada de los límites de gastos asignados contra las transacciones registradas.
            </p>
          </div>
          <div className="text-left shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold bg-slate-950/40 border border-slate-900 px-3 py-1.5 rounded-full">
              Gasto Real Total del Mes: <strong className="text-slate-200">${(absoluteTotalSpentCents / 100).toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Cajas de Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Presupuestado */}
          <div className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-4 flex flex-col gap-1 shadow-inner">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Presupuestado</span>
            <span className="text-xl font-bold text-slate-100">${(totalBudgetedCents / 100).toFixed(2)}</span>
          </div>

          {/* Gastado */}
          <div className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-4 flex flex-col gap-1 shadow-inner">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Gastado</span>
            <span className="text-xl font-bold text-slate-100">${(totalSpentCents / 100).toFixed(2)}</span>
          </div>

          {/* Restante */}
          <div className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-4 flex flex-col gap-1 shadow-inner">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {totalRemainingCents >= 0 ? 'Balance Disponible' : 'Déficit Superado'}
            </span>
            <span className={`text-xl font-bold ${totalRemainingCents >= 0 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
              ${(totalRemainingCents / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Barra de Progreso Global */}
        {totalBudgetedCents > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Uso total del presupuesto de gastos</span>
              <span className={`font-bold ${overallOver ? 'text-rose-400' : overallClose ? 'text-amber-400' : 'text-indigo-400'}`}>
                {overallPercent}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-900 flex items-center p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-500 ${totalBarColorClass}`}
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Barra de acciones y buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Buscador */}
        <div className="relative flex-1 max-w-sm w-full">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21-21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/30 border border-slate-900 focus:border-indigo-500/60 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-100 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Botón copiar mes anterior */}
        <button
          onClick={handleCopyFromPreviousMonth}
          disabled={copying}
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-xs font-semibold text-white rounded-2xl shadow-md cursor-pointer transition-colors"
        >
          {copying ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Clonando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H3.75A2.25 2.25 0 0 0 1.5 6v12a2.25 2.25 0 0 0 2.25 2.25h10.5A2.25 2.25 0 0 0 16.5 18v-2.25m-.002-3.75h5.625c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H16.5M16.5 12v5.25" />
              </svg>
              Copiar del mes anterior
            </>
          )}
        </button>
      </div>

      {/* 3. Lista de presupuestos */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <BudgetCard
              key={item.id}
              item={item}
              spentCents={spendings[item.id] || 0}
              month={month}
              onBudgetUpdated={handleBudgetUpdated}
              openConfirm={openConfirm}
            />
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl p-12 text-center text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto mb-3 text-slate-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-xs">No se encontraron categorías de gastos para presupuestar.</p>
        </div>
      )}

      {/* Modal de Confirmación */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
        isDestructive={confirmState.isDestructive}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onlyConfirm={confirmState.onlyConfirm}
      />
    </div>
  );
}
