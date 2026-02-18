export const PRODUCT_CATEGORIES = [
  "TOPS",
  "BOTTOMS",
  "SHOES",
  "ACCESSORIES",
] as const;

export type ProductCategoryValue = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategoryValue, string> = {
  TOPS: "Tops",
  BOTTOMS: "Bottoms",
  SHOES: "Shoes",
  ACCESSORIES: "Accessories",
};

export function isProductCategory(value: string): value is ProductCategoryValue {
  return PRODUCT_CATEGORIES.includes(value as ProductCategoryValue);
}
