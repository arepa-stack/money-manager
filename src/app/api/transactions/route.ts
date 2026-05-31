import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { transactionDate: 'desc' },
      take: 100,
      include: {
        account: true,
        category: true,
        subcategory: true,
      },
    });
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error al obtener transacciones:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
  }
}
