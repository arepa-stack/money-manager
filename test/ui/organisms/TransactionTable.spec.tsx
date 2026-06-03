import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionTable from '@/ui/organisms/TransactionTable';

const mockTransactions = [
  {
    id: 'tx-1',
    transactionDate: '2026-06-03T12:00:00Z',
    amount: 5000, // 50.00
    currency: 'VES',
    baseAmountUsd: 137, // 1.37
    transactionType: 'EXPENSE',
    note: 'Desayuno',
    description: 'Empanada con malta',
    accountId: 'acc-1',
    categoryId: 'cat-1',
    subcategoryId: null,
    destinationAccountId: null,
    account: { name: 'Efectivo' },
    category: { name: 'Comida' },
    subcategory: null,
    destinationAccount: null,
  }
];

const mockVisibleColumns = {
  time: true,
  account: true,
  category: true,
  amount: true,
  usdAmount: true,
  note: true,
};

describe('TransactionTable', () => {
  it('should render transaction details in row and card formats', () => {
    render(
      <TransactionTable
        transactions={mockTransactions}
        visibleColumns={mockVisibleColumns}
        onEditTransaction={vi.fn()}
      />
    );

    // Debe renderizar la cuenta y nota en el DOM
    expect(screen.getAllByText('Efectivo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Desayuno').length).toBeGreaterThan(0);
  });

  it('should expand mobile card to reveal details and actions on click', () => {
    const handleEdit = vi.fn();
    const handleDuplicate = vi.fn();
    const handleDelete = vi.fn();

    render(
      <TransactionTable
        transactions={mockTransactions}
        visibleColumns={mockVisibleColumns}
        onEditTransaction={handleEdit}
        onDuplicateTransaction={handleDuplicate}
        onDeleteTransaction={handleDelete}
      />
    );

    // Al inicio, los detalles de la tarjeta móvil no deberían estar renderizados
    expect(screen.queryByText('Equivalente USD')).not.toBeInTheDocument();

    // Buscar el contenedor de la tarjeta móvil (el cual tiene la clase cursor-pointer)
    const elements = screen.getAllByText('Desayuno');
    const cardHeader = elements.find(el => el.closest('.cursor-pointer'))?.closest('.cursor-pointer');
    expect(cardHeader).toBeInTheDocument();

    if (cardHeader) {
      // Hacer clic para expandir
      fireEvent.click(cardHeader);

      // Ahora los detalles de la tarjeta móvil y las acciones a todo lo ancho deberían aparecer en el DOM
      expect(screen.getByText('Equivalente USD')).toBeInTheDocument();
      expect(screen.getAllByText('Empanada con malta').length).toBe(2);

      const editBtn = screen.getByText('Editar');
      const duplicateBtn = screen.getByText('Duplicar');
      const deleteBtn = screen.getByText('Eliminar');

      expect(editBtn).toBeInTheDocument();
      expect(duplicateBtn).toBeInTheDocument();
      expect(deleteBtn).toBeInTheDocument();

      // Probar las acciones
      fireEvent.click(editBtn);
      expect(handleEdit).toHaveBeenCalledWith(mockTransactions[0]);

      fireEvent.click(duplicateBtn);
      expect(handleDuplicate).toHaveBeenCalledWith(mockTransactions[0]);

      fireEvent.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledWith(mockTransactions[0]);

      // Volver a hacer clic en la cabecera para colapsar
      fireEvent.click(cardHeader);
      expect(screen.queryByText('Equivalente USD')).not.toBeInTheDocument();
    }
  });
});
