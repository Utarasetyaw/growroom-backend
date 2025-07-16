/*
  Warnings:

  - The `shopDescription` column on the `GeneralSetting` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `ShippingRate` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `ShippingZone` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[categoryId,name]` on the table `SubCategory` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `name` on the `Category` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `variant` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `name` on the `SubCategory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `quote` on the `Testimonial` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "Category_name_key";

-- DropIndex
DROP INDEX "SubCategory_name_categoryId_key";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "GeneralSetting" ADD COLUMN     "shopName" JSONB,
DROP COLUMN "shopDescription",
ADD COLUMN     "shopDescription" JSONB;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "price",
DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL,
DROP COLUMN "variant",
ADD COLUMN     "variant" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "ShippingRate" DROP COLUMN "price";

-- AlterTable
ALTER TABLE "ShippingZone" DROP COLUMN "price";

-- AlterTable
ALTER TABLE "SubCategory" DROP COLUMN "name",
ADD COLUMN     "name" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Testimonial" DROP COLUMN "quote",
ADD COLUMN     "quote" JSONB NOT NULL,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZonePrice" (
    "id" SERIAL NOT NULL,
    "shippingZoneId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ShippingZonePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRatePrice" (
    "id" SERIAL NOT NULL,
    "shippingRateId" INTEGER NOT NULL,
    "currencyId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ShippingRatePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_productId_currencyId_key" ON "ProductPrice"("productId", "currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingZonePrice_shippingZoneId_currencyId_key" ON "ShippingZonePrice"("shippingZoneId", "currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingRatePrice_shippingRateId_currencyId_key" ON "ShippingRatePrice"("shippingRateId", "currencyId");

-- CreateIndex
CREATE UNIQUE INDEX "SubCategory_categoryId_name_key" ON "SubCategory"("categoryId", "name");

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingZonePrice" ADD CONSTRAINT "ShippingZonePrice_shippingZoneId_fkey" FOREIGN KEY ("shippingZoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingZonePrice" ADD CONSTRAINT "ShippingZonePrice_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRatePrice" ADD CONSTRAINT "ShippingRatePrice_shippingRateId_fkey" FOREIGN KEY ("shippingRateId") REFERENCES "ShippingRate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRatePrice" ADD CONSTRAINT "ShippingRatePrice_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
