import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TableSkeleton from '@/ui/atoms/TableSkeleton';

describe('TableSkeleton', () => {
  it('should render correct number of skeletons', () => {
    const { container } = render(<TableSkeleton rowsCount={3} />);
    
    // Debería renderizar la tabla para md y el div para móvil
    // Verificamos que contenga elementos de animación animate-pulse
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
    
    // Verificamos que tenga la estructura de filas y celdas
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });
});
