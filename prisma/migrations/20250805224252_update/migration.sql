-- AlterTable
ALTER TABLE "GeneralSetting" ADD COLUMN     "aboutItems" JSONB DEFAULT '[]',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "faqs" JSONB DEFAULT '[]',
ADD COLUMN     "phoneNumber" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
