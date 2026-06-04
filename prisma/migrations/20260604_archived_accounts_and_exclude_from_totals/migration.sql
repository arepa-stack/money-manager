-- Agregar exclude_from_totals a transactions e is_archived a accounts
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 1. Agregar is_archived a accounts (simple ADD COLUMN, SQLite lo soporta)
ALTER TABLE "accounts" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;

-- 2. Redefinir transactions para agregar exclude_from_totals
CREATE TABLE "new_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "provider_transaction_id" TEXT,
    "transaction_date" DATETIME NOT NULL,
    "account_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "subcategory_id" TEXT,
    "transaction_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "base_amount_usd" INTEGER NOT NULL,
    "note" TEXT,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destination_account_id" TEXT,
    "is_opening_balance" BOOLEAN NOT NULL DEFAULT false,
    "exclude_from_totals" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("id", "provider", "provider_transaction_id", "transaction_date", "account_id", "category_id", "subcategory_id", "transaction_type", "amount", "currency", "base_amount_usd", "note", "description", "created_at", "destination_account_id", "is_opening_balance", "exclude_from_totals")
SELECT "id", "provider", "provider_transaction_id", "transaction_date", "account_id", "category_id", "subcategory_id", "transaction_type", "amount", "currency", "base_amount_usd", "note", "description", "created_at", "destination_account_id", "is_opening_balance", false
FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
CREATE UNIQUE INDEX "transactions_provider_provider_transaction_id_key" ON "transactions"("provider", "provider_transaction_id");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
