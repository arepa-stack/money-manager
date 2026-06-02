import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, budgetUsd } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre de la categoría es requerido' },
        { status: 400 }
      );
    }

    if (type && !['INCOME', 'EXPENSE', 'TRANSFER'].includes(type)) {
      return NextResponse.json(
        { error: 'El tipo de categoría debe ser INCOME, EXPENSE o TRANSFER' },
        { status: 400 }
      );
    }

    // Verificar unicidad en el nuevo nombre
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        type: type,
      },
    });

    if (existingCategory && existingCategory.id !== id) {
      return NextResponse.json(
        { error: 'Ya existe otra categoría con el mismo nombre y tipo' },
        { status: 400 }
      );
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name.trim(),
        type,
        budgetUsd: budgetUsd !== undefined && budgetUsd !== null ? Math.round(Number(budgetUsd) * 100) : null,
      },
    });

    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error('Error al actualizar categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al actualizar la categoría' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar si tiene transacciones asociadas
    const transactionCount = await prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la categoría porque contiene transacciones asociadas' },
        { status: 400 }
      );
    }

    // Verificar si tiene subcategorías asociadas
    const subcategoryCount = await prisma.subcategory.count({
      where: { categoryId: id },
    });

    if (subcategoryCount > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la categoría porque contiene subcategorías asociadas' },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Categoría eliminada con éxito' });
  } catch (error: any) {
    console.error('Error al eliminar categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al eliminar la categoría' },
      { status: 500 }
    );
  }
}
