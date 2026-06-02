import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAction } from '@/lib/audit';

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
    // SQLite does not support mode: 'insensitive', use manual toLowerCase comparison
    const siblings = await prisma.subcategory.findMany({
      where: {
        categoryId: current.categoryId,
        NOT: { id },
      },
      select: { name: true },
    });

    const nameConflict = siblings.some(
      (s) => s.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameConflict) {
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

    logAction({
      action: 'UPDATE',
      entityType: 'SUBCATEGORY',
      entityId: updated.id,
      entityName: updated.name,
      details: { categoryId: current.categoryId, previousName: current.name },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar si tiene transacciones asociadas
    const transactionCount = await prisma.transaction.count({
      where: { subcategoryId: id },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la subcategoría porque contiene transacciones asociadas' },
        { status: 400 }
      );
    }

    const subcatToDelete = await prisma.subcategory.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    });

    await prisma.subcategory.delete({
      where: { id },
    });

    logAction({
      action: 'DELETE',
      entityType: 'SUBCATEGORY',
      entityId: id,
      entityName: subcatToDelete?.name,
      details: { categoryId: subcatToDelete?.categoryId, categoryName: subcatToDelete?.category?.name },
    });

    return NextResponse.json({ message: 'Subcategoría eliminada con éxito' });
  } catch (error: any) {
    console.error('Error al eliminar subcategoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al eliminar la subcategoría' },
      { status: 500 }
    );
  }
}
