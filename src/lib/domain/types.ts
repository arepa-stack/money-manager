export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface ParsedTransaction {
  date: Date;
  accountName: string;
  categoryName: string;
  subcategoryName?: string | null;
  amount: number; // Original amount (positive)
  currency: string; // ISO Currency code
  baseAmountUsd: number; // Base amount in USD
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
    amount: number;
    currency: string;
    baseAmountUsd: number;
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
}
