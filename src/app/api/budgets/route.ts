import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAction } from '@/lib/audit';

// GET /api/budgets?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'El parámetro month es requerido y debe tener el formato YYYY-MM' },
        { status: 400 }
      );
    }

    // Obtener categorías de tipo EXPENSE
    const categories = await prisma.category.findMany({
      where: { type: 'EXPENSE' },
      orderBy: { name: 'asc' },
    });

    // Obtener presupuestos mensuales para este mes
    const monthlyBudgets = await prisma.monthlyBudget.findMany({
      where: { yearMonth: month },
    });

    const budgetMap = new Map(monthlyBudgets.map((b) => [b.categoryId, b.budgetUsd]));

    // Mapear respuesta
    const result = categories.map((cat) => {
      const customBudget = budgetMap.get(cat.id);
      const hasCustom = customBudget !== undefined;
      return {
        id: cat.id,
        name: cat.name,
        type: cat.type,
        defaultBudgetUsd: cat.budgetUsd, // En centavos
        budgetUsd: hasCustom ? customBudget : null, // En centavos (null si no está establecido este mes)
        isCustom: hasCustom,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error al obtener presupuestos:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/budgets
// Payload: { month: "YYYY-MM", categoryId: "uuid", budgetUsd: number | null } (budgetUsd en USD, ej: 150.5)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, categoryId, budgetUsd } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: 'El mes es requerido y debe tener formato YYYY-MM' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: 'El ID de la categoría es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la categoría existe y es de tipo EXPENSE
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'La categoría especificada no existe' },
        { status: 404 }
      );
    }

    if (category.type !== 'EXPENSE') {
      return NextResponse.json(
        { error: 'Solo se pueden asignar presupuestos a categorías de tipo GASTO (EXPENSE)' },
        { status: 400 }
      );
    }

    // Convertir de USD float a centavos (Int) o null
    const budgetCents = budgetUsd !== undefined && budgetUsd !== null 
      ? Math.round(Number(budgetUsd) * 100) 
      : null;

    let result;

    if (budgetCents === null) {
      // Si el presupuesto es nulo, eliminamos la personalización mensual para que herede de la categoría por defecto
      try {
        await prisma.monthlyBudget.delete({
          where: {
            categoryId_yearMonth: {
              categoryId,
              yearMonth: month,
            },
          },
        });
      } catch (err) {
        // Ignorar error si no existía el registro
      }

      result = {
        categoryId,
        yearMonth: month,
        budgetUsd: category.budgetUsd,
        isCustom: false,
      };

      logAction({
        action: 'DELETE',
        entityType: 'TRANSACTION', // Usamos un tipo existente o 'SYSTEM' en logAction. 
        // Espera, logAction admite 'CATEGORY' en entityType
        entityId: categoryId,
        entityName: `${category.name} (${month})`,
        details: { message: 'Presupuesto mensual revertido a valor por defecto' },
      });
    } else {
      // Guardar o actualizar (upsert) el presupuesto mensual
      result = await prisma.monthlyBudget.upsert({
        where: {
          categoryId_yearMonth: {
            categoryId,
            yearMonth: month,
          },
        },
        update: {
          budgetUsd: budgetCents,
        },
        create: {
          categoryId,
          yearMonth: month,
          budgetUsd: budgetCents,
        },
      });

      logAction({
        action: 'UPDATE',
        entityType: 'CATEGORY',
        entityId: categoryId,
        entityName: `${category.name} (${month})`,
        details: { budgetUsd: budgetCents },
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error al guardar presupuesto mensual:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al guardar presupuesto' },
      { status: 500 }
    );
  }
}
