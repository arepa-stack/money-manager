import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const where: any = {};

    if (search) {
      where.note = {
        contains: search
      };
    } else {
      if (accountId) {
        where.OR = [
          { accountId },
          { destinationAccountId: accountId },
        ];
      }

      if (startDate || endDate) {
        where.transactionDate = {};
        
        const timezoneOffset = searchParams.get('timezoneOffset');
        const offsetMinutes = timezoneOffset ? parseInt(timezoneOffset, 10) : new Date().getTimezoneOffset();
        
        if (startDate) {
          const startUtc = new Date(`${startDate}T00:00:00.000Z`);
          where.transactionDate.gte = new Date(startUtc.getTime() + offsetMinutes * 60 * 1000);
        }
        if (endDate) {
          const endUtc = new Date(`${endDate}T23:59:59.999Z`);
          where.transactionDate.lte = new Date(endUtc.getTime() + offsetMinutes * 60 * 1000);
        }
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      take: 200, // Slightly increase threshold to show more entries under filters
      include: {
        account: true,
        category: true,
        subcategory: true,
        destinationAccount: true,
      },
    });
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error al obtener transacciones:', error);
    return NextResponse.json({ error: 'Error al obtener transacciones' }, { status: 500 });
  }
}
