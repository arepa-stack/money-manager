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
      },
    });

    const accountBalances = accounts.map((account) => {
      let balance = 0;
      let totalIncome = 0;
      let totalExpense = 0;

      account.transactions.forEach((tx) => {
        const amt = tx.baseAmountUsd;
        if (tx.transactionType === 'INCOME') {
          balance += amt;
          totalIncome += amt;
        } else if (tx.transactionType === 'EXPENSE') {
          balance -= amt;
          totalExpense += amt;
        } else if (tx.transactionType === 'TRANSFER') {
          // Outgoing transfer (treated as subtraction)
          balance -= amt;
          totalExpense += amt;
        }
      });

      return {
        accountId: account.id,
        accountName: account.name,
        balance,
        totalIncome,
        totalExpense,
        transactionCount: account.transactions.length,
      };
    });

    return NextResponse.json(accountBalances);
  } catch (error: any) {
    console.error('Error al calcular balances por cuenta:', error);
    return NextResponse.json({ error: 'Error al calcular balances por cuenta' }, { status: 500 });
  }
}
