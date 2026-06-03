'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT';
  entityType: 'ACCOUNT' | 'CATEGORY' | 'SUBCATEGORY' | 'TRANSACTION' | 'SYSTEM';
  entityId: string | null;
  entityName: string | null;
  details: string | null; // JSON stringified
  createdAt: string;
}

interface PaginatedResponse {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Config de apariencia por acción ─────────────────────────────────────────

const ACTION_CONFIG: Record<
  AuditLogEntry['action'],
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  CREATE: {
    label: 'Creado',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
      </svg>
    ),
  },
  UPDATE: {
    label: 'Actualizado',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
      </svg>
    ),
  },
  DELETE: {
    label: 'Eliminado',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  IMPORT: {
    label: 'Importación',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
      </svg>
    ),
  },
};

const ENTITY_LABELS: Record<AuditLogEntry['entityType'], string> = {
  ACCOUNT: 'Cuenta',
  CATEGORY: 'Categoría',
  SUBCATEGORY: 'Subcategoría',
  TRANSACTION: 'Transacción',
  SYSTEM: 'Sistema',
};

// ─── Subcomponente: Entry individual ─────────────────────────────────────────

function AuditEntry({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_CONFIG[entry.action] || {
    label: entry.action,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
      </svg>
    ),
  };
  const details = entry.details ? JSON.parse(entry.details) : null;

  const formattedDate = new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(entry.createdAt));

  return (
    <div className="relative flex gap-4">
      {/* Línea de tiempo */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm`}>
          {cfg.icon}
        </div>
        <div className="w-px flex-1 bg-slate-800 mt-2" />
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-6 min-w-0">
        <div
          className={`group bg-slate-900/50 border rounded-xl p-4 transition-all cursor-pointer hover:bg-slate-900/70 ${
            expanded ? 'border-slate-700' : 'border-slate-800 hover:border-slate-700'
          }`}
          onClick={() => setExpanded(!expanded)}
        >
          {/* Header de la entrada */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider bg-slate-800/80 px-2 py-0.5 rounded-full">
                  {ENTITY_LABELS[entry.entityType]}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200 truncate">
                {entry.entityName ?? entry.entityId ?? 'Sin nombre'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 whitespace-nowrap">{formattedDate}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Detalle expandible */}
          {expanded && details && (
            <div className="mt-3 pt-3 border-t border-slate-800 animate-fade-in">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Detalles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(details).map(([key, val]) => {
                  if (val === null || val === undefined || val === '') return null;
                  return (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="text-slate-500 capitalize shrink-0">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-slate-300 truncate font-medium">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {expanded && !details && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500 italic">Sin detalles adicionales.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AuditTimeline() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntityType, setFilterEntityType] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (filterAction) params.set('action', filterAction);
      if (filterEntityType) params.set('entityType', filterEntityType);
      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const json: PaginatedResponse = await res.json();
        setLogs(json.data);
        setTotalPages(json.pagination.totalPages);
        setTotal(json.pagination.total);
      }
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterEntityType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Resetear página al cambiar filtros
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const selectClass =
    'bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-200">Registro de Actividad</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {total > 0 ? `${total} evento${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}` : 'Sin eventos aún'}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => handleFilterChange(setFilterAction)(e.target.value)}
            className={selectClass}
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <select
            value={filterEntityType}
            onChange={(e) => handleFilterChange(setFilterEntityType)(e.target.value)}
            className={selectClass}
          >
            <option value="">Todas las entidades</option>
            {Object.entries(ENTITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {(filterAction || filterEntityType) && (
            <button
              onClick={() => {
                handleFilterChange(setFilterAction)('');
                handleFilterChange(setFilterEntityType)('');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}

          <button
            onClick={fetchLogs}
            className="text-xs text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Cargando historial...</span>
        </div>
      )}

      {/* Estado vacío */}
      {!loading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <p className="text-slate-300 font-semibold">Sin actividad registrada</p>
            <p className="text-slate-500 text-sm mt-1">
              {filterAction || filterEntityType
                ? 'Prueba con otros filtros.'
                : 'Los eventos aparecerán aquí a medida que uses la aplicación.'}
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!loading && logs.length > 0 && (
        <div className="relative">
          {logs.map((entry) => (
            <AuditEntry key={entry.id} entry={entry} />
          ))}
          {/* Punto final de la línea */}
          <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700 ml-3.5" />
        </div>
      )}

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            ← Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
