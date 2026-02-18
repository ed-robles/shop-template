export type CartAdjustmentCode = "CLAMPED_TO_STOCK" | "REMOVED_UNAVAILABLE";

export type CartAdjustment = {
  code: CartAdjustmentCode;
  productId: string;
  productName: string;
  requestedQuantity: number;
  adjustedQuantity: number;
  message: string;
};

export type CartSnapshotItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  priceInCents: number;
  stockQuantity: number;
  maxAllowedQuantity: number;
  quantity: number;
  lineTotalInCents: number;
};

export type CartSnapshot = {
  items: CartSnapshotItem[];
  itemCount: number;
  subtotalInCents: number;
  adjustments: CartAdjustment[];
};

export type GuestCartItemInput = {
  productId: string;
  quantity: number;
};
