import React from 'react';
import SearchInput from '@/ui/atoms/SearchInput';
import FilterSelect from '@/ui/atoms/FilterSelect';
import DateRangePicker from '@/ui/atoms/DateRangePicker';

interface TransactionFiltersProps {
  selectedAccountId: string;
  setSelectedAccountId: (value: string) => void;
  accounts: { id: string; name: string; currency: string; type: string; isArchived?: boolean }[];
  selectedCategoryId: string;
  setSelectedCategoryId: (value: string) => void;
  allCategories: { id: string; name: string; type: string }[];
  selectedTransactionType: string;
  setSelectedTransactionType: (value: string) => void;
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  availableNotes: string[];
}

export default function TransactionFilters({
  selectedAccountId,
  setSelectedAccountId,
  accounts,
  selectedCategoryId,
  setSelectedCategoryId,
  allCategories,
  selectedTransactionType,
  setSelectedTransactionType,
  startDate,
  endDate,
  onDateRangeChange,
  searchQuery,
  setSearchQuery,
  availableNotes,
}: TransactionFiltersProps) {
  // Map account options
  const accountOptions = accounts.map((acc) => ({
    value: acc.id,
    label: `${acc.name}${acc.isArchived ? ' (Eliminada)' : ''}`,
  }));

  // Map category options with localized flow type in label
  const categoryOptions = allCategories.map((cat) => {
    let typeLabel = 'Transf.';
    if (cat.type === 'INCOME') typeLabel = 'Ingreso';
    else if (cat.type === 'EXPENSE') typeLabel = 'Gasto';

    return {
      value: cat.id,
      label: `${cat.name} (${typeLabel})`,
    };
  });

  const flowTypeOptions = [
    { value: 'EXPENSE', label: 'Gastos (egreso)' },
    { value: 'INCOME', label: 'Ingresos (entrada)' },
    { value: 'TRANSFER', label: 'Transferencias' },
  ];

  return (
    <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl backdrop-blur-md shadow-xl space-y-4 relative z-50">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-slate-200">Filtros de Búsqueda</h2>
        <p className="text-xs text-slate-500">Consulta, busca y desglosa tus movimientos guardados</p>
      </div>

      {/* Free Text Search with Autocomplete */}
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        suggestions={availableNotes}
      />

      {/* 4 Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        <FilterSelect
          label="Cuenta"
          value={selectedAccountId}
          onChange={setSelectedAccountId}
          options={accountOptions}
          placeholder="Todas las cuentas"
        />

        <FilterSelect
          label="Categoría"
          value={selectedCategoryId}
          onChange={setSelectedCategoryId}
          options={categoryOptions}
          placeholder="Todas las categorías"
        />

        <FilterSelect
          label="Tipo de Flujo"
          value={selectedTransactionType}
          onChange={setSelectedTransactionType}
          options={flowTypeOptions}
          placeholder="Todos los flujos"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400">Rango de Fechas</label>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={onDateRangeChange}
          />
        </div>
      </div>
    </div>
  );
}
