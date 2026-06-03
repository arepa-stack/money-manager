import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BackupTab from '@/ui/pages/BackupTab';

// Mock de la librería xlsx para evitar descargas reales de archivos en los tests
const mockWriteFile = vi.fn();
const mockJsonToSheet = vi.fn(() => ({}));
const mockBookNew = vi.fn(() => ({}));
const mockBookAppendSheet = vi.fn();
const mockSheetToCsv = vi.fn(() => 'mock,csv,data');

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: () => mockJsonToSheet(),
    book_new: () => mockBookNew(),
    book_append_sheet: () => mockBookAppendSheet(),
    sheet_to_csv: () => mockSheetToCsv(),
  },
  writeFile: () => mockWriteFile(),
}));

// Mock del objeto window.URL para evitar errores en jest/happy-dom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

const mockProps = {
  showToast: vi.fn(),
  setConfirmState: vi.fn(),
  onRefreshData: vi.fn(),
};

describe('BackupTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Limpiar localStorage y mocks de fetch
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ value: null }),
      } as any)
    );
  });

  it('should render auth button when no token is present', async () => {
    render(<BackupTab {...mockProps} />);
    
    // Esperar a que pase el ciclo de renderizado de sesión persistida
    await waitFor(() => {
      expect(screen.getByText('Conectar Google Drive')).toBeInTheDocument();
    });
  });

  it('should render export panel and buttons', async () => {
    render(<BackupTab {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Descargar Excel (.xlsx)')).toBeInTheDocument();
      expect(screen.getByText('Descargar CSV (.csv)')).toBeInTheDocument();
    });
  });

  it('should trigger local xlsx export on clicking Excel button', async () => {
    // Mockear la respuesta del export de base de datos
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/db/export') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                transactions: [
                  {
                    id: 'tx1',
                    transactionDate: '2026-06-03T10:00:00Z',
                    amount: 5000,
                    currency: 'USD',
                    baseAmountUsd: 50,
                    transactionType: 'EXPENSE',
                  },
                ],
              },
            }),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ value: null }),
      } as any);
    });

    render(<BackupTab {...mockProps} />);

    const excelBtn = await screen.findByText('Descargar Excel (.xlsx)');
    fireEvent.click(excelBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/db/export');
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockProps.showToast).toHaveBeenCalledWith('Archivo Excel descargado con éxito', 'success');
    });
  });

  it('should show info toast when exporting with empty database', async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === '/api/db/export') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { transactions: [] } }),
        } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ value: null }),
      } as any);
    });

    render(<BackupTab {...mockProps} />);

    const excelBtn = await screen.findByText('Descargar Excel (.xlsx)');
    fireEvent.click(excelBtn);

    await waitFor(() => {
      expect(mockProps.showToast).toHaveBeenCalledWith(
        'No hay transacciones cargadas en el sistema para exportar',
        'info'
      );
    });
  });
});
