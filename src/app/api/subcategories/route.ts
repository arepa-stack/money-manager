import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAction } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoryId, name } = body;

    if (!categoryId || !name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El categoryId y el nombre son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si existe la categoría padre
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'La categoría especificada no existe' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una subcategoría con ese nombre en esta categoría
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: {
        categoryId_name: {
          categoryId,
          name: name.trim(),
        },
      },
    });

    if (existingSubcategory) {
      return NextResponse.json(
        { error: 'Ya existe una subcategoría con este nombre en la categoría seleccionada' },
        { status: 400 }
      );
    }

    const newSubcategory = await prisma.subcategory.create({
      data: {
        categoryId,
        name: name.trim(),
      },
    });

    logAction({
      action: 'CREATE',
      entityType: 'SUBCATEGORY',
      entityId: newSubcategory.id,
      entityName: newSubcategory.name,
      details: { categoryId, categoryName: category.name },
    });

    return NextResponse.json(newSubcategory, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear subcategoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al crear subcategoría' },
      { status: 500 }
    );
  }
}
