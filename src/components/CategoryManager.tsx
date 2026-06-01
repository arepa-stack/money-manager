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
}: {
  sub: Subcategory;
  onRenamed: (id: string, newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);

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

  return (
    <div className="flex items-center gap-3 pl-4 py-2 group/sub">
      <span className="w-1 h-1 rounded-full bg-slate-600 shrink-0" />
      {editing ? (
        <InlineEdit
          initialValue={sub.name}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-slate-400 truncate">{sub.name}</span>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover/sub:opacity-100 transition-opacity ml-auto shrink-0 text-slate-500 hover:text-indigo-400 p-1 rounded cursor-pointer"
            title="Editar subcategoría"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  onCategoryRenamed,
  onSubcategoryRenamed,
}: {
  category: Category;
  onCategoryRenamed: (id: string, newName: string) => void;
  onSubcategoryRenamed: (catId: string, subId: string, newName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(false);
  const meta = TYPE_META[category.type] ?? TYPE_META.EXPENSE;

  const handleCatSave = async (newName: string): Promise<string | null> => {
    const res = await fetch(`/api/categories/${category.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || 'Error al guardar.';
    onCategoryRenamed(category.id, data.name);
    setEditingCat(false);
    return null;
  };

  return (
    <div className={`rounded-2xl border ${meta.border} bg-slate-900/30 backdrop-blur-sm overflow-hidden transition-all`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4 group/cat">
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
            <InlineEdit
              initialValue={category.name}
              onSave={handleCatSave}
              onCancel={() => setEditingCat(false)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
              <span className="font-semibold text-slate-100 text-sm truncate">{category.name}</span>
              <button
                onClick={() => setEditingCat(true)}
                className="opacity-0 group-hover/cat:opacity-100 transition-opacity ml-1 shrink-0 text-slate-500 hover:text-indigo-400 p-1 rounded cursor-pointer"
                title="Editar categoría"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Subcategory count pill */}
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.border} ${meta.color} bg-transparent`}>
          {category.subcategories.length} sub
        </span>
      </div>

      {/* Subcategories collapsible */}
      {open && category.subcategories.length > 0 && (
        <div className="border-t border-slate-800/60 px-4 py-2 space-y-0.5">
          {category.subcategories.map((sub) => (
            <SubcategoryRow
              key={sub.id}
              sub={sub}
              onRenamed={(subId, newName) =>
                onSubcategoryRenamed(category.id, subId, newName)
              }
            />
          ))}
        </div>
      )}

      {open && category.subcategories.length === 0 && (
        <div className="border-t border-slate-800/60 px-5 py-3 text-xs text-slate-600 italic">
          Sin subcategorías
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Error al obtener categorías');
      const data: Category[] = await res.json();
      setCategories(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCategoryRenamed = (id: string, newName: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
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
              Edita el nombre de categorías y subcategorías. Los cambios se reflejan en todo el historial automáticamente gracias a las relaciones por ID.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
              {totalCategories} categorías · {totalSubcategories} subcategorías
            </span>
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
          No hay categorías en la base de datos. Importa un extracto primero.
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
                      onCategoryRenamed={handleCategoryRenamed}
                      onSubcategoryRenamed={handleSubcategoryRenamed}
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
