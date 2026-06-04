import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // Formato: "YYYY-MM"

    let firstDay: Date;
    let lastDay: Date;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [year, month] = monthParam.split('-').map(Number);
      firstDay = new Date(year, month - 1, 1);
      lastDay = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      // Primer día del mes actual en UTC/Local según servidor
      firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Agrupar gastos por categoría en el mes seleccionado
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

