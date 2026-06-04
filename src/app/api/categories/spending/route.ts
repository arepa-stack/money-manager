import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    // Primer día del mes actual en UTC/Local según servidor
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Agrupar gastos por categoría en el mes actual
    const spendings = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        transactionType: 'EXPENSE',
        excludeFromTotals: false,
        transactionDate: {
          gte: firstDay,
          lte: lastDay,
        },
      },
      _sum: {
        baseAmountUsd: true,
      },
    });

    // Mapear a un objeto de respuesta rápido { [categoryId]: baseAmountUsd }
    const result: Record<string, number> = {};
    spendings.forEach((item) => {
      if (item.categoryId) {
        result[item.categoryId] = item._sum.baseAmountUsd || 0;
      }
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error al obtener gastos mensuales de categorías:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
