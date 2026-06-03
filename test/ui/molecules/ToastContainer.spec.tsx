import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToastContainer, { ToastMessage } from '@/ui/molecules/ToastContainer';

describe('ToastContainer', () => {
  const mockToasts: ToastMessage[] = [
    { id: '1', message: 'Operación exitosa', type: 'success' },
    { id: '2', message: 'Ha ocurrido un error', type: 'error' },
    { id: '3', message: 'Información del sistema', type: 'info' }
  ];

  it('should not render anything when toasts list is empty', () => {
    const { container } = render(<ToastContainer toasts={[]} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render all toast messages', () => {
    render(<ToastContainer toasts={mockToasts} onClose={vi.fn()} />);
    expect(screen.getByText('Operación exitosa')).toBeInTheDocument();
    expect(screen.getByText('Ha ocurrido un error')).toBeInTheDocument();
    expect(screen.getByText('Información del sistema')).toBeInTheDocument();
  });

  it('should trigger onClose when clicking the close button on a toast', () => {
    const handleClose = vi.fn();
    render(<ToastContainer toasts={mockToasts} onClose={handleClose} />);
    
    // Buscar todos los botones de cerrar
    const closeButtons = screen.getAllByTitle('Cerrar notificación');
    expect(closeButtons).toHaveLength(3);
    
    // Hacer clic en el primero
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalledWith('1');
  });

  it('should render action button and trigger onAction and onClose when clicked', () => {
    const handleAction = vi.fn();
    const handleClose = vi.fn();
    const toastWithAction: ToastMessage[] = [
      {
        id: '4',
        message: 'Elemento eliminado',
        type: 'success',
        actionLabel: 'Deshacer',
        onAction: handleAction
      }
    ];

    render(<ToastContainer toasts={toastWithAction} onClose={handleClose} />);
    
    expect(screen.getByText('Elemento eliminado')).toBeInTheDocument();
    const actionButton = screen.getByRole('button', { name: 'Deshacer' });
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    
    expect(handleAction).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalledWith('4');
  });
});
