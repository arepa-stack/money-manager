export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface ParsedTransaction {
  date: Date;
  accountName: string;
  categoryName: string;
  subcategoryName?: string | null;
  amount: number; // Amount in cents, integer (positive). e.g. $15.30 → 1530
  currency: string; // ISO Currency code
  baseAmountUsd: number; // Base amount in USD cents, integer. e.g. $15.30 → 1530
  type: TransactionType;
  note?: string | null;
  description?: string | null;
  importHash: string; // SHA-256 for idempotency
  isOpeningBalance?: boolean;
  excludeFromTotals?: boolean; // true si pertenece a una cuenta eliminada/oculta en la app origen
  accountIsArchived?: boolean; // true si la cuenta origen está marcada como eliminada/oculta
}

export interface ImportAnalysisResult {
  totalRows: number;
  totalParsed: number;
  totalSkippedDuplicates: number;
  newAccounts: string[];
  newCategories: { name: string; type: TransactionType }[];
  newSubcategories: { categoryName: string; name: string }[];
  previewTransactions: {
    date: string;
    accountName: string;
    categoryName: string;
    subcategoryName: string | null;
    amount: number; // cents (integer)
    currency: string;
    baseAmountUsd: number; // USD cents (integer)
    type: TransactionType;
    note: string | null;
    isDuplicate: boolean;
    importHash: string;
    isOpeningBalance?: boolean;
    excludeFromTotals?: boolean;
    matchCandidate?: {
      id: string;
      date: string;
      note: string | null;
    } | null;
  }[];
}

export interface ImportExecuteResult {
  totalParsed: number;
  totalInserted: number;
  totalSkipped: number;
  newAccountsCreatedCount: number;
  newCategoriesCreatedCount: number;
  newSubcategoriesCreatedCount: number;
  accountBalances?: {
    accountId: string;
    accountName: string;
    currentBalanceUsd: number;
  }[];
}
