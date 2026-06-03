import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const accounts = await prisma.account.findMany();
    const categories = await prisma.category.findMany();
    const subcategories = await prisma.subcategory.findMany();
    const transactions = await prisma.transaction.findMany({
      orderBy: {
        transactionDate: 'asc',
      },
    });

    return NextResponse.json({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: {
        accounts,
        categories,
        subcategories,
        transactions,
      },
    });
  } catch (error: any) {
    console.error('Error al exportar base de datos:', error);
    return NextResponse.json({ error: 'Error al exportar los datos locales' }, { status: 500 });
  }
}
