import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const categoryId = searchParams.get('categoryId');
    const transactionType = searchParams.get('transactionType');

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

      if (categoryId) {
        where.categoryId = categoryId;
      }

      if (transactionType) {
        where.transactionType = transactionType;
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      transactionDate,
      accountId,
      transactionType,
      amount, // Flotante decimal
      currency,
      baseAmountUsd, // Flotante decimal
      categoryId,
      subcategoryId,
      destinationAccountId,
      note,
      description,
      isOpeningBalance
    } = body;

    // 1. Validaciones básicas
    if (!transactionDate || !accountId || !transactionType || typeof amount !== 'number' || !currency || typeof baseAmountUsd !== 'number') {
      return NextResponse.json({ error: 'Faltan parámetros requeridos o son inválidos' }, { status: 400 });
    }

    let finalCategoryId = categoryId;
    let finalDestinationAccountId = destinationAccountId;

    // 2. Lógica para transferencias
    if (transactionType === 'TRANSFER') {
      if (!destinationAccountId) {
        return NextResponse.json({ error: 'Las transferencias requieren una cuenta de destino' }, { status: 400 });
      }
      if (accountId === destinationAccountId) {
        return NextResponse.json({ error: 'La cuenta origen y destino no pueden ser la misma' }, { status: 400 });
      }

      // Buscar o crear la categoría de sistema "Transferencia"
      let transferCategory = await prisma.category.findFirst({
        where: { type: 'TRANSFER' }
      });

      if (!transferCategory) {
        transferCategory = await prisma.category.create({
          data: {
            name: 'Transferencia',
            type: 'TRANSFER'
          }
        });
      }
      finalCategoryId = transferCategory.id;
    } else {
      if (!categoryId) {
        return NextResponse.json({ error: 'Las transacciones requieren una categoría' }, { status: 400 });
      }
      finalDestinationAccountId = null;
    }

    // 3. Conversión de importes a centavos enteros
    const amountCents = Math.round(amount * 100);
    const baseAmountUsdCents = Math.round(baseAmountUsd * 100);

    // 4. Crear la transacción manual
    const newTransaction = await prisma.transaction.create({
      data: {
        provider: 'MANUAL',
        providerTransactionId: null,
        transactionDate: new Date(transactionDate),
        accountId,
        categoryId: finalCategoryId,
        subcategoryId: subcategoryId || null,
        transactionType,
        amount: amountCents,
        currency,
        baseAmountUsd: baseAmountUsdCents,
        note: note || null,
        description: description || null,
        destinationAccountId: finalDestinationAccountId,
        isOpeningBalance: !!isOpeningBalance
      },
      include: {
        account: true,
        category: true,
        subcategory: true,
        destinationAccount: true
      }
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear transacción:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al crear la transacción' },
      { status: 500 }
    );
  }
}
