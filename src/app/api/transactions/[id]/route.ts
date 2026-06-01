import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      transactionDate,
      accountId,
      transactionType,
      amount, // Flotante decimal
      currency,
      baseAmountUsd, // Flotante decimal
      categoryId,
      subcategoryId,
      destinationAccountId,
      note,
      description
    } = body;

    // 1. Validaciones básicas
    if (!id || !transactionDate || !accountId || !transactionType || typeof amount !== 'number' || !currency || typeof baseAmountUsd !== 'number') {
      return NextResponse.json({ error: 'Faltan parámetros requeridos o son inválidos' }, { status: 400 });
    }

    let finalCategoryId = categoryId;
    let finalDestinationAccountId = destinationAccountId;

    // 2. Lógica para transferencias
    if (transactionType === 'TRANSFER') {
      if (!destinationAccountId) {
        return NextResponse.json({ error: 'Las transferencias requieren una cuenta de destino' }, { status: 400 });
      }
      if (accountId === destinationAccountId) {
        return NextResponse.json({ error: 'La cuenta origen y destino no pueden ser la misma' }, { status: 400 });
      }

      // Buscar o crear la categoría de sistema "Transferencia"
      let transferCategory = await prisma.category.findFirst({
        where: { type: 'TRANSFER' }
      });

      if (!transferCategory) {
        transferCategory = await prisma.category.create({
          data: {
            name: 'Transferencia',
            type: 'TRANSFER'
          }
        });
      }
      finalCategoryId = transferCategory.id;
    } else {
      // Si no es transferencia, se asegura de limpiar el destino
      finalDestinationAccountId = null;
    }

    // 3. Conversión de importes a centavos enteros
    const amountCents = Math.round(amount * 100);
    const baseAmountUsdCents = Math.round(baseAmountUsd * 100);

    // 4. Actualizar la transacción
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        transactionDate: new Date(transactionDate),
        accountId,
        categoryId: finalCategoryId,
        subcategoryId: subcategoryId || null,
        transactionType,
        amount: amountCents,
        currency,
        baseAmountUsd: baseAmountUsdCents,
        note: note || null,
        description: description || null,
        destinationAccountId: finalDestinationAccountId
      },
      include: {
        account: true,
        category: true,
        subcategory: true,
        destinationAccount: true
      }
    });

    return NextResponse.json(updatedTransaction);
  } catch (error: any) {
    console.error('Error al actualizar transacción:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al actualizar la transacción' },
      { status: 500 }
    );
  }
}
