import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
