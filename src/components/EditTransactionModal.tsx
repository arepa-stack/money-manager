'use client';

import React, { useState, useEffect } from 'react';

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  type: string; // 'INCOME' | 'EXPENSE' | 'TRANSFER'
  subcategories: Subcategory[];
}

interface Transaction {
  id: string;
  transactionDate: string;
  amount: number; // centavos
  currency: string;
  baseAmountUsd: number; // centavos
  transactionType: string;
  note: string | null;
  description: string | null;
  accountId: string;
  categoryId: string;
  subcategoryId: string | null;
  destinationAccountId: string | null;
}

interface EditTransactionModalProps {
  transaction: Transaction;
  accounts: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

// Convert YYYY-MM-DDTHH:MM format
const formatToDatetimeLocal = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function EditTransactionModal({
  transaction,
  accounts,
  onClose,
  onSuccess,
}: EditTransactionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [transactionDate, setTransactionDate] = useState(formatToDatetimeLocal(transaction.transactionDate));
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [transactionType, setTransactionType] = useState<string>(transaction.transactionType);
  const [amount, setAmount] = useState<number | string>(transaction.amount / 100);
  const [currency, setCurrency] = useState(transaction.currency);
  const [baseAmountUsd, setBaseAmountUsd] = useState<number | string>(transaction.baseAmountUsd / 100);
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [subcategoryId, setSubcategoryId] = useState(transaction.subcategoryId || '');
  const [destinationAccountId, setDestinationAccountId] = useState(transaction.destinationAccountId || '');
  const [note, setNote] = useState(transaction.note || '');
  const [description, setDescription] = useState(transaction.description || '');

  // Load Categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCategories();
  }, []);

  // Sync BaseAmountUsd automatically when Currency is USD
  useEffect(() => {
    if (currency.toUpperCase() === 'USD') {
      setBaseAmountUsd(amount);
    }
  }, [amount, currency]);

  // Handle Type Change
  const handleTypeChange = (newType: string) => {
    setTransactionType(newType);
    if (newType === 'TRANSFER') {
      const transferCat = categories.find((c) => c.type === 'TRANSFER');
      if (transferCat) setCategoryId(transferCat.id);
      setSubcategoryId('');
      // Seleccionar una cuenta destino por defecto diferente de la actual si no hay ninguna
      if (!destinationAccountId || destinationAccountId === accountId) {
        const defaultDest = accounts.find((a) => a.id !== accountId);
        setDestinationAccountId(defaultDest ? defaultDest.id : '');
      }
    } else {
      setDestinationAccountId('');
      // Seleccionar la primera categoría de ese tipo
      const firstCat = categories.find((c) => c.type === newType);
      setCategoryId(firstCat ? firstCat.id : '');
      setSubcategoryId('');
    }
  };

  // Handle Account Change
  const handleAccountChange = (newAccountId: string) => {
    setAccountId(newAccountId);
    // Si es transferencia y coincide con el destino, cambiar el destino
    if (transactionType === 'TRANSFER' && destinationAccountId === newAccountId) {
      const altDest = accounts.find((a) => a.id !== newAccountId);
      setDestinationAccountId(altDest ? altDest.id : '');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const parsedAmount = parseFloat(String(amount));
    const parsedBaseAmount = parseFloat(String(baseAmountUsd));

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('El importe original debe ser un número válido mayor a cero.');
      setSaving(false);
      return;
    }

    if (isNaN(parsedBaseAmount) || parsedBaseAmount <= 0) {
      setError('El equivalente USD debe ser un número válido mayor a cero.');
      setSaving(false);
      return;
    }

    if (transactionType === 'TRANSFER' && !destinationAccountId) {
      setError('Las transferencias requieren una cuenta de destino.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionDate: new Date(transactionDate).toISOString(),
          accountId,
          transactionType,
          amount: parsedAmount,
          currency: currency.toUpperCase(),
          baseAmountUsd: parsedBaseAmount,
          categoryId,
          subcategoryId: subcategoryId || null,
          destinationAccountId: transactionType === 'TRANSFER' ? destinationAccountId : null,
          note: note.trim() || null,
          description: description.trim() || null,
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al actualizar la transacción.');
      }
    } catch (err: any) {
      setError('Error de red al actualizar la transacción.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Filter categories and subcategories lists
  const filteredCategories = categories.filter((c) => c.type === transactionType);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const availableSubcategories = selectedCategory ? selectedCategory.subcategories : [];

  return (
    <div 
      className="fixed inset-0 bg-slate-955/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-950 border border-slate-850 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-900">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Editar Transacción</h3>
            <p className="text-xs text-slate-500 mt-0.5">Modifica los detalles del registro seleccionado</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-700 cursor-pointer transition-all"
            title="Cerrar modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-rose-950/40 border border-rose-500/30 text-rose-250 text-rose-300 p-4 rounded-xl text-xs flex items-center gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5 text-rose-450 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha y Hora */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all outline-none"
              />
            </div>

            {/* Tipo de Movimiento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Tipo de Movimiento</label>
              <select
                value={transactionType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all outline-none"
              >
                <option value="EXPENSE">Gasto (Expense)</option>
                <option value="INCOME">Ingreso (Income)</option>
                <option value="TRANSFER">Transferencia (Transfer)</option>
              </select>
            </div>

            {/* Cuenta Origen */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">
                {transactionType === 'TRANSFER' ? 'Cuenta de Origen' : 'Cuenta'}
              </label>
              <select
                value={accountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Cuenta Destino (Solo para Transferencia) */}
            {transactionType === 'TRANSFER' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Cuenta de Destino</label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all outline-none"
                >
                  <option value="" disabled>Selecciona destino</option>
                  {accounts.filter((a) => a.id !== accountId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Importe Original */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Importe Original</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-3.5 pr-14 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.00"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 uppercase">
                  {currency}
                </span>
              </div>
            </div>

            {/* Divisa */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Divisa</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                required
                maxLength={4}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all outline-none uppercase"
                placeholder="USD"
              />
            </div>

            {/* Equivalente USD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Equivalente USD (Moneda Base)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={baseAmountUsd}
                  onChange={(e) => setBaseAmountUsd(e.target.value)}
                  required
                  disabled={currency.toUpperCase() === 'USD'}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-3.5 pr-12 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.00"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-550 text-slate-500">
                  USD
                </span>
              </div>
            </div>

            {/* Categoría (Oculto/Fijo si es TRANSFER) */}
            {transactionType !== 'TRANSFER' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 font-medium">Categoría</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId('');
                  }}
                  required
                  disabled={loadingCats}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-55 transition-all outline-none"
                >
                  <option value="" disabled>Selecciona categoría</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Subcategoría (Oculto si es TRANSFER) */}
            {transactionType !== 'TRANSFER' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Subcategoría (Opcional)</label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  disabled={loadingCats || availableSubcategories.length === 0}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-40 transition-all outline-none"
                >
                  <option value="">Ninguna subcategoría</option>
                  {availableSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Nota */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Nota corta</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all outline-none"
              placeholder="Ej. Almuerzo de negocios"
            />
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Descripción detallada</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all outline-none resize-none"
              placeholder="Detalles adicionales sobre el movimiento..."
            />
          </div>

          {/* Acciones */}
          <div className="pt-4 border-t border-slate-900 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-850 cursor-pointer disabled:opacity-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || loadingCats}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-650 text-white hover:bg-indigo-600 cursor-pointer disabled:opacity-55 transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
