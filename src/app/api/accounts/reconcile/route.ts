import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { accountId, targetBalance } = await request.json();

    if (!accountId || typeof targetBalance !== 'number') {
      return NextResponse.json({ error: 'Faltan parámetros o son inválidos' }, { status: 400 });
    }

    // 1. Obtener la cuenta y sus transacciones (origen y destino) para calcular el saldo actual
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        transactions: {
          select: {
            transactionType: true,
            baseAmountUsd: true,
            transactionDate: true
          }
        },
        receivedTransfers: {
          select: {
            transactionType: true,
            baseAmountUsd: true,
            transactionDate: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    let currentBalanceCents = 0;
    let oldestDate: Date | null = null;

    // Procesar transacciones salientes
    for (const tx of account.transactions) {
      const d = tx.transactionDate;
      if (!oldestDate || d < oldestDate) {
        oldestDate = d;
      }
      if (tx.transactionType === 'INCOME') {
        currentBalanceCents += tx.baseAmountUsd;
      } else if (tx.transactionType === 'EXPENSE' || tx.transactionType === 'TRANSFER') {
        currentBalanceCents -= tx.baseAmountUsd;
      }
    }

    // Procesar transferencias entrantes
    for (const tx of account.receivedTransfers) {
      const d = tx.transactionDate;
      if (!oldestDate || d < oldestDate) {
        oldestDate = d;
      }
      if (tx.transactionType === 'TRANSFER') {
        currentBalanceCents += tx.baseAmountUsd;
      }
    }

    // 2. Calcular diferencia
    // El usuario envía un flotante (ej 15.50), convertimos a centavos (1550)
    const targetBalanceCents = Math.round(targetBalance * 100);
    const diffCents = targetBalanceCents - currentBalanceCents;

    if (diffCents === 0) {
      return NextResponse.json({ message: 'El saldo ya está conciliado', created: false });
    }

    const isIncome = diffCents > 0;
    const adjustAmount = Math.abs(diffCents);

    // 3. Obtener o crear la categoría "Ajuste de Saldo Inicial"
    let category = await prisma.category.findFirst({
      where: { name: 'Ajuste de Saldo Inicial' }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Ajuste de Saldo Inicial',
          type: 'INCOME' // Tipo por defecto para la categoría de sistema
        }
      });
    }

    // 4. Invariante cronológico
    // Establecer la fecha de la transacción 1 segundo antes que el registro más antiguo
    let txDate = oldestDate ? new Date(oldestDate.getTime() - 1000) : new Date('2000-01-01T00:00:00.000Z');

    // 5. Crear la transacción de ajuste
    const newTx = await prisma.transaction.create({
      data: {
        accountId,
        categoryId: category.id,
        transactionType: isIncome ? 'INCOME' : 'EXPENSE',
        amount: adjustAmount,
        currency: 'USD',
        baseAmountUsd: adjustAmount,
        transactionDate: txDate,
        note: 'Conciliación manual de saldo inicial',
        importHash: `MANUAL_ADJUST_${accountId}_${Date.now()}_${randomUUID()}`,
        isOpeningBalance: true
      }
    });

    return NextResponse.json({ 
      message: 'Saldo conciliado correctamente', 
      created: true, 
      transaction: newTx 
    });

  } catch (error: any) {
    console.error('Error al conciliar cuenta:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
