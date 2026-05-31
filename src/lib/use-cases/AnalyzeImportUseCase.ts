import prisma from '../prisma';
import { parseMoneyManagerExcel } from '../parsers/moneyManagerParser';
import { ImportAnalysisResult, TransactionType } from '../domain/types';

export async function analyzeImport(fileBuffer: Buffer): Promise<ImportAnalysisResult> {
  const parsedTransactions = parseMoneyManagerExcel(fileBuffer);
  
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
  const accountNames = Array.from(new Set(parsedTransactions.map(t => t.accountName)));
  const categoryNames = Array.from(new Set(parsedTransactions.map(t => t.categoryName)));
  
  // subcategories need to be associated with their category to be uniquely checked
  const subcategoryCombos = Array.from(
    new Map(
      parsedTransactions
        .filter(t => !!t.subcategoryName)
        .map(t => [`${t.categoryName}_${t.subcategoryName}`, { category: t.categoryName, sub: t.subcategoryName! }])
    ).values()
  );

  const importHashes = parsedTransactions.map(t => t.importHash);

  // 2. Fetch existing entities from SQLite database
  const [existingAccounts, existingCategories, existingTransactions] = await Promise.all([
    prisma.account.findMany({
      where: { name: { in: accountNames } },
      select: { name: true }
    }),
    prisma.category.findMany({
      where: { name: { in: categoryNames } },
      select: { name: true }
    }),
    prisma.transaction.findMany({
      where: { importHash: { in: importHashes } },
      select: { importHash: true }
    })
  ]);

  const existingAccountSet = new Set(existingAccounts.map(a => a.name));
  const existingCategorySet = new Set(existingCategories.map(c => c.name));
  const existingHashSet = new Set(existingTransactions.map(t => t.importHash));

  // Determine new accounts and categories
  const newAccounts = accountNames.filter(name => !existingAccountSet.has(name));
  
  // We need to determine the type for new categories.
  // We'll infer it from the first transaction that uses this category.
  const newCategoriesMap = new Map<string, TransactionType>();
  parsedTransactions.forEach(t => {
    if (!existingCategorySet.has(t.categoryName) && !newCategoriesMap.has(t.categoryName)) {
      newCategoriesMap.set(t.categoryName, t.type);
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
    // If the category is new, then this subcategory is definitely new
    if (!existingCategorySet.has(combo.category)) {
      return true;
    }
    // Otherwise, check if it already exists under this category in the DB
    return !existingSubcategorySet.has(`${combo.category}_${combo.sub}`);
  });

  let duplicateCount = 0;
  
  const previewTransactions = parsedTransactions.map(t => {
    const isDuplicate = existingHashSet.has(t.importHash);
    if (isDuplicate) duplicateCount++;
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
      isDuplicate
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
