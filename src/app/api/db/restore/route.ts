import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { data } = payload;

    if (!data) {
      return NextResponse.json({ error: 'Payload de datos inválido o vacío' }, { status: 400 });
    }

    const { accounts = [], categories = [], subcategories = [], transactions = [] } = data;

    // Ejecutar la restauración de manera transaccional y atómica
    await prisma.$transaction(async (tx) => {
      // 1. Limpiar todas las tablas existentes en el orden correcto para evitar problemas de FK
      await tx.transaction.deleteMany();
      await tx.subcategory.deleteMany();
      await tx.category.deleteMany();
      await tx.account.deleteMany();

      // 2. Insertar Cuentas (Accounts)
      if (accounts.length > 0) {
        await tx.account.createMany({
          data: accounts.map((acc: any) => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            currency: acc.currency,
            createdAt: acc.createdAt ? new Date(acc.createdAt) : new Date(),
          })),
        });
      }

      // 3. Insertar Categorías (Categories)
      if (categories.length > 0) {
        await tx.category.createMany({
          data: categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            type: cat.type,
            budgetUsd: cat.budgetUsd,
          })),
        });
      }

      // 4. Insertar Subcategorías (Subcategories)
      if (subcategories.length > 0) {
        await tx.subcategory.createMany({
          data: subcategories.map((sub: any) => ({
            id: sub.id,
            categoryId: sub.categoryId,
            name: sub.name,
          })),
        });
      }

      // 5. Insertar Transacciones (Transactions)
      if (transactions.length > 0) {
        await tx.transaction.createMany({
          data: transactions.map((txData: any) => ({
            id: txData.id,
            provider: txData.provider,
            providerTransactionId: txData.providerTransactionId,
            transactionDate: new Date(txData.transactionDate),
            accountId: txData.accountId,
            categoryId: txData.categoryId,
            subcategoryId: txData.subcategoryId,
            transactionType: txData.transactionType,
            amount: txData.amount,
            currency: txData.currency,
            baseAmountUsd: txData.baseAmountUsd,
            note: txData.note,
            description: txData.description,
            createdAt: txData.createdAt ? new Date(txData.createdAt) : new Date(),
            destinationAccountId: txData.destinationAccountId,
            isOpeningBalance: txData.isOpeningBalance ?? false,
          })),
        });
      }

      // Registrar auditoría de la restauración
      await tx.auditLog.create({
        data: {
          action: 'IMPORT',
          entityType: 'SYSTEM',
          entityId: 'gdrive_restore',
          entityName: 'Restauración Google Drive',
          details: JSON.stringify({
            restoredAccounts: accounts.length,
            restoredCategories: categories.length,
            restoredSubcategories: subcategories.length,
            restoredTransactions: transactions.length,
          }),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al restaurar base de datos:', error);
    return NextResponse.json({ error: error.message || 'Error en la restauración de datos' }, { status: 500 });
  }
}
