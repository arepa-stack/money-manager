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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, budgetUsd } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre de la categoría es requerido' },
        { status: 400 }
      );
    }

    if (!type || !['INCOME', 'EXPENSE', 'TRANSFER'].includes(type)) {
      return NextResponse.json(
        { error: 'El tipo de categoría debe ser INCOME, EXPENSE o TRANSFER' },
        { status: 400 }
      );
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        type: type
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre y tipo' },
        { status: 400 }
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        type,
        budgetUsd: budgetUsd !== undefined && budgetUsd !== null ? Math.round(Number(budgetUsd) * 100) : null,
      }
    });

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al crear categoría' },
      { status: 500 }
    );
  }
}
