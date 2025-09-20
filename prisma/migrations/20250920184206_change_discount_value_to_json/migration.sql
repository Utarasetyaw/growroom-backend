/*
  Warnings:

  - Changed the type of `value` on the `Discount` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Discount" DROP COLUMN "value",
ADD COLUMN     "value" JSONB NOT NULL;
