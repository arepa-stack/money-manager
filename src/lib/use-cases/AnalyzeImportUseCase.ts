import prisma from '../prisma';
import { getProvider } from '../providers';
import { ImportAnalysisResult, TransactionType } from '../domain/types';
import { subDays, addDays } from 'date-fns';

export async function analyzeImport(fileBuffer: Buffer, providerName: string = 'MONEY_MANAGER'): Promise<ImportAnalysisResult> {
  const provider = getProvider(providerName);
  const parsedTransactions = provider.parse(fileBuffer);
  
  if (parsedTransactions.length === 0) {
    return {
      totalRows: 0,
      totalParsed: 0,
      totalSkippedDuplicates: 0,
      newAccounts: [],
      newCategories: [],
      newSubcategories: [],
      previewTransactions: []
    };
  }

  // 1. Extract unique names
  const accountNames = Array.from(
    new Set([
      ...parsedTransactions.map((t) => t.accountName),
      ...parsedTransactions.filter((t) => t.type === 'TRANSFER').map((t) => t.categoryName),
    ])
  );
  const categoryNames = Array.from(
    new Set(parsedTransactions.filter((t) => t.type !== 'TRANSFER').map((t) => t.categoryName))
  );
  
  // subcategories need to be associated with their category to be uniquely checked
  const subcategoryCombos = Array.from(
    new Map(
      parsedTransactions
        .filter(t => t.type !== 'TRANSFER' && !!t.subcategoryName)
        .map(t => [`${t.categoryName}_${t.subcategoryName}`, { category: t.categoryName, sub: t.subcategoryName! }])
    ).values()
  );

  const importHashes = parsedTransactions.map(t => t.importHash);

  // 2. Fetch existing entities from SQLite database
  const [existingAccounts, existingCategories, existingTransactions] = await Promise.all([
    prisma.account.findMany({
      where: { name: { in: accountNames } },
      select: { id: true, name: true }
    }),
    prisma.category.findMany({
      where: { name: { in: categoryNames } },
      select: { name: true }
    }),
    prisma.transaction.findMany({
      where: {
        provider: provider.name,
        providerTransactionId: { in: importHashes }
      },
      select: { providerTransactionId: true }
    })
  ]);

  const existingAccountMap = new Map<string, string>(existingAccounts.map(a => [a.name, a.id]));
  const existingCategorySet = new Set(existingCategories.map(c => c.name));
  const existingHashSet = new Set(existingTransactions.map(t => t.providerTransactionId));

  // Determine new accounts and categories
  const newAccounts = accountNames.filter(name => !existingAccountMap.has(name));
  
  const newCategoriesMap = new Map<string, TransactionType>();
  parsedTransactions.forEach(t => {
    if (t.type === 'TRANSFER') {
      if (!existingCategorySet.has('Transferencia') && !newCategoriesMap.has('Transferencia')) {
        newCategoriesMap.set('Transferencia', 'TRANSFER');
      }
    } else {
      if (!existingCategorySet.has(t.categoryName) && !newCategoriesMap.has(t.categoryName)) {
        newCategoriesMap.set(t.categoryName, t.type);
      }
    }
  });
  const newCategories = Array.from(newCategoriesMap.entries()).map(([name, type]) => ({ name, type }));

  // For subcategories, we need to fetch the existing ones for our categories
  const dbCategories = await prisma.category.findMany({
    where: { name: { in: categoryNames } },
    include: { subcategories: true }
  });

  // Build a lookup map of existing category+subcategory names
  const existingSubcategorySet = new Set<string>();
  dbCategories.forEach(cat => {
    cat.subcategories.forEach(sub => {
      existingSubcategorySet.add(`${cat.name}_${sub.name}`);
    });
  });

  const newSubcategories = subcategoryCombos.filter(combo => {
    if (!existingCategorySet.has(combo.category)) {
      return true;
    }
    return !existingSubcategorySet.has(`${combo.category}_${combo.sub}`);
  });

  // --- LOGICA DE RECONCILIACION / MATCHING ---
  // Obtener todas las transacciones "MANUAL" existentes para las cuentas de la importación
  // que estén dentro del rango de fechas de la importación (+/- 2 días)
  const dates = parsedTransactions.map(t => t.date.getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  const manualTransactions = await prisma.transaction.findMany({
    where: {
      provider: 'MANUAL',
      transactionDate: {
        gte: subDays(minDate, 2),
        lte: addDays(maxDate, 2)
      },
      accountId: { in: Array.from(existingAccountMap.values()) }
    },
    select: {
      id: true,
      transactionDate: true,
      amount: true,
      accountId: true,
      transactionType: true,
      note: true
    }
  });

  let duplicateCount = 0;
  
  const previewTransactions = parsedTransactions.map(t => {
    const isDuplicate = existingHashSet.has(t.importHash);
    if (isDuplicate) duplicateCount++;

    // Intentar buscar candidato para matching
    let matchCandidate: { id: string; date: string; note: string | null } | null = null;

    if (!isDuplicate) {
      const accountId = existingAccountMap.get(t.accountName);
      if (accountId) {
        // Encontrar transacciones manuales que coincidan en cuenta, monto, tipo y fecha (+/- 2 días)
        const match = manualTransactions.find(mt => {
          const dateDiffDays = Math.abs(mt.transactionDate.getTime() - t.date.getTime()) / (1000 * 60 * 60 * 24);
          return mt.accountId === accountId &&
                 mt.amount === t.amount &&
                 mt.transactionType === t.type &&
                 dateDiffDays <= 2;
        });

        if (match) {
          matchCandidate = {
            id: match.id,
            date: match.transactionDate.toISOString(),
            note: match.note
          };
        }
      }
    }

    return {
      date: t.date.toISOString(),
      accountName: t.accountName,
      categoryName: t.categoryName,
      subcategoryName: t.subcategoryName || null,
      amount: t.amount,
      currency: t.currency,
      baseAmountUsd: t.baseAmountUsd,
      type: t.type,
      note: t.note || null,
      isDuplicate,
      importHash: t.importHash,
      matchCandidate // Nuevo campo para la UI de importación
    };
  });

  return {
    totalRows: parsedTransactions.length,
    totalParsed: parsedTransactions.length - duplicateCount,
    totalSkippedDuplicates: duplicateCount,
    newAccounts,
    newCategories,
    newSubcategories: newSubcategories.map(s => ({ categoryName: s.category, name: s.sub })),
    previewTransactions
  };
}
