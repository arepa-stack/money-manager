import prisma from '../prisma';
import { getProvider } from '../providers';
import { ImportExecuteResult } from '../domain/types';

export async function executeImport(
  fileBuffer: Buffer, 
  providerName: string = 'MONEY_MANAGER',
  reconciliations: Record<string, string> = {} // maps importHash -> manualTransactionId
): Promise<ImportExecuteResult> {
  // Execute everything within a single transaction
  return prisma.$transaction(async (tx) => {
    const provider = getProvider(providerName);
    const parsedTransactions = provider.parse(fileBuffer);
    
    if (parsedTransactions.length === 0) {
      return {
        totalParsed: 0,
        totalInserted: 0,
        totalSkipped: 0,
        newAccountsCreatedCount: 0,
        newCategoriesCreatedCount: 0,
        newSubcategoriesCreatedCount: 0
      };
    }

    // 1. Gather all entity names
    const accountNames = Array.from(
      new Set([
        ...parsedTransactions.map((t) => t.accountName),
        ...parsedTransactions.filter((t) => t.type === 'TRANSFER').map((t) => t.categoryName),
      ])
    );
    const categoryNames = Array.from(
      new Set(parsedTransactions.filter((t) => t.type !== 'TRANSFER').map((t) => t.categoryName))
    );
    
    // Asegurar la existencia de la categoría de sistema "Transferencia"
    if (!categoryNames.includes('Transferencia')) {
      categoryNames.push('Transferencia');
    }

    // 2. Insert missing Accounts
    const existingAccounts = await tx.account.findMany({
      where: { name: { in: accountNames } },
      select: { name: true }
    });
    const existingAccNames = new Set(existingAccounts.map(a => a.name));
    const missingAccNames = accountNames.filter(name => !existingAccNames.has(name));
    
    if (missingAccNames.length > 0) {
      await tx.account.createMany({
        data: missingAccNames.map(name => ({ name }))
      });
    }

    // Load all accounts to get mapping of Name -> ID
    const allAccounts = await tx.account.findMany({
      where: { name: { in: accountNames } }
    });
    const accountMap = new Map<string, string>(allAccounts.map(a => [a.name, a.id]));

    // 3. Insert missing Categories
    const existingCategories = await tx.category.findMany({
      where: { name: { in: categoryNames } },
      select: { name: true }
    });
    const existingCatNames = new Set(existingCategories.map(c => c.name));
    const missingCatNames = categoryNames.filter(name => !existingCatNames.has(name));
    
    if (missingCatNames.length > 0) {
      const missingCategoriesData = missingCatNames.map(name => {
        if (name === 'Transferencia') {
          return {
            name,
            type: 'TRANSFER'
          };
        }
        const firstTx = parsedTransactions.find(t => t.categoryName === name);
        return {
          name,
          type: firstTx ? firstTx.type : 'EXPENSE'
        };
      });
      await tx.category.createMany({
        data: missingCategoriesData
      });
    }

    // Load all categories to get mapping of Name -> ID
    const allCategories = await tx.category.findMany({
      where: { name: { in: categoryNames } }
    });
    const categoryMap = new Map<string, string>(allCategories.map(c => [c.name, c.id]));

    // 4. Insert missing Subcategories
    const subcategoryCombos = Array.from(
      new Map(
        parsedTransactions
          .filter(t => t.type !== 'TRANSFER' && !!t.subcategoryName)
          .map(t => [`${t.categoryName}_${t.subcategoryName}`, { categoryName: t.categoryName, subcategoryName: t.subcategoryName! }])
      ).values()
    );

    const existingSubcategories = await tx.subcategory.findMany({
      where: {
        categoryId: { in: Array.from(categoryMap.values()) }
      }
    });
    const subcategoryKeySet = new Set(
      existingSubcategories.map(s => `${s.categoryId}_${s.name.toLowerCase()}`)
    );

    const subcategoriesToCreate: { categoryId: string; name: string }[] = [];
    for (const combo of subcategoryCombos) {
      const catId = categoryMap.get(combo.categoryName);
      if (catId) {
        const key = `${catId}_${combo.subcategoryName.toLowerCase()}`;
        if (!subcategoryKeySet.has(key)) {
          subcategoriesToCreate.push({
            categoryId: catId,
            name: combo.subcategoryName
          });
          subcategoryKeySet.add(key); // prevent duplicates within local scan
        }
      }
    }

    if (subcategoriesToCreate.length > 0) {
      await tx.subcategory.createMany({
        data: subcategoriesToCreate
      });
    }

    // Load all subcategories under these categories to get mapping
    const allSubcategories = await tx.subcategory.findMany({
      where: {
        categoryId: { in: Array.from(categoryMap.values()) }
      }
    });
    const subcategoryMap = new Map<string, string>(
      allSubcategories.map(s => [`${s.categoryId}_${s.name.toLowerCase()}`, s.id])
    );

    // 5. Detect and omit duplicates (already in DB with the exact same provider and providerTransactionId)
    const importHashes = parsedTransactions.map(t => t.importHash);
    const existingTransactions = await tx.transaction.findMany({
      where: {
        provider: provider.name,
        providerTransactionId: { in: importHashes }
      },
      select: { providerTransactionId: true }
    });
    const existingHashSet = new Set(existingTransactions.map(t => t.providerTransactionId));

    // Filter out rows that are duplicates
    const nonDuplicateTransactions = parsedTransactions.filter(t => !existingHashSet.has(t.importHash));

    let reconciliationsCount = 0;
    
    // Split between those that match a manual transaction vs brand new insertions
    const transactionsToInsert: typeof parsedTransactions = [];
    
    for (const t of nonDuplicateTransactions) {
      const manualId = reconciliations[t.importHash];
      if (manualId) {
        // Ejecutar reconciliación: Modificar la manual para asociarla al provider y asignarle el hash
        await tx.transaction.update({
          where: { id: manualId },
          data: {
            provider: provider.name,
            providerTransactionId: t.importHash
          }
        });
        reconciliationsCount++;
      } else {
        transactionsToInsert.push(t);
      }
    }

    // 6. Map and insert brand new transactions
    const transactionsData = transactionsToInsert.map(t => {
      const accountId = accountMap.get(t.accountName)!;
      
      let categoryId: string;
      let destinationAccountId: string | null = null;
      let subcategoryId: string | null = null;

      if (t.type === 'TRANSFER') {
        categoryId = categoryMap.get('Transferencia')!;
        destinationAccountId = accountMap.get(t.categoryName) || null;
      } else {
        categoryId = categoryMap.get(t.categoryName)!;
        if (t.subcategoryName) {
          subcategoryId = subcategoryMap.get(`${categoryId}_${t.subcategoryName.toLowerCase()}`) || null;
        }
      }

      return {
        provider: provider.name,
        providerTransactionId: t.importHash,
        transactionDate: t.date,
        accountId,
        categoryId,
        subcategoryId,
        transactionType: t.type,
        amount: t.amount,
        currency: t.currency,
        baseAmountUsd: t.baseAmountUsd,
        note: t.note || null,
        description: t.description || null,
        destinationAccountId
      };
    });

    const chunkSize = 1000;
    for (let i = 0; i < transactionsData.length; i += chunkSize) {
      const chunk = transactionsData.slice(i, i + chunkSize);
      await tx.transaction.createMany({
        data: chunk
      });
    }

    // 7. Calcular saldos actuales de todas las cuentas
    const dbAccounts = await tx.account.findMany({
      include: {
        transactions: {
          select: {
            transactionType: true,
            baseAmountUsd: true,
          },
        },
        receivedTransfers: {
          select: {
            transactionType: true,
            baseAmountUsd: true,
          },
        },
      },
    });

    const accountBalances = dbAccounts
      .map((account) => {
        let balance = 0;
        account.transactions.forEach((tx) => {
          if (tx.transactionType === 'INCOME') {
            balance += tx.baseAmountUsd;
          } else if (tx.transactionType === 'EXPENSE' || tx.transactionType === 'TRANSFER') {
            balance -= tx.baseAmountUsd;
          }
        });
        account.receivedTransfers.forEach((tx) => {
          if (tx.transactionType === 'TRANSFER') {
            balance += tx.baseAmountUsd;
          }
        });
        return {
          accountId: account.id,
          accountName: account.name,
          currentBalanceUsd: balance,
        };
      });

    return {
      totalParsed: parsedTransactions.length,
      totalInserted: transactionsData.length + reconciliationsCount,
      totalSkipped: parsedTransactions.length - (transactionsData.length + reconciliationsCount),
      newAccountsCreatedCount: missingAccNames.length,
      newCategoriesCreatedCount: missingCatNames.length,
      newSubcategoriesCreatedCount: subcategoriesToCreate.length,
      accountBalances
    };
  });
}
