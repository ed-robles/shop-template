-- This migration is written defensively because older repositories had
-- product-table creation in a later migration.
DO $$
DECLARE
  v_product_id TEXT;
  v_sku TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'Product'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Product'
        AND column_name = 'sku'
    ) THEN
      ALTER TABLE "Product" ADD COLUMN "sku" TEXT;
    END IF;

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

    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku")';
  END IF;
END
$$;
