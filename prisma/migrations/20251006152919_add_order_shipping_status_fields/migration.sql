/*
  Warnings:

  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNo" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "note" TEXT,
    "pickupStore" TEXT,
    "subTotal" INTEGER NOT NULL,
    "shipping" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "shipMethod" TEXT NOT NULL DEFAULT 'POST',
    "customerAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Order" ("createdAt", "customerEmail", "customerName", "customerPhone", "id", "note", "orderNo", "pickupStore", "shipping", "subTotal", "total") SELECT "createdAt", "customerEmail", "customerName", "customerPhone", "id", "note", "orderNo", "pickupStore", "shipping", "subTotal", "total" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNo_key" ON "Order"("orderNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
