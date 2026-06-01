import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Retrieve all transactions sorted chronologically
    const transactions = await prisma.transaction.findMany({
      orderBy: { transactionDate: 'asc' },
      select: {
        transactionDate: true,
        transactionType: true,
        baseAmountUsd: true,
      },
    });

    if (transactions.length === 0) {
      return NextResponse.json([]);
    }

    // 1. Group net balance change by month (YYYY-MM)
    const netChangeByMonth: { [key: string]: number } = {};

    for (const tx of transactions) {
      const date = new Date(tx.transactionDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      let change = 0;
      if (tx.transactionType === 'INCOME') {
        change = tx.baseAmountUsd;
      } else if (tx.transactionType === 'EXPENSE') {
        change = -tx.baseAmountUsd;
      }
      // Note: TRANSFER has neutral overall net change (one account -X, another +X)

      netChangeByMonth[monthKey] = (netChangeByMonth[monthKey] || 0) + change;
    }

    // 2. Determine date bounds to fill potential gaps
    const monthKeys = Object.keys(netChangeByMonth).sort();
    const startMonthStr = monthKeys[0];
    const endMonthStr = monthKeys[monthKeys.length - 1];

    const parseYearMonth = (str: string) => {
      const [year, month] = str.split('-').map(Number);
      return new Date(year, month - 1, 1);
    };

    const current = parseYearMonth(startMonthStr);
    const end = parseYearMonth(endMonthStr);

    // 3. Compute running cumulative total and fill gaps
    const result: { month: string; balance: number }[] = [];
    let runningTotal = 0;

    // Safety guard to avoid infinite loops if date parsing fails
    let loopCount = 0;
    while (current <= end && loopCount < 500) {
      loopCount++;
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const change = netChangeByMonth[monthKey] || 0;
      runningTotal += change;

      result.push({
        month: monthKey,
        balance: runningTotal, // integer cents — no float rounding needed
      });

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error al generar reporte de evolución:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte de evolución' },
      { status: 500 }
    );
  }
}
