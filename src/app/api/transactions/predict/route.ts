import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const note = searchParams.get('note');

    if (!note || note.trim() === '') {
      return NextResponse.json({ error: 'La nota es requerida para predecir' }, { status: 400 });
    }

    const lastTx = await prisma.transaction.findFirst({
      where: {
        note: {
          equals: note.trim(),
        },
      },
      orderBy: {
        transactionDate: 'desc',
      },
      select: {
        accountId: true,
        categoryId: true,
        subcategoryId: true,
        amount: true,
        currency: true,
        baseAmountUsd: true,
        transactionType: true,
        destinationAccountId: true,
      },
    });

    if (!lastTx) {
      return NextResponse.json(null); // No hay coincidencia previa
    }

    return NextResponse.json({
      accountId: lastTx.accountId,
      categoryId: lastTx.categoryId,
      subcategoryId: lastTx.subcategoryId || '',
      amount: lastTx.amount / 100, // Convertir centavos a decimal
      currency: lastTx.currency,
      baseAmountUsd: lastTx.baseAmountUsd / 100, // Convertir centavos a decimal
      transactionType: lastTx.transactionType,
      destinationAccountId: lastTx.destinationAccountId || '',
    });
  } catch (error: any) {
    console.error('Error al predecir transacción desde la nota:', error);
    return NextResponse.json({ error: 'Error al predecir transacción' }, { status: 500 });
  }
}
