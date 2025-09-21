/*
  Warnings:

  - You are about to drop the column `voucherId` on the `VoucherUsage` table. All the data in the column will be lost.
  - You are about to drop the `Voucher` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[voucherCode]` on the table `Discount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `discountId` to the `VoucherUsage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Voucher" DROP CONSTRAINT "Voucher_discountId_fkey";

-- DropForeignKey
ALTER TABLE "VoucherUsage" DROP CONSTRAINT "VoucherUsage_voucherId_fkey";

-- DropIndex
DROP INDEX "VoucherUsage_voucherId_idx";

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "maxUses" INTEGER,
ADD COLUMN     "usesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "voucherCode" TEXT;

-- AlterTable
ALTER TABLE "VoucherUsage" DROP COLUMN "voucherId",
ADD COLUMN     "discountId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Voucher";

-- CreateIndex
CREATE UNIQUE INDEX "Discount_voucherCode_key" ON "Discount"("voucherCode");

-- CreateIndex
CREATE INDEX "VoucherUsage_discountId_idx" ON "VoucherUsage"("discountId");

-- AddForeignKey
ALTER TABLE "VoucherUsage" ADD CONSTRAINT "VoucherUsage_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
