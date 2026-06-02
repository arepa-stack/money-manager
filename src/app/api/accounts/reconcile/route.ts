import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { accountId, targetBalance, clientDate } = await request.json();

    if (!accountId || typeof targetBalance !== 'number') {
      return NextResponse.json({ error: 'Faltan parámetros o son inválidos' }, { status: 400 });
    }

    // 1. Obtener la cuenta y sus transacciones (origen y destino) para calcular el saldo actual
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        transactions: {
          select: {
            id: true,
            transactionType: true,
            baseAmountUsd: true,
            transactionDate: true
          }
        },
        receivedTransfers: {
          select: {
            id: true,
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

    // Buscar si ya existe una transacción de apertura/ajuste previa para esta cuenta
    const openingTx = await prisma.transaction.findFirst({
      where: { accountId, isOpeningBalance: true }
    });

    let currentBalanceCents = 0;
    let oldestDate: Date | null = null;

    // Procesar transacciones salientes
    for (const tx of account.transactions) {
      // Excluir la transacción de apertura existente del cálculo de saldo actual
      if (openingTx && tx.id === openingTx.id) {
        continue;
      }
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
      // Excluir la de apertura
      if (openingTx && tx.id === openingTx.id) {
        continue;
      }
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
      if (openingTx) {
        await prisma.transaction.delete({
          where: { id: openingTx.id }
        });
        return NextResponse.json({ 
          message: 'El saldo ya está conciliado (se eliminó el ajuste de saldo inicial anterior)', 
          created: false 
        });
      }
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

    // 4. Fecha de transacción: día actual del ajuste (preferiblemente la fecha local del cliente)
    const txDate = clientDate ? new Date(clientDate) : new Date();

    // 5. Crear o actualizar la transacción de ajuste
    let resultTx;
    if (openingTx) {
      resultTx = await prisma.transaction.update({
        where: { id: openingTx.id },
        data: {
          categoryId: category.id,
          transactionType: isIncome ? 'INCOME' : 'EXPENSE',
          amount: adjustAmount,
          baseAmountUsd: adjustAmount,
          transactionDate: txDate,
          note: 'Conciliación manual de saldo inicial (modificado)'
        }
      });
    } else {
      resultTx = await prisma.transaction.create({
        data: {
          accountId,
          categoryId: category.id,
          transactionType: isIncome ? 'INCOME' : 'EXPENSE',
          amount: adjustAmount,
          currency: 'USD',
          baseAmountUsd: adjustAmount,
          transactionDate: txDate,
          note: 'Conciliación manual de saldo inicial',
          provider: 'MANUAL',
          providerTransactionId: `MANUAL_ADJUST_${accountId}_${Date.now()}_${randomUUID()}`,
          isOpeningBalance: true
        }
      });
    }

    return NextResponse.json({ 
      message: 'Saldo conciliado correctamente', 
      created: true, 
      transaction: resultTx 
    });

  } catch (error: any) {
    console.error('Error al conciliar cuenta:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
