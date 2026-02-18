-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('TOPS', 'BOTTOMS', 'SHOES', 'ACCESSORIES');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory" NOT NULL DEFAULT 'TOPS';

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");
