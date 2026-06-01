-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Scale existing float amounts to cents integers before altering schema
UPDATE "transactions"
SET
  "amount" = CAST(ROUND("amount" * 100) AS INTEGER),
  "base_amount_usd" = CAST(ROUND("base_amount_usd" * 100) AS INTEGER);

CREATE TABLE "new_transactions" (
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
    "destination_account_id" TEXT,
    CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "subcategories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_destination_account_id_fkey" FOREIGN KEY ("destination_account_id") REFERENCES "accounts" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("account_id", "amount", "base_amount_usd", "category_id", "created_at", "currency", "description", "destination_account_id", "id", "import_hash", "note", "subcategory_id", "transaction_date", "transaction_type") SELECT "account_id", "amount", "base_amount_usd", "category_id", "created_at", "currency", "description", "destination_account_id", "id", "import_hash", "note", "subcategory_id", "transaction_date", "transaction_type" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
CREATE UNIQUE INDEX "transactions_import_hash_key" ON "transactions"("import_hash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
