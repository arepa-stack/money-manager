import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        note: {
          not: null,
        },
      },
      distinct: ['note'],
      select: {
        note: true,
      },
      orderBy: {
        note: 'asc',
      },
    });

    const notes = transactions
      .map((t) => t.note)
      .filter((n): n is string => typeof n === 'string' && n.trim() !== '');

    return NextResponse.json(notes);
  } catch (error: any) {
    console.error('Error al obtener notas para autocompletado:', error);
    return NextResponse.json({ error: 'Error al obtener notas' }, { status: 500 });
  }
}
