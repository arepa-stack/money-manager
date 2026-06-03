import React, { useState } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
}

export default function SearchInput({
  value,
  onChange,
  suggestions,
  placeholder = 'Buscar movimientos por nota...',
}: SearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const matches = suggestions
    .filter((n) => n.toLowerCase().includes(value.toLowerCase()) && n.toLowerCase() !== value.toLowerCase())
    .slice(0, 6);

  return (
    <div className="relative w-full pt-1">
      <div className="relative w-full flex items-center">
        <span className="absolute left-3 text-slate-500 flex items-center pointer-events-none mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-600"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setShowSuggestions(false);
            }}
            className="absolute right-3 text-slate-500 hover:text-slate-250 transition-colors p-1"
            title="Limpiar búsqueda"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Custom Autocomplete Suggestions Menu */}
      {showSuggestions && value && matches.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-slate-950/95 border border-slate-850/85 rounded-xl shadow-2xl z-55 max-h-48 overflow-y-auto backdrop-blur-md divide-y divide-slate-900/50">
          {matches.map((note) => (
            <button
              key={note}
              type="button"
              onMouseDown={() => {
                onChange(note);
                setShowSuggestions(false);
              }}
              className="w-full px-3.5 py-2 text-xs text-slate-350 hover:text-slate-100 hover:bg-slate-900/50 cursor-pointer transition-colors text-left font-medium block truncate"
            >
              {note}
            </button>
          ))}
        </div>
      )}

      {/* Search Mode Warning Badge */}
      {value && (
        <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg uppercase tracking-wider w-fit animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Búsqueda global activa: filtros de fecha y cuenta ignorados
        </div>
      )}
    </div>
  );
}
