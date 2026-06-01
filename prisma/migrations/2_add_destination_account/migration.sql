-- AlterTable: Añadir columna destination_account_id a la tabla transactions
ALTER TABLE "transactions" ADD COLUMN "destination_account_id" TEXT REFERENCES "accounts"("id");
