-- Money Pattern Migration: Float → Integer (cents)
-- SQLite does not support ALTER COLUMN, so we use the table-recreation technique.

PRAGMA foreign_keys=OFF;

-- Step 1: Create new transactions table with INTEGER columns
CREATE TABLE "transactions_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "import_hash" TEXT NOT NULL,
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
    CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Step 2: Copy data, scaling float amounts to integer cents
INSERT INTO "transactions_new"
SELECT
    "id",
    "import_hash",
    "transaction_date",
    "account_id",
    "category_id",
    "subcategory_id",
    "transaction_type",
    CAST(ROUND("amount" * 100) AS INTEGER),
    "currency",
    CAST(ROUND("base_amount_usd" * 100) AS INTEGER),
    "note",
    "description",
    "created_at"
FROM "transactions";

-- Step 3: Drop old table and rename new one
DROP TABLE "transactions";
ALTER TABLE "transactions_new" RENAME TO "transactions";

-- Step 4: Recreate indexes
CREATE UNIQUE INDEX "transactions_import_hash_key" ON "transactions"("import_hash");

PRAGMA foreign_keys=ON;
