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
