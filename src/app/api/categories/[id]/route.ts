import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre de la categoría no puede estar vacío.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check uniqueness (excluding current category)
    const existing = await prisma.category.findFirst({
      where: { name: trimmedName, NOT: { id } },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe otra categoría con el nombre "${trimmedName}".` },
        { status: 409 }
      );
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name: trimmedName },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error al actualizar categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
