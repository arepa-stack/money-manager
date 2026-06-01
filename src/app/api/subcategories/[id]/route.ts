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
        { error: 'El nombre de la subcategoría no puede estar vacío.' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Find current subcategory to get its categoryId
    const current = await prisma.subcategory.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json(
        { error: 'Subcategoría no encontrada.' },
        { status: 404 }
      );
    }

    // Check uniqueness within the same category (excluding current)
    const existing = await prisma.subcategory.findFirst({
      where: {
        categoryId: current.categoryId,
        name: { equals: trimmedName, mode: 'insensitive' },
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: `Ya existe otra subcategoría con el nombre "${trimmedName}" en esta categoría.`,
        },
        { status: 409 }
      );
    }

    const updated = await prisma.subcategory.update({
      where: { id },
      data: { name: trimmedName },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error al actualizar subcategoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
