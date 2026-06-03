import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionsTab from '@/ui/pages/TransactionsTab';

// Mock components
vi.mock('@/ui/organisms/CalendarView', () => ({
  default: () => <div data-testid="calendar-view">Calendar View Mock</div>,
}));

vi.mock('@/ui/organisms/TransactionTable', () => ({
  default: () => <div data-testid="transaction-table">Transaction Table Mock</div>,
}));

vi.mock('@/ui/molecules/CategoryDistribution', () => ({
  default: () => <div data-testid="category-distribution">Category Distribution Mock</div>,
}));

const mockProps = {
  transactions: [
    {
      id: '1',
      transactionDate: '2026-06-03T10:00:00Z',
      amount: 1000,
      currency: 'USD',
      baseAmountUsd: 10,
      transactionType: 'INCOME',
      note: 'Sueldo',
      description: 'Pago mensual',
      accountId: 'acc1',
      categoryId: 'cat1',
      subcategoryId: null,
      destinationAccountId: null,
      account: { name: 'Efectivo' },
      category: { name: 'Trabajo' },
      subcategory: null,
      destinationAccount: null,
    }
  ],
  accounts: [{ id: 'acc1', name: 'Efectivo', currency: 'USD', type: 'CASH' }],
  allCategories: [{ id: 'cat1', name: 'Trabajo', type: 'INCOME' }],
  availableNotes: ['Sueldo', 'Comida'],
  isLoadingTxs: false,
  selectedAccountId: '',
  setSelectedAccountId: vi.fn(),
  selectedCategoryId: '',
  setSelectedCategoryId: vi.fn(),
  selectedTransactionType: '',
  setSelectedTransactionType: vi.fn(),
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  setStartDate: vi.fn(),
  setEndDate: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  handleClearFilters: vi.fn(),
  viewMode: 'list' as const,
  setViewMode: vi.fn(),
  showAnalytics: true,
  setShowAnalytics: vi.fn(),
  visibleColumns: {
    time: true,
    account: true,
    category: true,
    amount: true,
    usdAmount: true,
    note: true
  },
  onToggleColumn: vi.fn(),
  onNewTransaction: vi.fn(),
  onRefresh: vi.fn(),
  onEditTransaction: vi.fn(),
  onDuplicateTransaction: vi.fn(),
  onDeleteTransaction: vi.fn(),
  totalBalanceUsd: 1000,
  totalIncomeUsd: 1000,
  totalExpenseUsd: 0,
};

describe('TransactionsTab', () => {
  it('should render transaction table by default', () => {
    render(<TransactionsTab {...mockProps} />);
    expect(screen.getByTestId('transaction-table')).toBeInTheDocument();
    expect(screen.queryByTestId('calendar-view')).not.toBeInTheDocument();
  });

  it('should render calendar view if viewMode is calendar', () => {
    render(<TransactionsTab {...mockProps} viewMode="calendar" />);
    expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    expect(screen.queryByTestId('transaction-table')).not.toBeInTheDocument();
  });

  it('should trigger onNewTransaction when clicking create button', () => {
    render(<TransactionsTab {...mockProps} />);
    const createBtn = screen.getByText('Registrar Movimiento');
    fireEvent.click(createBtn);
    expect(mockProps.onNewTransaction).toHaveBeenCalled();
  });

  it('should toggle analytics display when clicking Show/Hide Analytics button', () => {
    render(<TransactionsTab {...mockProps} />);
    const toggleBtn = screen.getByText('Ocultar Análisis');
    fireEvent.click(toggleBtn);
    expect(mockProps.setShowAnalytics).toHaveBeenCalledWith(false);
  });
});
