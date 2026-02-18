-- AlterTable
ALTER TABLE "Product" ADD COLUMN "sku" TEXT;

-- Backfill existing products with unique six-digit SKU values.
DO $$
DECLARE
  v_product_id TEXT;
  v_sku TEXT;
BEGIN
  FOR v_product_id IN
    SELECT "id" FROM "Product" WHERE "sku" IS NULL
  LOOP
    LOOP
      v_sku := (FLOOR(RANDOM() * 900000) + 100000)::TEXT;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "Product" WHERE "sku" = v_sku
      );
    END LOOP;

    UPDATE "Product"
    SET "sku" = v_sku
    WHERE "id" = v_product_id;
  END LOOP;
END
$$;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
