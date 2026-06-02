'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface Account {
  id: string;
  name: string;
  type: string;
  currency: string;
  createdAt: string;
}

interface AccountManagerProps {
  onChange?: () => void;
}

const ACCOUNT_TYPES = [
  { id: 'CASH', name: 'Efectivo', icon: '💵', label: 'Efectivo' },
  { id: 'BANK', name: 'Banco / Débito', icon: '🏦', label: 'Banco' },
  { id: 'CREDIT_CARD', name: 'Tarjeta de Crédito (Pasivo)', icon: '💳', label: 'T. Crédito' },
  { id: 'INVESTMENT', name: 'Inversión', icon: '📈', label: 'Inversión' },
];

const CURRENCIES = [
  { id: 'USD', symbol: '$', name: 'USD' },
  { id: 'VES', symbol: 'Bs', name: 'VES' },
  { id: 'EUR', symbol: '€', name: 'EUR' },
];

export default function AccountManager({ onChange }: AccountManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('CASH');
  const [newAccountCurrency, setNewAccountCurrency] = useState('USD');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('CASH');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/accounts');
      if (!res.ok) throw new Error('Error al obtener las cuentas');
      const data = await res.json();
      setAccounts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccountName.trim(),
          type: newAccountType,
          currency: newAccountCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Error al crear la cuenta');
      } else {
        setAccounts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewAccountName('');
        setNewAccountType('CASH');
        setNewAccountCurrency('USD');
        onChange?.();
      }
    } catch (err) {
      setCreateError('Error al conectar con el servidor.');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    setUpdating(true);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          type: editType,
          currency: editCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUpdateError(data.error || 'Error al actualizar la cuenta');
      } else {
        setAccounts((prev) =>
          prev.map((acc) => (acc.id === id ? data : acc)).sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
        setEditName('');
        onChange?.();
      }
    } catch (err) {
      setUpdateError('Error al conectar con el servidor.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (account: Account) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la cuenta "${account.name}"?`)) return;

    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al eliminar la cuenta');
      } else {
        setAccounts((prev) => prev.filter((acc) => acc.id !== account.id));
        onChange?.();
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión al eliminar la cuenta.');
    }
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id);
    setEditName(account.name);
    setEditType(account.type || 'CASH');
    setEditCurrency(account.currency || 'USD');
    setUpdateError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditType('CASH');
    setEditCurrency('USD');
    setUpdateError(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Form Card */}
      <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl backdrop-blur-md shadow-xl">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-200">Gestión de Cuentas</h2>
          <p className="text-xs text-slate-500">
            Crea cuentas manuales para registrar transacciones y transferencias nativas.
          </p>
        </div>

        {/* Create Form */}
        <form onSubmit={handleCreate} className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2 w-full space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
              Nombre de la Cuenta
            </label>
            <input
              type="text"
              placeholder="Ej. Efectivo, Cuenta Corriente, Banesco..."
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              disabled={creating}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>

          <div className="w-full space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
              Tipo de Cuenta
            </label>
            <select
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value)}
              disabled={creating}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-350 focus:outline-none transition-all cursor-pointer"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                Moneda
              </label>
              <select
                value={newAccountCurrency}
                onChange={(e) => setNewAccountCurrency(e.target.value)}
                disabled={creating}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-slate-350 focus:outline-none transition-all cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={creating || !newAccountName.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-md shadow-indigo-600/10 shrink-0 h-[42px]"
            >
              {creating ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
        {createError && <p className="text-xs text-rose-400 mt-2 pl-1">{createError}</p>}
      </div>

      {/* Accounts List */}
      <div className="space-y-2">
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-xs">Cargando cuentas...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-200 p-4 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {!loading && !error && accounts.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm italic">
            No tienes ninguna cuenta registrada. Crea una arriba.
          </div>
        )}

        {!loading && !error && accounts.map((acc) => {
          const typeMeta = ACCOUNT_TYPES.find(t => t.id === acc.type) || ACCOUNT_TYPES[0];
          const currMeta = CURRENCIES.find(c => c.id === acc.currency) || CURRENCIES[0];

          return (
            <div
              key={acc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/20 hover:bg-slate-900/35 border border-slate-900/80 hover:border-slate-800 rounded-2xl px-5 py-4 transition-all group"
            >
              {editingId === acc.id ? (
                <div className="flex-1 flex flex-col gap-2.5 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center w-full">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(acc.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      disabled={updating}
                      className="sm:col-span-2 bg-slate-950 border border-indigo-500/50 focus:border-indigo-400 rounded-lg px-3 py-1.5 text-sm text-slate-100 outline-none transition-all min-w-0"
                      placeholder="Nombre de cuenta"
                    />

                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      disabled={updating}
                      className="bg-slate-950 border border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none transition-all cursor-pointer"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      disabled={updating}
                      className="bg-slate-950 border border-indigo-500/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-350 focus:outline-none transition-all cursor-pointer"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleUpdate(acc.id)}
                      disabled={updating || !editName.trim()}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg cursor-pointer transition-all shrink-0"
                    >
                      {updating ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={updating}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-all shrink-0"
                    >
                      Cancelar
                    </button>
                  </div>
                  {updateError && <p className="text-xs text-rose-400 pl-1">{updateError}</p>}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 text-lg">
                      {typeMeta.icon}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-200 text-sm block">{acc.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">
                        {typeMeta.label} • {currMeta.name} ({currMeta.symbol})
                      </span>
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => startEdit(acc)}
                      className="text-slate-500 hover:text-indigo-400 p-1.5 rounded cursor-pointer transition-colors"
                      title="Editar cuenta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(acc)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded cursor-pointer transition-colors"
                      title="Eliminar cuenta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0L9 9m5.63-3c.18-1.55-1.1-2.9-2.75-2.903-1.65-.003-2.93 1.34-2.75 2.903m12 .138-1.598 13.518c-.113 1.156-1.1 2.03-2.251 2.03H7.212c-1.152 0-2.138-.874-2.253-2.03L3 5.968m15.549-1.2h-11.23" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
