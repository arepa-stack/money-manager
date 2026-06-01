import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        transactions: {
          select: {
            transactionType: true,
            baseAmountUsd: true,
          },
        },
        receivedTransfers: {
          select: {
            transactionType: true,
            baseAmountUsd: true,
          },
        },
      },
    });

    const accountBalances = accounts.map((account) => {
      let balance = 0;
      let totalIncome = 0;
      let totalExpense = 0;

      // Procesar transacciones como origen (INCOME, EXPENSE y transferencias de salida TRANSFER_OUT)
      account.transactions.forEach((tx) => {
        const amt = tx.baseAmountUsd;
        if (tx.transactionType === 'INCOME') {
          balance += amt;
          totalIncome += amt;
        } else if (tx.transactionType === 'EXPENSE') {
          balance -= amt;
          totalExpense += amt;
        } else if (tx.transactionType === 'TRANSFER') {
          // Transferencia Saliente (TRANSFER_OUT)
          balance -= amt;
          totalExpense += amt;
        }
      });

      // Procesar transferencias recibidas como destino (transferencias de entrada TRANSFER_IN)
      account.receivedTransfers.forEach((tx) => {
        const amt = tx.baseAmountUsd;
        if (tx.transactionType === 'TRANSFER') {
          // Transferencia Entrante (TRANSFER_IN)
          balance += amt;
          totalIncome += amt;
        }
      });

      return {
        accountId: account.id,
        accountName: account.name,
        balance,
        totalIncome,
        totalExpense,
        transactionCount: account.transactions.length + account.receivedTransfers.length,
      };
    });

    return NextResponse.json(accountBalances);
  } catch (error: any) {
    console.error('Error al calcular balances por cuenta:', error);
    return NextResponse.json({ error: 'Error al calcular balances por cuenta' }, { status: 500 });
  }
}
