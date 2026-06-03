import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImportTab from '@/ui/pages/ImportTab';

// Mock molecules
vi.mock('@/ui/molecules/ImportWidget', () => ({
  default: () => <div data-testid="import-widget">Import Widget Mock</div>,
}));

vi.mock('@/ui/molecules/ImportPreview', () => ({
  default: () => <div data-testid="import-preview">Import Preview Mock</div>,
}));

const mockProps = {
  importState: 'upload' as const,
  setImportState: vi.fn(),
  file: null,
  setFile: vi.fn(),
  analysisResult: null,
  setAnalysisResult: vi.fn(),
  executeResult: null,
  setExecuteResult: vi.fn(),
  selectedProvider: 'MONEY_MANAGER',
  setSelectedProvider: vi.fn(),
  fetchTransactions: vi.fn(),
  fetchAccountsList: vi.fn(),
  fetchAvailableNotes: vi.fn(),
  handleClearFilters: vi.fn(),
  setCurrentTab: vi.fn(),
  setError: vi.fn(),
};

const mockAnalysisResult = {
  transactions: [],
  accounts: [],
  categories: [],
  validationErrors: [],
} as any;

const mockExecuteResult = {
  totalParsed: 12,
  totalInserted: 10,
  totalSkipped: 2,
  newAccountsCreatedCount: 1,
  newCategoriesCreatedCount: 2,
  newSubcategoriesCreatedCount: 0,
  accountBalances: [
    {
      accountId: 'acc1',
      accountName: 'Banco Provincial',
      currentBalanceUsd: -500, // Negative balance to test styling
    }
  ],
} as any;

describe('ImportTab', () => {
  it('should render ImportWidget when importState is upload', () => {
    render(<ImportTab {...mockProps} importState="upload" />);
    expect(screen.getByTestId('import-widget')).toBeInTheDocument();
    expect(screen.queryByTestId('import-preview')).not.toBeInTheDocument();
  });

  it('should render ImportPreview when importState is preview', () => {
    const file = new File([''], 'test.xlsx');
    render(
      <ImportTab
        {...mockProps}
        importState="preview"
        file={file}
        analysisResult={mockAnalysisResult}
      />
    );
    expect(screen.getByTestId('import-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('import-widget')).not.toBeInTheDocument();
  });

  it('should render success summary and reconciliation list when importState is success', () => {
    render(
      <ImportTab
        {...mockProps}
        importState="success"
        executeResult={mockExecuteResult}
      />
    );
    
    expect(screen.getByText('¡Importación Exitosa!')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // Transacciones Insertadas
    expect(screen.getAllByText('2').length).toBe(2);  // Duplicados Omitidos (2) and Nuevas Categorías (2)
    
    // Reconciliation account info
    expect(screen.getByText('Banco Provincial')).toBeInTheDocument();
    expect(screen.getByText(/-\$5[.,]00\s*USD/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajustar' })).toBeInTheDocument();
  });

  it('should call fetchTransactions and fetchAccountsList when reconciling account', async () => {
    // Mock the global fetch for reconciliation API call
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response)
    );

    render(
      <ImportTab
        {...mockProps}
        importState="success"
        executeResult={mockExecuteResult}
      />
    );

    const reconcileBtn = screen.getByRole('button', { name: 'Ajustar' });
    fireEvent.click(reconcileBtn);

    // Wait for the async state updates to complete
    await screen.findByText('Ajustado');

    // Should call API reconcile endpoint
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/accounts/reconcile',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"accountId":"acc1"'),
      })
    );
  });

  it('should render Google Drive restoration banner when isDatabaseEmpty is true', () => {
    render(<ImportTab {...mockProps} importState="upload" isDatabaseEmpty={true} />);
    
    expect(screen.getByText('¿Ya tienes una copia de seguridad?')).toBeInTheDocument();
    
    const configBtn = screen.getByRole('button', { name: /Configurar Google Drive/ });
    expect(configBtn).toBeInTheDocument();
    
    fireEvent.click(configBtn);
    expect(mockProps.setCurrentTab).toHaveBeenCalledWith('backup');
  });
});
