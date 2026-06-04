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
    const { name, type, currency } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre de la cuenta es requerido' },
        { status: 400 }
      );
    }

    const existingAccount = await prisma.account.findUnique({
      where: { name: name.trim() },
    });

    if (existingAccount && existingAccount.id !== id) {
      return NextResponse.json(
        { error: 'Ya existe otra cuenta con ese nombre' },
        { status: 400 }
      );
    }

    // No se puede editar una cuenta archivada (importada desde cuenta eliminada)
    const accountToEdit = await prisma.account.findUnique({ where: { id }, select: { isArchived: true } });
    if (accountToEdit?.isArchived) {
      return NextResponse.json(
        { error: 'No se puede modificar una cuenta archivada. Es un registro histórico de solo lectura.' },
        { status: 403 }
      );
    }

    const updatedAccount = await prisma.account.update({
      where: { id },
      data: {
        name: name.trim(),
        type,
        currency,
      },
    });

    logAction({
      action: 'UPDATE',
      entityType: 'ACCOUNT',
      entityId: updatedAccount.id,
      entityName: updatedAccount.name,
      details: { type: updatedAccount.type, currency: updatedAccount.currency },
    });

    return NextResponse.json(updatedAccount);
  } catch (error: any) {
    console.error('Error al actualizar cuenta:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al actualizar la cuenta' },
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

    // Verificar si la cuenta posee transacciones asociadas (origen o destino)
    const transactionCount = await prisma.transaction.count({
      where: {
        OR: [
          { accountId: id },
          { destinationAccountId: id },
        ],
      },
    });

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la cuenta porque posee transacciones asociadas' },
        { status: 400 }
      );
    }

    // No se puede eliminar una cuenta archivada
    const accountToCheck = await prisma.account.findUnique({ where: { id }, select: { isArchived: true } });
    if (accountToCheck?.isArchived) {
      return NextResponse.json(
        { error: 'No se puede eliminar una cuenta archivada. Es un registro histórico de solo lectura.' },
        { status: 403 }
      );
    }

    // Capturar nombre antes de eliminar para el log
    const accountToDelete = await prisma.account.findUnique({ where: { id }, select: { name: true } });

    await prisma.account.delete({
      where: { id },
    });

    logAction({
      action: 'DELETE',
      entityType: 'ACCOUNT',
      entityId: id,
      entityName: accountToDelete?.name,
    });

    return NextResponse.json({ message: 'Cuenta eliminada con éxito' });
  } catch (error: any) {
    console.error('Error al eliminar cuenta:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al eliminar la cuenta' },
      { status: 500 }
    );
  }
}
