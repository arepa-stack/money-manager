'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  type: string; // 'INCOME' | 'EXPENSE' | 'TRANSFER'
  budgetUsd?: number | null;
  subcategories: Subcategory[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; dot: string; bg: string; border: string }> = {
  INCOME: {
    label: 'Ingresos',
    color: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/20',
  },
  EXPENSE: {
    label: 'Gastos',
    color: 'text-rose-400',
    dot: 'bg-rose-400',
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/20',
  },
  TRANSFER: {
    label: 'Transferencias',
    color: 'text-indigo-400',
    dot: 'bg-indigo-400',
    bg: 'bg-indigo-500/8',
    border: 'border-indigo-500/20',
  },
};

// ─── Inline Edit Input ────────────────────────────────────────────────────────

function InlineEdit({
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
    if (value.trim() === initialValue.trim()) {
      onCancel();
      return;
    }
    setSaving(true);
    setError(null);
    const err = await onSave(value.trim());
    setSaving(false);
    if (err) setError(err);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="flex-1 bg-slate-950 border border-indigo-500/50 focus:border-indigo-400 rounded-lg px-3 py-1.5 text-sm text-slate-100 outline-none transition-all shadow-inner min-w-0"
        />
        <button
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all cursor-pointer"
        >
          {saving ? '...' : 'Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
        >
          Cancelar
        </button>
      </div>
      {error && (
        <p className="text-xs text-rose-400 pl-1 animate-fade-in">{error}</p>
      )}
    </div>
  );
}

// ─── Subcategory Row ──────────────────────────────────────────────────────────

function SubcategoryRow({
  sub,
  onRenamed,
  onDeleted,
}: {
  sub: Subcategory;
  onRenamed: (id: string, newName: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (newName: string): Promise<string | null> => {
    const res = await fetch(`/api/subcategories/${sub.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Error al guardar.';
    onRenamed(sub.id, data.name);
    setEditing(false);
    return null;
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la subcategoría "${sub.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/subcategories/${sub.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al eliminar la subcategoría');
      } else {
        onDeleted(sub.id);
      }
    } catch (e) {
      console.error(e);
      alert('Error en la conexión al eliminar.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 pl-4 py-2 group/sub">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
      {editing ? (
        <InlineEdit
          initialValue={sub.name}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-slate-300 truncate">{sub.name}</span>
          <div className="opacity-0 group-hover/sub:opacity-100 transition-opacity ml-auto shrink-0 flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="text-slate-500 hover:text-indigo-400 p-1 rounded cursor-pointer"
              title="Editar subcategoría"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer disabled:opacity-50"
              title="Eliminar subcategoría"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0L9 9m5.63-3c.18-1.55-1.1-2.9-2.75-2.903-1.65-.003-2.93 1.34-2.75 2.903m12 .138-1.598 13.518c-.113 1.156-1.1 2.03-2.251 2.03H7.212c-1.152 0-2.138-.874-2.253-2.03L3 5.968m15.549-1.2h-11.23" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  spendingUsd = 0,
  onCategoryUpdated,
  onCategoryDeleted,
  onSubcategoryAdded,
  onSubcategoryRenamed,
  onSubcategoryDeleted,
}: {
  category: Category;
  spendingUsd?: number;
  onCategoryUpdated: (id: string, name: string, type: string, budgetUsd: number | null) => void;
  onCategoryDeleted: (id: string) => void;
  onSubcategoryAdded: (catId: string, sub: Subcategory) => void;
  onSubcategoryRenamed: (catId: string, subId: string, newName: string) => void;
  onSubcategoryDeleted: (catId: string, subId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [tempName, setTempName] = useState(category.name);
  const [tempBudget, setTempBudget] = useState(
    category.budgetUsd !== null && category.budgetUsd !== undefined
      ? (category.budgetUsd / 100).toString()
      : ''
  );
  const [deletingCat, setDeletingCat] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);

  const meta = TYPE_META[category.type] ?? TYPE_META.EXPENSE;

  const handleCatSave = async () => {
    if (!tempName.trim()) return;
    setSavingCat(true);
    try {
      const budgetVal = tempBudget.trim() ? parseFloat(tempBudget.trim()) : null;
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tempName.trim(),
          type: category.type,
          budgetUsd: budgetVal !== null && !isNaN(budgetVal) ? budgetVal : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al guardar la categoría.');
      } else {
        onCategoryUpdated(category.id, data.name, data.type, data.budgetUsd);
        setEditingCat(false);
      }
    } catch (err) {
      alert('Error al conectar con el servidor.');
    } finally {
      setSavingCat(false);
    }
  };

  const handleCatDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la categoría "${category.name}" y todas sus subcategorías?`)) return;
    setDeletingCat(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al eliminar la categoría');
      } else {
        onCategoryDeleted(category.id);
      }
    } catch (e) {
      console.error(e);
      alert('Error en la conexión al eliminar la categoría.');
    } finally {
      setDeletingCat(false);
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    setAddingSub(true);
    setSubError(null);
    try {
      const res = await fetch('/api/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: category.id, name: newSubName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubError(data.error || 'Error al crear la subcategoría');
      } else {
        onSubcategoryAdded(category.id, data);
        setNewSubName('');
      }
    } catch (err) {
      setSubError('Error al conectar con el servidor.');
    } finally {
      setAddingSub(false);
    }
  };

  const startEdit = () => {
    setTempName(category.name);
    setTempBudget(
      category.budgetUsd !== null && category.budgetUsd !== undefined
        ? (category.budgetUsd / 100).toString()
        : ''
    );
    setEditingCat(true);
  };

  // Cálculo de barra de presupuesto
  const budgetCents = category.budgetUsd || 0;
  const showBudget = category.type === 'EXPENSE' && budgetCents > 0;
  const percent = showBudget ? Math.min(Math.round((spendingUsd / budgetCents) * 100), 200) : 0;
  const isOver = percent > 100;
  
  // Clases de color para barra
  const barColorClass = percent > 100 
    ? 'bg-rose-500 animate-pulse' 
    : percent > 80 
      ? 'bg-amber-500' 
      : 'bg-emerald-500';

  return (
    <div className={`rounded-2xl border ${meta.border} bg-slate-900/30 backdrop-blur-sm overflow-hidden transition-all shadow-md`}>
      {/* Header row */}
      <div className="flex flex-col gap-2.5 px-5 py-4">
        <div className="flex items-center gap-3 group/cat">
          {/* Expand toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-0.5"
            aria-label={open ? 'Colapsar' : 'Expandir'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          {/* Category name or edit input */}
          <div className="flex-1 min-w-0">
            {editingCat ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <input
                  autoFocus
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-indigo-500/50 rounded-lg px-2.5 py-1 text-sm text-slate-100 outline-none"
                  placeholder="Nombre categoría"
                />
                {category.type === 'EXPENSE' && (
                  <input
                    type="number"
                    step="0.01"
                    value={tempBudget}
                    onChange={(e) => setTempBudget(e.target.value)}
                    className="w-28 bg-slate-950 border border-indigo-500/50 rounded-lg px-2.5 py-1 text-sm text-slate-100 outline-none"
                    placeholder="Pto. mensual"
                  />
                )}
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={handleCatSave}
                    disabled={savingCat || !tempName.trim()}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-650 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg cursor-pointer transition-colors"
                  >
                    {savingCat ? '...' : 'Guardar'}
                  </button>
                  <button
                    onClick={() => setEditingCat(false)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                <span className="font-semibold text-slate-100 text-sm truncate">{category.name}</span>
                
                {category.type === 'EXPENSE' && (
                  <span className="text-[10px] text-slate-500 font-bold bg-slate-950/40 px-2 py-0.5 rounded border border-slate-900 ml-1">
                    {category.budgetUsd 
                      ? `Pto: $${(category.budgetUsd / 100).toFixed(0)}` 
                      : 'Sin presupuesto'}
                  </span>
                )}

                <div className="opacity-0 group-hover/cat:opacity-100 transition-opacity ml-2 shrink-0 flex items-center gap-0.5">
                  <button
                    onClick={startEdit}
                    className="text-slate-500 hover:text-indigo-400 p-1 rounded cursor-pointer"
                    title="Editar categoría"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={handleCatDelete}
                    disabled={deletingCat}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded cursor-pointer disabled:opacity-50"
                    title="Eliminar categoría"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0L9 9m5.63-3c.18-1.55-1.1-2.9-2.75-2.903-1.65-.003-2.93 1.34-2.75 2.903m12 .138-1.598 13.518c-.113 1.156-1.1 2.03-2.251 2.03H7.212c-1.152 0-2.138-.874-2.253-2.03L3 5.968m15.549-1.2h-11.23" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Subcategory count pill */}
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.border} ${meta.color} bg-transparent`}>
            {category.subcategories.length} sub
          </span>
        </div>

        {/* Budget Progress Bar */}
        {showBudget && !editingCat && (
          <div className="pl-5 space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-medium">
                Gasto este mes: <strong className="text-slate-200">${(spendingUsd / 100).toFixed(2)}</strong> de <strong className="text-slate-200">${(budgetCents / 100).toFixed(0)}</strong>
              </span>
              <span className={`font-bold ${isOver ? 'text-rose-400' : 'text-slate-400'}`}>
                {percent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Subcategories collapsible */}
      {open && (
        <div className="border-t border-slate-800/60 px-5 py-3 space-y-2 bg-slate-950/20">
          {category.subcategories.length > 0 ? (
            <div className="space-y-0.5">
              {category.subcategories.map((sub) => (
                <SubcategoryRow
                  key={sub.id}
                  sub={sub}
                  onRenamed={(subId, newName) =>
                    onSubcategoryRenamed(category.id, subId, newName)
                  }
                  onDeleted={(subId) => onSubcategoryDeleted(category.id, subId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-600 italic pl-4 py-1">
              Sin subcategorías
            </div>
          )}

          {/* Form to add subcategory */}
          <form onSubmit={handleAddSubcategory} className="pt-2 pl-4 border-t border-slate-800/30 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nueva subcategoría..."
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                disabled={addingSub}
                className="flex-1 max-w-[240px] bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={addingSub || !newSubName.trim()}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                {addingSub ? 'Añadiendo...' : 'Añadir'}
              </button>
            </div>
            {subError && <p className="text-[10px] text-rose-400 mt-1">{subError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CategoryManagerProps {
  onChange?: () => void;
}

export default function CategoryManager({ onChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [spendings, setSpendings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form states for new Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState('EXPENSE');
  const [newCatBudget, setNewCatBudget] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const catRes = await fetch('/api/categories');
      if (!catRes.ok) throw new Error('Error al obtener categorías');
      const catData: Category[] = await catRes.json();
      setCategories(catData);

      // Cargar gastos mensuales para presupuestos
      const spendRes = await fetch('/api/categories/spending');
      if (spendRes.ok) {
        const spendData = await spendRes.json();
        setSpendings(spendData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCategoryCreated = (newCat: Category) => {
    setCategories((prev) => {
      const next = [...prev, { ...newCat, subcategories: [] }];
      // Sort: type asc, then name asc
      return next.sort((a, b) => {
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        return a.name.localeCompare(b.name);
      });
    });
    onChange?.();
  };

  const handleCategoryUpdated = (id: string, newName: string, type: string, budgetUsd: number | null) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName, type, budgetUsd } : c))
    );
    onChange?.();
  };

  const handleCategoryDeleted = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    onChange?.();
  };

  const handleSubcategoryAdded = (catId: string, sub: Subcategory) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              subcategories: [...c.subcategories, sub].sort((a, b) =>
                a.name.localeCompare(b.name)
              ),
            }
          : c
      )
    );
    onChange?.();
  };

  const handleSubcategoryRenamed = (catId: string, subId: string, newName: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              subcategories: c.subcategories.map((s) =>
                s.id === subId ? { ...s, name: newName } : s
              ),
            }
          : c
      )
    );
    onChange?.();
  };

  const handleSubcategoryDeleted = (catId: string, subId: string) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              subcategories: c.subcategories.filter((s) => s.id !== subId),
            }
          : c
      )
    );
    onChange?.();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    setCreateError(null);
    try {
      const budgetVal = newCatBudget.trim() ? parseFloat(newCatBudget.trim()) : null;
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          type: newCatType,
          budgetUsd: budgetVal !== null && !isNaN(budgetVal) ? budgetVal : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || 'Error al crear la categoría');
      } else {
        handleCategoryCreated(data);
        setNewCatName('');
        setNewCatBudget('');
        setShowCreateForm(false);
      }
    } catch (err) {
      setCreateError('Error al conectar con el servidor.');
    } finally {
      setCreatingCat(false);
    }
  };

  // Group categories by type
  const grouped = categories.reduce<Record<string, Category[]>>((acc, cat) => {
    if (!acc[cat.type]) acc[cat.type] = [];
    acc[cat.type].push(cat);
    return acc;
  }, {});

  // Apply search filter
  const typeOrder = ['INCOME', 'EXPENSE', 'TRANSFER'];
  const filteredGrouped = typeOrder.reduce<Record<string, Category[]>>((acc, type) => {
    const cats = (grouped[type] ?? []).filter((c) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.subcategories.some((s) => s.name.toLowerCase().includes(q))
      );
    });
    if (cats.length > 0) acc[type] = cats;
    return acc;
  }, {});

  const totalCategories = categories.length;
  const totalSubcategories = categories.reduce((s, c) => s + c.subcategories.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Panel header */}
      <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-200">Gestión de Categorías</h2>
            <p className="text-xs text-slate-500">
              Crea, edita o elimina categorías y subcategorías. Los cambios se reflejarán inmediatamente en todo el sistema.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
              {totalCategories} categorías · {totalSubcategories} subcategorías
            </span>
            <button
              onClick={() => setShowCreateForm((show) => !show)}
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva Categoría
            </button>
            <button
              onClick={load}
              className="text-xs text-slate-400 hover:text-indigo-400 bg-slate-900/40 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              title="Recargar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Recargar
            </button>
          </div>
        </div>

        {/* Expandable Form to create category */}
        {showCreateForm && (
          <form onSubmit={handleCreateCategory} className="mt-5 pt-5 border-t border-slate-800/50 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end animate-slide-down">
            <div className="sm:col-span-2 w-full space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Nombre Categoría</label>
              <input
                type="text"
                placeholder="Ej. Restaurantes, Sueldo..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                disabled={creatingCat}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
              />
            </div>
            
            <div className="w-full space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Tipo de Flujo</label>
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value)}
                disabled={creatingCat}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-350 focus:outline-none transition-all cursor-pointer"
              >
                <option value="EXPENSE">Gastos (egreso)</option>
                <option value="INCOME">Ingresos (entrada)</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </div>

            <div className="w-full flex gap-2 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                  Pto. Mensual (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="150.00 (Opcional)"
                  value={newCatBudget}
                  onChange={(e) => setNewCatBudget(e.target.value)}
                  disabled={creatingCat}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                />
              </div>

              <div className="flex gap-1.5 shrink-0">
                <button
                  type="submit"
                  disabled={creatingCat || !newCatName.trim()}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-md shadow-indigo-600/10 h-[40px] shrink-0"
                >
                  {creatingCat ? '...' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all cursor-pointer h-[40px] shrink-0"
                >
                  Ocultar
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Search */}
        <div className="mt-4 relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar categoría o subcategoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando categorías...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-rose-950/40 border border-rose-500/30 text-rose-200 p-4 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="py-16 text-center text-slate-500 text-sm">
          No hay categorías creadas. ¡Crea una nueva arriba!
        </div>
      )}

      {/* Category groups */}
      {!loading && !error && Object.keys(filteredGrouped).length === 0 && search && (
        <div className="py-10 text-center text-slate-500 text-sm">
          No se encontraron resultados para <span className="text-slate-300">"{search}"</span>.
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-8">
          {typeOrder.map((type) => {
            const cats = filteredGrouped[type];
            if (!cats || cats.length === 0) return null;
            const meta = TYPE_META[type];
            return (
              <div key={type} className="space-y-3">
                {/* Type section header */}
                <div className={`flex items-center gap-2 px-1`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                  <h3 className={`text-xs font-extrabold uppercase tracking-widest ${meta.color}`}>
                    {meta.label}
                  </h3>
                  <span className="text-xs text-slate-600 ml-1">({cats.length})</span>
                </div>
                <div className="space-y-2">
                  {cats.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      spendingUsd={spendings[cat.id] || 0}
                      onCategoryUpdated={handleCategoryUpdated}
                      onCategoryDeleted={handleCategoryDeleted}
                      onSubcategoryAdded={handleSubcategoryAdded}
                      onSubcategoryRenamed={handleSubcategoryRenamed}
                      onSubcategoryDeleted={handleSubcategoryDeleted}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
