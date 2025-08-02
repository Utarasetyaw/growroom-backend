-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "description" JSONB,
ALTER COLUMN "careDetails" SET DEFAULT '[]';
