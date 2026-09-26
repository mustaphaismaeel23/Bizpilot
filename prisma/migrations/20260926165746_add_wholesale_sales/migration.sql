-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('RETAIL', 'WHOLESALE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "wholesalePrice" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "saleType" "SaleType" NOT NULL DEFAULT 'RETAIL';
